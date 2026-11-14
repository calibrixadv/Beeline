import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.transit import Station, Train
from app.schemas.route_plan import GeoPoint, TransitMode
from app.schemas.station import (
    StationBoardItem,
    StationBoardResponse,
    StationSearchResult,
    StationCreate,
    StationUpdate,
)
from app.services.train_service import TRAINS_DATA

STATIONS_DATA: List[StationSearchResult] = [
    StationSearchResult(
        code="BCT",
        name="București Nord",
        city="București",
        modes=[TransitMode.TRAIN, TransitMode.METRO, TransitMode.BUS],
        coordinates=GeoPoint(latitude=44.4473, longitude=26.0746, city="București")
    ),
    StationSearchResult(
        code="BCO",
        name="București Basarab",
        city="București",
        modes=[TransitMode.TRAIN, TransitMode.METRO],
        coordinates=GeoPoint(latitude=44.4491, longitude=26.0682, city="București")
    ),
    StationSearchResult(
        code="BCOB",
        name="București Obor",
        city="București",
        modes=[TransitMode.TRAIN, TransitMode.TRAM, TransitMode.BUS],
        coordinates=GeoPoint(latitude=44.4485, longitude=26.1362, city="București")
    ),
    StationSearchResult(
        code="GLT",
        name="Gara Galați",
        city="Galați",
        modes=[TransitMode.TRAIN, TransitMode.TRAM, TransitMode.BUS],
        coordinates=GeoPoint(latitude=45.4382, longitude=28.0561, city="Galați")
    ),
    StationSearchResult(
        code="BRL",
        name="Gara Brăila",
        city="Brăila",
        modes=[TransitMode.TRAIN, TransitMode.TRAM, TransitMode.BUS],
        coordinates=GeoPoint(latitude=45.2751, longitude=27.9554, city="Brăila")
    ),
    StationSearchResult(
        code="BSV",
        name="Gara Brașov",
        city="Brașov",
        modes=[TransitMode.TRAIN, TransitMode.BUS],
        coordinates=GeoPoint(latitude=45.6608, longitude=25.6144, city="Brașov")
    ),
    StationSearchResult(
        code="CJN",
        name="Gara Cluj-Napoca",
        city="Cluj-Napoca",
        modes=[TransitMode.TRAIN, TransitMode.TRAM, TransitMode.BUS],
        coordinates=GeoPoint(latitude=46.7842, longitude=23.5872, city="Cluj-Napoca")
    ),
    StationSearchResult(
        code="TIM",
        name="Gara Timișoara Nord",
        city="Timișoara",
        modes=[TransitMode.TRAIN, TransitMode.TRAM, TransitMode.BUS],
        coordinates=GeoPoint(latitude=45.7511, longitude=21.2084, city="Timișoara")
    ),
    StationSearchResult(
        code="IAS",
        name="Gara Iași",
        city="Iași",
        modes=[TransitMode.TRAIN, TransitMode.TRAM, TransitMode.BUS],
        coordinates=GeoPoint(latitude=47.1685, longitude=27.5701, city="Iași")
    ),
    StationSearchResult(
        code="CTA",
        name="Gara Constanța",
        city="Constanța",
        modes=[TransitMode.TRAIN, TransitMode.BUS],
        coordinates=GeoPoint(latitude=44.1704, longitude=28.6302, city="Constanța")
    ),
    StationSearchResult(
        code="PLS",
        name="Ploiești Sud",
        city="Ploiești",
        modes=[TransitMode.TRAIN, TransitMode.BUS],
        coordinates=GeoPoint(latitude=44.9272, longitude=26.0354, city="Ploiești")
    ),
    StationSearchResult(
        code="PLV",
        name="Ploiești Vest",
        city="Ploiești",
        modes=[TransitMode.TRAIN, TransitMode.BUS],
        coordinates=GeoPoint(latitude=44.9331, longitude=25.9992, city="Ploiești")
    ),
    StationSearchResult(
        code="ARD",
        name="Gara Arad",
        city="Arad",
        modes=[TransitMode.TRAIN, TransitMode.TRAM, TransitMode.BUS],
        coordinates=GeoPoint(latitude=46.1883, longitude=21.3235, city="Arad")
    ),
    StationSearchResult(
        code="SNA",
        name="Gara Sinaia",
        city="Sinaia",
        modes=[TransitMode.TRAIN, TransitMode.BUS],
        coordinates=GeoPoint(latitude=45.3533, longitude=25.5539, city="Sinaia")
    ),
    StationSearchResult(
        code="SBZ",
        name="Gara Sibiu",
        city="Sibiu",
        modes=[TransitMode.TRAIN, TransitMode.BUS],
        coordinates=GeoPoint(latitude=45.7981, longitude=24.1601, city="Sibiu")
    ),
]


