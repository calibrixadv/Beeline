from datetime import datetime
from typing import List, Literal, Optional, Union
from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, field_validator

PassengerType = Literal["ADULT", "CHILD", "STUDENT", "SENIOR"]
SeatPosition = Literal["WINDOW", "AISLE", "MIDDLE"]


class Passenger(BaseModel):
    fullName: str
    passengerType: PassengerType = "ADULT"
    idNumber: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class SeatPreferences(BaseModel):
    position: Optional[SeatPosition] = "WINDOW"
    quietZone: Optional[bool] = False

    model_config = ConfigDict(extra="ignore")


class BookingItemRequest(BaseModel):
    journeyId: str
    selectedClass: Literal["STANDARD", "FIRST", "BUSINESS", "SLEEPER"] = "STANDARD"
    travelDate: str
    departureTime: Optional[str] = Field(default=None, validation_alias=AliasChoices("departureTime", "departure_time"))
    seatPreferences: Optional[SeatPreferences] = Field(default_factory=SeatPreferences)
    passengers: List[Passenger]

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    @field_validator("departureTime", mode="before")
    @classmethod
    def serialize_departure_time(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return v


class CreateBookingRequest(BaseModel):
    items: List[BookingItemRequest]
    contactEmail: EmailStr
    contactPhone: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class TicketResponse(BaseModel):
    ticketNumber: str
    trainNumber: str
    carNumber: str
    seatNumber: str
    classType: str
    passengerName: str
    qrCodePayload: str
    departureTime: str
    arrivalTime: str
    origin: str
    destination: str

    model_config = ConfigDict(extra="ignore")


class BookingResponse(BaseModel):
    bookingId: str
    bookingReference: str
    status: Literal["CONFIRMED", "CANCELLED", "PENDING", "REFUNDED"] = "CONFIRMED"
    createdAt: str
    totalAmountLei: float
    currency: str = "RON"
    passengerCount: int = 1
    seatPreference: Optional[str] = "WINDOW"
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None
    tickets: List[TicketResponse] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class BookingUpdate(BaseModel):
    passengerCount: Optional[int] = Field(None, ge=1)
    seatPreference: Optional[str] = None
    contactEmail: Optional[EmailStr] = None
    contactPhone: Optional[str] = None
    status: Optional[Literal["CONFIRMED", "CANCELLED", "PENDING", "REFUNDED"]] = None

    model_config = ConfigDict(extra="ignore")
