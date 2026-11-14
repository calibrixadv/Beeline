from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserProfile


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Unique traveler username")
    full_name: Optional[str] = None
    device_info: Optional[str] = "Web Browser"


class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str
    device_info: Optional[str] = "Web Browser"


class BreachCheckRequest(BaseModel):
    password: Optional[str] = None
    email: Optional[str] = None


class BreachCheckResponse(BaseModel):
    is_password_compromised: bool = False
    password_breach_count: int = 0
    is_email_compromised: bool = False
    email_breach_count: int = 0
    breaches: List[str] = Field(default_factory=list)
    warning: Optional[str] = None
    recommendation: str = "Use a unique password with at least 8 characters, combining uppercase, lowercase, numbers, and symbols."


class GuestLoginRequest(BaseModel):
    device_info: Optional[str] = "Guest Client"


class GuestConvertRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfile


class MFALoginChallengeResponse(BaseModel):
    mfa_required: bool = True
    mfa_session_token: str
    message: str = "Multi-factor authentication required"


class MFAVerifyRequest(BaseModel):
    mfa_session_token: str
    totp_code: Optional[str] = None
    backup_code: Optional[str] = None
    device_info: Optional[str] = "Authenticated Device"


class MFASetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    qr_code_base64: str
    backup_codes: List[str]


class MFAConfirmSetupRequest(BaseModel):
    code: str


class MFADisableRequest(BaseModel):
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    # reset_token provided to facilitate local dev / programmatic verification
    reset_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    message: str
