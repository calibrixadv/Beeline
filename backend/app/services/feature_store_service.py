import asyncio
from datetime import datetime, timezone
import hashlib
import logging
import re
from typing import Any, Dict, List, Optional
import unicodedata

from app.core.config import settings
from app.core.redis import get_redis
from app.services.corridor_service import POPULAR_CORRIDORS
from app.services.disruption_service import DisruptionService
from app.services.station_service import STATIONS_DATA
from app.services.train_service import OPERATORS_DATA, TRAINS_DATA

logger = logging.getLogger(__name__)

ROMANIAN_HYPHENATED_CITIES = [
    "drobeta-turnu-severin",
    "drobeta-turnu severin",
    "cluj-napoca",
    "targu-mures",
    "targu-jiu",
    "piatra-neamt",
    "ramnicu-valcea",
    "baia-mare",
    "odorheiu-secuiesc",
    "slanic-moldova",
]


def _clean_slug_token(s: str) -> str:
    normalized = unicodedata.normalize("NFKD", s).encode("ASCII", "ignore").decode("utf-8")
    alphanumeric = re.sub(r"[^\w\s-]", "", normalized).strip().lower()
    return re.sub(r"[-\s]+", "_", alphanumeric)


def slugify_corridor(origin: str, destination: str = "") -> str:
    """
    Computes a canonical, deterministic slug for transit corridors.
    e.g. slugify_corridor("Galați", "București Nord") -> "galati-bucuresti_nord"
         slugify_corridor("Cluj-Napoca - Oradea") -> "cluj_napoca-oradea"
         slugify_corridor("Drobeta-Turnu Severin", "Craiova") -> "drobeta_turnu_severin-craiova"
    """
    origin = origin.strip() if origin else ""
    destination = destination.strip() if destination else ""

    if destination:
        return f"{_clean_slug_token(origin)}-{_clean_slug_token(destination)}"

    if not origin:
        return ""

    # Check for directional / explicit corridor separators
    sep_match = re.search(r"\s*(?:->|–|—|⇄|➔|\bto\b|/)\s*|\s+-\s+", origin, flags=re.IGNORECASE)
    if sep_match:
        part1 = origin[:sep_match.start()]
        part2 = origin[sep_match.end():]
        if part1 and part2:
            return f"{_clean_slug_token(part1)}-{_clean_slug_token(part2)}"

    # Pre-replace known Romanian hyphenated city names to preserve intra-city words
    normalized_origin = origin
    for city in ROMANIAN_HYPHENATED_CITIES:
        pattern = re.compile(re.escape(city), re.IGNORECASE)
        normalized_origin = pattern.sub(city.replace("-", "_").replace(" ", "_"), normalized_origin)

    if "-" in normalized_origin:
        parts = normalized_origin.split("-", 1)
        if parts[0] and parts[1]:
            return f"{_clean_slug_token(parts[0])}-{_clean_slug_token(parts[1])}"

    return _clean_slug_token(origin)


def slugify_station(station_code: str) -> str:
    """Standardizes station code / identifier for cache keys."""
    if not station_code:
        return ""
    normalized = unicodedata.normalize("NFKD", station_code).encode("ASCII", "ignore").decode("utf-8")
    cleaned = re.sub(r"[:/.\s-]+", "_", normalized).strip("_").lower()
    return re.sub(r"[^\w-]", "", cleaned)


def slugify_carrier(carrier_name: str) -> str:
    """Standardizes transit operator / carrier identifier for cache keys."""
    if not carrier_name:
        return ""
    normalized = unicodedata.normalize("NFKD", carrier_name).encode("ASCII", "ignore").decode("utf-8")
    cleaned = re.sub(r"[^\w\s-]", "", normalized).strip().lower()
    return re.sub(r"[\s_]+", "-", cleaned)


def corridor_hash(corridor_slug: str) -> int:
    """Computes a stable int16 hash % 1000 independent of Python runtime process random seed."""
    if not corridor_slug:
        return 0
    digest = hashlib.md5(corridor_slug.encode("utf-8")).hexdigest()
    return int(digest, 16) % 1000


def corridor_key(corridor_id: str) -> str:
    return f"{settings.REDIS_FEATURE_PREFIX}corridor:{corridor_id.strip().lower()}"


def station_key(station_code: str) -> str:
    return f"{settings.REDIS_FEATURE_PREFIX}station:{station_code.strip().lower()}"


def carrier_key(carrier_id: str) -> str:
    return f"{settings.REDIS_FEATURE_PREFIX}carrier:{carrier_id.strip().lower()}"


