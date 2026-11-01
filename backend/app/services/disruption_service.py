from typing import List, Optional
from app.schemas.disruption import DisruptionItem

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


disruption_service = DisruptionService()
