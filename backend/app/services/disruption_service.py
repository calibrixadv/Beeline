import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.transit import Disruption
from app.schemas.disruption import (
    DisruptionCreate,
    DisruptionItem,
    DisruptionUpdate,
)

DISRUPTIONS_DATA: List[DisruptionItem] = [
    DisruptionItem(
        id="dis-cfr-ploiesti-01",
        operator="CFR S.A.",
        severity="WARNING",
        headline="Track modernization on Ploiești Vest - Câmpina",
        description="Speed restrictions in place. InterRegio services may experience 10-15 minute delays.",
        estimatedDelayMinutes=15,
        affectedLines=["IR 1745", "IR 1632", "IR 1631"],
        startsAt="2026-10-20T00:00:00Z",
        endsAt="2026-11-05T23:59:00Z"
    ),
    DisruptionItem(
        id="dis-cfr-bucuresti-02",
        operator="CFR S.A.",
        severity="INFO",
        headline="Electronic interlocking maintenance at Gara de Nord",
        description="Minor platform reassignment may occur during peak morning hours.",
        estimatedDelayMinutes=5,
        affectedLines=["IR 1572", "TFC 15021"],
        startsAt="2026-10-25T00:00:00Z",
        endsAt="2026-11-15T23:59:00Z"
    ),
    DisruptionItem(
        id="dis-metrorex-m2-03",
        operator="Metrorex S.A.",
        severity="INFO",
        headline="Turnstile firmware update at Piața Victoriei",
        description="Normal train frequencies maintained. Contactless cards recommended.",
        estimatedDelayMinutes=0,
        affectedLines=["M2"],
        startsAt="2026-10-28T04:00:00Z",
        endsAt="2026-11-02T23:00:00Z"
    ),
    DisruptionItem(
        id="dis-transurb-gl-04",
        operator="Transurb S.A. Galați",
        severity="WARNING",
        headline="Road rehabilitation on Strada Brăilei (Țiglina 1)",
        description="Buses detour via Str. Cloșca. Add 5-8 minutes buffer for transfer at Gara CFR.",
        estimatedDelayMinutes=8,
        affectedLines=["102", "105"],
        startsAt="2026-10-15T06:00:00Z",
        endsAt="2026-11-10T18:00:00Z"
    ),
]


class DisruptionService:
    @staticmethod
    def get_disruptions(
        severity: Optional[str] = None,
        operator: Optional[str] = None,
        line: Optional[str] = None
    ) -> List[DisruptionItem]:
        results = list(DISRUPTIONS_DATA)

        if severity and severity.upper() != "ALL":
            results = [d for d in results if d.severity.upper() == severity.upper()]

        if operator:
            op = operator.lower().strip()
            results = [d for d in results if op in d.operator.lower()]

        if line:
            l = line.lower().strip()
            results = [
                d for d in results
                if any(l in affected.lower() for affected in d.affectedLines)
            ]

        return results

    @staticmethod
    def get_disruption_by_id(disruption_id: str) -> Optional[DisruptionItem]:
        for d in DISRUPTIONS_DATA:
            if d.id == disruption_id:
                return d
        return None

    @staticmethod
    async def create_disruption(data: DisruptionCreate, db: Optional[AsyncSession] = None) -> DisruptionItem:
        dis_id = data.id or f"dis-{uuid.uuid4().hex[:8]}"
        for d in DISRUPTIONS_DATA:
            if d.id == dis_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Disruption with ID '{dis_id}' already exists."
                )

        if db is not None:
            res = await db.execute(select(Disruption).where(Disruption.id == dis_id))
            if res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Disruption with ID '{dis_id}' already exists."
                )
            try:
                starts_dt = datetime.fromisoformat(data.startsAt.replace("Z", "+00:00")) if data.startsAt else datetime.now(timezone.utc)
            except Exception:
                starts_dt = datetime.now(timezone.utc)
            try:
                ends_dt = datetime.fromisoformat(data.endsAt.replace("Z", "+00:00")) if data.endsAt else None
            except Exception:
                ends_dt = None

            affected_str = ",".join(data.affectedLines) if data.affectedLines else "M500"
            db_dis = Disruption(
                id=dis_id,
                title=data.headline.strip(),
                description=data.description.strip(),
                severity=data.severity,
                affected_operator=data.operator.strip(),
                affected_line=affected_str,
                delay_minutes=data.estimatedDelayMinutes,
                status="ACTIVE",
                starts_at=starts_dt,
                ends_at=ends_dt
            )
            db.add(db_dis)
            await db.commit()

        new_disruption = DisruptionItem(
            id=dis_id,
            operator=data.operator.strip(),
            severity=data.severity,
            headline=data.headline.strip(),
            description=data.description.strip(),
            estimatedDelayMinutes=data.estimatedDelayMinutes,
            affectedLines=data.affectedLines,
            startsAt=data.startsAt or datetime.now(timezone.utc).isoformat(),
            endsAt=data.endsAt
        )
        DISRUPTIONS_DATA.append(new_disruption)
        return new_disruption

    @staticmethod
    async def update_disruption(disruption_id: str, data: DisruptionUpdate, db: Optional[AsyncSession] = None) -> DisruptionItem:
        d = DisruptionService.get_disruption_by_id(disruption_id)
        if not d:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Disruption with ID '{disruption_id}' not found."
            )
        if db is not None:
            res = await db.execute(select(Disruption).where(Disruption.id == disruption_id))
            db_dis = res.scalar_one_or_none()
            if db_dis:
                if data.headline is not None:
                    db_dis.title = data.headline.strip()
                if data.description is not None:
                    db_dis.description = data.description.strip()
                if data.severity is not None:
                    db_dis.severity = data.severity
                if data.operator is not None:
                    db_dis.affected_operator = data.operator.strip()
                if data.estimatedDelayMinutes is not None:
                    db_dis.delay_minutes = data.estimatedDelayMinutes
                if data.affectedLines is not None:
                    db_dis.affected_line = ",".join(data.affectedLines)
                await db.commit()

        if data.operator is not None:
            d.operator = data.operator.strip()
        if data.severity is not None:
            d.severity = data.severity
        if data.headline is not None:
            d.headline = data.headline.strip()
        if data.description is not None:
            d.description = data.description.strip()
        if data.estimatedDelayMinutes is not None:
            d.estimatedDelayMinutes = data.estimatedDelayMinutes
        if data.affectedLines is not None:
            d.affectedLines = data.affectedLines
        if data.endsAt is not None:
            d.endsAt = data.endsAt
        return d

    @staticmethod
    async def delete_disruption(disruption_id: str, db: Optional[AsyncSession] = None) -> bool:
        d = DisruptionService.get_disruption_by_id(disruption_id)
        if not d:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Disruption with ID '{disruption_id}' not found."
            )
        if db is not None:
            res = await db.execute(select(Disruption).where(Disruption.id == disruption_id))
            db_dis = res.scalar_one_or_none()
            if db_dis:
                await db.delete(db_dis)
                await db.commit()

        DISRUPTIONS_DATA.remove(d)
        return True


disruption_service = DisruptionService()
