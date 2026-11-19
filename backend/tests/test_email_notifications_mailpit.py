from datetime import datetime, timedelta, timezone
import json
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.booking import Booking, Ticket
from app.models.route import SavedRoute
from app.models.user import User
from app.services.email_service import EmailMessageRecord, email_service
from app.services.trip_notification_service import (
    clear_dedup_cache,
    trip_notification_service,
)


@pytest.mark.asyncio
async def test_auth_and_recovery_emails(client: AsyncClient):
    """
    Test 1: Signup, Guest Convert, Forgot Password, and Reset Password
    dispatch well-formed Cozy Hive HTML+text emails with proper subjects & links.
    """
    email_service.clear_outbox()

    # 1. Signup user
    signup_email = "honeybee.signup@beeline.io"
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": signup_email,
        "password": "SecurePassword2026!",
        "full_name": "Honey Traveler"
    })
    assert signup_res.status_code == 201

    welcome_msg = email_service.get_last_email_for(signup_email)
    assert welcome_msg is not None
    assert "Welcome to Beeline" in welcome_msg.subject
    assert "recovery codes" in welcome_msg.subject.lower()
    assert "The Cozy Hive" in welcome_msg.html_body
    assert "Honey Traveler" in welcome_msg.html_body
    assert "recovery codes" in welcome_msg.text_body.lower()

    # 2. Guest Convert
    guest_login_res = await client.post("/api/v1/auth/guest", json={"device_info": "Safari Test"})
    assert guest_login_res.status_code == 201
    guest_token = guest_login_res.json()["access_token"]
    converted_email = "converted.honey@beeline.io"

    convert_res = await client.post(
        "/api/v1/auth/guest/convert",
        json={
            "email": converted_email,
            "password": "ConvertedPass2026!",
            "full_name": "Converted Bee"
        },
        headers={"Authorization": f"Bearer {guest_token}"}
    )
    assert convert_res.status_code == 200

    convert_msg = email_service.get_last_email_for(converted_email)
    assert convert_msg is not None
    assert "Welcome to Beeline" in convert_msg.subject
    assert "Converted Bee" in convert_msg.html_body

    # 3. Forgot Password
    forgot_res = await client.post("/api/v1/auth/forgot-password", json={
        "email": signup_email
    })
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json().get("reset_token")
    assert reset_token is not None

    forgot_msg = email_service.get_last_email_for(signup_email)
    assert forgot_msg is not None
    assert "Password Reset" in forgot_msg.subject
    assert reset_token in forgot_msg.html_body
    assert reset_token in forgot_msg.text_body

    # 4. Reset Password
    reset_res = await client.post("/api/v1/auth/reset-password", json={
        "reset_token": reset_token,
        "new_password": "BrandNewSecret2026!"
    })
    assert reset_res.status_code == 200

    changed_msg = email_service.get_last_email_for(signup_email)
    assert changed_msg is not None
    assert "Security Alert: Your Password Was Changed" in changed_msg.subject
    assert "immediately revoked" in changed_msg.html_body


@pytest.mark.asyncio
async def test_booking_confirmation_and_cancellation_emails(client: AsyncClient, db_session: AsyncSession):
    """
    Test 2: Booking creation (POST /bookings) and cancellation (DELETE /bookings/{id})
    dispatch confirmation & cancellation emails to logged-in users.
    """
    email_service.clear_outbox()

    # 1. Register & login
    user_email = "booking.traveler@beeline.io"
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": user_email,
        "password": "SecureBooking2026!",
        "full_name": "Railway Explorer"
    })
    assert signup_res.status_code == 201
    auth_token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}

    # 2. Create Booking
    booking_req = {
        "items": [
            {
                "journeyId": "ir-1572-bv-buc",
                "travelDate": "2026-03-29",
                "selectedClass": "FIRST",
                "passengers": [
                    {
                        "fullName": "Railway Explorer",
                        "passengerType": "ADULT",
                        "idDocumentNumber": "RO123456"
                    }
                ],
                "seatPreferences": {
                    "position": "WINDOW"
                }
            }
        ],
        "contactEmail": user_email,
        "contactPhone": "+40721000000"
    }

    create_res = await client.post("/api/v1/bookings", json=booking_req, headers=headers)
    assert create_res.status_code == 201
    booking_data = create_res.json()
    booking_id = booking_data["bookingId"]
    booking_ref = booking_data["bookingReference"]

    # Verify confirmation email
    conf_msg = email_service.get_last_email_for(user_email)
    assert conf_msg is not None
    assert booking_ref in conf_msg.subject
    assert "Booking Confirmed" in conf_msg.subject
    assert booking_ref in conf_msg.html_body
    assert "LEI" in conf_msg.html_body

    # 3. Cancel Booking
    del_res = await client.delete(f"/api/v1/bookings/{booking_id}", headers=headers)
    assert del_res.status_code == 200

    cancel_msg = email_service.get_last_email_for(user_email)
    assert cancel_msg is not None
    assert booking_ref in cancel_msg.subject
    assert "Cancelled" in cancel_msg.subject
    assert "Reservation Cancelled" in cancel_msg.html_body


