import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    phone_number = Column(String(32), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    role = Column(String(32), default="TRAVELER", server_default=text("'TRAVELER'"), nullable=False)
    preferences = Column(Text, nullable=False, default="{}", server_default=text("'{}'"))
    is_guest = Column(Boolean, default=False, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, server_default=text("FALSE"), nullable=False)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    account_status = Column(String(32), default="ACTIVE", server_default=text("'ACTIVE'"), nullable=False, index=True)
    frozen_at = Column(DateTime(timezone=True), nullable=True)
    deletion_scheduled_at = Column(DateTime(timezone=True), nullable=True)
    deletion_reminder_15d_sent = Column(Boolean, default=False, server_default=text("FALSE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("role IN ('TRAVELER', 'OPERATOR', 'ADMIN')", name="ck_users_role"),
        CheckConstraint("account_status IN ('ACTIVE', 'FROZEN_PENDING_DELETION')", name="ck_users_account_status"),
    )

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    mfa_credential = relationship("MFACredential", back_populates="user", uselist=False, cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")
    saved_routes = relationship("SavedRoute", back_populates="user", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_hash = Column(String(64), index=True, nullable=False)
    device_fingerprint = Column(String(128), nullable=True)
    device_name = Column(String(255), nullable=True)
    device_info = Column(String(255), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(500), nullable=True)
    remember_me = Column(Boolean, default=False, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_active_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="sessions")


class MFACredential(Base):
    __tablename__ = "mfa_credentials"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    secret_key = Column(String(255), nullable=False)
    backup_codes_hash = Column(Text, nullable=False, default="[]")  # JSON encoded list of hashes
    backup_codes = Column(Text, nullable=True, default="[]")  # Direct SQL column compatibility
    is_confirmed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="mfa_credential")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="password_reset_tokens")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    code_hash = Column(String(128), nullable=False)
    token_hash = Column(String(128), unique=True, index=True, nullable=False)
    attempts = Column(Integer, default=0, server_default=text("0"), nullable=False)
    is_used = Column(Boolean, default=False, server_default=text("FALSE"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="email_verification_tokens")
