from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserPreferencesSchema(BaseModel):
    default_pillar: Literal["safe", "fast", "economy"] = "safe"
    home_station_code: Optional[str] = "GLT"
    min_transfer_buffer_minutes: int = Field(default=15, ge=5, le=120)
    preferred_operators: List[str] = Field(default_factory=list)
    email_security_alerts: bool = True
    email_delay_alerts: bool = True
    theme: Literal["cozy_hive", "high_contrast"] = "cozy_hive"

    model_config = ConfigDict(extra="ignore")


class UserPreferencesUpdate(BaseModel):
    default_pillar: Optional[Literal["safe", "fast", "economy"]] = None
    home_station_code: Optional[str] = None
    min_transfer_buffer_minutes: Optional[int] = Field(default=None, ge=5, le=120)
    preferred_operators: Optional[List[str]] = None
    email_security_alerts: Optional[bool] = None
    email_delay_alerts: Optional[bool] = None
    theme: Optional[Literal["cozy_hive", "high_contrast"]] = None

    model_config = ConfigDict(extra="ignore")


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "TRAVELER"
    preferences: Optional[str] = None
    is_guest: bool = False
    is_active: bool = True
    mfa_enabled: bool = False
    account_status: str = "ACTIVE"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Union[str, Dict[str, Any]]] = None

    model_config = ConfigDict(extra="ignore")


class UserProfile(UserBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    password: Optional[str] = None
    mfa_code: Optional[str] = None
    reason: Optional[str] = None


class DeleteAccountResponse(BaseModel):
    message: str = "User account deleted successfully (frozen for 30 days)"
    status: str = "FROZEN_PENDING_DELETION"
    days_remaining: int = 30
    deletion_scheduled_at: Optional[datetime] = None


class SessionResponse(BaseModel):
    session_id: str
    device_info: Optional[str] = None
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    remember_me: bool = False
    created_at: datetime
    last_active_at: datetime
    expires_at: Optional[datetime] = None
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)
