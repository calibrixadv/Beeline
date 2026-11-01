from typing import List
from app.schemas.route_corridor import PopularCorridor

POPULAR_CORRIDORS: List[PopularCorridor] = [
    PopularCorridor(
        origin="Galați",
        destination="București Nord",
        label="Galați ⇄ București",
        frequency="Hourly",
        fastestDurationFormatted="3h 15m",
        minFareLei=58.00,
        primaryOperators=["CFR Călători", "Transferoviar Călători"]
    ),
    PopularCorridor(
        origin="București Nord",
        destination="Brașov",
        label="București ⇄ Brașov",
        frequency="Every 30 min",
        fastestDurationFormatted="2h 15m",
        minFareLei=42.50,
        primaryOperators=["CFR Călători", "Astra Trans Carpatic"]
    ),
    PopularCorridor(
        origin="Cluj-Napoca",
        destination="Oradea",
        label="Cluj-Napoca ⇄ Oradea",
        frequency="Every 2h",
        fastestDurationFormatted="2h 45m",
        minFareLei=36.00,
        primaryOperators=["CFR Călători", "Transferoviar Călători"]
    ),
    PopularCorridor(
        origin="Timișoara Nord",
        destination="Arad",
        label="Timișoara ⇄ Arad",
        frequency="Every 45 min",
        fastestDurationFormatted="45m",
        minFareLei=18.50,
        primaryOperators=["Regio Călători", "CFR Călători"]
    ),
    PopularCorridor(
        origin="București Nord",
        destination="Constanța",
        label="București ⇄ Constanța",
        frequency="Hourly",
        fastestDurationFormatted="2h 00m",
        minFareLei=65.00,
        primaryOperators=["CFR Călători", "Astra Trans Carpatic"]
    ),
]


class CorridorService:
    @staticmethod
    def get_popular_corridors() -> List[PopularCorridor]:
        return POPULAR_CORRIDORS


corridor_service = CorridorService()
