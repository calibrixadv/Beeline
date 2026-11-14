from typing import Any, Dict, Optional
from ..models import TrainApiFeatures


class TrainApiCollector:
    """
    Collector and parser for train features conforming to freeze_contract.md (Sursa 1: Train APIs).
    Allows ingestion from live train telemetry, GTFS-RT feeds, or manual input dictionaries.
    """

    CATEGORY_MAP = {
        "R": 0,
        "REGIO": 0,
        "RE": 1,
        "REGIO_EXPRES": 1,
        "IR": 2,
        "INTERREGIO": 2,
        "IC": 3,
        "INTERCITY": 3,
    }

    OPERATOR_CANONICAL = {
        "cfr": "CFR",
        "cfr călători": "CFR",
        "cfr calatori": "CFR",
        "astra": "ASTRA",
        "astra trans carpatic": "ASTRA",
        "tfc": "TFC",
        "transferoviar": "TFC",
        "transferoviar călători": "TFC",
        "softrans": "SOFTRANS",
        "regio călători": "REGIO",
        "regio calatori": "REGIO",
    }

    def parse_raw(self, data: Dict[str, Any]) -> TrainApiFeatures:
        """
        Parses and standardizes raw train feed or manual data into TrainApiFeatures.
        """
        train_number = str(data.get("train_number") or data.get("trainNumber") or "IR 0000").strip()

        # Parse Category
        cat_raw = str(data.get("train_category") or data.get("category") or "").upper().strip()
        if not cat_raw and " " in train_number:
            cat_raw = train_number.split()[0].upper()
        category = self.CATEGORY_MAP.get(cat_raw, 2)

        # Parse Operator
        op_raw = str(data.get("operator") or data.get("carrier") or "CFR").lower().strip()
        operator = self.OPERATOR_CANONICAL.get(op_raw, op_raw.upper())

        origin = str(data.get("origin_station_code") or data.get("origin") or "BCT").upper().strip()
        destination = str(data.get("destination_station_code") or data.get("destination") or "BSV").upper().strip()

        duration = float(data.get("scheduled_duration_minutes") or data.get("durationMinutes") or 120.0)
        distance = float(data.get("distance_km") or data.get("distanceKm") or (duration * 1.1))
        stops = int(data.get("stop_count") or data.get("stopsCount") or 4)
        delay_origin = int(data.get("delay_at_origin_minutes") or data.get("originDelay") or 0)

        traction_raw = str(data.get("traction_type") or "ELECTRIC").upper()
        traction = 0 if "DIESEL" in traction_raw else 1

        has_transfer = int(bool(data.get("has_transfer", 0)))
        buffer = float(data.get("transfer_buffer_minutes") or (20.0 if has_transfer else 999.0))

        return TrainApiFeatures(
            train_number=train_number,
            operator=operator,
            train_category=category,
            origin_station_code=origin,
            destination_station_code=destination,
            scheduled_duration_minutes=duration,
            distance_km=distance,
            stop_count=stops,
            delay_at_origin_minutes=delay_origin,
            traction_type=traction,
            has_transfer=has_transfer,
            transfer_buffer_minutes=buffer,
        )
