import json
import math
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.transit import Station, Train
from app.schemas.common import PaginationMeta
from app.schemas.train import (
    RailwayOperator,
    TrainCreate,
    TrainFare,
    TrainJourney,
    TrainStation,
    TrainStop,
    TrainUpdate,
)

OPERATORS_DATA: List[RailwayOperator] = [
    RailwayOperator(
        id="cfr-calatori",
        name="CFR Călători",
        shortName="CFR",
        country="Romania",
        website="https://www.cfrcalatori.ro",
        phone="+40219521",
        gtfsRtHealth="OPERATIONAL",
        logoUrl="https://beeline.io/assets/operators/cfr.png"
    ),
    RailwayOperator(
        id="astra-trans-carpatic",
        name="Astra Trans Carpatic",
        shortName="Astra",
        country="Romania",
        website="https://www.astratranscarpatic.ro",
        phone="+40357731222",
        gtfsRtHealth="OPERATIONAL",
        logoUrl="https://beeline.io/assets/operators/astra.png"
    ),
    RailwayOperator(
        id="transferoviar-calatori",
        name="Transferoviar Călători",
        shortName="TFC",
        country="Romania",
        website="https://transferoviarcalatori.ro",
        phone="+40264434177",
        gtfsRtHealth="OPERATIONAL",
        logoUrl="https://beeline.io/assets/operators/tfc.png"
    ),
    RailwayOperator(
        id="regio-calatori",
        name="Regio Călători",
        shortName="Regio",
        country="Romania",
        website="https://regiocalatori.ro",
        phone="+40368401010",
        gtfsRtHealth="OPERATIONAL",
        logoUrl="https://beeline.io/assets/operators/regio.png"
    ),
    RailwayOperator(
        id="interregional-calatori",
        name="Interregional Călători",
        shortName="IRC",
        country="Romania",
        website="https://interregional.ro",
        phone="+40260611222",
        gtfsRtHealth="DEGRADED",
        logoUrl="https://beeline.io/assets/operators/irc.png"
    )
]

