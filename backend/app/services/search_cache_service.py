import collections
from datetime import datetime, timezone
import hashlib
import json
import logging
import os
import re
import time
import unicodedata
from typing import Any, Dict, List, Optional, Tuple, Union
from zoneinfo import ZoneInfo

from app.core.redis import get_redis, log_redis_warning
from app.schemas.common import PaginatedResponse
from app.schemas.route_plan import RoutePlanResponse, TrainItineraryResponse, TransitRouteQuery
from app.schemas.train import TrainJourney
from scraper.collectors.train_api import resolve_known_station

logger = logging.getLogger(__name__)

BUCHAREST_TZ = ZoneInfo("Europe/Bucharest")


def normalize_text_canonical(text: Optional[str]) -> str:
    """Removes diacritics, extra spaces, and lowercases text."""
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    return re.sub(r"\s+", " ", decomposed).strip().lower()


def text_to_slug(text: Optional[str]) -> str:
    """Converts station or query name to a canonical hyphen/space-collapsed slug."""
    norm = normalize_text_canonical(text)
    slug = re.sub(r"[^a-z0-9]+", "_", norm).strip("_")
    return slug or "unknown"


def resolve_station_slug(station_name: Optional[str]) -> str:
    """Resolves station via dictionary aliases first for maximum hit rate, then slugifies."""
    if not station_name:
        return "unknown"
    match = resolve_known_station(station_name)
    if match and match.name:
        return text_to_slug(match.name)
    return text_to_slug(station_name)


class InMemoryLRUCache:
    """Bounded LRU in-memory cache fallback using collections.OrderedDict (max 128 items)."""

    def __init__(self, maxsize: int = 128):
        self.maxsize = maxsize
        self._store: collections.OrderedDict[str, Tuple[float, str]] = collections.OrderedDict()

    def get(self, key: str) -> Optional[str]:
        if key not in self._store:
            return None
        expires_at, val = self._store[key]
        if time.time() > expires_at:
            del self._store[key]
            return None
        self._store.move_to_end(key)
        return val

    def set(self, key: str, value: str, ttl: int) -> None:
        if key in self._store:
            self._store.move_to_end(key)
        self._store[key] = (time.time() + ttl, value)
        if len(self._store) > self.maxsize:
            self._store.popitem(last=False)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()


