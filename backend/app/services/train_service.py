import json
import math
import re
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.transit import Station, Train
from app.schemas.common import PaginationMeta
from app.schemas.train import (
    OperatorsSummaryResponse,
    RailwayOperator,
    TrainCreate,
    TrainFare,
    TrainJourney,
    TrainStation,
    TrainStop,
    TrainUpdate,
)
from app.schemas.route_plan import BookingWindowInfo, TrainItineraryResponse
from app.services.timetable_sync_service import timetable_sync_service
from scraper.collectors.train_api import (
    InfoFerLiveAdapter,
    STATION_DICTIONARY,
    canonical_train_category,
    normalize_train_number,
    resolve_known_station,
    normalize_text,
    to_bucharest_iso,
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
    ),
    RailwayOperator(
        id="ferotrafic-tfi",
        name="Ferotrafic TFI",
        shortName="Ferotrafic",
        country="Romania",
        website="https://ferotrafic.ro",
        phone="+40232252525",
        gtfsRtHealth="OPERATIONAL",
        logoUrl="https://beeline.io/assets/operators/ferotrafic.png"
    ),
    RailwayOperator(
        id="softrans",
        name="Softrans",
        shortName="Softrans",
        country="Romania",
        website="https://softrans.ro",
        phone="+40251414000",
        gtfsRtHealth="OPERATIONAL",
        logoUrl="https://beeline.io/assets/operators/softrans.png"
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


def normalize_code_str(val: str) -> str:
    """Collapses whitespace and uppercases string."""
    if not val:
        return ""
    return re.sub(r"\s+", " ", str(val).strip().upper())


def compact_code_str(val: str) -> str:
    """Removes all whitespace and non-alphanumeric chars, uppercased."""
    if not val:
        return ""
    return re.sub(r"[^A-Z0-9]", "", str(val).strip().upper())


def matches_train_code(train_number: str, query: str) -> bool:
    """Robust train code matcher supporting:
    - full codes: 'IC 535', 'ic535', 'IC535'
    - prefix / category queries: 'IC', 'IR', 'RE', 'R'
    - train number digits: '535', '1572'
    """
    if not query or not query.strip():
        return True

    clean_q = normalize_code_str(query)
    compact_q = compact_code_str(clean_q)

    clean_t = normalize_code_str(train_number)
    compact_t = compact_code_str(clean_t)

    # Exact or compact code match: 'IC 535' == 'IC 535', 'IC535' == 'IC535'
    if clean_q == clean_t or compact_q == compact_t:
        return True

    # Category / prefix matching: 'IC' matches 'IC 535', 'IC 11785'
    t_parts = clean_t.split(" ", 1)
    t_category = t_parts[0] if len(t_parts) > 0 else ""
    t_digits = t_parts[1] if len(t_parts) > 1 else ""

    if clean_q in {"IC", "IR", "RE", "R"}:
        return t_category == clean_q

    # Pure digits: '535' matches 'IC 535'
    if clean_q.isdigit():
        return clean_q == t_digits or clean_q in t_digits

    # Check if compact query expands to 'CAT NUMBER' e.g. 'IC535' -> 'IC 535'
    match = re.match(r"^([A-Z]+)(\d+)$", compact_q)
    if match:
        expanded_q = f"{match.group(1)} {match.group(2)}"
        if expanded_q == clean_t:
            return True

    if compact_q in compact_t:
        return True

    return False


def _scrape_record_to_train_journey(
    rec: Any,
    travel_date: str,
    route_info: Optional[Dict[str, Any]] = None
) -> TrainJourney:
    t_num = rec.train_number
    raw_stops = getattr(rec, "route_stops", None) or (route_info.get("stops") if route_info else None)
    duration_min = max(10, int(round(rec.source_train_api.scheduled_duration_minutes)))

    dep_sec = getattr(rec, "departure_seconds", None)
    if dep_sec is None:
        if raw_stops and len(raw_stops) > 0 and raw_stops[0].get("dep_sec") is not None:
            dep_sec = int(raw_stops[0]["dep_sec"])
        else:
            dep_sec = 0

    arr_sec = getattr(rec, "arrival_seconds", None)
    if arr_sec is None:
        if raw_stops and len(raw_stops) > 0 and raw_stops[-1].get("arr_sec") is not None:
            arr_sec = int(raw_stops[-1]["arr_sec"])
        else:
            arr_sec = dep_sec + duration_min * 60

    tz_bucharest = ZoneInfo("Europe/Bucharest")
    base_d = datetime.strptime(travel_date, "%Y-%m-%d").date()
    dt_ref = datetime(base_d.year, base_d.month, base_d.day, tzinfo=tz_bucharest)
    tz_offset_str = dt_ref.strftime("%z")
    tz_offset = f"{tz_offset_str[:3]}:{tz_offset_str[3:]}" if len(tz_offset_str) == 5 else "+02:00"

    dep_hh = dep_sec // 3600
    dep_mm = (dep_sec % 3600) // 60
    computed_dep_iso = f"{travel_date}T{dep_hh:02d}:{dep_mm:02d}:00{tz_offset}"
    raw_dep_iso = getattr(rec, "departure_iso", None)
    dep_time_iso = to_bucharest_iso(raw_dep_iso, travel_date) if raw_dep_iso else computed_dep_iso

    arr_day_offset = arr_sec // 86400
    arr_rem_sec = arr_sec % 86400
    arr_hh = arr_rem_sec // 3600
    arr_mm = (arr_rem_sec % 3600) // 60
    if arr_day_offset > 0:
        arr_date = (base_d + timedelta(days=arr_day_offset)).isoformat()
    else:
        arr_date = travel_date
    computed_arr_iso = f"{arr_date}T{arr_hh:02d}:{arr_mm:02d}:00{tz_offset}"
    raw_arr_iso = getattr(rec, "arrival_iso", None)
    arr_time_iso = to_bucharest_iso(raw_arr_iso, travel_date) if raw_arr_iso else computed_arr_iso

    full_op = getattr(rec, "full_operator", None) or (route_info.get("full_operator") if route_info else None)
    if not full_op:
        op_map = {
            "CFR": "CFR Călători",
            "ASTRA": "Astra Trans Carpatic",
            "TFC": "Transferoviar Călători",
            "SOFTRANS": "Softrans",
            "REGIO": "Regio Călători",
        }
        full_op = op_map.get(rec.operator, "CFR Călători")

    orig_c = rec.source_train_api.origin_station_code
    dest_c = rec.source_train_api.destination_station_code
    orig_name = (route_info.get("full_train_origin") if route_info else None) or STATION_DICTIONARY.get(orig_c, {}).get("name", orig_c)
    dest_name = (route_info.get("full_train_destination") if route_info else None) or STATION_DICTIONARY.get(dest_c, {}).get("name", dest_c)

    dist = rec.source_train_api.distance_km
    cat = rec.source_train_api.train_category
    if cat == 3:  # IC
        p_std = round(18.0 + dist * 0.38, 2)
    elif cat == 2:  # IR
        p_std = round(12.0 + dist * 0.30, 2)
    elif cat == 1:  # RE
        p_std = round(7.0 + dist * 0.25, 2)
    else:  # R
        p_std = round(5.0 + dist * 0.20, 2)
    p_1st = round(p_std * 1.5, 2)

    fares = [
        TrainFare(classType="STANDARD", price=p_std, currency="RON", seatsAvailable=48),
        TrainFare(classType="FIRST", price=p_1st, currency="RON", seatsAvailable=12),
    ]
    if cat >= 2:
        fares.append(TrainFare(classType="BUSINESS", price=round(p_std * 2.0, 2), currency="RON", seatsAvailable=4))

    amenities = ["POWER_OUTLETS", "WHEELCHAIR_ACCESSIBLE"]
    if cat >= 2:
        amenities.append("WIFI")
    if cat == 3 or "astra" in full_op.lower() or "softrans" in full_op.lower():
        amenities.append("DINING_CAR")

    stops_data = []
    if raw_stops:
        for idx, s in enumerate(raw_stops):
            s_dep_sec = s.get("dep_sec", 0)
            s_arr_sec = s.get("arr_sec", s_dep_sec)

            dep_day_off = s_dep_sec // 86400
            dep_rem = s_dep_sec % 86400
            s_dep_date = (base_d + timedelta(days=dep_day_off)).isoformat()
            fallback_dep_iso = f"{s_dep_date}T{(dep_rem // 3600):02d}:{((dep_rem % 3600) // 60):02d}:00{tz_offset}"

            arr_day_off = s_arr_sec // 86400
            arr_rem = s_arr_sec % 86400
            s_arr_date = (base_d + timedelta(days=arr_day_off)).isoformat()
            fallback_arr_iso = f"{s_arr_date}T{(arr_rem // 3600):02d}:{((arr_rem % 3600) // 60):02d}:00{tz_offset}"

            raw_dep = s.get("dep_iso") or (fallback_dep_iso if s.get("departure_time") != "--:--" else None)
            raw_arr = s.get("arr_iso") or (fallback_arr_iso if s.get("arrival_time") != "--:--" else None)

            s_dep_iso = to_bucharest_iso(raw_dep, travel_date)
            s_arr_iso = to_bucharest_iso(raw_arr, travel_date)

            stops_data.append(TrainStop(
                stopNumber=idx + 1,
                station=TrainStation(code=s["code"], name=s["name"], city=s["name"]),
                scheduledArrival=s_arr_iso,
                scheduledDeparture=s_dep_iso,
                platform=str((idx % 4) + 1)
            ))
    else:
        stops_data = [
            TrainStop(
                stopNumber=1,
                station=TrainStation(code=orig_c, name=orig_name, city=orig_name),
                scheduledDeparture=dep_time_iso,
                platform="1"
            ),
            TrainStop(
                stopNumber=2,
                station=TrainStation(code=dest_c, name=dest_name, city=dest_name),
                scheduledArrival=arr_time_iso,
                platform="2"
            )
        ]

    delay = int(round(rec.target_labels.actual_delay_minutes)) if hasattr(rec, "target_labels") and rec.target_labels else 0
    status_str = "DELAYED" if delay > 5 else "ON_TIME"

    clean_num = t_num.lower().replace(" ", "-")
    d_clean = travel_date.replace("-", "")
    journey_id = f"tr-{clean_num}-{d_clean}"

    return TrainJourney(
        id=journey_id,
        trainNumber=t_num,
        operator=full_op,
        origin=TrainStation(code=orig_c, name=orig_name, city=orig_name, platform="1"),
        destination=TrainStation(code=dest_c, name=dest_name, city=dest_name, platform="2"),
        departureTime=dep_time_iso,
        arrivalTime=arr_time_iso,
        durationMinutes=duration_min,
        durationFormatted=f"{duration_min // 60}h {duration_min % 60}m",
        status=status_str,
        delayMinutes=delay,
        carbonFootprintKg=round(dist * 0.035, 1),
        amenities=amenities,
        fares=fares,
        stops=stops_data
    )


class TrainService:
    @classmethod
    def _itinerary_to_train_journey(cls, itin: TrainItineraryResponse, travel_date: str) -> TrainJourney:
        stops = itin.stops
        first_st_code = stops[0].stationCode if stops else "GLT"
        first_st_name = stops[0].stationName if stops else (itin.fullTrainOrigin or "Galați")
        first_st_city = stops[0].city if stops else first_st_name
        last_st_code = stops[-1].stationCode if stops else "BCT"
        last_st_name = stops[-1].stationName if stops else (itin.fullTrainDestination or "București Nord")
        last_st_city = stops[-1].city if stops else last_st_name

        first_st = TrainStation(code=first_st_code, name=first_st_name, city=first_st_city)
        last_st = TrainStation(code=last_st_code, name=last_st_name, city=last_st_city)

        dep_iso = None
        for s in stops:
            if s.departureTime:
                dep_iso = to_bucharest_iso(s.departureTime, travel_date)
                break
        if not dep_iso:
            dep_iso = to_bucharest_iso(stops[0].arrivalTime, travel_date) if stops else f"{travel_date}T08:00:00+02:00"

        arr_iso = None
        for s in reversed(stops):
            if s.arrivalTime:
                arr_iso = to_bucharest_iso(s.arrivalTime, travel_date)
                break
        if not arr_iso:
            arr_iso = to_bucharest_iso(stops[-1].departureTime, travel_date) if stops else f"{travel_date}T12:00:00+02:00"

        stops_data = [
            TrainStop(
                stopNumber=s.stopSequence,
                station=TrainStation(code=s.stationCode, name=s.stationName, city=s.city or s.stationName),
                scheduledArrival=to_bucharest_iso(s.arrivalTime, travel_date),
                scheduledDeparture=to_bucharest_iso(s.departureTime, travel_date),
                platform=s.platform,
            )
            for s in stops
        ]

        cat = 3 if "IC" in itin.trainNumber else (2 if "IR" in itin.trainNumber else 1)
        amenities = ["POWER_OUTLETS", "WHEELCHAIR_ACCESSIBLE"]
        if cat >= 2:
            amenities.append("WIFI")
        if cat == 3 or "astra" in itin.operator.lower() or "softrans" in itin.operator.lower():
            amenities.append("DINING_CAR")

        fares = [
            TrainFare(classType="STANDARD", price=round(7.0 + itin.totalDistanceKm * 0.25, 2), currency="RON", seatsAvailable=40),
            TrainFare(classType="FIRST", price=round((7.0 + itin.totalDistanceKm * 0.25) * 1.5, 2), currency="RON", seatsAvailable=12),
        ]
        if cat >= 2:
            fares.append(TrainFare(classType="BUSINESS", price=round((7.0 + itin.totalDistanceKm * 0.25) * 2.0, 2), currency="RON", seatsAvailable=4))

        dur = itin.totalDurationMinutes
        dur_fmt = f"{dur // 60}h {dur % 60:02d}m" if dur >= 60 else f"{dur}m"

        norm_digits = re.sub(r"[^a-zA-Z0-9]", "-", itin.trainNumber.lower())
        j_id = f"trn-{norm_digits}-{travel_date.replace('-', '')}"

        return TrainJourney(
            id=j_id,
            trainNumber=itin.trainNumber,
            operator=itin.operator,
            origin=TrainStation(code=first_st.code, name=first_st.name, city=first_st.city or first_st.name, platform="1"),
            destination=TrainStation(code=last_st.code, name=last_st.name, city=last_st.city or last_st.name, platform="1"),
            departureTime=dep_iso,
            arrivalTime=arr_iso,
            durationMinutes=dur,
            durationFormatted=dur_fmt,
            status="ON_TIME",
            delayMinutes=0,
            carbonFootprintKg=round(itin.totalDistanceKm * 0.035, 1),
            amenities=amenities,
            fares=fares,
            stops=stops_data,
        )

    @classmethod
    def get_trains(
        cls,
        search_query: Optional[str] = None,
        status_filter: Optional[str] = None,
        operator_filter: Optional[str] = None,
        origin_code: Optional[str] = None,
        destination_code: Optional[str] = None,
        origin: Optional[str] = None,
        destination: Optional[str] = None,
        travel_date: Optional[str] = None,
        max_price: Optional[float] = None,
        sort_by: str = "departure",
        sort_order: str = "asc",
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[TrainJourney], PaginationMeta]:
        # 1. Booking window validation if travel_date specified
        bw = timetable_sync_service.get_booking_window()
        min_date = bw["minDate"]
        max_date = bw["maxDate"]

        if travel_date:
            if travel_date < min_date:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Cannot plan or book a trip in the past. Please choose a date from today onward."
                )
            if travel_date > max_date:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Travel date '{travel_date}' is outside the booking window ({min_date} to {max_date}). Please choose a date within 90 days."
                )
            effective_date = travel_date
        else:
            effective_date = min_date

        infofer_adapter = InfoFerLiveAdapter.get_shared_instance()
        effective_orig = origin or origin_code
        effective_dest = destination or destination_code

        # Check if search_query represents a corridor e.g. "Galați -> București Nord" or "GLT - BCT"
        if not (effective_orig and effective_dest) and search_query:
            corr_m = re.search(r"([A-Za-zȘșȚțĂăÎîÂâ0-9\s-]+?)\s*(?:➔|->|–|-)\s*([A-Za-zȘșȚțĂăÎîÂâ0-9\s-]+)", search_query)
            if corr_m:
                cand_orig = corr_m.group(1).strip()
                cand_dest = corr_m.group(2).strip()
                if resolve_known_station(cand_orig) and resolve_known_station(cand_dest):
                    effective_orig = cand_orig
                    effective_dest = cand_dest

        results: List[TrainJourney] = []
        seen_train_keys: set = set()

        TRAIN_NUMBER_PATTERN = re.compile(r"^\s*(?:IC|IR-N|IRN|IR|RE|R)?[\s\-]*(\d{1,6})\s*$", re.IGNORECASE)
        train_match = TRAIN_NUMBER_PATTERN.match(search_query) if search_query else None

        if effective_orig and effective_dest:
            orig_match = resolve_known_station(effective_orig)
            dest_match = resolve_known_station(effective_dest)
            if not orig_match or not dest_match:
                return [], PaginationMeta(totalItems=0, page=page, pageSize=page_size, totalPages=0, hasNext=False, hasPrev=False)

            eff_orig = orig_match.name
            eff_dest = dest_match.name
            # Strictly 100% Live InfoFer only:
            records = infofer_adapter.fetch_itinerary_sync(eff_orig, eff_dest, date_str=effective_date)
            if records:
                for r in records:
                    is_rec_multi = (
                        getattr(r, "is_multi_leg", False)
                        or (getattr(r, "transfer_legs", None) and len(r.transfer_legs) > 1)
                        or ("+" in r.source_train_api.train_number)
                        or ("->" in r.source_train_api.train_number)
                        or ("/" in r.source_train_api.train_number)
                    )
                    if is_rec_multi:
                        continue
                    t_num = normalize_train_number(r.source_train_api.train_number)
                    dedup_key = (t_num, effective_date)
                    if dedup_key not in seen_train_keys:
                        seen_train_keys.add(dedup_key)
                        results.append(_scrape_record_to_train_journey(r, effective_date))

            # Only check custom created TRAINS_DATA if travel_date matches exactly and not in live results
            for t in TRAINS_DATA:
                if t.departureTime.startswith(effective_date):
                    if ((t.origin.code.upper() == orig_match.code.upper() or normalize_text(t.origin.name) == normalize_text(orig_match.name)) and
                        (t.destination.code.upper() == dest_match.code.upper() or normalize_text(t.destination.name) == normalize_text(dest_match.name))):
                        t_num = normalize_train_number(t.trainNumber)
                        if (t_num, effective_date) not in seen_train_keys:
                            seen_train_keys.add((t_num, effective_date))
                            results.append(t)

        elif effective_orig or effective_dest:
            # Single station specified via origin or destination
            target_st = effective_orig or effective_dest
            st_match = resolve_known_station(target_st)
            if not st_match:
                return [], PaginationMeta(totalItems=0, page=page, pageSize=page_size, totalPages=0, hasNext=False, hasPrev=False)

            board_recs = infofer_adapter.fetch_station_board_sync(st_match.name, effective_date)
            for r in board_recs:
                t_num = normalize_train_number(r.source_train_api.train_number)
                dedup_key = (t_num, effective_date)
                if dedup_key not in seen_train_keys:
                    seen_train_keys.add(dedup_key)
                    results.append(_scrape_record_to_train_journey(r, effective_date))

        elif train_match:
            # Flexible train number query: e.g. "r2300", "R 2300", "R-2300", "2300", "ir10072", "IC 572"
            digits = train_match.group(1)
            itin = infofer_adapter.get_train_itinerary_live(digits, effective_date)
            if itin:
                j = cls._itinerary_to_train_journey(itin, effective_date)
                t_key = (normalize_train_number(j.trainNumber), effective_date)
                if t_key not in seen_train_keys:
                    seen_train_keys.add(t_key)
                    results.append(j)

        elif search_query and resolve_known_station(search_query):
            # Station board query by single station name (e.g. "Sibiu", "Craiova", "Timișoara Nord")
            st_match = resolve_known_station(search_query)
            board_recs = infofer_adapter.fetch_station_board_sync(st_match.name, effective_date)
            for r in board_recs:
                t_num = normalize_train_number(r.source_train_api.train_number)
                dedup_key = (t_num, effective_date)
                if dedup_key not in seen_train_keys:
                    seen_train_keys.add(dedup_key)
                    results.append(_scrape_record_to_train_journey(r, effective_date))

        else:
            # Mainline corridors browse pool (when browsing or searching by category e.g. "IC"):
            mainline_corridors = [
                ("București Nord", "Brașov"),
                ("Galați", "București Nord"),
                ("București Nord", "Constanța"),
            ]
            for m_orig, m_dest in mainline_corridors:
                recs = infofer_adapter.fetch_itinerary_sync(m_orig, m_dest, date_str=effective_date)
                for r in recs:
                    t_num = normalize_train_number(r.source_train_api.train_number)
                    dedup_key = (t_num, effective_date)
                    if dedup_key not in seen_train_keys:
                        seen_train_keys.add(dedup_key)
                        results.append(_scrape_record_to_train_journey(r, effective_date))

            # Backward-compat with in-memory test fixtures in TRAINS_DATA
            for t in TRAINS_DATA:
                t_num = normalize_train_number(t.trainNumber)
                if (t_num, effective_date) not in seen_train_keys:
                    if not travel_date or t.departureTime.startswith(effective_date):
                        results.append(t)
                        seen_train_keys.add((t_num, effective_date))

        # Filters
        if search_query:
            clean_q = normalize_code_str(search_query)
            if clean_q in {"IC", "IR", "RE", "R"}:
                results = [t for t in results if matches_train_code(t.trainNumber, search_query)]
            elif train_match:
                results = [t for t in results if matches_train_code(t.trainNumber, search_query)]
            elif resolve_known_station(search_query):
                pass
            else:
                q_low = search_query.lower().strip()
                results = [
                    t for t in results
                    if matches_train_code(t.trainNumber, search_query)
                    or q_low in t.origin.name.lower()
                    or q_low in t.origin.city.lower()
                    or q_low in t.destination.name.lower()
                    or q_low in t.destination.city.lower()
                    or q_low in t.operator.lower()
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

        if origin:
            orig_match = resolve_known_station(origin)
            if orig_match:
                orig_names = {normalize_text(orig_match.name), normalize_text(origin)}
                orig_codes = {orig_match.code.upper()}
                results = [
                    t for t in results
                    if t.origin.code.upper() in orig_codes
                    or normalize_text(t.origin.name) in orig_names
                ]
            else:
                return [], PaginationMeta(totalItems=0, page=page, pageSize=page_size, totalPages=0, hasNext=False, hasPrev=False)

        if destination:
            dest_match = resolve_known_station(destination)
            if dest_match:
                dest_names = {normalize_text(dest_match.name), normalize_text(destination)}
                dest_codes = {dest_match.code.upper()}
                results = [
                    t for t in results
                    if t.destination.code.upper() in dest_codes
                    or normalize_text(t.destination.name) in dest_names
                ]
            else:
                return [], PaginationMeta(totalItems=0, page=page, pageSize=page_size, totalPages=0, hasNext=False, hasPrev=False)

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

    @classmethod
    def get_train_by_id(cls, train_id: str) -> Optional[TrainJourney]:
        for t in TRAINS_DATA:
            if t.id == train_id:
                return t
        parts = train_id.split("-")
        if len(parts) >= 4 and parts[0] == "tr" and parts[-1].isdigit() and len(parts[-1]) == 8:
            date_guess = parts[-1]
            date_str = f"{date_guess[:4]}-{date_guess[4:6]}-{date_guess[6:8]}"
            train_category = parts[1].upper()
            train_number = parts[2]
            target_norm = f"{train_category} {train_number}"

            infofer_adapter = InfoFerLiveAdapter.get_shared_instance()
            itin = infofer_adapter.get_train_itinerary_live(target_norm, date_str=date_str)
            if itin:
                return cls._itinerary_to_train_journey(itin, date_str)
        return None

    @staticmethod
    def list_operators() -> List[RailwayOperator]:
        return OPERATORS_DATA

    @classmethod
    def get_train_itinerary(
        cls, train_number: str, travel_date: Optional[str] = None
    ) -> TrainItineraryResponse:
        bw = timetable_sync_service.get_booking_window()
        min_date = bw["minDate"]
        max_date = bw["maxDate"]

        effective_date = travel_date or min_date
        date_str = effective_date[:10]

        if date_str < min_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot plan or book a trip in the past. Please choose a date from today onward.",
            )
        if date_str > max_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Travel date '{date_str}' is outside the booking window ({min_date} to {max_date}). Please choose a date within 90 days.",
            )

        infofer_adapter = InfoFerLiveAdapter.get_shared_instance()
        itinerary = infofer_adapter.get_train_itinerary_live(train_number, date_str=date_str)
        if not itinerary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Train '{train_number}' not found in live InfoFer timetable for date {date_str}.",
            )
        return itinerary

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

    @staticmethod
    async def get_live_operators_summary() -> OperatorsSummaryResponse:
        from app.services.operator_summary_service import operator_summary_service
        return await operator_summary_service.get_live_operators_summary()


train_service = TrainService()