TRAINS_DATA: List[TrainJourney] = [
    TrainJourney(
        id="tr-ir-1572-20261021",
        trainNumber="IR 1572",
        operator="CFR Călători",
        origin=TrainStation(code="GLT", name="Gara Galați", city="Galați", platform="1"),
        destination=TrainStation(code="BCT", name="Gara de Nord", city="București", platform="3"),
        departureTime="2026-10-21T07:30:00+03:00",
        arrivalTime="2026-10-21T10:45:00+03:00",
        durationMinutes=195,
        durationFormatted="3h 15m",
        status="ON_TIME",
        delayMinutes=0,
        carbonFootprintKg=14.2,
        amenities=["WIFI", "POWER_OUTLETS", "DINING_CAR", "WHEELCHAIR_ACCESSIBLE"],
        fares=[
            TrainFare(classType="STANDARD", price=62.50, currency="RON", seatsAvailable=48),
            TrainFare(classType="FIRST", price=94.00, currency="RON", seatsAvailable=12),
            TrainFare(classType="BUSINESS", price=125.00, currency="RON", seatsAvailable=4),
        ],
        stops=[
            TrainStop(
                stopNumber=1,
                station=TrainStation(code="GLT", name="Gara Galați", city="Galați"),
                scheduledDeparture="2026-10-21T07:30:00+03:00",
                platform="1"
            ),
            TrainStop(
                stopNumber=2,
                station=TrainStation(code="BRL", name="Gara Brăila", city="Brăila"),
                scheduledArrival="2026-10-21T07:55:00+03:00",
                scheduledDeparture="2026-10-21T07:58:00+03:00",
                platform="2"
            ),
            TrainStop(
                stopNumber=3,
                station=TrainStation(code="PLS", name="Ploiești Sud", city="Ploiești"),
                scheduledArrival="2026-10-21T09:55:00+03:00",
                scheduledDeparture="2026-10-21T09:58:00+03:00",
                platform="1"
            ),
            TrainStop(
                stopNumber=4,
                station=TrainStation(code="BCT", name="Gara de Nord", city="București"),
                scheduledArrival="2026-10-21T10:45:00+03:00",
                platform="3"
            )
        ]
    ),
    TrainJourney(
        id="tr-ir-1631-20261021",
        trainNumber="IR 1631",
        operator="CFR Călători",
        origin=TrainStation(code="BCT", name="Gara de Nord", city="București", platform="4"),
        destination=TrainStation(code="BSV", name="Gara Brașov", city="Brașov", platform="2"),
        departureTime="2026-10-21T09:10:00+03:00",
        arrivalTime="2026-10-21T11:40:00+03:00",
        durationMinutes=150,
        durationFormatted="2h 30m",
        status="ON_TIME",
        delayMinutes=0,
        carbonFootprintKg=9.8,
        amenities=["WIFI", "POWER_OUTLETS", "WHEELCHAIR_ACCESSIBLE"],
        fares=[
            TrainFare(classType="STANDARD", price=48.00, currency="RON", seatsAvailable=60),
            TrainFare(classType="FIRST", price=72.00, currency="RON", seatsAvailable=18),
        ],
        stops=[
            TrainStop(
                stopNumber=1,
                station=TrainStation(code="BCT", name="Gara de Nord", city="București"),
                scheduledDeparture="2026-10-21T09:10:00+03:00",
                platform="4"
            ),
            TrainStop(
                stopNumber=2,
                station=TrainStation(code="PLV", name="Ploiești Vest", city="Ploiești"),
                scheduledArrival="2026-10-21T09:45:00+03:00",
                scheduledDeparture="2026-10-21T09:47:00+03:00",
                platform="1"
            ),
            TrainStop(
                stopNumber=3,
                station=TrainStation(code="SNA", name="Gara Sinaia", city="Sinaia"),
                scheduledArrival="2026-10-21T10:35:00+03:00",
                scheduledDeparture="2026-10-21T10:37:00+03:00",
                platform="1"
            ),
            TrainStop(
                stopNumber=4,
                station=TrainStation(code="BSV", name="Gara Brașov", city="Brașov"),
                scheduledArrival="2026-10-21T11:40:00+03:00",
                platform="2"
            )
        ]
    ),
    TrainJourney(
        id="tr-ir-15531-20261021",
        trainNumber="IR 15531",
        operator="Astra Trans Carpatic",
        origin=TrainStation(code="BCT", name="Gara de Nord", city="București", platform="1"),
        destination=TrainStation(code="ARD", name="Gara Arad", city="Arad", platform="1"),
        departureTime="2026-10-21T21:40:00+03:00",
        arrivalTime="2026-10-22T08:15:00+03:00",
        durationMinutes=635,
        durationFormatted="10h 35m",
        status="ON_TIME",
        delayMinutes=0,
        carbonFootprintKg=28.5,
        amenities=["WIFI", "POWER_OUTLETS", "DINING_CAR", "QUIET_ZONE"],
        fares=[
            TrainFare(classType="STANDARD", price=115.00, currency="RON", seatsAvailable=35),
            TrainFare(classType="FIRST", price=165.00, currency="RON", seatsAvailable=10),
            TrainFare(classType="SLEEPER", price=240.00, currency="RON", seatsAvailable=6),
        ],
        stops=[
            TrainStop(
                stopNumber=1,
                station=TrainStation(code="BCT", name="Gara de Nord", city="București"),
                scheduledDeparture="2026-10-21T21:40:00+03:00",
                platform="1"
            ),
            TrainStop(
                stopNumber=2,
                station=TrainStation(code="BSV", name="Gara Brașov", city="Brașov"),
                scheduledArrival="2026-10-22T00:15:00+03:00",
                scheduledDeparture="2026-10-22T00:20:00+03:00",
                platform="2"
            ),
            TrainStop(
                stopNumber=3,
                station=TrainStation(code="ARD", name="Gara Arad", city="Arad"),
                scheduledArrival="2026-10-22T08:15:00+03:00",
                platform="1"
            )
        ]
    ),
    TrainJourney(
        id="tr-ir-1745-20261021",
        trainNumber="IR 1745",
        operator="CFR Călători",
        origin=TrainStation(code="BCT", name="Gara de Nord", city="București", platform="2"),
        destination=TrainStation(code="CJN", name="Gara Cluj-Napoca", city="Cluj-Napoca", platform="3"),
        departureTime="2026-10-21T06:00:00+03:00",
        arrivalTime="2026-10-21T15:20:00+03:00",
        durationMinutes=560,
        durationFormatted="9h 20m",
        status="DELAYED",
        delayMinutes=15,
        carbonFootprintKg=24.1,
        amenities=["POWER_OUTLETS", "WHEELCHAIR_ACCESSIBLE"],
        fares=[
            TrainFare(classType="STANDARD", price=102.00, currency="RON", seatsAvailable=24),
            TrainFare(classType="FIRST", price=148.00, currency="RON", seatsAvailable=8),
        ],
        stops=[
            TrainStop(
                stopNumber=1,
                station=TrainStation(code="BCT", name="Gara de Nord", city="București"),
                scheduledDeparture="2026-10-21T06:00:00+03:00",
                platform="2"
            ),
            TrainStop(
                stopNumber=2,
                station=TrainStation(code="PLS", name="Ploiești Sud", city="Ploiești"),
                scheduledArrival="2026-10-21T06:40:00+03:00",
                scheduledDeparture="2026-10-21T06:42:00+03:00",
                platform="1"
            ),
            TrainStop(
                stopNumber=3,
                station=TrainStation(code="BSV", name="Gara Brașov", city="Brașov"),
                scheduledArrival="2026-10-21T08:45:00+03:00",
                scheduledDeparture="2026-10-21T08:50:00+03:00",
                platform="3"
            ),
            TrainStop(
                stopNumber=4,
                station=TrainStation(code="CJN", name="Gara Cluj-Napoca", city="Cluj-Napoca"),
                scheduledArrival="2026-10-21T15:20:00+03:00",
                actualArrival="2026-10-21T15:35:00+03:00",
                platform="3"
            )
        ]
    ),
    TrainJourney(
        id="tr-tfc-15021-20261021",
        trainNumber="TFC 15021",
        operator="Transferoviar Călători",
        origin=TrainStation(code="BCT", name="Gara de Nord", city="București", platform="6"),
        destination=TrainStation(code="GLT", name="Gara Galați", city="Galați", platform="2"),
        departureTime="2026-10-21T13:45:00+03:00",
        arrivalTime="2026-10-21T17:35:00+03:00",
        durationMinutes=230,
        durationFormatted="3h 50m",
        status="ON_TIME",
        delayMinutes=0,
        carbonFootprintKg=13.9,
        amenities=["WIFI", "POWER_OUTLETS", "BIKE_STORAGE"],
        fares=[
            TrainFare(classType="STANDARD", price=54.00, currency="RON", seatsAvailable=42),
        ],
        stops=[
            TrainStop(
                stopNumber=1,
                station=TrainStation(code="BCT", name="Gara de Nord", city="București"),
                scheduledDeparture="2026-10-21T13:45:00+03:00",
                platform="6"
            ),
            TrainStop(
                stopNumber=2,
                station=TrainStation(code="GLT", name="Gara Galați", city="Galați"),
                scheduledArrival="2026-10-21T17:35:00+03:00",
                platform="2"
            )
        ]
    ),
    TrainJourney(
        id="tr-reg-16011-20261021",
        trainNumber="R 16011",
        operator="Regio Călători",
        origin=TrainStation(code="BSV", name="Gara Brașov", city="Brașov", platform="1"),
        destination=TrainStation(code="SBZ", name="Gara Sibiu", city="Sibiu", platform="2"),
        departureTime="2026-10-21T10:15:00+03:00",
        arrivalTime="2026-10-21T13:05:00+03:00",
        durationMinutes=170,
        durationFormatted="2h 50m",
        status="BOARDING",
        delayMinutes=0,
        carbonFootprintKg=7.5,
        amenities=["WHEELCHAIR_ACCESSIBLE", "BIKE_STORAGE"],
        fares=[
            TrainFare(classType="STANDARD", price=28.50, currency="RON", seatsAvailable=50),
        ],
        stops=[
            TrainStop(
                stopNumber=1,
                station=TrainStation(code="BSV", name="Gara Brașov", city="Brașov"),
                scheduledDeparture="2026-10-21T10:15:00+03:00",
                platform="1"
            ),
            TrainStop(
                stopNumber=2,
                station=TrainStation(code="SBZ", name="Gara Sibiu", city="Sibiu"),
                scheduledArrival="2026-10-21T13:05:00+03:00",
                platform="2"
            )
        ]
    ),
]


