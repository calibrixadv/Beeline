import asyncio
from datetime import datetime, timezone
import json
import logging
import math
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import onnxruntime as ort

from app.core.config import settings
from app.schemas.risk import RiskFactorExplanation, RiskFeatureVector, RiskPrediction
from app.schemas.route_plan import (
    BufferAdequacy,
    RiskLevel,
    RouteRiskAnalysis,
    RouteRiskFactor,
    TransitLeg,
    TransitMode,
    TransitRoutePlan,
)
from app.services.feature_store_service import (
    FeatureStoreService,
    corridor_hash,
    slugify_carrier,
    slugify_corridor,
    slugify_station,
)

logger = logging.getLogger(__name__)

# Mode ordinal encoding matching training schema
MODE_ENCODING: Dict[str, int] = {
    "BUS": 0,
    "METRO": 1,
    "TRAM": 2,
    "R": 3,
    "RE": 4,
    "IR": 5,
    "IC": 6,
}

# Operator benchmark punctuality and default chronic delays
CARRIER_PROFILES: Dict[str, Dict[str, Any]] = {
    "metrorex": {"punctuality": 0.98, "chronic_delay": 1.5, "mode": "METRO"},
    "transurb": {"punctuality": 0.93, "chronic_delay": 3.5, "mode": "BUS"},
    "ctp-cluj": {"punctuality": 0.92, "chronic_delay": 4.0, "mode": "BUS"},
    "softrans": {"punctuality": 0.91, "chronic_delay": 6.0, "mode": "RE"},
    "stpt": {"punctuality": 0.90, "chronic_delay": 5.0, "mode": "TRAM"},
    "stb": {"punctuality": 0.89, "chronic_delay": 7.0, "mode": "BUS"},
    "astra-trans-carpatic": {"punctuality": 0.88, "chronic_delay": 8.0, "mode": "IR"},
    "transferoviar-calatori": {"punctuality": 0.87, "chronic_delay": 9.0, "mode": "R"},
    "regio-calatori": {"punctuality": 0.86, "chronic_delay": 10.0, "mode": "R"},
    "cfr-calatori": {"punctuality": 0.82, "chronic_delay": 14.5, "mode": "IR"},
}

# Known Romanian railway single-track bottlenecks
SINGLE_TRACK_CORRIDORS = {
    "galati-faurei",
    "faurei-galati",
    "ploiesti_vest-campina",
    "campina-ploiesti_vest",
    "cluj_napoca-oradea",
    "oradea-cluj_napoca",
    "galati-bucuresti_nord",
    "bucuresti_nord-galati",
    "ploiesti_vest-brasov",
    "brasov-ploiesti_vest",
    "glt-bct",
    "bct-glt",
    "cjn-ord",
    "ord-cjn",
    "plv-cmp",
    "cmp-plv",
    "plv-bsv",
    "bsv-plv",
}

# Geographic coordinates of key Romanian hubs
STATION_COORDINATES: Dict[str, Tuple[float, float]] = {
    "BCT": (44.4473, 26.0753),
    "BSV": (45.6607, 25.6144),
    "GLT": (45.4431, 28.0556),
    "PLV": (44.9272, 25.9989),
    "CTA": (44.1706, 28.6322),
    "CJN": (46.7844, 23.5878),
    "ORD": (47.0719, 21.9328),
    "TIM": (45.7508, 21.2081),
    "ARD": (46.1917, 21.3208),
    "CRA": (44.3328, 23.8153),
    "IAS": (47.1642, 27.5703),
}


