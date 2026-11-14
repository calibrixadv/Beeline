import logging
from typing import AsyncGenerator, Optional
from redis.asyncio import ConnectionPool, Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_pool: Optional[ConnectionPool] = None
_redis_client: Optional[Redis] = None
_custom_redis_client: Optional[Redis] = None


def get_redis_pool() -> ConnectionPool:
    """Returns or initializes the singleton asynchronous Redis ConnectionPool."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=1.0,
            socket_timeout=1.0,
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
        return bool(res)
    except Exception as exc:
        logger.debug(f"Redis health check failed (offline/unreachable): {exc}")
        return False


async def close_redis_pool() -> None:
    """Cleanly terminates the Redis connection pool and client on application shutdown."""
    global _redis_pool, _redis_client, _custom_redis_client
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
