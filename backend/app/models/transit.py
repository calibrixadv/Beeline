import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Station(Base):
    __tablename__ = "stations"

    code = Column(String(16), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    city = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    modes = Column(Text, default='["TRAIN"]', server_default=text("'[\"TRAIN\"]'"), nullable=False)
    is_active = Column(Boolean, default=True, server_default=text("TRUE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=text("CURRENT_TIMESTAMP"), nullable=False)

    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90.0 AND 90.0", name="ck_stations_latitude"),
        CheckConstraint("longitude BETWEEN -180.0 AND 180.0", name="ck_stations_longitude"),
    )


class Train(Base):
    __tablename__ = "trains"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    train_number = Column(String(32), unique=True, nullable=False, index=True)
    operator_name = Column(String(100), nullable=False)
    operator_code = Column(String(16), nullable=False, index=True)
    origin_code = Column(String(16), ForeignKey("stations.code", ondelete="RESTRICT"), nullable=False, index=True)
    destination_code = Column(String(16), ForeignKey("stations.code", ondelete="RESTRICT"), nullable=False, index=True)
    departure_time = Column(DateTime(timezone=True), nullable=False)
    arrival_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    status = Column(String(32), default="ON_TIME", server_default=text("'ON_TIME'"), nullable=False, index=True)
    delay_minutes = Column(Integer, default=0, server_default=text("0"), nullable=False)
    base_price_lei = Column(Float, nullable=False)
    available_seats = Column(Integer, default=100, server_default=text("100"), nullable=False)
    amenities = Column(Text, default="[]", server_default=text("'[]'"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=text("CURRENT_TIMESTAMP"), nullable=False)

    origin_station = relationship("Station", foreign_keys=[origin_code])
    destination_station = relationship("Station", foreign_keys=[destination_code])

    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_trains_duration"),
        CheckConstraint("delay_minutes >= 0", name="ck_trains_delay"),
        CheckConstraint("base_price_lei >= 0", name="ck_trains_price"),
        CheckConstraint("available_seats >= 0", name="ck_trains_seats"),
        CheckConstraint("status IN ('ON_TIME', 'DELAYED', 'CANCELLED', 'BOARDING')", name="ck_trains_status"),
    )


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    line_code = Column(String(32), nullable=False, index=True)
    route_name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    mode = Column(String(32), nullable=False, index=True)
    provider_id = Column(String(64), nullable=False)
    provider_name = Column(String(100), nullable=False)
    origin_station = Column(String(255), nullable=False)
    destination_station = Column(String(255), nullable=False)
    frequency_minutes = Column(Integer, default=15, server_default=text("15"), nullable=False)
    first_departure = Column(String(8), default="05:00", server_default=text("'05:00'"), nullable=False)
    last_departure = Column(String(8), default="23:30", server_default=text("'23:30'"), nullable=False)
    fare_lei = Column(Float, default=3.0, server_default=text("3.0"), nullable=False)
    is_active = Column(Boolean, default=True, server_default=text("TRUE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=text("CURRENT_TIMESTAMP"), nullable=False)

    __table_args__ = (
        CheckConstraint("frequency_minutes > 0", name="ck_schedules_frequency"),
        CheckConstraint("fare_lei >= 0", name="ck_schedules_fare"),
        CheckConstraint("mode IN ('TRAIN', 'BUS', 'TRAM', 'METRO')", name="ck_schedules_mode"),
    )


class Disruption(Base):
    __tablename__ = "disruptions"

    id = Column(String(64), primary_key=True, default=generate_uuid, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), default="WARNING", server_default=text("'WARNING'"), nullable=False, index=True)
    affected_operator = Column(String(100), nullable=False)
    affected_line = Column(String(32), nullable=False, index=True)
    delay_minutes = Column(Integer, default=0, server_default=text("0"), nullable=False)
    status = Column(String(32), default="ACTIVE", server_default=text("'ACTIVE'"), nullable=False, index=True)
    starts_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, server_default=text("CURRENT_TIMESTAMP"), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=text("CURRENT_TIMESTAMP"), nullable=False)

    __table_args__ = (
        CheckConstraint("severity IN ('INFO', 'WARNING', 'CRITICAL')", name="ck_disruptions_severity"),
        CheckConstraint("delay_minutes >= 0", name="ck_disruptions_delay"),
        CheckConstraint("status IN ('ACTIVE', 'RESOLVED', 'SCHEDULED')", name="ck_disruptions_status"),
    )
