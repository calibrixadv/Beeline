import asyncio
import logging
import secrets
import time
from typing import Dict, List, Optional, Tuple

from app.core.config import settings
from app.core.redis import get_redis

logger = logging.getLogger(__name__)


class AuthRateLimiter:
    """
    Sliding-window rate limiter for sensitive authentication mutation endpoints.
    Backed by Redis sliding-window sorted sets (`ratelimit:auth:{client_ip}:{path}`)
    with graceful in-memory fallback when Redis is offline or unreachable.
    """

    def __init__(self) -> None:
        self._memory_windows: Dict[str, List[float]] = {}
        self._lock = asyncio.Lock()

    async def check_rate_limit(
        self,
        client_ip: str,
        path: str,
        window_seconds: Optional[int] = None,
        max_requests: Optional[int] = None,
    ) -> Tuple[bool, int]:
        """
        Checks whether the given (client_ip, path) tuple exceeds max_requests within window_seconds.
        Returns:
            (is_limited, retry_after_seconds)
            If is_limited is True, retry_after_seconds >= 1.
            If is_limited is False, retry_after_seconds == 0.
        """
        w_secs = window_seconds if window_seconds is not None else settings.AUTH_RATE_LIMIT_WINDOW_SECONDS
        max_req = max_requests if max_requests is not None else settings.AUTH_RATE_LIMIT_MAX_REQUESTS

        clean_ip = client_ip.strip() if client_ip else "127.0.0.1"
        clean_path = path.strip() if path else "/api/v1/auth"
        redis_key = f"ratelimit:auth:{clean_ip}:{clean_path}"

        now = time.time()
        window_start = now - w_secs

        # 1. Attempt Redis sliding-window check
        try:
            redis = get_redis()
            pipe = redis.pipeline()
            pipe.zremrangebyscore(redis_key, "-inf", window_start)
            pipe.zcard(redis_key)
            res = await pipe.execute()
            current_count = int(res[1])

            if current_count >= max_req:
                earliest = await redis.zrange(redis_key, 0, 0, withscores=True)
                if earliest:
                    earliest_time = float(earliest[0][1])
                    retry_after = max(1, int(earliest_time + w_secs - now))
                else:
                    retry_after = w_secs
                return True, retry_after

            # Under limit: record request and refresh key TTL
            member = f"{now}:{secrets.token_hex(4)}"
            pipe = redis.pipeline()
            pipe.zadd(redis_key, {member: now})
            pipe.expire(redis_key, w_secs + 5)
            await pipe.execute()
            return False, 0
        except Exception as exc:
            logger.debug(f"Redis rate limiter fallback to in-memory: {exc}")

        # 2. In-memory sliding-window fallback
        async with self._lock:
            ts_list = self._memory_windows.get(redis_key, [])
            ts_list = [t for t in ts_list if t > window_start]

            if len(ts_list) >= max_req:
                earliest_time = ts_list[0]
                retry_after = max(1, int(earliest_time + w_secs - now))
                self._memory_windows[redis_key] = ts_list
                return True, retry_after

            ts_list.append(now)
            self._memory_windows[redis_key] = ts_list
            return False, 0

    async def reset(self, client_ip: Optional[str] = None, path: Optional[str] = None) -> None:
        """Clears sliding window counters (for testing and isolation)."""
        async with self._lock:
            if client_ip and path:
                key = f"ratelimit:auth:{client_ip.strip()}:{path.strip()}"
                self._memory_windows.pop(key, None)
                try:
                    redis = get_redis()
                    await redis.delete(key)
                except Exception:
                    pass
            else:
                self._memory_windows.clear()
                try:
                    redis = get_redis()
                    keys = await redis.keys("ratelimit:auth:*")
                    if keys:
                        await redis.delete(*keys)
                except Exception:
                    pass


auth_rate_limiter = AuthRateLimiter()