class TrainService:
    @staticmethod
    def get_trains(
        search_query: Optional[str] = None,
        status_filter: Optional[str] = None,
        operator_filter: Optional[str] = None,
        origin_code: Optional[str] = None,
        destination_code: Optional[str] = None,
        travel_date: Optional[str] = None,
        max_price: Optional[float] = None,
        sort_by: str = "departure",
        sort_order: str = "asc",
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[TrainJourney], PaginationMeta]:
        results = list(TRAINS_DATA)

        # Filters
        if search_query:
            q = search_query.lower().strip()
            results = [
                t for t in results
                if q in t.trainNumber.lower()
                or q in t.origin.name.lower()
                or q in t.origin.city.lower()
                or q in t.destination.name.lower()
                or q in t.destination.city.lower()
                or q in t.operator.lower()
            ]

        if status_filter and status_filter.upper() != "ALL":
            results = [t for t in results if t.status.upper() == status_filter.upper()]

        if operator_filter and operator_filter.upper() != "ALL":
            op = operator_filter.lower().strip()
            results = [t for t in results if op in t.operator.lower()]

        if origin_code:
            oc = origin_code.upper().strip()
            results = [t for t in results if t.origin.code.upper() == oc]

        if destination_code:
            dc = destination_code.upper().strip()
            results = [t for t in results if t.destination.code.upper() == dc]

        if travel_date:
            results = [t for t in results if t.departureTime.startswith(travel_date)]

        if max_price is not None and max_price > 0:
            results = [
                t for t in results
                if any(f.price <= max_price for f in t.fares)
            ]

        # Sorting
        reverse = (sort_order.lower() == "desc")
        if sort_by == "departure":
            results.sort(key=lambda t: t.departureTime, reverse=reverse)
        elif sort_by == "price":
            results.sort(key=lambda t: min(f.price for f in t.fares), reverse=reverse)
        elif sort_by == "duration":
            results.sort(key=lambda t: t.durationMinutes, reverse=reverse)

        # Pagination
        total_items = len(results)
        page = max(1, page)
        page_size = max(1, min(100, page_size))
        total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = results[start_idx:end_idx]

        meta = PaginationMeta(
            page=page,
            pageSize=page_size,
            totalItems=total_items,
            totalPages=total_pages,
            hasNext=(page < total_pages),
            hasPrev=(page > 1)
        )

        return paginated_items, meta

    @staticmethod
    def get_train_by_id(train_id: str) -> Optional[TrainJourney]:
        for t in TRAINS_DATA:
            if t.id == train_id:
                return t
        return None

    @staticmethod
    def list_operators() -> List[RailwayOperator]:
        return OPERATORS_DATA

    @staticmethod
    async def create_train(data: TrainCreate, db: Optional[AsyncSession] = None) -> TrainJourney:
        train_id = data.id or f"trn-{data.trainNumber.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}"
        for t in TRAINS_DATA:
            if t.id == train_id or t.trainNumber.upper() == data.trainNumber.strip().upper():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Train journey with number '{data.trainNumber}' or ID '{train_id}' already exists."
                )

        if db is not None:
            res = await db.execute(select(Train).where(or_(Train.id == train_id, Train.train_number == data.trainNumber.strip())))
            if res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Train journey with number '{data.trainNumber}' or ID '{train_id}' already exists."
                )

            # Ensure origin and destination stations exist in db for FK constraints
            for st_info in [data.origin, data.destination]:
                st_res = await db.execute(select(Station).where(Station.code == st_info.code.upper()))
                if not st_res.scalar_one_or_none():
                    db.add(Station(
                        code=st_info.code.upper(),
                        name=st_info.name,
                        city=st_info.city,
                        latitude=44.44,
                        longitude=26.07,
                        modes='["TRAIN"]',
                        is_active=True
                    ))
                    await db.flush()

            try:
                dep_dt = datetime.fromisoformat(data.departureTime.replace("Z", "+00:00"))
            except Exception:
                dep_dt = datetime.now(timezone.utc)
            try:
                arr_dt = datetime.fromisoformat(data.arrivalTime.replace("Z", "+00:00"))
            except Exception:
                arr_dt = datetime.now(timezone.utc)

            base_price = min(f.price for f in data.fares) if data.fares else 50.0
            avail_seats = max(f.seatsAvailable for f in data.fares) if data.fares else 100
            amenities_json = json.dumps(data.amenities or ["WIFI", "POWER_OUTLETS"])

            db_train = Train(
                id=train_id,
                train_number=data.trainNumber.strip(),
                operator_name=data.operator.strip(),
                operator_code=data.operator.strip()[:16],
                origin_code=data.origin.code.upper(),
                destination_code=data.destination.code.upper(),
                departure_time=dep_dt,
                arrival_time=arr_dt,
                duration_minutes=data.durationMinutes,
                status=data.status,
                delay_minutes=data.delayMinutes,
                base_price_lei=base_price,
                available_seats=avail_seats,
                amenities=amenities_json
            )
            db.add(db_train)
            await db.commit()

        # Formatted duration
        dur_h = data.durationMinutes // 60
        dur_m = data.durationMinutes % 60
        duration_fmt = data.durationFormatted or (f"{dur_h}h {dur_m}m" if dur_h > 0 else f"{dur_m}m")

        fares = data.fares or [
            TrainFare(classType="STANDARD", price=55.0, currency="RON", seatsAvailable=95),
            TrainFare(classType="FIRST", price=95.0, currency="RON", seatsAvailable=28)
        ]
        stops = data.stops or [
            TrainStop(stopNumber=1, station=data.origin, scheduledDeparture=data.departureTime),
            TrainStop(stopNumber=2, station=data.destination, scheduledArrival=data.arrivalTime)
        ]
        amenities = data.amenities or ["WIFI", "POWER_OUTLETS"]

        new_train = TrainJourney(
            id=train_id,
            trainNumber=data.trainNumber.strip(),
            operator=data.operator.strip(),
            origin=data.origin,
            destination=data.destination,
            departureTime=data.departureTime,
            arrivalTime=data.arrivalTime,
            durationMinutes=data.durationMinutes,
            durationFormatted=duration_fmt,
            status=data.status,
            delayMinutes=data.delayMinutes,
            fares=fares,
            stops=stops,
            amenities=amenities,
            carbonFootprintKg=data.carbonFootprintKg or 12.5
        )
        TRAINS_DATA.append(new_train)
        return new_train

    @staticmethod
    async def update_train(train_id: str, data: TrainUpdate, db: Optional[AsyncSession] = None) -> TrainJourney:
        train = TrainService.get_train_by_id(train_id)
        if not train:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Train journey with ID '{train_id}' not found."
            )
        if db is not None:
            res = await db.execute(select(Train).where(Train.id == train_id))
            db_tr = res.scalar_one_or_none()
            if db_tr:
                if data.operator is not None:
                    db_tr.operator_name = data.operator.strip()
                if data.status is not None:
                    db_tr.status = data.status
                if data.delayMinutes is not None:
                    db_tr.delay_minutes = data.delayMinutes
                if data.amenities is not None:
                    db_tr.amenities = json.dumps(data.amenities)
                if data.fares is not None and data.fares:
                    db_tr.base_price_lei = min(f.price for f in data.fares)
                    db_tr.available_seats = max(f.seatsAvailable for f in data.fares)
                await db.commit()

        if data.operator is not None:
            train.operator = data.operator.strip()
        if data.status is not None:
            train.status = data.status
        if data.delayMinutes is not None:
            train.delayMinutes = data.delayMinutes
        if data.amenities is not None:
            train.amenities = data.amenities
        if data.fares is not None:
            train.fares = data.fares
        if data.carbonFootprintKg is not None:
            train.carbonFootprintKg = data.carbonFootprintKg
        return train

    @staticmethod
    async def delete_train(train_id: str, db: Optional[AsyncSession] = None) -> bool:
        train = TrainService.get_train_by_id(train_id)
        if not train:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Train journey with ID '{train_id}' not found."
            )
        if db is not None:
            res = await db.execute(select(Train).where(Train.id == train_id))
            db_tr = res.scalar_one_or_none()
            if db_tr:
                await db.delete(db_tr)
                await db.commit()

        TRAINS_DATA.remove(train)
        return True


train_service = TrainService()
