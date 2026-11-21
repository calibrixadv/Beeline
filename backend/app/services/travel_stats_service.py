from collections import Counter
from datetime import datetime
import json
import logging
import math
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking, Ticket
from app.models.route import SavedRoute
from app.models.user import User
from app.schemas.user import RouteCorridorSummary, UserTravelStatsResponse
from app.services.station_catalog_service import KNOWN_COORDINATES, clean_station_name, station_catalog_service
from app.services.train_service import train_service
from scraper.collectors.train_api import resolve_known_station

logger = logging.getLogger(__name__)

# Honest Romanian Driving Comparison Constants (Variant B)
CAR_COST_PER_KM_RON: float = 0.65  # Fuel (~7.5 L/100km) + vignette / wear estimate in Romania
CAR_AVG_SPEED_KMH: float = 62.0    # Intercity DN/E roads average
CAR_PARKING_OVERHEAD_MINUTES: float = 15.0  # Urban entry/exit + parking overhead
CAR_CO2_KG_PER_KM: float = 0.171   # Average passenger car emissions kg CO2/km
RAIL_CO2_KG_PER_KM: float = 0.035  # Electric/diesel Romanian rail mix kg CO2/km


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS coordinates in kilometers."""
    radius_earth_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return radius_earth_km * c


def canonicalize_station_name(name: str) -> Tuple[str, Optional[str]]:
    """Returns canonical station display name and code (e.g. ('Galați', 'GLT'))."""
    if not name or not name.strip():
        return ("", None)
    clean = clean_station_name(name.strip())
    match = resolve_known_station(clean)
    if match and match.name:
        return (match.name, match.code)
    # Direct match on raw name
    match_raw = resolve_known_station(name.strip())
    if match_raw and match_raw.name:
        return (match_raw.name, match_raw.code)
    return (clean or name.strip(), None)


def get_station_coords(code: Optional[str], name: str) -> Optional[Tuple[float, float]]:
    """Resolves station GPS coordinates from KNOWN_COORDINATES or catalog."""
    if code and code.upper() in KNOWN_COORDINATES:
        lat, lon, _ = KNOWN_COORDINATES[code.upper()]
        return (lat, lon)
    if code:
        st = station_catalog_service.get_station_by_code(code)
        if st and st.coordinates:
            return (st.coordinates.latitude, st.coordinates.longitude)
    match = resolve_known_station(name)
    if match and match.code and match.code.upper() in KNOWN_COORDINATES:
        lat, lon, _ = KNOWN_COORDINATES[match.code.upper()]
        return (lat, lon)
    return None


def calculate_trip_distance_km(
    origin_name: str,
    dest_name: str,
    duration_minutes: int,
    stored_distance: Optional[float] = None
) -> float:
    """
    Computes rail travel distance in kilometers:
    1. Real stored rail distance if provided.
    2. Coordinates Haversine distance * 1.22 rail curvature factor.
    3. Conservative fallback: duration_minutes * 1.05 (~63 km/h Romanian rail average).
    """
    if stored_distance is not None and stored_distance > 0.0:
        return round(float(stored_distance), 1)

    _, orig_code = canonicalize_station_name(origin_name)
    _, dest_code = canonicalize_station_name(dest_name)

    c1 = get_station_coords(orig_code, origin_name)
    c2 = get_station_coords(dest_code, dest_name)

    if c1 and c2:
        straight_km = haversine_km(c1[0], c1[1], c2[0], c2[1])
        if straight_km > 0.1:
            return round(straight_km * 1.22, 1)

    if duration_minutes > 0:
        return round(duration_minutes * 1.05, 1)

    return 20.0  # Conservative minimal fallback distance


class TripRecord:
    def __init__(
        self,
        origin: str,
        destination: str,
        operator: str,
        fare_lei: float,
        duration_minutes: int,
        distance_km: float,
        money_saved_lei: float,
        minutes_saved: int,
        co2_saved_kg: float,
    ):
        self.origin = origin
        self.destination = destination
        self.operator = operator
        self.fare_lei = fare_lei
        self.duration_minutes = duration_minutes
        self.distance_km = distance_km
        self.money_saved_lei = money_saved_lei
        self.minutes_saved = minutes_saved
        self.co2_saved_kg = co2_saved_kg


class TravelStatsService:
    @staticmethod
    async def get_user_travel_stats(db: AsyncSession, user: User) -> UserTravelStatsResponse:
        """
        Gathers persisted non-cancelled Bookings and non-duplicated SavedRoutes for user,
        calculates honest comparative stats vs driving by car, and groups by corridor.
        """
        # 1. Fetch non-cancelled Bookings with preloaded Tickets
        stmt_bookings = (
            select(Booking)
            .options(selectinload(Booking.tickets))
            .where(
                Booking.user_id == user.id,
                Booking.status.not_in(["CANCELLED", "REFUNDED"])
            )
            .order_by(Booking.created_at.desc())
        )
        res_bookings = await db.execute(stmt_bookings)
        bookings: List[Booking] = list(res_bookings.scalars().all())

        # 2. Fetch SavedRoutes
        stmt_saved = (
            select(SavedRoute)
            .where(SavedRoute.user_id == user.id)
            .order_by(SavedRoute.created_at.desc())
        )
        res_saved = await db.execute(stmt_saved)
        saved_routes: List[SavedRoute] = list(res_saved.scalars().all())

        all_trips: List[TripRecord] = []
        booking_plan_ids: Set[str] = set()
        booking_fingerprints: Set[Tuple[str, str, str]] = set()

        # 3. Process confirmed bookings
        for b in bookings:
            raw_dict: Dict[str, Any] = {}
            if b.raw_data:
                try:
                    raw_dict = json.loads(b.raw_data)
                except Exception:
                    raw_dict = {}

            # Collect journey or plan IDs from raw_data
            items = raw_dict.get("items", [])
            for item in items:
                if isinstance(item, dict) and item.get("journeyId"):
                    booking_plan_ids.add(str(item["journeyId"]))

            first_ticket: Optional[Ticket] = b.tickets[0] if b.tickets else None
            last_ticket: Optional[Ticket] = b.tickets[-1] if b.tickets else None

            origin_raw = first_ticket.origin if first_ticket else "Origin"
            dest_raw = last_ticket.destination if last_ticket else "Destination"

            orig_canon, _ = canonicalize_station_name(origin_raw)
            dest_canon, _ = canonicalize_station_name(dest_raw)

            dep_str = first_ticket.departure_time if first_ticket else ""
            dep_date = dep_str[:10] if dep_str else ""
            booking_fingerprints.add((orig_canon, dest_canon, dep_date))

            fare_lei = float(b.total_amount_lei or 0.0)

            # Resolve operator & duration
            operator = "CFR Călători"
            duration_minutes = 0
            stored_distance: Optional[float] = None

            if items and isinstance(items[0], dict) and items[0].get("journeyId"):
                j_id = str(items[0]["journeyId"])
                train = train_service.get_train_by_id(j_id)
                if train:
                    operator = train.operator or operator
                    duration_minutes = train.durationMinutes

            if duration_minutes <= 0 and first_ticket and last_ticket:
                try:
                    d_clean = first_ticket.departure_time.replace("Z", "+00:00")
                    a_clean = last_ticket.arrival_time.replace("Z", "+00:00")
                    dep_dt = datetime.fromisoformat(d_clean)
                    arr_dt = datetime.fromisoformat(a_clean)
                    diff = int((arr_dt - dep_dt).total_seconds() / 60)
                    if diff > 0:
                        duration_minutes = diff
                except Exception:
                    pass

            if duration_minutes <= 0:
                duration_minutes = 120

            distance_km = calculate_trip_distance_km(
                orig_canon, dest_canon, duration_minutes, stored_distance=stored_distance
            )

            # Driving comparison
            car_cost_lei = distance_km * CAR_COST_PER_KM_RON
            money_saved = max(0.0, car_cost_lei - fare_lei)
            car_duration_min = (distance_km / CAR_AVG_SPEED_KMH) * 60.0 + CAR_PARKING_OVERHEAD_MINUTES
            minutes_saved = max(0, round(car_duration_min - duration_minutes))
            co2_saved = max(0.0, distance_km * (CAR_CO2_KG_PER_KM - RAIL_CO2_KG_PER_KM))

            all_trips.append(
                TripRecord(
                    origin=orig_canon,
                    destination=dest_canon,
                    operator=operator,
                    fare_lei=fare_lei,
                    duration_minutes=duration_minutes,
                    distance_km=distance_km,
                    money_saved_lei=money_saved,
                    minutes_saved=minutes_saved,
                    co2_saved_kg=co2_saved,
                )
            )

        # 4. Process SavedRoute records (excluding already booked trips)
        for sr in saved_routes:
            try:
                plan_data = json.loads(sr.plan_data)
                plan_id = str(plan_data.get("id") or sr.id)

                orig_raw = sr.origin_name or plan_data.get("query", {}).get("origin", {}).get("name", "")
                dest_raw = sr.destination_name or plan_data.get("query", {}).get("destination", {}).get("name", "")

                orig_canon, _ = canonicalize_station_name(orig_raw)
                dest_canon, _ = canonicalize_station_name(dest_raw)

                dep_str = plan_data.get("departureTime", "")
                dep_date = dep_str[:10] if dep_str else ""

                # Deduplication against bookings
                if plan_id in booking_plan_ids:
                    continue
                if (orig_canon, dest_canon, dep_date) in booking_fingerprints:
                    continue

                fare_info = plan_data.get("fare", {})
                fare_lei = float(fare_info.get("totalAmountLei", 50.0))
                duration_minutes = int(plan_data.get("totalDurationMinutes", 120))

                operator = "CFR Călători"
                legs = plan_data.get("legs", [])
                stored_distance = None

                if legs and isinstance(legs, list):
                    first_leg = legs[0]
                    if isinstance(first_leg, dict):
                        operator = first_leg.get("names", {}).get("operatorName", "CFR Călători")
                    leg_dists = [
                        float(l.get("distanceKm"))
                        for l in legs
                        if isinstance(l, dict) and l.get("distanceKm") is not None
                    ]
                    if leg_dists:
                        stored_distance = sum(leg_dists)

                distance_km = calculate_trip_distance_km(
                    orig_canon, dest_canon, duration_minutes, stored_distance=stored_distance
                )

                car_cost_lei = distance_km * CAR_COST_PER_KM_RON
                money_saved = max(0.0, car_cost_lei - fare_lei)
                car_duration_min = (distance_km / CAR_AVG_SPEED_KMH) * 60.0 + CAR_PARKING_OVERHEAD_MINUTES
                minutes_saved = max(0, round(car_duration_min - duration_minutes))
                co2_saved = max(0.0, distance_km * (CAR_CO2_KG_PER_KM - RAIL_CO2_KG_PER_KM))

                all_trips.append(
                    TripRecord(
                        origin=orig_canon,
                        destination=dest_canon,
                        operator=operator,
                        fare_lei=fare_lei,
                        duration_minutes=duration_minutes,
                        distance_km=distance_km,
                        money_saved_lei=money_saved,
                        minutes_saved=minutes_saved,
                        co2_saved_kg=co2_saved,
                    )
                )
            except Exception as exc:
                logger.warning(f"Error parsing saved route {sr.id} for travel stats: {exc}")
                continue

        # Zero trips scenario: return strict factual zeros without promotional copy
        total_trips = len(all_trips)
        if total_trips == 0:
            return UserTravelStatsResponse(
                totalTrips=0,
                moneySavedLei=0.0,
                minutesSaved=0,
                totalDistanceKm=0.0,
                co2SavedKg=0.0,
                comparisonBaseline="CAR",
                favoriteRoute=None,
                topRoutes=[],
            )

        # 5. Group trips by canonical corridor (origin, destination)
        corridors_map: Dict[Tuple[str, str], List[TripRecord]] = {}
        for t in all_trips:
            key = (t.origin, t.destination)
            corridors_map.setdefault(key, []).append(t)

        corridor_summaries: List[RouteCorridorSummary] = []
        for (c_orig, c_dest), c_trips in corridors_map.items():
            trip_count = len(c_trips)
            tot_dist = round(sum(t.distance_km for t in c_trips), 1)
            tot_money = round(sum(t.money_saved_lei for t in c_trips), 2)
            tot_minutes = int(round(sum(t.minutes_saved for t in c_trips)))
            ops = [t.operator for t in c_trips if t.operator]
            top_op = Counter(ops).most_common(1)[0][0] if ops else "CFR Călători"

            corridor_summaries.append(
                RouteCorridorSummary(
                    origin=c_orig,
                    destination=c_dest,
                    tripCount=trip_count,
                    totalDistanceKm=tot_dist,
                    moneySavedLei=tot_money,
                    minutesSaved=tot_minutes,
                    topOperator=top_op,
                )
            )

        # Sort descending by tripCount, tie-break by totalDistanceKm descending
        corridor_summaries.sort(key=lambda c: (c.tripCount, c.totalDistanceKm), reverse=True)

        favorite_route = corridor_summaries[0] if corridor_summaries else None
        top_routes = corridor_summaries[:5]

        total_money_saved = round(sum(t.money_saved_lei for t in all_trips), 2)
        total_minutes_saved = int(round(sum(t.minutes_saved for t in all_trips)))
        total_distance = round(sum(t.distance_km for t in all_trips), 1)
        total_co2_saved = round(sum(t.co2_saved_kg for t in all_trips), 1)

        return UserTravelStatsResponse(
            totalTrips=total_trips,
            moneySavedLei=total_money_saved,
            minutesSaved=total_minutes_saved,
            totalDistanceKm=total_distance,
            co2SavedKg=total_co2_saved,
            comparisonBaseline="CAR",
            favoriteRoute=favorite_route,
            topRoutes=top_routes,
        )


travel_stats_service = TravelStatsService()
