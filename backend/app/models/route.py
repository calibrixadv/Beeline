import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class SavedRoute(Base):
    __tablename__ = "saved_routes"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    origin_name = Column(String(255), nullable=False)
    destination_name = Column(String(255), nullable=False)
    plan_data = Column(Text, nullable=False)  # JSON-encoded TransitRoutePlan
    notes = Column(String(500), nullable=True)
    alert_muted = Column(Boolean, default=False, server_default=text("FALSE"), nullable=False)
    alert_lead_minutes = Column(Integer, default=30, server_default=text("30"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="saved_routes")

    __table_args__ = (
        CheckConstraint("alert_lead_minutes IN (5, 10, 30, 60)", name="ck_saved_routes_alert_lead"),
    )
