import re
from typing import Any, Optional, Union
from app.schemas.route_plan import TransitRoutePlan, TransitLeg


def normalize_trip_string(s: Optional[str]) -> str:
    """Lowercase, trimmed, collapsed spaces."""
    if not s:
        return ""
    return re.sub(r"\s+", " ", str(s).strip().lower())


def extract_departure_hhmm(time_str: Optional[str]) -> str:
    """Extracts deterministic HH:MM (24-hour) from ISO timestamp or time string."""
    if not time_str:
        return ""
    s = str(time_str).strip()
    if "T" in s:
        s = s.split("T", 1)[1]
    match = re.match(r"^(\d{1,2}):(\d{2})", s)
    if match:
        hours = match.group(1).zfill(2)
        minutes = match.group(2)
        return f"{hours}:{minutes}"
    return ""


def extract_travel_date(date_or_time_str: Optional[str]) -> str:
    """Extracts YYYY-MM-DD date string."""
    if not date_or_time_str:
        return ""
    s = str(date_or_time_str).strip()
    match = re.match(r"^(\d{4}-\d{2}-\d{2})", s)
    if match:
        return match.group(1)
    return s


def compute_trip_fingerprint(
    train_number: Optional[str],
    origin: Optional[str],
    destination: Optional[str],
    travel_date: Optional[str],
    departure_hhmm: Optional[str],
) -> str:
    """
    Canonical deterministic trip fingerprint shared across backend and frontend:
    fingerprint = "${normalize(trainNumber)}|${normalize(origin)}|${normalize(destination)}|${travelDate}|${departureHHMM}"
    """
    norm_train = normalize_trip_string(train_number)
    norm_orig = normalize_trip_string(origin)
    norm_dest = normalize_trip_string(destination)
    date_str = extract_travel_date(travel_date)
    time_str = extract_departure_hhmm(departure_hhmm)
    return f"{norm_train}|{norm_orig}|{norm_dest}|{date_str}|{time_str}"


def _is_train_mode(t_type: Any) -> bool:
    if not t_type:
        return False
    val = getattr(t_type, "value", t_type)
    return str(val).upper() == "TRAIN" or "TRAIN" in str(t_type).upper()


def extract_plan_train_number(plan: Union[TransitRoutePlan, dict]) -> str:
    legs = plan.legs if isinstance(plan, TransitRoutePlan) else plan.get("legs", [])
    train_leg = None
    for leg in legs:
        t_type = (
            getattr(leg, "transportType", None)
            if not isinstance(leg, dict)
            else leg.get("transportType")
        )
        if _is_train_mode(t_type):
            train_leg = leg
            break
    if not train_leg and legs:
        train_leg = legs[0]

    line_code = ""
    if train_leg:
        if hasattr(train_leg, "names") and train_leg.names:
            line_code = getattr(train_leg.names, "lineCode", "") or getattr(train_leg.names, "lineName", "")
        elif isinstance(train_leg, dict):
            names = train_leg.get("names", {})
            line_code = (
                names.get("lineCode")
                or names.get("lineName")
                or train_leg.get("lineCode")
                or train_leg.get("trainNumber")
            )

    if not line_code:
        summary = plan.summary if isinstance(plan, TransitRoutePlan) else plan.get("summary", "")
        line_code = summary[:24] if summary else ""

    return line_code or ""


def compute_trip_fingerprint_from_plan(plan: Union[TransitRoutePlan, dict]) -> str:
    """Extracts canonical physical trip fingerprint from a TransitRoutePlan or its dict representation."""
    if isinstance(plan, TransitRoutePlan):
        train_number = extract_plan_train_number(plan)
        origin = ""
        if plan.query and plan.query.origin:
            origin = plan.query.origin.name or plan.query.origin.city or ""
        if not origin and plan.legs:
            origin = plan.legs[0].names.originName
        destination = ""
        if plan.query and plan.query.destination:
            destination = plan.query.destination.name or plan.query.destination.city or ""
        if not destination and plan.legs:
            destination = plan.legs[-1].names.destinationName
        dep_time = plan.departureTime
        if not dep_time and plan.legs:
            dep_time = plan.legs[0].timings.scheduledDeparture
        travel_date = extract_travel_date(dep_time)
        departure_hhmm = extract_departure_hhmm(dep_time)
    else:
        train_number = extract_plan_train_number(plan)
        q = plan.get("query", {})
        q_orig = q.get("origin", {}) if isinstance(q, dict) else {}
        origin = q_orig.get("name") or q_orig.get("city") or ""
        q_dest = q.get("destination", {}) if isinstance(q, dict) else {}
        destination = q_dest.get("name") or q_dest.get("city") or ""
        legs = plan.get("legs", [])
        if not origin and legs:
            origin = legs[0].get("names", {}).get("originName", "")
        if not destination and legs:
            destination = legs[-1].get("names", {}).get("destinationName", "")
        dep_time = plan.get("departureTime", "")
        if not dep_time and legs:
            dep_time = legs[0].get("timings", {}).get("scheduledDeparture", "")
        travel_date = extract_travel_date(dep_time)
        departure_hhmm = extract_departure_hhmm(dep_time)

    return compute_trip_fingerprint(
        train_number=train_number,
        origin=origin,
        destination=destination,
        travel_date=travel_date,
        departure_hhmm=departure_hhmm,
    )