@pytest.mark.asyncio
async def test_trip_notification_service_departure_scheduler(db_session: AsyncSession):
    """
    Test 3: TripNotificationService.check_and_dispatch_upcoming_departures()
    sends a departure reminder email when a logged-in user's booked/saved train departs within
    the 60-minute window, skips guest users, skips users with email_notifications: false,
    and strictly deduplicates (second run sends 0 duplicates).
    """
    email_service.clear_outbox()
    await clear_dedup_cache()

    now = datetime(2026, 3, 29, 12, 0, 0, tzinfo=timezone.utc)
    departure_time_dt = now + timedelta(minutes=40)
    departure_str = departure_time_dt.isoformat()

    # User A: Normal logged-in user with enabled notifications
    user_a = User(
        id="user-a-notif",
        email="traveler.a@beeline.io",
        full_name="Traveler Alpha",
        is_guest=False,
        is_active=True,
        account_status="ACTIVE",
        preferences=json.dumps({"email_notifications": True, "departure_reminder_minutes": 60})
    )
    db_session.add(user_a)

    # User B: Opted out user (email_notifications: False)
    user_b = User(
        id="user-b-optout",
        email="traveler.b@beeline.io",
        full_name="Traveler Beta",
        is_guest=False,
        is_active=True,
        account_status="ACTIVE",
        preferences=json.dumps({"email_notifications": False, "departure_reminder_minutes": 60})
    )
    db_session.add(user_b)

    # User C: Guest user (is_guest=True)
    user_c = User(
        id="user-c-guest",
        email="guest_12345@guest.beeline.local",
        full_name="Guest Gamma",
        is_guest=True,
        is_active=True,
        account_status="ACTIVE"
    )
    db_session.add(user_c)

    # Booking for User A departing in 40 min
    bkg_a = Booking(
        id="bkg-a-1",
        user_id="user-a-notif",
        booking_reference="BEE-1111",
        status="CONFIRMED",
        total_amount_lei=85.0,
        currency="RON",
        passenger_count=1,
        created_at=now,
        updated_at=now
    )
    db_session.add(bkg_a)
    ticket_a = Ticket(
        id="tkt-a-1",
        booking_id="bkg-a-1",
        ticket_number="TK-IR1572-1A12",
        train_number="IR 1572",
        car_number="1",
        seat_number="12",
        passenger_name="Traveler Alpha",
        qr_code_payload="qr_test",
        departure_time=departure_str,
        arrival_time=(now + timedelta(hours=3)).isoformat(),
        origin="București Nord",
        destination="Brașov",
        created_at=now
    )
    db_session.add(ticket_a)

    # Booking for User B (opted out) departing in 40 min
    bkg_b = Booking(
        id="bkg-b-1",
        user_id="user-b-optout",
        booking_reference="BEE-2222",
        status="CONFIRMED",
        total_amount_lei=50.0,
        currency="RON",
        passenger_count=1,
        created_at=now,
        updated_at=now
    )
    db_session.add(bkg_b)
    ticket_b = Ticket(
        id="tkt-b-1",
        booking_id="bkg-b-1",
        ticket_number="TK-IR1631-1A20",
        train_number="IR 1631",
        car_number="1",
        seat_number="20",
        passenger_name="Traveler Beta",
        qr_code_payload="qr_test_b",
        departure_time=departure_str,
        arrival_time=(now + timedelta(hours=3)).isoformat(),
        origin="București Nord",
        destination="Constanța",
        created_at=now
    )
    db_session.add(ticket_b)

    # SavedRoute for User A departing in 35 min
    saved_plan = {
        "summary": "IR 1583 • București Nord → Constanța",
        "departureTime": (now + timedelta(minutes=35)).isoformat(),
        "arrivalTime": (now + timedelta(hours=2, minutes=30)).isoformat(),
        "legs": [
            {
                "trainNumber": "IR 1583",
                "origin": {"name": "București Nord"},
                "destination": {"name": "Constanța"},
                "departureTime": (now + timedelta(minutes=35)).isoformat()
            }
        ]
    }
    saved_a = SavedRoute(
        id="saved-a-1",
        user_id="user-a-notif",
        origin_name="București Nord",
        destination_name="Constanța",
        plan_data=json.dumps(saved_plan),
        created_at=now
    )
    db_session.add(saved_a)

    await db_session.commit()

    # Run 1: Dispatch upcoming departures
    res1 = await trip_notification_service.check_and_dispatch_upcoming_departures(db_session, now=now)
    assert res1["sent"] == 2  # 1 booking + 1 saved route for User A
    assert res1["skipped_opted_out"] >= 1  # User B skipped
    assert res1["skipped_duplicate"] == 0

    msg_bkg = email_service.get_last_email_for("traveler.a@beeline.io")
    assert msg_bkg is not None
    assert "departs in" in msg_bkg.subject

    # Run 2: Exact same scan should strictly deduplicate -> 0 sent, 2 skipped_duplicate
    res2 = await trip_notification_service.check_and_dispatch_upcoming_departures(db_session, now=now)
    assert res2["sent"] == 0
    assert res2["skipped_duplicate"] == 2


