import json
import math
import random
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, Ticket
from app.models.user import User
from app.schemas.booking import (
    BookingResponse,
    CreateBookingRequest,
    TicketResponse,
)
from app.schemas.common import PaginationMeta
from app.services.train_service import train_service


class BookingService:
    @staticmethod
    def _generate_booking_ref() -> str:
        code = random.randint(1000, 9999)
        return f"BEE-{code}"

    @staticmethod
    async def create_booking(
        db: AsyncSession,
        user: User,
        data: CreateBookingRequest
    ) -> BookingResponse:
        if not data.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one journey item is required to create a booking."
            )

        booking_ref = BookingService._generate_booking_ref()
        booking_id = f"bkg-ro-{datetime.now(timezone.utc).year}-{random.randint(10000, 99999)}"
        created_at_dt = datetime.now(timezone.utc)
        created_at_str = created_at_dt.isoformat()

        total_amount = 0.0
        ticket_models: List[Ticket] = []
        ticket_responses: List[TicketResponse] = []

        car_counter = 1
        seat_counter = random.randint(10, 50)

        for item in data.items:
            journey = train_service.get_train_by_id(item.journeyId)
            origin_name = journey.origin.name if journey else "Origin Station"
            dest_name = journey.destination.name if journey else "Destination Station"
            train_num = journey.trainNumber if journey else "IR 1572"
            dep_time = journey.departureTime if journey else f"{item.travelDate}T08:00:00+03:00"
            arr_time = journey.arrivalTime if journey else f"{item.travelDate}T11:00:00+03:00"

            # Determine fare price
            fare_price = 50.0  # default
            if journey:
                matching_fare = next((f for f in journey.fares if f.classType == item.selectedClass), None)
                if matching_fare:
                    fare_price = matching_fare.price
                elif journey.fares:
                    fare_price = journey.fares[0].price

            if not item.passengers:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"At least one passenger required for journey {item.journeyId}."
                )

            for passenger in item.passengers:
                total_amount += fare_price
                seat_num = str(seat_counter)
                car_num = str(car_counter)
                seat_counter += 1

                train_slug = train_num.replace(" ", "")
                ticket_num = f"TK-{train_slug}-{car_num}A{seat_num}"
                qr_payload = f"https://beeline.io/t/{booking_ref}-{car_num}A{seat_num}"

                ticket = Ticket(
                    booking_id=booking_id,
                    ticket_number=ticket_num,
                    train_number=train_num,
                    car_number=car_num,
                    seat_number=seat_num,
                    class_type=item.selectedClass,
                    passenger_name=passenger.fullName,
                    qr_code_payload=qr_payload,
                    departure_time=dep_time,
                    arrival_time=arr_time,
                    origin=origin_name,
                    destination=dest_name,
                    created_at=created_at_dt
                )
                ticket_models.append(ticket)

                ticket_responses.append(
                    TicketResponse(
                        ticketNumber=ticket_num,
                        trainNumber=train_num,
                        carNumber=car_num,
                        seatNumber=seat_num,
                        classType=item.selectedClass,
                        passengerName=passenger.fullName,
                        qrCodePayload=qr_payload,
                        departureTime=dep_time,
                        arrivalTime=arr_time,
                        origin=origin_name,
                        destination=dest_name
                    )
                )

            car_counter += 1

        booking_obj = Booking(
            id=booking_id,
            user_id=user.id,
            booking_reference=booking_ref,
            status="CONFIRMED",
            total_amount_lei=round(total_amount, 2),
            currency="RON",
            contact_email=str(data.contactEmail),
            contact_phone=data.contactPhone,
            raw_data=json.dumps(data.model_dump()),
            created_at=created_at_dt,
            updated_at=created_at_dt
        )

        db.add(booking_obj)
        for t in ticket_models:
            db.add(t)

        await db.commit()

        return BookingResponse(
            bookingId=booking_id,
            bookingReference=booking_ref,
            status="CONFIRMED",
            createdAt=created_at_str,
            totalAmountLei=round(total_amount, 2),
            currency="RON",
            contactEmail=str(data.contactEmail),
            contactPhone=data.contactPhone,
            tickets=ticket_responses
        )

    @staticmethod
    async def list_bookings(
        db: AsyncSession,
        user: User,
        page: int = 1,
        page_size: int = 10,
        status_filter: Optional[str] = None
    ) -> Tuple[List[BookingResponse], PaginationMeta]:
        page = max(1, page)
        page_size = max(1, min(100, page_size))

        stmt = select(Booking).where(Booking.user_id == user.id)
        if status_filter and status_filter.upper() != "ALL":
            stmt = stmt.where(Booking.status == status_filter.upper())
        stmt = stmt.order_by(Booking.created_at.desc())

        result = await db.execute(stmt)
        all_bookings = result.scalars().all()
        total_items = len(all_bookings)
        total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_bookings = all_bookings[start_idx:end_idx]

        responses: List[BookingResponse] = []
        for b in paginated_bookings:
            # fetch tickets for this booking
            t_stmt = select(Ticket).where(Ticket.booking_id == b.id).order_by(Ticket.created_at.asc())
            t_res = await db.execute(t_stmt)
            tickets = t_res.scalars().all()

            ticket_res_list = [
                TicketResponse(
                    ticketNumber=t.ticket_number,
                    trainNumber=t.train_number,
                    carNumber=t.car_number,
                    seatNumber=t.seat_number,
                    classType=t.class_type,
                    passengerName=t.passenger_name,
                    qrCodePayload=t.qr_code_payload,
                    departureTime=t.departure_time,
                    arrivalTime=t.arrival_time,
                    origin=t.origin,
                    destination=t.destination
                )
                for t in tickets
            ]

            responses.append(
                BookingResponse(
                    bookingId=b.id,
                    bookingReference=b.booking_reference,
                    status=b.status,  # type: ignore
                    createdAt=b.created_at.isoformat(),
                    totalAmountLei=b.total_amount_lei,
                    currency=b.currency,
                    contactEmail=b.contact_email,
                    contactPhone=b.contact_phone,
                    tickets=ticket_res_list
                )
            )

        meta = PaginationMeta(
            page=page,
            pageSize=page_size,
            totalItems=total_items,
            totalPages=total_pages,
            hasNext=(page < total_pages),
            hasPrev=(page > 1)
        )

        return responses, meta

    @staticmethod
    async def cancel_booking(
        db: AsyncSession,
        user: User,
        booking_id: str
    ) -> BookingResponse:
        stmt = select(Booking).where(
            Booking.id == booking_id,
            Booking.user_id == user.id
        )
        result = await db.execute(stmt)
        booking = result.scalar_one_or_none()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID '{booking_id}' not found."
            )

        booking.status = "CANCELLED"
        booking.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(booking)

        # fetch tickets
        t_stmt = select(Ticket).where(Ticket.booking_id == booking.id)
        t_res = await db.execute(t_stmt)
        tickets = t_res.scalars().all()

        ticket_res_list = [
            TicketResponse(
                ticketNumber=t.ticket_number,
                trainNumber=t.train_number,
                carNumber=t.car_number,
                seatNumber=t.seat_number,
                classType=t.class_type,
                passengerName=t.passenger_name,
                qrCodePayload=t.qr_code_payload,
                departureTime=t.departure_time,
                arrivalTime=t.arrival_time,
                origin=t.origin,
                destination=t.destination
            )
            for t in tickets
        ]

        return BookingResponse(
            bookingId=booking.id,
            bookingReference=booking.booking_reference,
            status="CANCELLED",
            createdAt=booking.created_at.isoformat(),
            totalAmountLei=booking.total_amount_lei,
            currency=booking.currency,
            contactEmail=booking.contact_email,
            contactPhone=booking.contact_phone,
            tickets=ticket_res_list
        )


booking_service = BookingService()