class SearchCacheService:
    """
    Principal Search Cache & Recent Searches Ring Service.
    Primary: Redis (supports redis:// and rediss:// on Render Key Value).
    Fallback: Bounded In-Memory LRU (128 items) for seamless offline resilience.
    """

    RECENT_ROUTES_KEY = "beeline:recent_searches:routes"
    RECENT_TRAINS_KEY = "beeline:recent_searches:trains"
    MAX_RECENT_SEARCHES = 100

    def __init__(self):
        self._mem_cache = InMemoryLRUCache(maxsize=128)
        self._mem_recent_routes: List[Dict[str, Any]] = []
        self._mem_recent_trains: List[Dict[str, Any]] = []
        self._hits: int = 0
        self._misses: int = 0

    @property
    def is_active(self) -> bool:
        """
        In production/Render, cache is always 100% active.
        Under pytest, cleanly isolated unless explicitly tested
        (e.g. test_redis_search_cache or ENABLE_SEARCH_CACHE_IN_TEST=1)
        adhering to Freeze Contract 4.
        """
        cur_test = os.environ.get("PYTEST_CURRENT_TEST", "")
        if cur_test:
            return "test_redis_search_cache" in cur_test or os.environ.get("ENABLE_SEARCH_CACHE_IN_TEST") == "1"
        return True

    def _get_redis_client(self):
        try:
            return get_redis()
        except Exception:
            return None

    # -------------------------------------------------------------------------
    # Canonical Cache Key Builders
    # -------------------------------------------------------------------------

    def compute_route_plan_key(self, query: TransitRouteQuery) -> str:
        """
        Canonical route plan cache key:
        beeline:cache:route_plan:v1:{orig_slug}:{dest_slug}:{date_iso}:{param_hash}
        """
        orig_raw = query.origin.name or query.origin.city or ""
        dest_raw = query.destination.name or query.destination.city or ""
        orig_slug = resolve_station_slug(orig_raw)
        dest_slug = resolve_station_slug(dest_raw)

        if query.departureTime and len(query.departureTime) >= 10:
            date_iso = query.departureTime[:10]
        else:
            date_iso = datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")

        params_map = {}
        if query.maxTransfers is not None:
            params_map["maxTransfers"] = query.maxTransfers
        if query.allowedModes:
            params_map["allowedModes"] = sorted(
                str(m.value) if hasattr(m, "value") else str(m) for m in query.allowedModes
            )
        if query.optimizationPreference:
            params_map["optimizationPreference"] = str(query.optimizationPreference)
        if query.minimumBufferMinutes is not None:
            params_map["minimumBufferMinutes"] = query.minimumBufferMinutes

        param_json = json.dumps(params_map, sort_keys=True)
        param_hash = hashlib.sha256(param_json.encode("utf-8")).hexdigest()[:12]

        return f"beeline:cache:route_plan:v1:{orig_slug}:{dest_slug}:{date_iso}:{param_hash}"

    def compute_trains_search_key(
        self,
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
        page_size: int = 20,
    ) -> str:
        """
        Canonical train search cache key:
        beeline:cache:trains_search:v1:{query_hash}
        """
        eff_query = normalize_text_canonical(search_query) if search_query else ""
        eff_orig = resolve_station_slug(origin or origin_code) if (origin or origin_code) else ""
        eff_dest = resolve_station_slug(destination or destination_code) if (destination or destination_code) else ""
        eff_date = travel_date or datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")

        params_dict = {
            "query": eff_query,
            "status": status_filter.strip().upper() if status_filter and status_filter != "ALL" else "",
            "operator": normalize_text_canonical(operator_filter) if operator_filter else "",
            "origin": eff_orig,
            "destination": eff_dest,
            "date": eff_date,
            "maxPrice": round(float(max_price), 2) if max_price is not None else None,
            "sortBy": (sort_by or "departure").lower(),
            "sortOrder": (sort_order or "asc").lower(),
            "page": int(page),
            "pageSize": int(page_size),
        }
        filtered = {k: v for k, v in params_dict.items() if v not in (None, "")}
        canonical_str = json.dumps(filtered, sort_keys=True)
        query_hash = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()[:16]

        return f"beeline:cache:trains_search:v1:{query_hash}"

    def compute_train_itinerary_key(self, train_number: str, date_str: Optional[str] = None) -> str:
        """
        Canonical train itinerary cache key:
        beeline:cache:train_itinerary:v1:{train_digits}:{date_iso}
        """
        digits = re.sub(r"\D", "", train_number) or normalize_text_canonical(train_number)
        date_iso = date_str or datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")
        return f"beeline:cache:train_itinerary:v1:{digits}:{date_iso}"

    # -------------------------------------------------------------------------
    # Smart TTL Policy
    # -------------------------------------------------------------------------

    @staticmethod
    def get_ttl_seconds(date_iso: str, result_count: int) -> int:
        """
        Smart TTL Policy:
        - Today's date (Europe/Bucharest): 300s (5 min) keeps live delays reasonably fresh.
        - Future dates: 3600s (1 hour) for computed route plans/train searches.
        - Genuine empty results (HTTP 200, 0 operating trains): short TTL 300s.
        """
        today_bucharest = datetime.now(BUCHAREST_TZ).strftime("%Y-%m-%d")
        if result_count == 0:
            return 300
        if date_iso == today_bucharest:
            return 300
        return 3600

    # -------------------------------------------------------------------------
    # Core Raw Read / Write Operations
    # -------------------------------------------------------------------------

    async def _get_raw(self, cache_key: str) -> Tuple[Optional[str], str]:
        """
        Checks Redis then in-memory fallback.
        Returns (raw_json_str, source) where source is 'redis', 'memory', or 'origin'.
        """
        if not self.is_active:
            return None, "origin"

        client = self._get_redis_client()
        if client:
            try:
                cached_val = await client.get(cache_key)
                if cached_val is not None:
                    self._hits += 1
                    # Refresh key in local memory LRU as warm copy
                    self._mem_cache.set(cache_key, cached_val, ttl=300)
                    try:
                        await client.expire(cache_key, 300)
                    except Exception:
                        pass
                    return cached_val, "redis"
            except Exception as exc:
                log_redis_warning(None, exc, context="_get_raw")

        # In-memory LRU fallback
        mem_val = self._mem_cache.get(cache_key)
        if mem_val is not None:
            self._hits += 1
            return mem_val, "memory"

        self._misses += 1
        return None, "origin"

    async def _set_raw(self, cache_key: str, payload_str: str, ttl: int) -> None:
        """Sets payload in in-memory LRU and Redis."""
        if not self.is_active:
            return

        self._mem_cache.set(cache_key, payload_str, ttl=ttl)
        client = self._get_redis_client()
        if client:
            try:
                await client.set(cache_key, payload_str, ex=ttl)
            except Exception as exc:
                log_redis_warning(None, exc, context="_set_raw")

    # -------------------------------------------------------------------------
    # Recent Searches Ring Index (ZSET)
    # -------------------------------------------------------------------------

    def _update_mem_recent(self, mem_list: List[Dict[str, Any]], entry: Dict[str, Any]) -> None:
        """Helper to keep in-memory recent searches list bounded to 100 and deduplicated."""
        target_key = entry.get("cacheKey")
        orig = normalize_text_canonical(entry.get("origin"))
        dest = normalize_text_canonical(entry.get("destination"))
        date = entry.get("date")

        idx_to_remove = None
        for i, existing in enumerate(mem_list):
            if existing.get("cacheKey") == target_key or (
                normalize_text_canonical(existing.get("origin")) == orig
                and normalize_text_canonical(existing.get("destination")) == dest
                and existing.get("date") == date
            ):
                idx_to_remove = i
                break
        if idx_to_remove is not None:
            mem_list.pop(idx_to_remove)

        mem_list.insert(0, entry)
        if len(mem_list) > self.MAX_RECENT_SEARCHES:
            mem_list.pop()

    async def record_recent_route_search(
        self,
        origin: str,
        destination: str,
        date: str,
        cache_key: str,
        result_count: int,
    ) -> None:
        """Maintains beeline:recent_searches:routes ZSET trimmed to max 100 entries."""
        if not self.is_active:
            return

        now_iso = datetime.now(BUCHAREST_TZ).isoformat()
        entry = {
            "origin": origin,
            "destination": destination,
            "date": date,
            "cacheKey": cache_key,
            "resultCount": result_count,
            "lastSearchedAt": now_iso,
        }
        self._update_mem_recent(self._mem_recent_routes, entry)

        client = self._get_redis_client()
        if client:
            try:
                key = self.RECENT_ROUTES_KEY
                # Scan existing entries to remove duplicate corridor/date before adding refreshed entry
                existing = await client.zrange(key, 0, -1)
                for item_raw in existing:
                    try:
                        parsed = json.loads(item_raw)
                        if (
                            parsed.get("cacheKey") == cache_key
                            or (
                                normalize_text_canonical(parsed.get("origin")) == normalize_text_canonical(origin)
                                and normalize_text_canonical(parsed.get("destination")) == normalize_text_canonical(destination)
                                and parsed.get("date") == date
                            )
                        ):
                            await client.zrem(key, item_raw)
                    except Exception:
                        pass
                await client.zadd(key, {json.dumps(entry): time.time()})
                await client.zremrangebyrank(key, 0, -101)
            except Exception as exc:
                log_redis_warning(None, exc, context="record_recent_route_search")

    async def record_recent_train_search(
        self,
        origin: str,
        destination: str,
        date: str,
        cache_key: str,
        result_count: int,
    ) -> None:
        """Maintains beeline:recent_searches:trains ZSET trimmed to max 100 entries."""
        if not self.is_active:
            return

        now_iso = datetime.now(BUCHAREST_TZ).isoformat()
        entry = {
            "origin": origin,
            "destination": destination,
            "date": date,
            "cacheKey": cache_key,
            "resultCount": result_count,
            "lastSearchedAt": now_iso,
        }
        self._update_mem_recent(self._mem_recent_trains, entry)

        client = self._get_redis_client()
        if client:
            try:
                key = self.RECENT_TRAINS_KEY
                existing = await client.zrange(key, 0, -1)
                for item_raw in existing:
                    try:
                        parsed = json.loads(item_raw)
                        if (
                            parsed.get("cacheKey") == cache_key
                            or (
                                normalize_text_canonical(parsed.get("origin")) == normalize_text_canonical(origin)
                                and normalize_text_canonical(parsed.get("destination")) == normalize_text_canonical(destination)
                                and parsed.get("date") == date
                            )
                        ):
                            await client.zrem(key, item_raw)
                    except Exception:
                        pass
                await client.zadd(key, {json.dumps(entry): time.time()})
                await client.zremrangebyrank(key, 0, -101)
            except Exception as exc:
                log_redis_warning(None, exc, context="record_recent_train_search")

    async def get_recent_route_searches(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Returns the last `limit` (max 25) recent route searches newest-first."""
        eff_limit = min(max(limit, 1), 25)
        client = self._get_redis_client()
        if client:
            try:
                raw_items = await client.zrevrange(self.RECENT_ROUTES_KEY, 0, eff_limit - 1)
                results = []
                for item in raw_items:
                    try:
                        results.append(json.loads(item))
                    except Exception:
                        pass
                return results
            except Exception as exc:
                log_redis_warning(None, exc, context="get_recent_route_searches")

        return self._mem_recent_routes[:eff_limit]

    # -------------------------------------------------------------------------
    # Route Plan Specific Cache Operations
    # -------------------------------------------------------------------------

    async def get_route_plan(self, cache_key: str) -> Optional[Tuple[RoutePlanResponse, str]]:
        raw_str, source = await self._get_raw(cache_key)
        if not raw_str:
            return None
        try:
            data = json.loads(raw_str)
            return RoutePlanResponse.model_validate(data), source
        except Exception as exc:
            logger.warning(f"Failed deserializing cached RoutePlanResponse {cache_key}: {exc}")
            return None

    async def set_route_plan(
        self,
        cache_key: str,
        response: RoutePlanResponse,
        date_str: str,
        origin: str,
        destination: str,
    ) -> None:
        ttl = self.get_ttl_seconds(date_str, response.totalDayRoutes)
        payload = response.model_dump_json()
        await self._set_raw(cache_key, payload, ttl)
        await self.record_recent_route_search(
            origin=origin,
            destination=destination,
            date=date_str,
            cache_key=cache_key,
            result_count=response.totalDayRoutes,
        )

    # -------------------------------------------------------------------------
    # Trains Search Specific Cache Operations
    # -------------------------------------------------------------------------

    async def get_trains_search(self, cache_key: str) -> Optional[Tuple[PaginatedResponse[TrainJourney], str]]:
        raw_str, source = await self._get_raw(cache_key)
        if not raw_str:
            return None
        try:
            data = json.loads(raw_str)
            return PaginatedResponse[TrainJourney].model_validate(data), source
        except Exception as exc:
            logger.warning(f"Failed deserializing cached PaginatedResponse[TrainJourney] {cache_key}: {exc}")
            return None

    async def set_trains_search(
        self,
        cache_key: str,
        response: PaginatedResponse[TrainJourney],
        date_str: str,
        origin: str = "",
        destination: str = "",
        query_display: str = "",
    ) -> None:
        ttl = self.get_ttl_seconds(date_str, len(response.data))
        payload = response.model_dump_json()
        await self._set_raw(cache_key, payload, ttl)
        await self.record_recent_train_search(
            origin=origin or query_display or "All Trains",
            destination=destination or "",
            date=date_str,
            cache_key=cache_key,
            result_count=len(response.data),
        )

    # -------------------------------------------------------------------------
    # Train Itinerary Specific Cache Operations
    # -------------------------------------------------------------------------

    async def get_train_itinerary(self, cache_key: str) -> Optional[Tuple[TrainItineraryResponse, str]]:
        raw_str, source = await self._get_raw(cache_key)
        if not raw_str:
            return None
        try:
            data = json.loads(raw_str)
            return TrainItineraryResponse.model_validate(data), source
        except Exception as exc:
            logger.warning(f"Failed deserializing cached TrainItineraryResponse {cache_key}: {exc}")
            return None

    async def set_train_itinerary(
        self,
        cache_key: str,
        response: TrainItineraryResponse,
        date_str: str,
    ) -> None:
        ttl = self.get_ttl_seconds(date_str, 1 if response.stops else 0)
        payload = response.model_dump_json()
        await self._set_raw(cache_key, payload, ttl)

    # -------------------------------------------------------------------------
    # Health, Statistics & Testing Clean Slate
    # -------------------------------------------------------------------------

    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Returns { backend: 'redis'|'memory', redisConnected: bool,
                  recentRouteSearchesCount: int, recentTrainSearchesCount: int,
                  hits: int, misses: int }
        """
        redis_connected = False
        count_routes = 0
        count_trains = 0

        client = self._get_redis_client()
        if client:
            try:
                await client.ping()
                redis_connected = True
                count_routes = await client.zcard(self.RECENT_ROUTES_KEY) or 0
                count_trains = await client.zcard(self.RECENT_TRAINS_KEY) or 0
            except Exception as exc:
                log_redis_warning(None, exc, context="get_cache_stats")
                redis_connected = False

        if not redis_connected:
            count_routes = len(self._mem_recent_routes)
            count_trains = len(self._mem_recent_trains)

        return {
            "backend": "redis" if redis_connected else "memory",
            "redisConnected": redis_connected,
            "recentRouteSearchesCount": count_routes,
            "recentTrainSearchesCount": count_trains,
            "hits": self._hits,
            "misses": self._misses,
        }

    async def clear_all(self) -> None:
        """Clears in-memory LRU and flushes all beeline:cache:* and beeline:recent_searches:* keys."""
        self._mem_cache.clear()
        self._mem_recent_routes.clear()
        self._mem_recent_trains.clear()
        self._hits = 0
        self._misses = 0

        client = self._get_redis_client()
        if client:
            try:
                keys = await client.keys("beeline:cache:*")
                if keys:
                    await client.delete(*keys)
                recent_keys = await client.keys("beeline:recent_searches:*")
                if recent_keys:
                    await client.delete(*recent_keys)
            except Exception:
                pass


search_cache_service = SearchCacheService()
