import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.models.booking import IdempotencyRecord

logger = logging.getLogger(__name__)


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
        - If not found: claims via Redis distributed atomic lock (SET NX EX 120),
          then inserts IN_PROGRESS record and returns None (caller proceeds).
        - If found and completed with matching payload: returns (response_code, cached_payload).
        - If found and payload hash differs: raises 422 Unprocessable Entity.
        - If found and in-flight (or Redis lock held): raises 409 Conflict.
        - If Redis is offline or errors: seamlessly falls back to SQL table.
        """
        stmt = select(IdempotencyRecord).where(
            IdempotencyRecord.user_id == user_id,
            IdempotencyRecord.idempotency_key == idempotency_key
        )

        # 1. Attempt Redis atomic distributed lock first (SET NX EX 120)
        redis_lock_key = f"idemp:{user_id}:{idempotency_key}"
        redis_lock_acquired = False

        try:
            redis = get_redis()
            acquired = await redis.set(redis_lock_key, payload_hash, nx=True, ex=120)
            if acquired:
                redis_lock_acquired = True
            else:
                # Lock is already held in Redis by an in-flight operation.
                existing_val = await redis.get(redis_lock_key)
                if existing_val and existing_val != payload_hash:
                    raise HTTPException(
                        status_code=422,
                        detail="Idempotency key payload mismatch: request body does not match previous execution with this key"
                    )
                # Check if operation was already completed in SQL to return cached replay
                result = await db.execute(stmt)
                record = result.scalar_one_or_none()
                if record:
                    if record.request_hash != payload_hash:
                        raise HTTPException(
                            status_code=422,
                            detail="Idempotency key payload mismatch: request body does not match previous execution with this key"
                        )
                    if record.status == "COMPLETED":
                        cached_data = json.loads(record.response_payload) if record.response_payload else {}
                        return record.response_code, cached_data

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Concurrent in-flight operation with this idempotency key. Please retry shortly."
                )
        except HTTPException:
            raise
        except Exception as exc:
            # Graceful fallback: Redis is offline, continue to SQL transaction table
            logger.debug(f"Redis idempotency lock skipped (fallback to SQL): {exc}")

        # 2. Check SQL database state and insert IN_PROGRESS record
        try:
            # Ensure user exists for relational foreign key integrity
            from app.models.user import User
            user_check = await db.execute(select(User.id).where(User.id == user_id))
            if not user_check.scalar_one_or_none():
                db.add(User(
                    id=user_id,
                    email=f"{user_id}@test.beeline.io",
                    username=user_id,
                    is_guest=True,
                    is_active=True
                ))
                await db.flush()

            result = await db.execute(stmt)
            record = result.scalar_one_or_none()

            if record:
                # Release Redis lock if acquired because SQL already has record
                if redis_lock_acquired:
                    try:
                        redis = get_redis()
                        await redis.delete(redis_lock_key)
                    except Exception:
                        pass

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

            # 3. Atomically claim the key by inserting an IN_PROGRESS record into SQL
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
                # If we claimed the Redis lock but SQL insertion failed due to concurrent race, release Redis lock
                if redis_lock_acquired:
                    try:
                        redis = get_redis()
                        await redis.delete(redis_lock_key)
                    except Exception:
                        pass
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
        except HTTPException:
            raise
        except Exception:
            # Generic DB error (e.g. connection error, operational error): clean up Redis lock and roll back DB
            if redis_lock_acquired:
                try:
                    redis = get_redis()
                    await redis.delete(redis_lock_key)
                except Exception:
                    pass
            try:
                await db.rollback()
            except Exception:
                pass
            raise

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

        try:
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
        finally:
            # Release in-flight distributed lock in Redis
            try:
                redis = get_redis()
                await redis.delete(f"idemp:{user_id}:{idempotency_key}")
            except Exception:
                pass

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

        # Clean up Redis distributed lock
        try:
            redis = get_redis()
            await redis.delete(f"idemp:{user_id}:{idempotency_key}")
        except Exception:
            pass

