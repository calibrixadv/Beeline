import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.deps import get_client_ip
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, init_db
from app.core.rate_limit import auth_rate_limiter
from app.core.redis import close_redis_pool
from app.core.security import (
    compute_device_fingerprint,
    compute_device_proof,
    decrypt_auth_token,
    encrypt_auth_token,
)
from app.services.account_lifecycle_service import AccountLifecycleService
from app.services.auth_service import AuthService
from app.services.feature_store_service import corridor_feature_sync_worker
from app.services.risk_service import risk_service

logger = logging.getLogger(__name__)


STATUS_CODE_MAP = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "INTERNAL_SERVER_ERROR",
}


async def account_lifecycle_worker():
    """Periodic background worker checking for 15-day reminders and Day-0 permanent account deletions."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await AccountLifecycleService.run_lifecycle_sweep(db)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.debug(f"Account lifecycle background worker note: {exc}")

        try:
            await asyncio.sleep(3600)  # Sweep once an hour
        except asyncio.CancelledError:
            break


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: initialize database tables
    await init_db()

    # Initialize in-process ONNX ML Inference Session
    try:
        risk_service.init_session(app=app)
    except Exception as exc:
        logger.warning(
            f"Could not initialize ML risk session: {exc}. Server operating in fallback mode."
        )
        app.state.risk_session = None

    # Start non-blocking feature sync background worker
    sync_task = asyncio.create_task(corridor_feature_sync_worker())
    app.state.corridor_feature_sync_task = sync_task

    # Start non-blocking account deletion lifecycle worker
    lifecycle_task = asyncio.create_task(account_lifecycle_worker())
    app.state.account_lifecycle_task = lifecycle_task

    yield

    # Shutdown: cleanly cancel background tasks
    sync_task.cancel()
    try:
        await sync_task
    except asyncio.CancelledError:
        pass
    except Exception:
        pass

    lifecycle_task.cancel()
    try:
        await lifecycle_task
    except asyncio.CancelledError:
        pass
    except Exception:
        pass

    # Clean up ML risk session
    try:
        risk_service.close()
    except Exception:
        pass
    app.state.risk_session = None

    # Disconnect Redis pool
    await close_redis_pool()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Global Exception Handlers adhering to api.md Section 2 Uniform Error Semantics
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code = STATUS_CODE_MAP.get(exc.status_code, f"HTTP_{exc.status_code}_ERROR")
    msg = str(exc.detail) if exc.detail else "An error occurred"
    content = {
        "error": {
            "code": code,
            "message": msg,
        },
        "detail": exc.detail,
    }
    if isinstance(exc.detail, dict):
        content["error"]["code"] = exc.detail.get("code", code)
        content["error"]["message"] = exc.detail.get("message", msg)
        for k, v in exc.detail.items():
            content[k] = v
    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=getattr(exc, "headers", None)
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        details.append({
            "field": field,
            "message": err.get("msg", ""),
            "code": err.get("type", "VALIDATION_ERROR"),
        })
    msg = "Request validation failed."
    if details and "message" in details[0]:
        msg = details[0]["message"]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": msg,
                "details": details,
            },
            "detail": exc.errors(),
        }
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Internal server fault",
            },
            "detail": "Internal server fault",
        }
    )

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def session_security_and_rotation_middleware(request: Request, call_next):
    """
    Step 1 Session Middleware:
    1. Anti-Hijack Device-Context Verification for beeline_auth_token cookies.
    2. Instant Redis Revocation Check (< 0.5ms).
    3. Transparent Server-Side Auto-Rotation when rot_exp (15 min) passes while backend vault is valid.
    """
    auth_cookie = request.cookies.get("beeline_auth_token")
    rotated_auth_token = None
    rotated_max_age = None

    path = request.url.path
    is_public_route = (
        path.startswith(f"{settings.API_V1_STR}/auth/login") or
        path.startswith(f"{settings.API_V1_STR}/auth/signup") or
        path.startswith(f"{settings.API_V1_STR}/auth/guest") or
        path.startswith(f"{settings.API_V1_STR}/auth/forgot-password") or
        path.startswith(f"{settings.API_V1_STR}/auth/reset-password") or
        path.startswith(f"{settings.API_V1_STR}/auth/check-breach") or
        path.startswith(f"{settings.API_V1_STR}/routes/plan") or
        path.startswith(f"{settings.API_V1_STR}/routes/corridors") or
        path.startswith(f"{settings.API_V1_STR}/trains") or
        path.startswith(f"{settings.API_V1_STR}/schedules") or
        path.startswith(f"{settings.API_V1_STR}/stations") or
        path.startswith(f"{settings.API_V1_STR}/plan") or
        path.startswith("/plan") or
        (request.method == "DELETE" and path == f"{settings.API_V1_STR}/users/me/sessions") or
        path in ("/", "/health", f"{settings.API_V1_STR}/docs", f"{settings.API_V1_STR}/redoc", f"{settings.API_V1_STR}/openapi.json")
    )

    if auth_cookie and not is_public_route:
        try:
            payload = decrypt_auth_token(auth_cookie)
            sid = payload.get("sid") or payload.get("session_id")
            now_ts = int(datetime.now(timezone.utc).timestamp())

            # If request has Authorization Bearer from a DIFFERENT session, the cookie is stale residue
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                try:
                    h_payload = decrypt_auth_token(auth_header[7:].strip())
                    h_sid = h_payload.get("sid") or h_payload.get("session_id")
                    if h_sid and sid and h_sid != sid:
                        return await call_next(request)
                except Exception:
                    pass

            # 1. Anti-Hijack Device-Context Verification
            current_dfp = compute_device_fingerprint(request)
            proof = request.cookies.get("beeline_device_proof")
            expected_proof = compute_device_proof(sid, current_dfp) if sid else ""
            token_dfp = payload.get("dfp")

            if not proof or proof != expected_proof or (token_dfp and token_dfp != current_dfp):
                # Anti-hijack violation! Revoke session instantly in Redis and PostgreSQL
                if sid:
                    await AuthService.revoke_session_system(sid)
                resp = JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "error": {
                            "code": "UNAUTHORIZED",
                            "message": "Device context mismatch or hijack attempt detected. Session revoked.",
                        },
                        "detail": "Device context mismatch or hijack attempt detected. Session revoked.",
                    }
                )
                resp.delete_cookie(key="beeline_auth_token", path="/")
                resp.delete_cookie(key="beeline_device_proof", path="/")
                return resp

            # 2. Redis Instant Revocation Check
            if sid:
                is_rev = await AuthService.is_session_revoked_redis(sid)
                if is_rev is True:
                    resp = JSONResponse(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        content={
                            "error": {
                                "code": "UNAUTHORIZED",
                                "message": "Revoked or expired session",
                            },
                            "detail": "Revoked or expired session",
                        }
                    )
                    resp.delete_cookie(key="beeline_auth_token", path="/")
                    resp.delete_cookie(key="beeline_device_proof", path="/")
                    return resp

            # 3. Transparent Auto-Rotation when 15-minute rot_exp passes
            rot_exp = payload.get("rot_exp")
            exp = payload.get("exp")
            if rot_exp and exp and now_ts >= rot_exp and now_ts < exp and sid:
                is_valid = await AuthService.is_session_valid(sid)
                if is_valid:
                    new_payload = dict(payload)
                    new_payload["iat"] = now_ts
                    new_payload["rot_exp"] = now_ts + 15 * 60
                    rotated_auth_token = encrypt_auth_token(new_payload)
                    rotated_max_age = max(0, exp - now_ts)
        except Exception as exc:
            logger.debug(f"Session middleware verification exception: {exc}")

    response = await call_next(request)

    # Attach transparently rotated cookie if eligible
    if rotated_auth_token and rotated_max_age is not None:
        response.set_cookie(
            key="beeline_auth_token",
            value=rotated_auth_token,
            max_age=rotated_max_age,
            httponly=True,
            samesite="lax",
            path="/",
            secure=False,
        )

    return response


@app.middleware("http")
async def auth_rate_limit_middleware(request: Request, call_next):
    """
    Step 5 Global Auth Rate-Limit Middleware:
    Enforces sliding-window rate limiting on sensitive /api/v1/auth/* mutation endpoints (POST)
    using Redis sliding-window counters with graceful in-memory fallback.
    """
    if not settings.AUTH_RATE_LIMIT_ENABLED:
        return await call_next(request)

    path = request.url.path
    if request.method == "POST" and (path.startswith(f"{settings.API_V1_STR}/auth/") or path == f"{settings.API_V1_STR}/auth"):
        # Allow explicit test bypass header
        bypass = request.headers.get("X-Test-Rate-Limit-Bypass", "").lower()
        if bypass in ("true", "1"):
            return await call_next(request)

        client_ip = get_client_ip(request)
        is_limited, retry_after = await auth_rate_limiter.check_rate_limit(
            client_ip=client_ip,
            path=path,
            window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
            max_requests=settings.AUTH_RATE_LIMIT_MAX_REQUESTS,
        )
        if is_limited:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Too many requests. Please slow down and try again later.",
                        "retry_after": retry_after,
                    },
                    "detail": "Too many requests. Please slow down and try again later.",
                },
                headers={"Retry-After": str(retry_after)},
            )

    return await call_next(request)



@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


# Register API v1
app.include_router(api_router, prefix=settings.API_V1_STR)
