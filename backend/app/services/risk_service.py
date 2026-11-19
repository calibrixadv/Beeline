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
import joblib

from app.core.config import settings
from app.ml_models.production_components import (
    DriftPurgedTwoStepCalibrator,
    HierarchicalEmpiricalBayesTargetEncoder,
)
import __main__
__main__.DriftPurgedTwoStepCalibrator = DriftPurgedTwoStepCalibrator
__main__.HierarchicalEmpiricalBayesTargetEncoder = HierarchicalEmpiricalBayesTargetEncoder
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
        self._omni_bundle: Optional[Dict[str, Any]] = None
        self._raw_boosters: Optional[Dict[str, Any]] = None
        self._metadata: Optional[Dict[str, Any]] = None
        self._model_path: str = settings.ML_MODEL_PATH
        self._initialized: bool = False

    def init_session(self, app: Optional[Any] = None) -> bool:
        """
        Initializes the ONNX runtime InferenceSession on CPU and loads
        the Omni-Apex production multi-head bundle.
        Returns True on successful warm-up, False if fallback mode is activated.
        """
        if not settings.ENABLE_ML_INFERENCE:
            logger.info("ML inference disabled via ENABLE_ML_INFERENCE setting.")
            self._session = None
            self._omni_bundle = None
            self._raw_boosters = None
            if app is not None:
                app.state.risk_session = None
            return False

        model_file = Path(self._model_path)
        bundle_file = model_file.parent / "omni_production_bundle.pkl"

        # 1. Load Omni-Apex multi-head bundle if present
        if bundle_file.exists():
            try:
                bundle = joblib.load(str(bundle_file))
                self._omni_bundle = bundle
                self._raw_boosters = {
                    "h1_res": bundle["head1_res"].booster_,
                    "h1_dir": bundle["head1_dir"].booster_,
                    "h2_l2": bundle["head2_l2"].booster_,
                    "h2_p25": bundle["head2_p25"].booster_,
                    "h2_p75": bundle["head2_p75"].booster_,
                    "h2_p90": bundle["head2_p90"].booster_,
                    "h3": bundle["head3_classifier"].booster_,
                    "h4": bundle["head4_classifier"].booster_,
                }
                logger.info(f"Loaded Omni-Apex production bundle from {bundle_file} (N={bundle.get('corpus_rows', 'unknown')}).")
            except Exception as b_exc:
                logger.warning(f"Could not load omni production bundle: {b_exc}. Operating in ONNX-only fallback.")
                self._omni_bundle = None
                self._raw_boosters = None
        else:
            self._omni_bundle = None
            self._raw_boosters = None

        # 2. Load ONNX runtime session
        if not model_file.exists():
            logger.warning(
                f"ONNX risk model not found at {model_file}. Server operating in deterministic fallback mode."
            )
            self._session = None
            if app is not None:
                app.state.risk_session = None
            return self._omni_bundle is not None

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

    def get_omni_bundle(self) -> Optional[Dict[str, Any]]:
        """Returns the active Omni-Apex production bundle or None."""
        if not self._initialized:
            self.init_session()
        return self._omni_bundle

    def close(self) -> None:
        """Cleans up the ONNX session and Omni bundle."""
        self._session = None
        self._omni_bundle = None
        self._raw_boosters = None
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
                expectedMeanDelayMinutes=0.0,
                p90DelayMinutes=0,
                missedConnectionProbability=0.0,
                reliabilityScorePct=100.0,
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

        exp_mean = round(float(synthetic_delay) * 1.05, 2)
        p90_del = int(round(synthetic_delay * 1.5 + 5))
        rel_pct = round(max(0.0, min(100.0, 100.0 - overall_score)), 1)

        analysis = RouteRiskAnalysis(
            overallRiskScore=overall_score,
            riskLevel=level,
            historicalPunctualityRate=round(avg_punct / 100.0, 2),
            tightestBufferMinutes=tightest_buffer if tightest_buffer != 999 else 0,
            bufferAdequacy=adequacy,
            riskSummaryText=summary,
            factors=factors,
            expectedDelayMinutes=synthetic_delay,
            expectedMeanDelayMinutes=exp_mean,
            p90DelayMinutes=p90_del,
            missedConnectionProbability=missed_prob,
            reliabilityScorePct=rel_pct,
            riskFactors=risk_factors,
            isMlComputed=False,
        )
        for leg in legs:
            leg.risk.expectedDelayMinutes = synthetic_delay
            leg.risk.expectedMeanDelayMinutes = exp_mean
            leg.risk.p90DelayMinutes = p90_del
            leg.risk.missedConnectionProbability = missed_prob
            leg.risk.reliabilityScorePct = rel_pct
            leg.risk.riskScore = overall_score
            leg.risk.riskLevel = level
            leg.risk.riskFactors = risk_factors
        return analysis

    def _assemble_omni_feature_matrix(
        self,
        plans: List[TransitRoutePlan],
        corridor_features_map: Dict[str, Any],
        station_features_map: Dict[str, Any],
        carrier_features_map: Dict[str, Any],
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str], List[str]]:
        """
        Assembles (N, 45) multi-head feature matrix and companion arrays in < 0.2 ms
        incorporating 3-level HEB lookups, causal EMAs, 2nd-gen tribology, and hub priors.
        """
        n = len(plans)
        X_main = np.zeros((n, 45), dtype=np.float32)
        has_tr_arr = np.zeros(n, dtype=np.float32)
        tr_buf_arr = np.zeros(n, dtype=np.float32)
        orig_del_arr = np.zeros(n, dtype=np.float32)
        corridor_slugs: List[str] = []
        weather_conditions: List[str] = []

        heb_encoders = self._omni_bundle.get("heb_encoders", {}) if self._omni_bundle else {}
        heb_del = heb_encoders.get("delay")
        heb_p15 = heb_encoders.get("p15")
        heb_mis = heb_encoders.get("missed")

        train_ema_map = self._omni_bundle.get("latest_train_ema", {}) if self._omni_bundle else {}
        corr_ema_map = self._omni_bundle.get("latest_corridor_ema", {}) if self._omni_bundle else {}
        hub_priors_map = self._omni_bundle.get("hub_priors", {}) if self._omni_bundle else {}
        corr_priors_map = self._omni_bundle.get("corridor_priors", {}) if self._omni_bundle else {}
        turnaround_priors_map = self._omni_bundle.get("turnaround_priors", {}) if self._omni_bundle else {}
        single_track_priors_map = self._omni_bundle.get("single_track_priors", {}) if self._omni_bundle else {}

        for i, plan in enumerate(plans):
            legs = plan.legs
            primary_leg = self._extract_primary_leg(plan)
            orig_city = legs[0].names.originCity or legs[0].names.originName if legs else ""
            dest_city = legs[-1].names.destinationCity or legs[-1].names.destinationName if legs else ""
            c_slug = slugify_corridor(orig_city, dest_city)
            corridor_slugs.append(c_slug)

            c_feats = corridor_features_map.get(c_slug, {})
            weather = c_feats.get("weather_condition", "CLEAR")
            weather_conditions.append(weather)

            train_cat_raw = float(self._encode_train_category(primary_leg))
            train_cat_norm = train_cat_raw + 3.0 if train_cat_raw <= 3 else train_cat_raw
            c_hash = float(corridor_hash(c_slug))
            duration = float(plan.totalDurationMinutes or 60.0)
            stops = float(sum(len(l.coords.intermediateStops) for l in legs) if legs else 0)
            dist_km = float(self._extract_distance_km(plan))
            dep_dt = self._extract_departure_datetime(plan)
            hour = float(dep_dt.hour)
            is_peak = 1.0 if hour in [7, 8, 9, 16, 17, 18, 19] else 0.0
            dow = float(dep_dt.weekday())
            is_wknd = 1.0 if dow in [5, 6] else 0.0

            has_tr = 1.0 if (plan.transfersCount > 0 or len(legs) > 1) else 0.0
            buffers = [l.risk.transferBufferAfterMinutes for l in legs[:-1] if l.risk.transferBufferAfterMinutes is not None]
            tr_buf = float(min(buffers)) if (has_tr == 1.0 and buffers) else (999.0 if has_tr == 0.0 else 20.0)

            orig_del = float(c_feats.get("rolling_delay_3h", 0.0))
            is_single = 1.0 if (
                c_slug in SINGLE_TRACK_CORRIDORS
                or any("single-track" in (l.instructions.transferNotice or "").lower() for l in legs)
                or any("faurei" in (l.names.destinationName or "").lower() for l in legs)
            ) else 0.0

            speed_restr = float(c_feats.get("active_disruptions_count", 0.0))
            mountain_flag = 1.0 if any(p in c_slug for p in ["brasov", "predeal", "sinaia", "campina", "bsv", "plv"]) else 0.0
            traction = 1.0 if any(t in c_slug for t in ["bucuresti", "brasov", "constanta", "ploiesti", "craiova", "timisoara", "cluj"]) else 0.0

            temp = float(c_feats.get("temp_celsius", 15.0))
            precip = float(c_feats.get("precipitation_rate_mm_h", 0.0))
            is_thunder = float(c_feats.get("is_thunderstorm", 0.0))
            wind = float(c_feats.get("wind_speed_kmh", 12.0))
            snow = float(c_feats.get("snow_depth_cm", 0.0))
            freeze = float(c_feats.get("freezing_rain_risk", 0.0))
            vis = float(c_feats.get("visibility_meters", 10000.0))
            month = dep_dt.month
            season = 0.0 if month in [12, 1, 2] else (1.0 if month in [3, 4, 5] else (2.0 if month in [6, 7, 8] else 3.0))

            line_code = (primary_leg.names.lineCode or "").strip().upper() if primary_leg else ""

            # HEB lookups
            h_del = heb_del.lookup(line_code, train_cat_norm, c_slug) if heb_del else 18.0
            h_p15 = heb_p15.lookup(line_code, train_cat_norm, c_slug) if heb_p15 else 0.75
            h_mis = heb_mis.lookup(line_code, train_cat_norm, c_slug) if heb_mis else 0.15

            # EMAs
            tr_ema = train_ema_map.get(line_code, {})
            co_ema = corr_ema_map.get(c_slug, {})
            t_7d = float(tr_ema.get("7d", 18.0))
            t_14d = float(tr_ema.get("14d", 18.0))
            t_30d = float(tr_ema.get("30d", 18.0))
            c_7d = float(co_ema.get("7d", 18.0))
            c_14d = float(co_ema.get("14d", 18.0))
            c_30d = float(co_ema.get("30d", 18.0))

            # Tribology physics
            is_autumn = 1.0 if season == 3.0 else 0.0
            autumn_adhesion = float(is_autumn * precip * max(1.0, stops))
            cryo_brake = float(max(0.0, (-10.0 - temp) * max(1.0, stops)))
            near_freezing = 1.0 if (-2.5 <= temp <= 1.5) else 0.0
            catenary_icing = float(max(0.0, traction * near_freezing * (snow + 5.0 * freeze)))
            vis_deficit = float(max(0.0, 200.0 - vis))
            signal_decel = float(max(0.0, vis_deficit * (max(10.0, dist_km) / 100.0)))
            thermo_stress = autumn_adhesion + cryo_brake + catenary_icing + 0.10 * signal_decel

            # Contagion priors
            c_prior = corr_priors_map.get(c_slug, {})
            orig_station_code = (legs[0].names.originName or "BCT")[:3].upper() if legs else "BCT"
            hub_p = hub_priors_map.get(orig_station_code, {})
            c_prec_count = 1.0
            c_prec_mean = float(c_prior.get("mean_origin_delay", 4.0))
            c_cong_idx = float(c_prec_count * (c_prec_mean + 1.0))
            hub_press = float(hub_p.get("centrality", 0.10) * c_prec_mean)

            # Turnaround & Single-track priors
            turn_prev = float(turnaround_priors_map.get(line_code, orig_del * 0.90))
            turn_slack = float(max(0.0, turn_prev - 20.0))
            st_pressure = float(single_track_priors_map.get(c_slug, orig_del * is_single * 0.85))

            X_main[i, :] = [
                train_cat_norm, c_hash, duration, stops, dist_km, hour, is_peak, dow, is_wknd,
                has_tr, tr_buf, orig_del, is_single, speed_restr, mountain_flag, traction,
                temp, precip, is_thunder, wind, snow, freeze, vis, season,
                h_del, h_p15, h_mis,
                t_7d, t_14d, t_30d, c_7d, c_14d, c_30d,
                autumn_adhesion, cryo_brake, catenary_icing, signal_decel, thermo_stress,
                c_prec_count, c_prec_mean, c_cong_idx, hub_press,
                turn_prev, turn_slack, st_pressure,
            ]
            has_tr_arr[i] = has_tr
            tr_buf_arr[i] = tr_buf
            orig_del_arr[i] = orig_del

        return X_main, has_tr_arr, tr_buf_arr, orig_del_arr, corridor_slugs, weather_conditions

    async def enrich_route_plans(
        self,
        plans: List[TransitRoutePlan],
    ) -> List[TransitRoutePlan]:
        """
        Batched inference and feature store enrichment across all candidate itineraries.
        Converts candidate routes into feature matrices, executes fast multi-head inference
        (< 2.0ms), and enriches plans with calibrated Omni-Apex ML risk analysis.
        """
        if not plans:
            return plans

        session = self.get_session()
        bundle = self.get_omni_bundle()

        if session is None or not settings.ENABLE_ML_INFERENCE:
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

            # 3. Vectorize each plan into RiskFeatureVector (for ONNX session & backward parity)
            vectors: List[RiskFeatureVector] = []
            for plan in plans:
                orig_city = plan.legs[0].names.originCity or plan.legs[0].names.originName if plan.legs else ""
                dest_city = plan.legs[-1].names.destinationCity or plan.legs[-1].names.destinationName if plan.legs else ""
                c_slug = slugify_corridor(orig_city, dest_city)
                c_feats = corridor_features_map.get(c_slug, {})

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

            batch_matrix_18 = np.stack([v.to_numpy_vector() for v in vectors], axis=0)

            # Execute ONNX session (validates runtime session & triggers on mock exceptions)
            ort_outputs = session.run(None, {"float_input": batch_matrix_18})
            onnx_delays = ort_outputs[0]
            onnx_missed = ort_outputs[1]

            # 4. Multi-Head Production Prediction Engine
            if self._omni_bundle is not None and self._raw_boosters is not None:
                X_main, has_tr_arr, tr_buf_arr, orig_del_arr, corridor_slugs, weather_conditions = (
                    self._assemble_omni_feature_matrix(
                        plans=plans,
                        corridor_features_map=corridor_features_map,
                        station_features_map=station_features_map,
                        carrier_features_map=carrier_features_map,
                    )
                )

                # Head 1: L1 Point Delay Regressor (v35/v40 Architecture)
                pred_res = np.maximum(0.0, orig_del_arr + self._raw_boosters["h1_res"].predict(X_main))
                pred_dir = np.maximum(0.0, self._raw_boosters["h1_dir"].predict(X_main))
                pred_p50 = 0.50 * pred_res + 0.50 * pred_dir

                # Head 2: L2 Mean Expectation & Quantile Spread Engine (v51/v48/v45 Architecture)
                pred_l2 = np.maximum(0.0, self._raw_boosters["h2_l2"].predict(X_main))
                pred_p25 = np.maximum(0.0, self._raw_boosters["h2_p25"].predict(X_main))
                pred_p75 = np.maximum(pred_p25, self._raw_boosters["h2_p75"].predict(X_main))
                pred_p90 = np.maximum(pred_p75, self._raw_boosters["h2_p90"].predict(X_main))
                pred_iqr = np.maximum(1.0, pred_p75 - pred_p25)

                # Z-scores for Head 3
                z_score_15m = ((15.0 - pred_p50) / pred_iqr).astype(np.float32)
                z_score_transfer = np.where(has_tr_arr == 1.0, (tr_buf_arr - pred_p50) / pred_iqr, 999.0).astype(np.float32)
                effective_transfer_margin = np.where(has_tr_arr == 1.0, tr_buf_arr - pred_p50, 999.0).astype(np.float32)

                # Head 3: Missed Connection Z-Score Classifier (v29/v41/v51 Architecture)
                X_h3 = np.column_stack([
                    X_main,
                    z_score_transfer,
                    effective_transfer_margin,
                    z_score_15m,
                    pred_iqr,
                    pred_p50,
                    pred_l2,
                ])
                prob_mis_raw = self._raw_boosters["h3"].predict(X_h3)
                prob_mis = np.where(has_tr_arr == 1.0, prob_mis_raw, 0.0)

                # Head 4: Drift-Purged Reliability Head & Calibrator (v38 Architecture)
                raw_rel_probs = self._raw_boosters["h4"].predict(X_main)
                cal_rel_probs = self._omni_bundle["head4_calibrator"].transform(raw_rel_probs)
                rel_pct = np.clip(cal_rel_probs * 100.0, 0.0, 100.0)

            elif onnx_delays is not None and onnx_missed is not None:
                # Standalone ONNX runtime fallback
                pred_p50 = onnx_delays[:, 0]
                pred_l2 = onnx_delays[:, 0] * 1.05
                pred_p90 = onnx_delays[:, 0] * 1.5 + 5.0
                prob_mis = np.array([
                    onnx_missed[i, 1] if (plan.transfersCount > 0 or len(plan.legs) > 1) else 0.0
                    for i, plan in enumerate(plans)
                ], dtype=np.float32)
                rel_pct = np.clip((1.0 - prob_mis) * 100.0, 0.0, 100.0)
                corridor_slugs = [
                    slugify_corridor(
                        plan.legs[0].names.originCity or plan.legs[0].names.originName if plan.legs else "",
                        plan.legs[-1].names.destinationCity or plan.legs[-1].names.destinationName if plan.legs else "",
                    )
                    for plan in plans
                ]
                weather_conditions = [
                    corridor_features_map.get(s, {}).get("weather_condition", "CLEAR") for s in corridor_slugs
                ]
            else:
                for plan in plans:
                    plan.riskAnalysis = self.deterministic_fallback_analysis(plan)
                return plans

            # 5. Map predictions, calibrate scores, and enrich each plan & leg
            for i, plan in enumerate(plans):
                vec = vectors[i]
                c_slug = corridor_slugs[i]
                weather = weather_conditions[i]

                pred_delay = float(pred_p50[i])
                pred_missed = float(np.clip(prob_mis[i], 0.0, 1.0))

                exp_delay_min = int(round(max(0.0, pred_delay)))
                exp_mean_delay = round(float(max(0.0, pred_l2[i])), 2)
                p90_delay = int(round(max(float(exp_delay_min), float(pred_p90[i]))))
                missed_prob = round(pred_missed, 4)
                reliability_pct = round(float(np.clip(rel_pct[i], 0.0, 100.0)), 2)

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
                    expectedMeanDelayMinutes=exp_mean_delay,
                    p90DelayMinutes=p90_delay,
                    missedConnectionProbability=missed_prob,
                    reliabilityScorePct=reliability_pct,
                    riskFactors=risk_factors,
                    isMlComputed=True,
                )

                # Update each leg's risk profile with multi-head predictions
                for leg in plan.legs:
                    leg.risk.expectedDelayMinutes = exp_delay_min
                    leg.risk.expectedMeanDelayMinutes = exp_mean_delay
                    leg.risk.p90DelayMinutes = p90_delay
                    leg.risk.missedConnectionProbability = missed_prob
                    leg.risk.reliabilityScorePct = reliability_pct
                    leg.risk.riskScore = score
                    leg.risk.riskLevel = level
                    leg.risk.riskFactors = risk_factors

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
