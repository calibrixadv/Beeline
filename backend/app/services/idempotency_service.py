import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import IdempotencyRecord


class IdempotencyService:
    @staticmethod
    def compute_hash(payload: Any) -> str:
        """Computes SHA-256 fingerprint of request body."""
        if isinstance(payload, bytes):
            raw_bytes = payload
        elif isinstance(payload, str):
            raw_bytes = payload.encode("utf-8")
        else:
            # Sort keys for deterministic JSON serialization
            raw_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.sha256(raw_bytes).hexdigest()

    @staticmethod
    async def claim_key(
        db: AsyncSession,
        user_id: str,
        idempotency_key: str,
        payload_hash: str
    ) -> Optional[Tuple[int, Dict[str, Any]]]:
        """
        Validates idempotency key against database and atomically claims it:
        - If not found: inserts IN_PROGRESS record and returns None (caller proceeds).
        - If found and completed with matching payload: returns (response_code, cached_payload).
        - If found and payload hash differs: raises 422 Unprocessable Entity.
        - If found and in-flight: raises 409 Conflict.
        """
        stmt = select(IdempotencyRecord).where(
            IdempotencyRecord.user_id == user_id,
            IdempotencyRecord.idempotency_key == idempotency_key
        )
        result = await db.execute(stmt)
        record = result.scalar_one_or_none()

        if record:
            # Check hash match
            if record.request_hash != payload_hash:
                raise HTTPException(
                    status_code=422,
                    detail="Idempotency key payload mismatch: request body does not match previous execution with this key"
                )

            if record.status == "IN_PROGRESS":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Concurrent in-flight operation with this idempotency key. Please retry shortly."
                )

            # Return cached response
            cached_data = json.loads(record.response_payload) if record.response_payload else {}
            return record.response_code, cached_data

        # Atomically claim the key by inserting an IN_PROGRESS record
        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        new_record = IdempotencyRecord(
            user_id=user_id,
            idempotency_key=idempotency_key,
            request_hash=payload_hash,
            status="IN_PROGRESS",
            response_code=0,
            response_payload="",
            expires_at=expires
        )
        db.add(new_record)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            # Concurrent race condition: another concurrent worker claimed the key in parallel!
            result = await db.execute(stmt)
            record = result.scalar_one_or_none()
            if record:
                if record.request_hash != payload_hash:
                    raise HTTPException(
                        status_code=422,
                        detail="Idempotency key payload mismatch: request body does not match previous execution with this key"
                    )
                if record.status == "IN_PROGRESS":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Concurrent in-flight operation with this idempotency key. Please retry shortly."
                    )
                cached_data = json.loads(record.response_payload) if record.response_payload else {}
                return record.response_code, cached_data
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Concurrent in-flight operation with this idempotency key. Please retry shortly."
            )

        return None

    # Backward compatibility alias
    check_key = claim_key

    @staticmethod
    async def complete_key(
        db: AsyncSession,
        user_id: str,
        idempotency_key: str,
        payload_hash: str,
        response_code: int,
        response_data: Any
    ) -> None:
        """Stores the completed execution result for replay caching within 24 hours."""
        serialized = json.dumps(response_data) if not isinstance(response_data, str) else response_data
        expires = datetime.now(timezone.utc) + timedelta(hours=24)

        stmt = select(IdempotencyRecord).where(
            IdempotencyRecord.user_id == user_id,
            IdempotencyRecord.idempotency_key == idempotency_key
        )
        result = await db.execute(stmt)
        record = result.scalar_one_or_none()

        if record:
            record.request_hash = payload_hash
            record.status = "COMPLETED"
            record.response_code = response_code
            record.response_payload = serialized
            record.expires_at = expires
        else:
            new_record = IdempotencyRecord(
                user_id=user_id,
                idempotency_key=idempotency_key,
                request_hash=payload_hash,
                status="COMPLETED",
                response_code=response_code,
                response_payload=serialized,
                expires_at=expires
            )
            db.add(new_record)

        await db.commit()

    # Backward compatibility alias
    store_response = complete_key

    @staticmethod
    async def release_key_on_error(
        db: AsyncSession,
        user_id: str,
        idempotency_key: str
    ) -> None:
        """Cleans up an IN_PROGRESS claim if the operation failed so future retries can succeed."""
        try:
            stmt = select(IdempotencyRecord).where(
                IdempotencyRecord.user_id == user_id,
                IdempotencyRecord.idempotency_key == idempotency_key
            )
            result = await db.execute(stmt)
            record = result.scalar_one_or_none()
            if record and record.status == "IN_PROGRESS":
                await db.delete(record)
                await db.commit()
        except Exception:
            await db.rollback()