@pytest.mark.asyncio
async def test_notifications_api_endpoints(client: AsyncClient, db_session: AsyncSession):
    """
    Test 4: POST /api/v1/notifications/test-departure-alert returns 200 and dispatches
    a departure email for a logged-in user, and returns 403 for a guest user.
    Also tests GET /api/v1/notifications/status and POST /api/v1/notifications/dispatch-due.
    """
    email_service.clear_outbox()

    # 1. As a Guest user
    guest_login = await client.post("/api/v1/auth/guest", json={"device_info": "Guest Device"})
    assert guest_login.status_code == 201
    guest_token = guest_login.json()["access_token"]

    guest_alert_res = await client.post(
        "/api/v1/notifications/test-departure-alert",
        headers={"Authorization": f"Bearer {guest_token}"}
    )
    assert guest_alert_res.status_code == 403
    assert "Sign in with an email account" in guest_alert_res.json()["detail"]

    # 2. As a Registered user
    user_email = "test.pilot@beeline.io"
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": user_email,
        "password": "TestPilotPassword2026!",
        "full_name": "Test Pilot"
    })
    assert signup_res.status_code == 201
    user_token = signup_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # Status endpoint
    status_res = await client.get("/api/v1/notifications/status", headers=user_headers)
    assert status_res.status_code == 200
    st_data = status_res.json()
    assert st_data["emailNotificationsEnabled"] is True
    assert st_data["departureReminderMinutes"] >= 10
    assert "emailMode" in st_data

    # Test alert endpoint
    alert_res = await client.post(
        "/api/v1/notifications/test-departure-alert",
        json={
            "trainNumber": "IC 531",
            "origin": "București Nord",
            "destination": "Cluj-Napoca",
            "delayMinutes": 15
        },
        headers=user_headers
    )
    assert alert_res.status_code == 200
    alert_data = alert_res.json()
    assert alert_data["recipientEmail"] == user_email
    assert alert_data["trainNumber"] == "IC 531"

    last_msg = email_service.get_last_email_for(user_email)
    assert last_msg is not None
    assert "IC 531" in last_msg.subject
    assert "⚠️ Beeline Delay Alert (+15m)" in last_msg.subject
    assert "Linia 1" in last_msg.html_body

    # Dispatch-due endpoint
    dispatch_res = await client.post("/api/v1/notifications/dispatch-due", headers=user_headers)
    assert dispatch_res.status_code == 200
    assert "checked" in dispatch_res.json()


