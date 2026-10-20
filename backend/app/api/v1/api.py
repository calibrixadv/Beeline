from fastapi import APIRouter

from app.api.v1.endpoints import auth, routes, schedules, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Sessions"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Sessions"])
api_router.include_router(routes.router, prefix="/routes", tags=["Transit Route Planning"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["Transit Schedules"])
