import logging
import os
import re
import time
from typing import Any, AsyncGenerator, Optional
from redis.asyncio import ConnectionPool, Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_pool: Optional[ConnectionPool] = None
_redis_client: Optional[Redis] = None
_custom_redis_client: Optional[Redis] = None
_sync_redis_client: Optional[Any] = None

_last_redis_warning_time: float = 0.0
_redis_is_down: bool = False


def sanitize_redis_url(url: Optional[str]) -> str:
    """Sanitizes Redis URL so credentials/passwords are never logged."""
    if not url:
        return "redis://***"
    try:
        return re.sub(r"://([^:@]+):([^@]+)@", r"://\1:***@", url)
    except Exception:
        return "redis://***"


def log_redis_warning(url: Optional[str], exc: Exception, context: str = "Redis operation") -> None:
    """Logs a rate-limited warning (at most once every 60s or once per outage) without leaking secrets."""
    global _last_redis_warning_time, _redis_is_down
    now = time.time()
    if not _redis_is_down or (now - _last_redis_warning_time) > 60.0:
        safe_url = sanitize_redis_url(url or settings.REDIS_URL)
        logger.warning(
            f"{context} failed for '{safe_url}': {type(exc).__name__}: {exc}. "
            "Server operating in fallback degraded mode."
        )
        _last_redis_warning_time = now
        _redis_is_down = True


def mark_redis_recovered() -> None:
    global _redis_is_down
    if _redis_is_down:
        logger.info("Redis connection recovered successfully.")
        _redis_is_down = False


def get_redis_url() -> str:
    return os.environ.get("REDIS_URL") or settings.REDIS_URL or "redis://localhost:6379/0"


def get_redis_pool() -> ConnectionPool:
    """Returns or initializes the singleton asynchronous Redis ConnectionPool with fail-fast timeouts."""
    global _redis_pool
    if _redis_pool is None:
        url = get_redis_url()
        _redis_pool = ConnectionPool.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=2.0,
            socket_timeout=2.0,
            retry_on_timeout=False,
            max_connections=50,
        )
    return _redis_pool


def set_redis_pool(pool: Optional[ConnectionPool]) -> None:
    """Explicitly override the connection pool (e.g. for testing)."""
    global _redis_pool, _redis_client
    _redis_pool = pool
    _redis_client = None


def set_custom_redis_client(client: Optional[Redis]) -> None:
    """Explicitly override the redis client instance (e.g. for FakeRedis during tests)."""
    global _custom_redis_client, _redis_client
    _custom_redis_client = client
    _redis_client = None


def get_redis() -> Redis:
    """Returns an asynchronous Redis client instance using the connection pool."""
    if _custom_redis_client is not None:
        return _custom_redis_client
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis(connection_pool=get_redis_pool())
    return _redis_client


def get_sync_redis() -> Optional[Any]:
    """Returns or initializes a synchronous Redis client with fail-fast timeouts."""
    global _sync_redis_client
    if _sync_redis_client is not None:
        return _sync_redis_client
    url = get_redis_url()
    try:
        import redis
        client = redis.Redis.from_url(
            url,
            socket_connect_timeout=2.0,
            socket_timeout=2.0,
            retry_on_timeout=False,
        )
        client.ping()
        _sync_redis_client = client
        mark_redis_recovered()
        return client
    except Exception as exc:
        log_redis_warning(url, exc, context="Sync Redis connection")
        return None


async def get_redis_client() -> AsyncGenerator[Redis, None]:
    """FastAPI async dependency yielding the shared Redis client without tearing down the pool."""
    yield get_redis()


async def redis_health_check() -> bool:
    """
    Pings the Redis server with graceful degradation.
    Returns True if reachable, False otherwise without raising unhandled exceptions.
    """
    try:
        client = get_redis()
        res = await client.ping()
        if res:
            mark_redis_recovered()
        return bool(res)
    except Exception as exc:
        log_redis_warning(get_redis_url(), exc, context="Redis health check ping")
        return False


async def close_redis_pool() -> None:
    """Cleanly terminates the Redis connection pool and client on application shutdown."""
    global _redis_pool, _redis_client, _custom_redis_client, _sync_redis_client
    if _redis_client is not None:
        try:
            await _redis_client.aclose()
        except Exception:
            pass
        _redis_client = None
    if _redis_pool is not None:
        try:
            await _redis_pool.disconnect()
        except Exception as exc:
            logger.warning(f"Error disconnecting Redis connection pool: {exc}")
        finally:
            _redis_pool = None
    if _custom_redis_client is not None:
        try:
            await _custom_redis_client.aclose()
        except Exception:
            pass
        _custom_redis_client = None
    if _sync_redis_client is not None:
        try:
            _sync_redis_client.close()
        except Exception:
            pass
        _sync_redis_client = None
