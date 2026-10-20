from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.user import SessionResponse, UserProfile
from app.services.auth_service import AuthService

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve profile of the currently authenticated user or guest."""
    return UserProfile.model_validate(current_user)


@router.get("/me/sessions", response_model=List[SessionResponse])
async def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """List all active sessions registered for the current user."""
    sessions = await AuthService.list_user_sessions(db, current_user.id)
    return [
        SessionResponse(
            session_id=s.id,
            device_info=s.device_info,
            ip_address=s.ip_address,
            created_at=s.created_at,
            last_active_at=s.last_active_at,
            is_current=False
        )
        for s in sessions
    ]


@router.delete("/me/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Revoke a specific remote session."""
    revoked = await AuthService.revoke_session(db, session_id=session_id, user_id=current_user.id)
    if not revoked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return MessageResponse(message="Session revoked successfully")


@router.delete("/me/sessions", response_model=MessageResponse)
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Revoke all sessions for current user."""
    count = await AuthService.revoke_all_user_sessions(db, user_id=current_user.id)
    return MessageResponse(message=f"Revoked {count} sessions successfully")