class StationService:
    @staticmethod
    def search_stations(query: str, limit: int = 10, city: Optional[str] = None) -> List[StationSearchResult]:
        if not query or len(query.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query must contain at least 2 characters."
            )

        q = query.lower().strip()
        results = []
        for s in STATIONS_DATA:
            if city and city.lower().strip() not in s.city.lower():
                continue
            if q in s.name.lower() or q in s.code.lower() or q in s.city.lower():
                results.append(s)

        limit = max(1, min(50, limit))
        return results[:limit]

    @staticmethod
    def get_station_by_code(code: str) -> Optional[StationSearchResult]:
        for s in STATIONS_DATA:
            if s.code.upper() == code.upper():
                return s
        return None

    @staticmethod
    def get_station_board(
        station_code: str,
        board_type: str = "DEPARTURES",
        window_hours: int = 2
    ) -> StationBoardResponse:
        st = StationService.get_station_by_code(station_code)
        if not st:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Station with code '{station_code}' not found."
            )

        b_type = board_type.upper()
        if b_type not in ["DEPARTURES", "ARRIVALS"]:
            b_type = "DEPARTURES"

        window_hours = max(1, min(24, window_hours))
        board_items: List[StationBoardItem] = []

        for train in TRAINS_DATA:
            # Check if this station is origin, destination, or in intermediate stops
            is_origin = (train.origin.code.upper() == station_code.upper())
            is_dest = (train.destination.code.upper() == station_code.upper())

            # Find stop matching station_code
            matching_stop = None
            for s in train.stops:
                if s.station.code.upper() == station_code.upper():
                    matching_stop = s
                    break

            if b_type == "DEPARTURES":
                if is_origin:
                    time_str = train.departureTime.split("T")[-1][:5]
                    platform = train.origin.platform or "Linia 1"
                    board_items.append(
                        StationBoardItem(
                            trainNumber=train.trainNumber,
                            operator=train.operator,
                            destination=train.destination.name,
                            origin=train.origin.name,
                            scheduledTime=time_str,
                            expectedTime=time_str,
                            delayMinutes=train.delayMinutes,
                            platform=platform,
                            status=train.status
                        )
                    )
                elif matching_stop and matching_stop.scheduledDeparture and not is_dest:
                    time_str = matching_stop.scheduledDeparture.split("T")[-1][:5]
                    platform = matching_stop.platform or "Linia 1"
                    board_items.append(
                        StationBoardItem(
                            trainNumber=train.trainNumber,
                            operator=train.operator,
                            destination=train.destination.name,
                            origin=train.origin.name,
                            scheduledTime=time_str,
                            expectedTime=time_str,
                            delayMinutes=train.delayMinutes,
                            platform=platform,
                            status=train.status
                        )
                    )
            else:  # ARRIVALS
                if is_dest:
                    time_str = train.arrivalTime.split("T")[-1][:5]
                    platform = train.destination.platform or "Linia 1"
                    board_items.append(
                        StationBoardItem(
                            trainNumber=train.trainNumber,
                            operator=train.operator,
                            destination=train.destination.name,
                            origin=train.origin.name,
                            scheduledTime=time_str,
                            expectedTime=time_str,
                            delayMinutes=train.delayMinutes,
                            platform=platform,
                            status=train.status
                        )
                    )
                elif matching_stop and matching_stop.scheduledArrival and not is_origin:
                    time_str = matching_stop.scheduledArrival.split("T")[-1][:5]
                    platform = matching_stop.platform or "Linia 1"
                    board_items.append(
                        StationBoardItem(
                            trainNumber=train.trainNumber,
                            operator=train.operator,
                            destination=train.destination.name,
                            origin=train.origin.name,
                            scheduledTime=time_str,
                            expectedTime=time_str,
                            delayMinutes=train.delayMinutes,
                            platform=platform,
                            status=train.status
                        )
                    )

        # Sort items by scheduled time
        board_items.sort(key=lambda x: x.scheduledTime)

        return StationBoardResponse(
            station=st,
            boardType=b_type,  # type: ignore
            windowHours=window_hours,
            generatedAt=datetime.now(timezone.utc).isoformat(),
            items=board_items
        )

    def list_all_stations(
        self,
        city: Optional[str] = None,
        mode: Optional[TransitMode] = None,
        limit: Optional[int] = None
    ) -> List[StationSearchResult]:
        results = STATIONS_DATA
        if city:
            results = [s for s in results if s.city.lower() == city.lower()]
        if mode:
            results = [s for s in results if mode in s.modes]
        if limit and limit > 0:
            results = results[:limit]
        return results

    @staticmethod
    def get_station_by_code(station_code: str) -> Optional[StationSearchResult]:
        for s in STATIONS_DATA:
            if s.code.upper() == station_code.upper():
                return s
        return None

    async def create_station(self, data: StationCreate, db: Optional[AsyncSession] = None) -> StationSearchResult:
        code_upper = data.code.strip().upper()
        existing = self.get_station_by_code(code_upper)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Station with code '{code_upper}' already exists."
            )
        if db is not None:
            res = await db.execute(select(Station).where(Station.code == code_upper))
            if res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Station with code '{code_upper}' already exists."
                )
            modes_json = json.dumps([m.value if hasattr(m, "value") else str(m) for m in data.modes])
            db_station = Station(
                code=code_upper,
                name=data.name.strip(),
                city=data.city.strip(),
                latitude=data.coordinates.latitude,
                longitude=data.coordinates.longitude,
                modes=modes_json,
                is_active=True
            )
            db.add(db_station)
            await db.commit()

        new_station = StationSearchResult(
            code=code_upper,
            name=data.name.strip(),
            city=data.city.strip(),
            modes=data.modes,
            coordinates=data.coordinates
        )
        STATIONS_DATA.append(new_station)
        return new_station

    async def update_station(self, station_code: str, data: StationUpdate, db: Optional[AsyncSession] = None) -> StationSearchResult:
        code_upper = station_code.strip().upper()
        st = self.get_station_by_code(code_upper)
        if not st:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Station with code '{station_code}' not found."
            )
        if db is not None:
            res = await db.execute(select(Station).where(Station.code == code_upper))
            db_st = res.scalar_one_or_none()
            if db_st:
                if data.name is not None:
                    db_st.name = data.name.strip()
                if data.city is not None:
                    db_st.city = data.city.strip()
                if data.coordinates is not None:
                    db_st.latitude = data.coordinates.latitude
                    db_st.longitude = data.coordinates.longitude
                if data.modes is not None:
                    db_st.modes = json.dumps([m.value if hasattr(m, "value") else str(m) for m in data.modes])
                await db.commit()

        if data.name is not None:
            st.name = data.name.strip()
        if data.city is not None:
            st.city = data.city.strip()
        if data.modes is not None:
            st.modes = data.modes
        if data.coordinates is not None:
            st.coordinates = data.coordinates
        return st

    async def delete_station(self, station_code: str, db: Optional[AsyncSession] = None) -> bool:
        code_upper = station_code.strip().upper()
        st = self.get_station_by_code(code_upper)
        if not st:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Station with code '{station_code}' not found."
            )
        # Foreign Key check: ensure no active trains refer to this station
        for tr in TRAINS_DATA:
            if tr.origin.code.upper() == code_upper or tr.destination.code.upper() == code_upper:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot delete station '{st.code}': referenced by active train journey '{tr.trainNumber}' (Foreign Key constraint)."
                )
        if db is not None:
            res_tr = await db.execute(
                select(Train).where(or_(Train.origin_code == code_upper, Train.destination_code == code_upper))
            )
            conflict_tr = res_tr.scalars().first()
            if conflict_tr:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot delete station '{st.code}': referenced by active train journey '{conflict_tr.train_number}' (Foreign Key constraint)."
                )
            res_st = await db.execute(select(Station).where(Station.code == code_upper))
            db_st = res_st.scalar_one_or_none()
            if db_st:
                await db.delete(db_st)
                await db.commit()

        STATIONS_DATA.remove(st)
        return True


station_service = StationService()
