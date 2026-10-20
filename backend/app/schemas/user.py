from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_guest: bool = False
    is_active: bool = True
    mfa_enabled: bool = False


class UserProfile(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionResponse(BaseModel):
    session_id: str
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_active_at: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)