def haversine_distance_km(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float],
) -> float:
    """Computes great-circle distance between two geographic coordinates in km."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


class RiskService:
    """
    Production In-Process ONNX Inference & Risk Scoring Service.
    Loads risk_model.onnx, handles Redis feature store enrichment, executes
    batched vectorized inference, and falls back gracefully to deterministic Transfer Shield rules.
    """

    def __init__(self) -> None:
        self._session: Optional[ort.InferenceSession] = None
        self._metadata: Optional[Dict[str, Any]] = None
        self._model_path: str = settings.ML_MODEL_PATH
        self._initialized: bool = False

    def init_session(self, app: Optional[Any] = None) -> bool:
        """
        Initializes the ONNX runtime InferenceSession on the CPU.
        Returns True on successful warm-up, False if fallback mode is activated.
        """
        if not settings.ENABLE_ML_INFERENCE:
            logger.info("ML inference disabled via ENABLE_ML_INFERENCE setting.")
            self._session = None
            if app is not None:
                app.state.risk_session = None
            return False

        model_file = Path(self._model_path)
        if not model_file.exists():
            logger.warning(
                f"ONNX risk model not found at {model_file}. Server operating in deterministic fallback mode."
            )
            self._session = None
            if app is not None:
                app.state.risk_session = None
            return False

        try:
            opts = ort.SessionOptions()
            opts.intra_op_num_threads = 2
            opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

            session = ort.InferenceSession(
                str(model_file),
                sess_options=opts,
                providers=["CPUExecutionProvider"],
            )

            # Warm-up inference run
            dummy = np.zeros((1, 18), dtype=np.float32)
            _ = session.run(None, {"float_input": dummy})

            self._session = session
            self._initialized = True
            if app is not None:
                app.state.risk_session = session

            # Load optional metadata
            meta_path = Path(settings.ML_METADATA_PATH)
            if meta_path.exists():
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        self._metadata = json.load(f)
                except Exception as meta_exc:
                    logger.debug(f"Could not load risk metadata: {meta_exc}")

            logger.info(f"Loaded and warmed up ONNX risk model from {model_file} successfully.")
            return True
        except Exception as exc:
            logger.warning(f"Failed to load ONNX risk model: {exc}. Server operating in fallback mode.")
            self._session = None
            if app is not None:
                app.state.risk_session = None
            return False

    def get_session(self) -> Optional[ort.InferenceSession]:
        """Returns the active InferenceSession or lazily initializes if possible."""
        if self._session is not None:
            return self._session
        if not self._initialized:
            self.init_session()
        return self._session

    def close(self) -> None:
        """Cleans up the ONNX session."""
        self._session = None
        self._initialized = False

    @staticmethod
    def _extract_primary_leg(plan: TransitRoutePlan) -> Optional[TransitLeg]:
        """Identifies the primary leg (longest duration non-walk leg, or first leg, or None if no legs)."""
        if not plan.legs:
            return None
        non_walk = [l for l in plan.legs if l.transportType != TransitMode.WALK]
        if non_walk:
            return max(non_walk, key=lambda l: l.timings.durationMinutes)
        return plan.legs[0]

    @staticmethod
    def _encode_train_category(leg: Optional[TransitLeg]) -> int:
        """Maps transport type and line code to the ordinal mode encoding (0..6)."""
        if leg is None:
            return MODE_ENCODING["BUS"]
        mode = leg.transportType
        if mode == TransitMode.METRO:
            return MODE_ENCODING["METRO"]
        if mode == TransitMode.TRAM:
            return MODE_ENCODING["TRAM"]
        if mode in [TransitMode.BUS, TransitMode.WALK, TransitMode.AIR, TransitMode.FERRY]:
            return MODE_ENCODING["BUS"]

        # Intercity / Regional Rail
        line_code = (leg.names.lineCode or "").upper()
        if "IC" in line_code:
            return MODE_ENCODING["IC"]
        if "IR" in line_code:
            return MODE_ENCODING["IR"]
        if "RE" in line_code:
            return MODE_ENCODING["RE"]
        if "R" in line_code:
            return MODE_ENCODING["R"]
        return MODE_ENCODING["IR"]

    @staticmethod
    def _extract_departure_datetime(plan: TransitRoutePlan) -> datetime:
        """
        Parses departure timestamp across ISO 8601, RFC 3339 with timezone names,
        or standard Romanian transit operator formats (DD.MM.YYYY HH:MM[:SS]),
        defaulting to current UTC time if unparseable.
        """
        raw_time = plan.departureTime or (plan.legs[0].timings.scheduledDeparture if plan.legs else None)
        if raw_time:
            # Strip bracketed timezone names (e.g. 2026-10-21T06:40:00+03:00[Europe/Bucharest])
            clean_time = re.sub(r"\[.*?\]", "", raw_time.strip())
            try:
                return datetime.fromisoformat(clean_time)
            except Exception:
                pass

            # Romanian transit and date formats
            for fmt in (
                "%d.%m.%Y %H:%M:%S",
                "%d.%m.%Y %H:%M",
                "%d/%m/%Y %H:%M:%S",
                "%d/%m/%Y %H:%M",
                "%Y/%m/%d %H:%M:%S",
                "%Y/%m/%d %H:%M",
            ):
                try:
                    return datetime.strptime(clean_time, fmt)
                except Exception:
                    pass

        return datetime.now(timezone.utc)

    @classmethod
    def _extract_distance_km(cls, plan: TransitRoutePlan) -> float:
        """Computes Haversine distance between journey endpoints."""
        if not plan.legs:
            return 0.0
        first_leg = plan.legs[0]
        last_leg = plan.legs[-1]
        lat1 = first_leg.coords.originCoords.latitude
        lon1 = first_leg.coords.originCoords.longitude
        lat2 = last_leg.coords.destinationCoords.latitude
        lon2 = last_leg.coords.destinationCoords.longitude
        dist = haversine_distance_km(lat1, lon1, lat2, lon2)
        if dist > 0.0:
            return dist
        return 45.0  # Safe fallback estimate

    @classmethod
    async def extract_plan_features(
        cls,
        plan: TransitRoutePlan,
        corridor_features: Dict[str, Any],
        transfer_station_features: Dict[str, Any],
        carrier_features: Dict[str, Any],
    ) -> RiskFeatureVector:
        """
        Transforms a TransitRoutePlan and pre-fetched Redis features into a canonical
        RiskFeatureVector.
        """
        primary_leg = cls._extract_primary_leg(plan)
        train_cat = cls._encode_train_category(primary_leg)

        # Corridor slug & hash
        if plan.legs:
            orig_city = plan.legs[0].names.originCity or plan.legs[0].names.originName
            dest_city = plan.legs[-1].names.destinationCity or plan.legs[-1].names.destinationName
        else:
            orig_city = ""
            dest_city = ""
        corridor_slug = slugify_corridor(orig_city, dest_city)
        c_hash = corridor_hash(corridor_slug)

        duration = max(0.0, float(plan.totalDurationMinutes)) if plan.totalDurationMinutes is not None else 60.0
        total_stops = max(0, sum(len(l.coords.intermediateStops) for l in plan.legs)) if plan.legs else 0
        dist_km = max(0.0, cls._extract_distance_km(plan))

        dep_dt = cls._extract_departure_datetime(plan)
        dep_hour = min(23, max(0, dep_dt.hour))
        is_peak = 1 if dep_hour in [7, 8, 9, 16, 17, 18, 19] else 0
        dow = min(6, max(0, dep_dt.weekday()))
        is_wknd = 1 if dow in [5, 6] else 0

        has_transfer = 1 if (plan.transfersCount > 0 or len(plan.legs) > 1) else 0

        # Transfer buffer
        transfer_buffers = [
            l.risk.transferBufferAfterMinutes
            for l in plan.legs[:-1]
            if l.risk.transferBufferAfterMinutes is not None
        ]
        if has_transfer:
            tightest_buffer = float(min(transfer_buffers)) if transfer_buffers else 20.0
        else:
            tightest_buffer = 999.0

        # Transfer station metrics
        st_rel = min(1.0, max(0.0, float(transfer_station_features.get("punctuality_rate", transfer_station_features.get("reliability", 0.88)))))
        st_cong = min(1.0, max(0.0, float(transfer_station_features.get("congestion_index", 0.30))))

        # Corridor metrics from Redis & itinerary disruptions
        leg_disruptions_count = sum(len(l.risk.disruptions) for l in plan.legs) if plan.legs else 0
        redis_disruptions = int(corridor_features.get("active_disruptions_count", 0))
        active_disruptions = max(0, max(redis_disruptions, leg_disruptions_count))

        # Max disruption severity
        sev_map = {"CRITICAL": 3, "WARNING": 2, "INFO": 1}
        leg_max_sev = 0
        for l in plan.legs:
            for d in l.risk.disruptions:
                leg_max_sev = max(leg_max_sev, sev_map.get(d.severity, 0))
        redis_sev = int(corridor_features.get("max_disruption_severity", 0))
        corridor_sev_max = min(3, max(0, max(redis_sev, leg_max_sev)))

        rolling_3h = max(0.0, float(corridor_features.get("rolling_delay_3h", 0.0)))
        rolling_24h = max(0.0, float(corridor_features.get("rolling_delay_24h", 0.0)))

        # Carrier baseline punctuality
        carrier_punct = min(1.0, max(0.0, float(carrier_features.get("baseline_punctuality", 0.88))))

        return RiskFeatureVector(
            train_category=train_cat,
            corridor_id_hash=c_hash,
            scheduled_duration_minutes=duration,
            stop_count=total_stops,
            distance_km_est=dist_km,
            departure_hour=dep_hour,
            is_peak_hour=is_peak,
            day_of_week=dow,
            is_weekend=is_wknd,
            has_transfer=has_transfer,
            transfer_buffer_minutes=tightest_buffer,
            transfer_station_reliability=st_rel,
            transfer_station_congestion=st_cong,
            active_corridor_disruptions=active_disruptions,
            corridor_severity_max=corridor_sev_max,
            rolling_avg_delay_3h=rolling_3h,
            rolling_avg_delay_24h=rolling_24h,
            carrier_baseline_punctuality=carrier_punct,
        )

    @classmethod
    def _generate_factors_and_explanations(
        cls,
        plan: TransitRoutePlan,
        vector: RiskFeatureVector,
        corridor_slug: str,
        tightest_buffer: int,
        weather: str = "CLEAR",
    ) -> Tuple[List[RouteRiskFactor], List[str]]:
        """Constructs structured RouteRiskFactors and human-readable explanation strings."""
        factors: List[RouteRiskFactor] = []
        risk_factors: List[str] = []

        # 1. Single-track bottleneck check
        corridor_check = corridor_slug.lower()
        if (
            corridor_check in SINGLE_TRACK_CORRIDORS
            or any("single-track" in (l.instructions.transferNotice or "").lower() for l in plan.legs)
            or any("faurei" in (l.names.destinationName or "").lower() for l in plan.legs)
        ):
            factors.append(
                RouteRiskFactor(
                    code="SINGLE_TRACK_RAIL",
                    severity="INFO",
                    description=f"Single-track railway segment on {corridor_slug or 'route'} corridor.",
                    affectedLegIndex=1 if len(plan.legs) > 1 else (0 if plan.legs else None),
                )
            )
            risk_factors.append(f"Single-track railway segment on {corridor_slug or 'route'} branch.")

        # 2. Transfer buffer check
        if vector.has_transfer == 1:
            if tightest_buffer < 15:
                sev = "CRITICAL" if tightest_buffer < 10 else "WARNING"
                factors.append(
                    RouteRiskFactor(
                        code="SUB_15_MIN_TRANSFER",
                        severity=sev,
                        description=f"Tight {tightest_buffer}-min transfer increases risk of missed connection.",
                        affectedLegIndex=0 if plan.legs else None,
                    )
                )
                risk_factors.append(f"Tight {tightest_buffer}-min transfer leaves narrow margin for delays.")
            else:
                risk_factors.append(
                    f"Shielded: {tightest_buffer}-min buffer safely absorbs standard Romanian transit delays."
                )
        else:
            risk_factors.append("Direct transit route with zero connection risk.")

        # 3. Urban rush hour traffic
        if vector.is_peak_hour == 1 and any(
            l.transportType in [TransitMode.BUS, TransitMode.TRAM] for l in plan.legs
        ):
            factors.append(
                RouteRiskFactor(
                    code="URBAN_RUSH_HOUR_TRAFFIC",
                    severity="INFO",
                    description="Urban rush-hour traffic may add minor surface transit delay.",
                    affectedLegIndex=0 if plan.legs else None,
                )
            )
            risk_factors.append("Urban rush hour traffic: allow extra margin for surface transit.")

        # 4. Carrier chronic delay
        if vector.carrier_baseline_punctuality < 0.85:
            factors.append(
                RouteRiskFactor(
                    code="CARRIER_CHRONIC_DELAY",
                    severity="INFO",
                    description=f"Carrier baseline punctuality ({int(vector.carrier_baseline_punctuality * 100)}%) may require additional transfer buffer.",
                    affectedLegIndex=1 if len(plan.legs) > 1 else (0 if plan.legs else None),
                )
            )
            risk_factors.append("Carrier operational variance on intercity rail segment.")

        # 5. Weather alert
        if weather != "CLEAR" or vector.corridor_severity_max >= 2:
            factors.append(
                RouteRiskFactor(
                    code="WEATHER_ALERT",
                    severity="WARNING" if vector.corridor_severity_max >= 2 else "INFO",
                    description=f"Weather conditions ({weather}) active on corridor.",
                    affectedLegIndex=0 if plan.legs else None,
                )
            )
            risk_factors.append(f"Weather alert active: {weather} conditions on route.")

        return factors, risk_factors

    @classmethod
    def calibrate_risk_score(
        cls,
        expected_delay: float,
        missed_conn_prob: float,
        transfers_count: int,
        tightest_buffer: int,
    ) -> Tuple[float, RiskLevel, BufferAdequacy, str]:
        """
        Calibrates predicted delay and connection probability into composite risk metrics:
        Score = min(100.0, 40 * P(Missed) + 3 * ExpectedDelay + 15 * (1 - BufferAdequacyFactor))
        """
        if transfers_count == 0:
            adequacy = BufferAdequacy.GENEROUS
            adequacy_factor = 1.0
        elif tightest_buffer >= 35:
            adequacy = BufferAdequacy.GENEROUS
            adequacy_factor = 1.0
        elif tightest_buffer >= 20:
            adequacy = BufferAdequacy.OPTIMAL
            adequacy_factor = 0.8
        elif tightest_buffer >= 15:
            adequacy = BufferAdequacy.TIGHT
            adequacy_factor = 0.4
        else:
            adequacy = BufferAdequacy.INSUFFICIENT
            adequacy_factor = 0.0

        raw_score = (
            (40.0 * missed_conn_prob)
            + (3.0 * max(0.0, expected_delay))
            + (15.0 * (1.0 - adequacy_factor))
        )
        overall_score = round(min(100.0, max(0.0, raw_score)), 1)

        # Calibrated risk level bands
        if overall_score <= 20.0:
            level = RiskLevel.LOW
            if transfers_count > 0:
                if tightest_buffer >= 20:
                    summary = f"Shielded connection: {tightest_buffer}-min buffer safely absorbs standard Romanian transit delays."
                else:
                    summary = f"Connection buffer: {tightest_buffer}-min margin. Watch for platform announcements."
            else:
                summary = "Direct transit route with minimal connection risk."
        elif overall_score <= 45.0:
            level = RiskLevel.MODERATE
            summary = (
                f"Moderate connection: {tightest_buffer}-min buffer allows minor variance. Watch live tracking."
                if transfers_count > 0
                else "Moderate delay variance expected. Check real-time tracking."
            )
        elif overall_score <= 70.0:
            level = RiskLevel.HIGH
            summary = f"Elevated risk: {tightest_buffer}-min buffer leaves slim margin for platform changes."
        else:
            level = RiskLevel.CRITICAL
            summary = "Critical risk: High chance of missed connection due to tight buffers or disruptions."

        return overall_score, level, adequacy, summary

    @classmethod
    def deterministic_fallback_analysis(
        cls,
        plan: TransitRoutePlan,
        min_buffer_required: int = 20,
    ) -> RouteRiskAnalysis:
        """
        Deterministic Romanian Transfer Shield Fallback Engine.
        Used when ONNX session fails, model file is missing, or unexpected error occurs.
        Guarantees zero 500 errors and preserves the full RouteRiskAnalysis contract.
        """
        legs = plan.legs
        if not legs:
            return RouteRiskAnalysis(
                overallRiskScore=0.0,
                riskLevel=RiskLevel.LOW,
                historicalPunctualityRate=1.0,
                tightestBufferMinutes=0,
                bufferAdequacy=BufferAdequacy.GENEROUS,
                riskSummaryText="Direct transit route with no connection risk.",
                factors=[],
                expectedDelayMinutes=0,
                missedConnectionProbability=0.0,
                riskFactors=["Direct transit route with no connection risk."],
                isMlComputed=False,
            )

        avg_punct = sum(l.risk.historicalPunctualityPercent for l in legs) / len(legs)
        punct_penalty = max(0.0, 100.0 - avg_punct)

        buffers = [
            l.risk.transferBufferAfterMinutes
            for l in legs[:-1]
            if l.risk.transferBufferAfterMinutes is not None
        ]
        tightest_buffer = min(buffers) if buffers else 999

        if len(buffers) == 0 or tightest_buffer >= 35:
            buf_penalty = 5.0
            adequacy = BufferAdequacy.GENEROUS
        elif tightest_buffer >= 20:
            buf_penalty = 15.0
            adequacy = BufferAdequacy.OPTIMAL
        elif tightest_buffer >= 15:
            buf_penalty = 35.0
            adequacy = BufferAdequacy.TIGHT
        else:
            buf_penalty = 70.0
            adequacy = BufferAdequacy.INSUFFICIENT

        # Disruption penalties and synthetic delay
        disruption_penalty = 0.0
        synthetic_delay = 0
        factors: List[RouteRiskFactor] = []
        risk_factors: List[str] = []

        for idx, leg in enumerate(legs):
            for d in leg.risk.disruptions:
                if d.severity == "CRITICAL":
                    disruption_penalty += 40.0
                    synthetic_delay += 25
                elif d.severity == "WARNING":
                    disruption_penalty += 20.0
                    synthetic_delay += 12
                else:
                    disruption_penalty += 5.0
                    synthetic_delay += 4

            if leg.risk.transferBufferAfterMinutes is not None and leg.risk.transferBufferAfterMinutes < 15:
                factors.append(
                    RouteRiskFactor(
                        code="SUB_15_MIN_TRANSFER",
                        severity="WARNING" if leg.risk.transferBufferAfterMinutes >= 10 else "CRITICAL",
                        description=f"Tight {leg.risk.transferBufferAfterMinutes} min transfer at {leg.names.destinationName}.",
                        affectedLegIndex=idx,
                    )
                )
                risk_factors.append(f"Tight {leg.risk.transferBufferAfterMinutes} min transfer at {leg.names.destinationName}.")

        raw_risk = (0.35 * punct_penalty) + (0.45 * buf_penalty) + (0.20 * min(disruption_penalty, 100.0))
        overall_score = round(min(100.0, max(0.0, raw_risk)), 1)

        # Connection probability heuristic
        if len(buffers) == 0:
            missed_prob = 0.01
            risk_factors.insert(0, "Direct transit route with minimal connection risk.")
        elif tightest_buffer < 15:
            missed_prob = 0.50
        elif tightest_buffer < 20:
            missed_prob = 0.15
            risk_factors.insert(0, f"Caution: {tightest_buffer}-min buffer leaves slim margin.")
        else:
            missed_prob = 0.03
            risk_factors.insert(0, f"Shielded: {tightest_buffer}-min buffer safely absorbs standard Romanian transit delays.")

        if overall_score <= 25.0:
            level = RiskLevel.LOW
            summary = f"Shielded connection: {tightest_buffer if tightest_buffer != 999 else 0}-min buffer safely absorbs standard Romanian transit delays."
        elif overall_score <= 50.0:
            level = RiskLevel.MODERATE
            summary = f"Moderate connection: {tightest_buffer if tightest_buffer != 999 else 0}-min buffer allows minor variance. Watch live tracking."
        elif overall_score <= 75.0:
            level = RiskLevel.HIGH
            summary = f"Elevated risk: {tightest_buffer if tightest_buffer != 999 else 0}-min buffer leaves slim margin for platform changes."
        else:
            level = RiskLevel.CRITICAL
            summary = "Critical risk: High chance of missed connection due to tight buffers or disruptions."

        return RouteRiskAnalysis(
            overallRiskScore=overall_score,
            riskLevel=level,
            historicalPunctualityRate=round(avg_punct / 100.0, 2),
            tightestBufferMinutes=tightest_buffer if tightest_buffer != 999 else 0,
            bufferAdequacy=adequacy,
            riskSummaryText=summary,
            factors=factors,
            expectedDelayMinutes=synthetic_delay,
            missedConnectionProbability=missed_prob,
            riskFactors=risk_factors,
            isMlComputed=False,
        )

    async def enrich_route_plans(
        self,
        plans: List[TransitRoutePlan],
    ) -> List[TransitRoutePlan]:
        """
        Batched inference and feature store enrichment across all candidate itineraries.
        Converts all candidate routes into an (N, 18) feature matrix, runs batched
        ONNX inference in < 1ms, and updates plans with calibrated ML risk analysis.
        """
        if not plans:
            return plans

        session = self.get_session()
        if session is None or not settings.ENABLE_ML_INFERENCE:
            # Fallback path when ML session unavailable
            for plan in plans:
                plan.riskAnalysis = self.deterministic_fallback_analysis(plan)
            return plans

        try:
            # 1. Collect corridor, station, and carrier keys for batch pre-fetching
            corridor_keys: List[str] = []
            station_keys: List[str] = []
            carrier_keys: List[str] = []

            for plan in plans:
                if plan.legs:
                    orig_city = plan.legs[0].names.originCity or plan.legs[0].names.originName
                    dest_city = plan.legs[-1].names.destinationCity or plan.legs[-1].names.destinationName
                    corridor_keys.append(slugify_corridor(orig_city, dest_city))

                    # Transfer stations
                    for leg in plan.legs[:-1]:
                        st_code = leg.names.destinationName or ""
                        if st_code:
                            station_keys.append(slugify_station(st_code))

                    # Primary carrier
                    primary_leg = self._extract_primary_leg(plan)
                    if primary_leg:
                        car_name = primary_leg.names.operatorShortName or primary_leg.names.operatorName or ""
                        if car_name:
                            carrier_keys.append(slugify_carrier(car_name))

            # 2. Parallel Redis batch fetch (pipelined across corridors, stations, and carriers)
            unique_corridors = list(set(corridor_keys))
            unique_stations = list(set(station_keys))
            unique_carriers = list(set(carrier_keys))

            corridor_features_map, station_features_map, carrier_features_map = await asyncio.gather(
                FeatureStoreService.batch_get_corridor_features(unique_corridors),
                FeatureStoreService.batch_get_station_features(unique_stations),
                FeatureStoreService.batch_get_carrier_features(unique_carriers),
                return_exceptions=True,
            )
            if isinstance(corridor_features_map, Exception):
                corridor_features_map = {}
            if isinstance(station_features_map, Exception):
                station_features_map = {}
            if isinstance(carrier_features_map, Exception):
                carrier_features_map = {}

            # 3. Vectorize each plan into RiskFeatureVector
            vectors: List[RiskFeatureVector] = []
            corridor_slugs: List[str] = []
            weather_conditions: List[str] = []

            for plan in plans:
                orig_city = plan.legs[0].names.originCity or plan.legs[0].names.originName if plan.legs else ""
                dest_city = plan.legs[-1].names.destinationCity or plan.legs[-1].names.destinationName if plan.legs else ""
                c_slug = slugify_corridor(orig_city, dest_city)
                corridor_slugs.append(c_slug)

                c_feats = corridor_features_map.get(c_slug, {})
                weather_conditions.append(c_feats.get("weather_condition", "CLEAR"))

                # Identify the bottleneck transfer station (tightest buffer)
                st_slug = ""
                if len(plan.legs) > 1:
                    tightest_transfer_leg = min(
                        plan.legs[:-1],
                        key=lambda l: (
                            l.risk.transferBufferAfterMinutes
                            if l.risk.transferBufferAfterMinutes is not None
                            else 999
                        ),
                        default=None,
                    )
                    if tightest_transfer_leg and tightest_transfer_leg.names.destinationName:
                        st_slug = slugify_station(tightest_transfer_leg.names.destinationName)
                st_feats = station_features_map.get(st_slug, {})

                primary_leg = self._extract_primary_leg(plan)
                car_name = (
                    (primary_leg.names.operatorShortName or primary_leg.names.operatorName or "")
                    if primary_leg
                    else ""
                )
                car_slug = slugify_carrier(car_name)
                car_feats = carrier_features_map.get(car_slug, {})

                vec = await self.extract_plan_features(plan, c_feats, st_feats, car_feats)
                vectors.append(vec)

            # 4. Stack into batched (N, 18) float32 array
            batch_matrix = np.stack([v.to_numpy_vector() for v in vectors], axis=0)

            # 5. Execute in-process ONNX batched inference (< 1.0ms for batch of 3-5)
            ort_outputs = session.run(None, {"float_input": batch_matrix})
            expected_delays = ort_outputs[0]  # shape: (N, 1)
            missed_conn_probs = ort_outputs[1]  # shape: (N, 2)

            # 6. Map predictions, calibrate scores, and enrich each plan
            for i, plan in enumerate(plans):
                vec = vectors[i]
                c_slug = corridor_slugs[i]
                weather = weather_conditions[i]

                pred_delay = float(expected_delays[i, 0])
                pred_missed = float(np.clip(missed_conn_probs[i, 1], 0.0, 1.0))

                exp_delay_min = int(round(max(0.0, pred_delay)))
                missed_prob = round(pred_missed, 2)

                # Tightest buffer
                buffers = [
                    l.risk.transferBufferAfterMinutes
                    for l in plan.legs[:-1]
                    if l.risk.transferBufferAfterMinutes is not None
                ]
                tightest_buf = min(buffers) if buffers else 0

                score, level, adequacy, summary = self.calibrate_risk_score(
                    expected_delay=pred_delay,
                    missed_conn_prob=pred_missed,
                    transfers_count=plan.transfersCount,
                    tightest_buffer=tightest_buf,
                )

                factors, risk_factors = self._generate_factors_and_explanations(
                    plan=plan,
                    vector=vec,
                    corridor_slug=c_slug,
                    tightest_buffer=tightest_buf,
                    weather=weather,
                )

                # Compute punctuality rate from leg punctuality percentages
                avg_punct = sum(l.risk.historicalPunctualityPercent for l in plan.legs) / len(plan.legs) if plan.legs else 100.0
                punct_rate = round(avg_punct / 100.0, 2)

                plan.riskAnalysis = RouteRiskAnalysis(
                    overallRiskScore=score,
                    riskLevel=level,
                    historicalPunctualityRate=punct_rate,
                    tightestBufferMinutes=tightest_buf,
                    bufferAdequacy=adequacy,
                    riskSummaryText=summary,
                    factors=factors,
                    expectedDelayMinutes=exp_delay_min,
                    missedConnectionProbability=missed_prob,
                    riskFactors=risk_factors,
                    isMlComputed=True,
                )

            return plans

        except Exception as exc:
            logger.warning(
                f"Unexpected error during ML risk enrichment: {exc}. Activating deterministic fallback.",
                exc_info=True,
            )
            for plan in plans:
                plan.riskAnalysis = self.deterministic_fallback_analysis(plan)
            return plans

    def enrich_route_plans_sync(
        self,
        plans: List[TransitRoutePlan],
    ) -> List[TransitRoutePlan]:
        """Synchronous wrapper for offline or test environments."""
        try:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop is not None and loop.is_running():
                # Inside running event loop: perform fallback safely
                for plan in plans:
                    plan.riskAnalysis = self.deterministic_fallback_analysis(plan)
                return plans
            return asyncio.run(self.enrich_route_plans(plans))
        except Exception:
            for plan in plans:
                plan.riskAnalysis = self.deterministic_fallback_analysis(plan)
            return plans


risk_service = RiskService()
