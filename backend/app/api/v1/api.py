from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    bookings,
    disruptions,
    routes,
    schedules,
    stations,
    trains,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Sessions"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Sessions"])
api_router.include_router(routes.router, prefix="/routes", tags=["Transit Route Planning"])
api_router.include_router(trains.router, prefix="/trains", tags=["Rail Timetables & Fares"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["Transit Schedules"])
api_router.include_router(stations.router, prefix="/stations", tags=["Station Search & Live Boards"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Trip Bookings & Wallet Checkout"])
api_router.include_router(disruptions.router, prefix="/disruptions", tags=["Transit Disruptions"])

