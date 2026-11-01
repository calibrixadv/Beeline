import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_reference = Column(String(32), unique=True, nullable=False, index=True)
    status = Column(String(32), default="CONFIRMED", nullable=False)
    total_amount_lei = Column(Float, nullable=False)
    currency = Column(String(8), default="RON", nullable=False)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(64), nullable=True)
    raw_data = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="bookings")
    tickets = relationship("Ticket", back_populates="booking", cascade="all, delete-orphan")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    booking_id = Column(String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    ticket_number = Column(String(64), unique=True, nullable=False, index=True)
    train_number = Column(String(32), nullable=False)
    car_number = Column(String(16), nullable=False)
    seat_number = Column(String(16), nullable=False)
    class_type = Column(String(32), default="STANDARD", nullable=False)
    passenger_name = Column(String(255), nullable=False)
    qr_code_payload = Column(String(255), nullable=False)
    departure_time = Column(String(64), nullable=False)
    arrival_time = Column(String(64), nullable=False)
    origin = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    booking = relationship("Booking", back_populates="tickets")


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    idempotency_key = Column(String(255), nullable=False, index=True)
    request_hash = Column(String(64), nullable=False)
    status = Column(String(32), default="COMPLETED", nullable=False)  # "IN_PROGRESS", "COMPLETED"
    response_code = Column(Integer, default=200, nullable=True)
    response_payload = Column(Text, nullable=True, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_user_idempotency_key"),
    )