DEFAULT_CORRIDOR_FEATURES: Dict[str, Any] = {
    "active_disruptions_count": 0,
    "max_disruption_severity": 0,
    "rolling_delay_3h": 0.0,
    "rolling_delay_24h": 0.0,
    "corridor_punctuality_rate": 0.88,
    "weather_condition": "CLEAR",
    "weather_alert_severity": 0,
    "external_factors_score": 0.0,
    "updated_at": "",
}

DEFAULT_STATION_FEATURES: Dict[str, Any] = {
    "congestion_index": 0.30,
    "transfer_delay_buffer_variance": 0.0,
    "avg_transfer_delay": 0.0,
    "platform_reassignment_risk": 0,
    "active_disruptions_count": 0,
    "weather_alert_severity": 0,
    "punctuality_rate": 0.88,
    "updated_at": "",
}

DEFAULT_CARRIER_FEATURES: Dict[str, Any] = {
    "baseline_punctuality": 0.88,
    "chronic_delay_minutes": 5.0,
    "active_incident_count": 0,
    "updated_at": "",
}


def _parse_corridor_features(raw: Dict[str, str]) -> Dict[str, Any]:
    features = dict(DEFAULT_CORRIDOR_FEATURES)
    if not raw:
        return features
    try:
        if "active_disruptions_count" in raw:
            features["active_disruptions_count"] = int(raw["active_disruptions_count"])
        if "max_disruption_severity" in raw:
            features["max_disruption_severity"] = int(raw["max_disruption_severity"])
        if "rolling_delay_3h" in raw:
            features["rolling_delay_3h"] = float(raw["rolling_delay_3h"])
        if "rolling_delay_24h" in raw:
            features["rolling_delay_24h"] = float(raw["rolling_delay_24h"])
        if "corridor_punctuality_rate" in raw:
            features["corridor_punctuality_rate"] = float(raw["corridor_punctuality_rate"])
        if "weather_condition" in raw:
            features["weather_condition"] = str(raw["weather_condition"])
        if "weather_alert_severity" in raw:
            features["weather_alert_severity"] = int(raw["weather_alert_severity"])
        if "external_factors_score" in raw:
            features["external_factors_score"] = float(raw["external_factors_score"])
        if "updated_at" in raw:
            features["updated_at"] = str(raw["updated_at"])
    except Exception as exc:
        logger.warning(f"Error parsing corridor features: {exc}")
    return features


def _parse_station_features(raw: Dict[str, str]) -> Dict[str, Any]:
    features = dict(DEFAULT_STATION_FEATURES)
    if not raw:
        return features
    try:
        if "congestion_index" in raw:
            features["congestion_index"] = float(raw["congestion_index"])
        if "avg_transfer_delay" in raw:
            val = float(raw["avg_transfer_delay"])
            features["avg_transfer_delay"] = val
            features["transfer_delay_buffer_variance"] = val
        if "transfer_delay_buffer_variance" in raw:
            val = float(raw["transfer_delay_buffer_variance"])
            features["transfer_delay_buffer_variance"] = val
            features["avg_transfer_delay"] = val
        if "platform_reassignment_risk" in raw:
            features["platform_reassignment_risk"] = int(raw["platform_reassignment_risk"])
        if "active_disruptions_count" in raw:
            features["active_disruptions_count"] = int(raw["active_disruptions_count"])
        if "weather_alert_severity" in raw:
            features["weather_alert_severity"] = int(raw["weather_alert_severity"])
        if "punctuality_rate" in raw:
            features["punctuality_rate"] = float(raw["punctuality_rate"])
        if "updated_at" in raw:
            features["updated_at"] = str(raw["updated_at"])
    except Exception as exc:
        logger.warning(f"Error parsing station features: {exc}")
    return features


def _parse_carrier_features(raw: Dict[str, str]) -> Dict[str, Any]:
    features = dict(DEFAULT_CARRIER_FEATURES)
    if not raw:
        return features
    try:
        if "baseline_punctuality" in raw:
            features["baseline_punctuality"] = float(raw["baseline_punctuality"])
        if "chronic_delay_minutes" in raw:
            features["chronic_delay_minutes"] = float(raw["chronic_delay_minutes"])
        if "active_incident_count" in raw:
            features["active_incident_count"] = int(raw["active_incident_count"])
        if "updated_at" in raw:
            features["updated_at"] = str(raw["updated_at"])
    except Exception as exc:
        logger.warning(f"Error parsing carrier features: {exc}")
    return features