@pytest.mark.asyncio
async def test_email_service_smtp_mime_multipart_romanian():
    """
    Test 5: Verify EmailService SMTP transport formatting (_build_mime_message)
    generates valid UTF-8 MIMEMultipart("alternative") messages (with Romanian diacritics
    like 'București Nord → Brașov' properly encoded) ready for Mailpit 1025.
    """
    record = EmailMessageRecord(
        to_email="calator@beeline.io",
        subject="Beeline: Trenul IR 1572 (București Nord → Brașov) pleacă în 45 min",
        html_body="<html><body><h1>Călătorie plăcută de la București Nord la Brașov!</h1></body></html>",
        text_body="Călătorie plăcută de la București Nord la Brașov!",
        template_name="train_departure_reminder",
        context={}
    )

    mime_msg = email_service._build_mime_message(record)

    assert mime_msg.is_multipart()
    assert mime_msg.get_content_type() == "multipart/alternative"
    assert mime_msg["To"] == "calator@beeline.io"
    assert "București Nord" in mime_msg["Subject"]
    assert "Brașov" in mime_msg["Subject"]
    assert mime_msg["Date"] is not None
    assert mime_msg["Message-ID"] is not None

    payloads = mime_msg.get_payload()
    assert len(payloads) == 2

    # Check text payload and encoding
    text_part = payloads[0]
    assert text_part.get_content_type() == "text/plain"
    assert text_part.get_content_charset() == "utf-8"
    assert "București Nord la Brașov" in text_part.get_payload(decode=True).decode("utf-8")

    # Check html payload and encoding
    html_part = payloads[1]
    assert html_part.get_content_type() == "text/html"
    assert html_part.get_content_charset() == "utf-8"
    assert "Călătorie plăcută" in html_part.get_payload(decode=True).decode("utf-8")


@pytest.mark.asyncio
async def test_all_lifecycle_and_security_notification_templates(client: AsyncClient):
    """
    Test 6: Verify password changes, MFA status updates, account status emails,
    and delay alerts dispatch correctly across domain events.
    """
    user_email = "lifecycle.traveler@beeline.io"
    signup_res = await client.post("/api/v1/auth/signup", json={
        "email": user_email,
        "password": "SecureLifecycle2026!",
        "full_name": "Lifecycle Traveler"
    })
    assert signup_res.status_code == 201
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Password change dispatch
    pw_res = await client.post("/api/v1/users/me/password", json={
        "current_password": "SecureLifecycle2026!",
        "new_password": "UpdatedLifecycle2026!"
    }, headers=headers)
    assert pw_res.status_code == 200

    pw_msg = email_service.get_last_email_for(user_email)
    assert pw_msg is not None
    assert "Security Alert: Your Password Was Changed" in pw_msg.subject

    # 2. MFA setup & enable dispatch
    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    assert setup_res.status_code == 200
    secret = setup_res.json()["secret"]

    from app.services.mfa_service import mfa_service
    code = mfa_service.generate_totp_code(secret)
    v_res = await client.post("/api/v1/auth/mfa/verify", json={"code": code}, headers=headers)
    assert v_res.status_code == 200

    mfa_msg = email_service.get_last_email_for(user_email)
    assert mfa_msg is not None
    assert "Two-Factor Authentication (2FA) Enabled" in mfa_msg.subject

    # 3. MFA disable dispatch
    dis_res = await client.post("/api/v1/auth/mfa/disable", json={"password": "UpdatedLifecycle2026!"}, headers=headers)
    assert dis_res.status_code == 200

    dis_msg = email_service.get_last_email_for(user_email)
    assert dis_msg is not None
    assert "Two-Factor Authentication (2FA) Disabled" in dis_msg.subject

    # 4. Account status update email
    status_msg = await email_service.send_account_status_email(
        to_email=user_email,
        action="Account Frozen (30 Days)",
        details="Your account is scheduled for permanent deletion in 30 days."
    )
    assert status_msg.status == "sent"
    assert "Account Update: Account Frozen" in status_msg.subject

    # 5. Live train delay alert dispatch
    delay_msg = await email_service.send_train_delay_alert_email(
        to_email=user_email,
        train_number="IR 1572",
        origin="București Nord",
        destination="Brașov",
        departure_time="2026-03-29T08:00:00+02:00",
        delay_minutes=35,
        user_name="Lifecycle Traveler"
    )
    assert delay_msg.status == "sent"
    assert "delayed by 35 min" in delay_msg.subject
    assert "35 minutes" in delay_msg.html_body