class FeatureStoreService:
    @staticmethod
    def slugify_corridor(origin: str, destination: str = "") -> str:
        return slugify_corridor(origin, destination)

    @staticmethod
    def slugify_station(station_code: str) -> str:
        return slugify_station(station_code)

    @staticmethod
    def slugify_carrier(carrier_name: str) -> str:
        return slugify_carrier(carrier_name)

    @staticmethod
    def corridor_hash(corridor_slug: str) -> int:
        return corridor_hash(corridor_slug)

    @staticmethod
    async def get_corridor_features(corridor_id: str) -> Dict[str, Any]:
        """
        Retrieves real-time features for a given corridor ID.
        Falls back safely to realistic defaults if key is missing or Redis is down.
        """
        cid = corridor_id.strip().lower()
        key = corridor_key(cid)
        try:
            redis = get_redis()
            data = await redis.hgetall(key)
            if not data:
                return dict(DEFAULT_CORRIDOR_FEATURES)
            return _parse_corridor_features(data)
        except Exception as exc:
            logger.debug(f"Redis get_corridor_features failed ({cid}): {exc}")
            return dict(DEFAULT_CORRIDOR_FEATURES)

    @staticmethod
    async def get_station_features(station_code: str) -> Dict[str, Any]:
        """
        Retrieves congestion and transfer friction metrics for a station code.
        Falls back safely to defaults if missing or Redis is unavailable.
        """
        code = station_code.strip().lower()
        key = station_key(code)
        try:
            redis = get_redis()
            data = await redis.hgetall(key)
            if not data:
                return dict(DEFAULT_STATION_FEATURES)
            return _parse_station_features(data)
        except Exception as exc:
            logger.debug(f"Redis get_station_features failed ({code}): {exc}")
            return dict(DEFAULT_STATION_FEATURES)

    @staticmethod
    async def get_carrier_features(carrier_id: str) -> Dict[str, Any]:
        """
        Retrieves baseline reliability and operational stats for a transit carrier.
        Falls back safely to defaults if missing or Redis is unavailable.
        """
        cid = carrier_id.strip().lower()
        key = carrier_key(cid)
        try:
            redis = get_redis()
            data = await redis.hgetall(key)
            if not data:
                # Also try slugified version if raw name passed
                alt_cid = slugify_carrier(cid)
                if alt_cid != cid:
                    data = await redis.hgetall(carrier_key(alt_cid))
            if not data:
                return dict(DEFAULT_CARRIER_FEATURES)
            return _parse_carrier_features(data)
        except Exception as exc:
            logger.debug(f"Redis get_carrier_features failed ({cid}): {exc}")
            return dict(DEFAULT_CARRIER_FEATURES)

    @staticmethod
    async def batch_get_corridor_features(corridor_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Executes pipelined Redis HGETALL batch read for sub-millisecond retrieval.
        Returns a mapping of corridor_id -> features.
        """
        if not corridor_ids:
            return {}
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            for cid in corridor_ids:
                pipe.hgetall(corridor_key(cid))
            results = await pipe.execute()
            out = {}
            for cid, raw in zip(corridor_ids, results):
                out[cid] = _parse_corridor_features(raw) if raw else dict(DEFAULT_CORRIDOR_FEATURES)
            return out
        except Exception as exc:
            logger.debug(f"Redis batch_get_corridor_features failed: {exc}")
            return {cid: dict(DEFAULT_CORRIDOR_FEATURES) for cid in corridor_ids}

    @staticmethod
    async def batch_get_station_features(station_codes: List[str]) -> Dict[str, Dict[str, Any]]:
        """Executes pipelined Redis HGETALL batch read for stations."""
        if not station_codes:
            return {}
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            for code in station_codes:
                pipe.hgetall(station_key(code))
            results = await pipe.execute()
            out = {}
            for code, raw in zip(station_codes, results):
                out[code] = _parse_station_features(raw) if raw else dict(DEFAULT_STATION_FEATURES)
            return out
        except Exception as exc:
            logger.debug(f"Redis batch_get_station_features failed: {exc}")
            return {code: dict(DEFAULT_STATION_FEATURES) for code in station_codes}

    @staticmethod
    async def batch_get_carrier_features(carrier_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Executes pipelined Redis HGETALL batch read for carriers."""
        if not carrier_ids:
            return {}
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            for cid in carrier_ids:
                pipe.hgetall(carrier_key(cid))
            results = await pipe.execute()
            out = {}
            for cid, raw in zip(carrier_ids, results):
                out[cid] = _parse_carrier_features(raw) if raw else dict(DEFAULT_CARRIER_FEATURES)
            return out
        except Exception as exc:
            logger.debug(f"Redis batch_get_carrier_features failed: {exc}")
            return {cid: dict(DEFAULT_CARRIER_FEATURES) for cid in carrier_ids}

    @staticmethod
    async def set_corridor_features(
        corridor_id: str,
        features: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """Pipelined write of corridor features hash with sliding TTL."""
        cid = corridor_id.strip().lower()
        key = corridor_key(cid)
        ttl_seconds = ttl if ttl is not None else settings.REDIS_FEATURE_TTL_SECONDS
        payload = {k: str(v) for k, v in features.items()}
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            pipe.hset(key, mapping=payload)
            pipe.expire(key, ttl_seconds)
            await pipe.execute()
            return True
        except Exception as exc:
            logger.debug(f"Redis set_corridor_features failed ({cid}): {exc}")
            return False

    @staticmethod
    async def set_station_features(
        station_code: str,
        features: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """Pipelined write of station features hash with sliding TTL."""
        code = station_code.strip().lower()
        key = station_key(code)
        ttl_seconds = ttl if ttl is not None else settings.REDIS_FEATURE_TTL_SECONDS
        payload = {k: str(v) for k, v in features.items()}
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            pipe.hset(key, mapping=payload)
            pipe.expire(key, ttl_seconds)
            await pipe.execute()
            return True
        except Exception as exc:
            logger.debug(f"Redis set_station_features failed ({code}): {exc}")
            return False

    @staticmethod
    async def set_carrier_features(
        carrier_id: str,
        features: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """Pipelined write of carrier features hash with sliding TTL."""
        cid = carrier_id.strip().lower()
        key = carrier_key(cid)
        ttl_seconds = ttl if ttl is not None else settings.REDIS_FEATURE_TTL_SECONDS
        payload = {k: str(v) for k, v in features.items()}
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            pipe.hset(key, mapping=payload)
            pipe.expire(key, ttl_seconds)
            await pipe.execute()
            return True
        except Exception as exc:
            logger.debug(f"Redis set_carrier_features failed ({cid}): {exc}")
            return False

    @staticmethod
    async def sync_all_features() -> Dict[str, Any]:
        """
        Aggregates operational metrics across disruptions, trains, stations,
        carriers, and synthetic ANM weather alert conditions, writing pre-computed
        feature hashes to Redis in an atomic pipeline.
        Zero SQL table locks or long-running database queries are triggered.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        disruptions = DisruptionService.get_disruptions()
        sev_map = {"INFO": 1, "WARNING": 2, "CRITICAL": 3}

        # ---------------------------------------------------------------------
        # 1. Prepare Corridor Features
        # ---------------------------------------------------------------------
        corridor_data: Dict[str, Dict[str, Any]] = {}

        # Aggregate unique corridor endpoints from POPULAR_CORRIDORS and TRAINS_DATA
        corridor_pairs = []
        seen_pairs = set()

        for c in POPULAR_CORRIDORS:
            pair = (c.origin, c.destination)
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                corridor_pairs.append(pair)

        for tr in TRAINS_DATA:
            orig = tr.origin.city or tr.origin.name
            dest = tr.destination.city or tr.destination.name
            pair = (orig, dest)
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                corridor_pairs.append(pair)

        for origin, dest in corridor_pairs:
            slug = slugify_corridor(origin, dest)
            if not slug:
                continue

            # Identify matching disruptions
            matching_disruptions = []
            for d in disruptions:
                combined_text = f"{d.headline} {d.description} {' '.join(d.affectedLines)}".lower()
                origin_clean = origin.split()[0].lower()
                dest_clean = dest.split()[0].lower()
                if (origin_clean in combined_text and dest_clean in combined_text) or \
                   ("ploiesti" in combined_text and "brasov" in slug) or \
                   ("tiglina" in combined_text and "galati" in slug) or \
                   ("gara de nord" in combined_text and "bucuresti" in slug):
                    matching_disruptions.append(d)

            d_count = len(matching_disruptions)
            max_sev = max([sev_map.get(d.severity.upper(), 0) for d in matching_disruptions], default=0)
            delay_est = sum([d.estimatedDelayMinutes for d in matching_disruptions])

            # Romanian rail network calibrations
            if "brasov" in slug:
                rolling_3h = max(12.0, float(delay_est))
                rolling_24h = 8.5
                punctuality = 0.86
                weather = "RAIN"
                w_sev = 1
            elif "galati" in slug:
                rolling_3h = max(8.0, float(delay_est))
                rolling_24h = 6.0
                punctuality = 0.89
                weather = "CLEAR"
                w_sev = 0
            else:
                rolling_3h = float(delay_est)
                rolling_24h = round(delay_est * 0.7, 1)
                punctuality = max(0.70, round(0.95 - (rolling_3h * 0.008), 2))
                weather = "CLEAR"
                w_sev = 0

            external_score = round(
                min(1.0, 0.25 * max_sev + 0.15 * w_sev + min(0.3, rolling_3h / 50.0)),
                2
            )

            c_feat = {
                "active_disruptions_count": d_count,
                "max_disruption_severity": max_sev,
                "rolling_delay_3h": rolling_3h,
                "rolling_delay_24h": rolling_24h,
                "corridor_punctuality_rate": punctuality,
                "weather_condition": weather,
                "weather_alert_severity": w_sev,
                "external_factors_score": external_score,
                "updated_at": now_iso,
            }
            corridor_data[slug] = c_feat

            # Store reverse corridor
            rev_slug = slugify_corridor(dest, origin)
            if rev_slug and rev_slug not in corridor_data:
                corridor_data[rev_slug] = c_feat

            # Store short city-to-city aliases (e.g. bucuresti-brasov for bucuresti_nord-brasov)
            short_slug = slugify_corridor(origin.split()[0], dest.split()[0])
            if short_slug and short_slug not in corridor_data:
                corridor_data[short_slug] = c_feat
            rev_short_slug = slugify_corridor(dest.split()[0], origin.split()[0])
            if rev_short_slug and rev_short_slug not in corridor_data:
                corridor_data[rev_short_slug] = c_feat

        # ---------------------------------------------------------------------
        # 2. Prepare Station Features
        # ---------------------------------------------------------------------
        station_data: Dict[str, Dict[str, Any]] = {}
        station_congestions = {
            "bct": 0.65,
            "bsv": 0.45,
            "cjn": 0.40,
            "tim": 0.35,
            "glt": 0.25,
            "pls": 0.35,
            "plv": 0.30,
            "ard": 0.25,
            "cta": 0.35,
        }
        station_punctuality = {
            "bct": 0.85,
            "bsv": 0.89,
            "cjn": 0.91,
            "tim": 0.90,
            "glt": 0.92,
            "cta": 0.90,
        }

        for st in STATIONS_DATA:
            code_lower = st.code.lower()
            cong = station_congestions.get(code_lower, 0.30)
            punct = station_punctuality.get(code_lower, 0.88)

            # Reassignment risk (e.g. BCT maintenance)
            has_maint = any(
                "interlocking" in d.description.lower() or "platform" in d.description.lower()
                for d in disruptions if st.name.lower() in d.headline.lower() or st.city.lower() in d.headline.lower()
            )
            reassignment = 1 if has_maint or cong > 0.60 else 0
            avg_delay = 4.2 if code_lower == "bct" else (2.5 if code_lower == "bsv" else 0.5)

            st_features = {
                "congestion_index": cong,
                "avg_transfer_delay": avg_delay,
                "transfer_delay_buffer_variance": avg_delay,
                "platform_reassignment_risk": reassignment,
                "active_disruptions_count": 1 if has_maint else 0,
                "weather_alert_severity": 1 if code_lower in ["bsv", "sna"] else 0,
                "punctuality_rate": punct,
                "updated_at": now_iso,
            }
            station_data[code_lower] = st_features

        # ---------------------------------------------------------------------
        # 3. Prepare Carrier Features (Romanian Rail & Urban Transit Operators)
        # ---------------------------------------------------------------------
        carrier_data: Dict[str, Dict[str, Any]] = {}

        # Benchmarks: Metrorex 0.98, Transurb 0.93, CTP 0.92, CFR 0.82 (from plan.md 1.1 & 4.1)
        carrier_benchmarks = {
            "metrorex": {"punctuality": 0.98, "chronic_delay": 1.5},
            "transurb": {"punctuality": 0.93, "chronic_delay": 3.5},
            "ctp-cluj": {"punctuality": 0.92, "chronic_delay": 4.0},
            "softrans": {"punctuality": 0.91, "chronic_delay": 6.0},
            "stb": {"punctuality": 0.89, "chronic_delay": 7.0},
            "astra-trans-carpatic": {"punctuality": 0.88, "chronic_delay": 8.0},
            "transferoviar-calatori": {"punctuality": 0.87, "chronic_delay": 9.0},
            "regio-calatori": {"punctuality": 0.86, "chronic_delay": 10.0},
            "cfr-calatori": {"punctuality": 0.82, "chronic_delay": 14.5},
            "interregional-calatori": {"punctuality": 0.80, "chronic_delay": 15.0},
        }

        # Index operators from train_service OPERATORS_DATA
        for op in OPERATORS_DATA:
            op_slug = slugify_carrier(op.id)
            bench = carrier_benchmarks.get(op_slug, {"punctuality": 0.88, "chronic_delay": 8.0})

            # Count disruptions affecting this operator
            incidents = sum(
                1 for d in disruptions
                if (d.operator and d.operator.lower() in [op.name.lower(), op.shortName.lower(), op_slug]) or
                   (op.name.lower() in d.description.lower() or op.shortName.lower() in d.headline.lower())
            )

            c_feat = {
                "baseline_punctuality": bench["punctuality"],
                "chronic_delay_minutes": bench["chronic_delay"],
                "active_incident_count": incidents,
                "updated_at": now_iso,
            }
            carrier_data[op_slug] = c_feat
            # Also store with underscore key for alias lookups (e.g. cfr_calatori)
            underscore_slug = op_slug.replace("-", "_")
            if underscore_slug != op_slug:
                carrier_data[underscore_slug] = c_feat

        # Include urban transit operators
        for urban_slug, bench in carrier_benchmarks.items():
            if urban_slug not in carrier_data:
                incidents = sum(
                    1 for d in disruptions
                    if (d.operator and urban_slug in d.operator.lower()) or (urban_slug in d.headline.lower())
                )
                c_feat = {
                    "baseline_punctuality": bench["punctuality"],
                    "chronic_delay_minutes": bench["chronic_delay"],
                    "active_incident_count": incidents,
                    "updated_at": now_iso,
                }
                carrier_data[urban_slug] = c_feat
                underscore_slug = urban_slug.replace("-", "_")
                if underscore_slug != urban_slug:
                    carrier_data[underscore_slug] = c_feat

        # ---------------------------------------------------------------------
        # 4. Pipeline write to Redis (if reachable)
        # ---------------------------------------------------------------------
        try:
            redis = get_redis()
            pipe = redis.pipeline()

            for cid, c_features in corridor_data.items():
                k = corridor_key(cid)
                pipe.hset(k, mapping={k_: str(v_) for k_, v_ in c_features.items()})
                pipe.expire(k, settings.REDIS_FEATURE_TTL_SECONDS)

            for scode, s_features in station_data.items():
                k = station_key(scode)
                pipe.hset(k, mapping={k_: str(v_) for k_, v_ in s_features.items()})
                pipe.expire(k, settings.REDIS_FEATURE_TTL_SECONDS)

            for car_id, car_features in carrier_data.items():
                k = carrier_key(car_id)
                pipe.hset(k, mapping={k_: str(v_) for k_, v_ in car_features.items()})
                pipe.expire(k, settings.REDIS_FEATURE_TTL_SECONDS)

            await pipe.execute()
            logger.info(
                f"Feature store sync cycle completed. Pipelined {len(corridor_data)} corridors, "
                f"{len(station_data)} stations, and {len(carrier_data)} carriers."
            )
        except Exception as exc:
            logger.debug(f"Redis pipeline write during sync_all_features skipped/failed: {exc}")

        return {
            "corridors": corridor_data,
            "stations": station_data,
            "carriers": carrier_data,
            "synced_at": now_iso
        }


feature_store_service = FeatureStoreService()


async def corridor_feature_sync_worker() -> None:
    """
    Background asynchronous worker running during FastAPI lifespan.
    Periodically synchronizes live transit corridor, station, and carrier features into Redis
    without blocking SQL connections.
    """
    logger.info("Starting corridor_feature_sync_worker background task.")
    while True:
        try:
            await FeatureStoreService.sync_all_features()
        except asyncio.CancelledError:
            logger.info("corridor_feature_sync_worker cancelled, exiting.")
            break
        except Exception as exc:
            logger.warning(f"Error in corridor_feature_sync_worker cycle: {exc}")

        try:
            await asyncio.sleep(settings.FEATURE_SYNC_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            logger.info("corridor_feature_sync_worker cancelled during sleep, exiting.")
            break
