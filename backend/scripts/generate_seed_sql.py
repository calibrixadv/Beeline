#!/usr/bin/env python3
"""
Generates clean, realistic, and rich Romanian transit seed data in seed.sql
conforming to PostgreSQL 16 & SQLite 3.35+.
"""
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.schemas.route_plan import (
    TransitRoutePlan, TransitRouteQuery, LocationQuery, GeoPoint,
    CuratedPillar, MascotRecommendation, RouteRiskAnalysis, RiskLevel, BufferAdequacy,
    RouteFareSummary, LegFareItem, EcoBenchmark, TransitLeg, TransitMode, LegNames,
    LegCoordinates, IntermediateStop, GeoJSONLineString, LegTimings, LegRiskProfile,
    LegFare, LegAmenities, LegInstructions
)
from app.services.routing_service import routing_service

now_iso = "2026-10-21T06:00:00Z"
valid_until = "2026-10-21T23:59:59Z"

# 1. Micro 19 -> Piața Unirii multimodal plan
q1 = TransitRouteQuery(
    origin=LocationQuery(name="Micro 19", city="Galați", coords=GeoPoint(latitude=45.4125, longitude=27.9982, city="Galați")),
    destination=LocationQuery(name="Piața Unirii", city="București", coords=GeoPoint(latitude=44.4276, longitude=26.1026, city="București"))
)
p1 = routing_service.generate_micro19_to_unirii_plan(q1)

# 2. Galați -> București Nord Direct Express
q2 = TransitRouteQuery(
    origin=LocationQuery(name="Galați", city="Galați", coords=GeoPoint(latitude=45.4382, longitude=28.0561, city="Galați", platform="Linia 1")),
    destination=LocationQuery(name="București Nord", city="București", coords=GeoPoint(latitude=44.4473, longitude=26.0746, city="București", platform="Linia 3"))
)
leg2 = TransitLeg(
    id="leg-cfr-ir-1572-direct",
    legIndex=0,
    transportType=TransitMode.TRAIN,
    names=LegNames(
        originName="Gara Galați",
        originCity="Galați",
        destinationName="București Nord",
        destinationCity="București",
        lineCode="IR 1572",
        lineName="Galați ⇄ București Nord",
        operatorName="CFR Călători",
        operatorShortName="CFR",
        headsign="București Nord",
        vehicleIdentifier="Alstom Coradia Stream"
    ),
    coords=LegCoordinates(
        originCoords=GeoPoint(latitude=45.4382, longitude=28.0561, city="Galați", platform="Linia 1"),
        destinationCoords=GeoPoint(latitude=44.4473, longitude=26.0746, city="București", platform="Linia 3"),
        intermediateStops=[
            IntermediateStop(stopSequence=1, name="Gara Brăila", coords=GeoPoint(latitude=45.2751, longitude=27.9554, city="Brăila")),
            IntermediateStop(stopSequence=2, name="Gara Făurei", coords=GeoPoint(latitude=45.0862, longitude=27.2718, city="Făurei")),
            IntermediateStop(stopSequence=3, name="Gara Buzău", coords=GeoPoint(latitude=45.1432, longitude=26.8306, city="Buzău")),
            IntermediateStop(stopSequence=4, name="Ploiești Sud", coords=GeoPoint(latitude=44.9272, longitude=26.0354, city="Ploiești"))
        ],
        geometry=GeoJSONLineString(
            type="LineString",
            coordinates=[
                (28.0561, 45.4382),
                (27.9554, 45.2751),
                (27.2718, 45.0862),
                (26.8306, 45.1432),
                (26.0354, 44.9272),
                (26.0746, 44.4473)
            ]
        )
    ),
    timings=LegTimings(
        scheduledDeparture="2026-10-21T07:30:00+03:00",
        scheduledArrival="2026-10-21T10:45:00+03:00",
        estimatedDeparture="2026-10-21T07:30:00+03:00",
        estimatedArrival="2026-10-21T10:45:00+03:00",
        durationMinutes=195,
        delayMinutes=0,
        isRealtime=True
    ),
    risk=LegRiskProfile(
        legRiskScore=8.0,
        historicalPunctualityPercent=94.0,
        transferBufferAfterMinutes=None,
        isShieldedBuffer=True,
        disruptions=[]
    ),
    fare=LegFare(
        amount=62.50,
        currency="RON",
        ticketCategory="RAIL_INTERREGIO",
        bookingUrl="https://bilete.cfrcalatori.ro",
        providerPaymentMethods=["CONTACTLESS_CARD", "CFR_TICKET_OFFICE"]
    ),
    amenities=LegAmenities(
        items=["WIFI", "POWER_OUTLETS", "DINING_CAR", "WHEELCHAIR_ACCESSIBLE"],
        crowdingLevel="LOW",
        stepFreeAccess=True
    ),
    instructions=LegInstructions(
        leadText="Board CFR IR 1572 at Gara Galați Linia 1",
        detailSteps=["Direct express journey via Brăila, Buzău, and Ploiești to București Nord"],
        transferNotice="Arrive at București Nord main concourse."
    )
)
p2 = TransitRoutePlan(
    id="itinerary-gl-bct-direct-001",
    query=q2,
    summary="CFR IR 1572 Direct Express",
    departureTime="2026-10-21T07:30:00+03:00",
    arrivalTime="2026-10-21T10:45:00+03:00",
    totalDurationMinutes=195,
    totalWalkMinutes=5,
    totalWalkDistanceMeters=250,
    transfersCount=0,
    curatedPillar=CuratedPillar.FASTEST,
    mascotRecommendation=MascotRecommendation(
        persona="barnaby",
        badgeLabel="DIRECT EXPRESS",
        advice="Single direct train connection between Galați and București. 0 transfers needed."
    ),
    riskAnalysis=RouteRiskAnalysis(
        overallRiskScore=8.0,
        riskLevel=RiskLevel.LOW,
        historicalPunctualityRate=0.94,
        tightestBufferMinutes=0,
        bufferAdequacy=BufferAdequacy.GENEROUS,
        riskSummaryText="Direct train service with high historical on-time performance.",
        factors=[],
        expectedDelayMinutes=0,
        missedConnectionProbability=0.0,
        riskFactors=["Direct train service with high historical on-time performance."],
        isMlComputed=True
    ),
    fare=RouteFareSummary(
        totalAmountLei=62.50,
        totalAmountEur=12.50,
        isIntegratedTicketAvailable=True,
        legFares=[LegFareItem(legId="leg-cfr-ir-1572-direct", operator="CFR Călători", amountLei=62.50, amountEur=12.50)]
    ),
    eco=EcoBenchmark(
        routeEmissionsKgCO2=7.2,
        carEmissionsKgCO2=36.4,
        savedKgCO2=29.2,
        percentageSaved=80.2,
        treeDaysEquivalent=4.8
    ),
    legs=[leg2],
    createdAt=now_iso,
    validUntil=valid_until
)

# 3. București Nord -> Brașov Scenic Express
q3 = TransitRouteQuery(
    origin=LocationQuery(name="București Nord", city="București", coords=GeoPoint(latitude=44.4473, longitude=26.0746, city="București")),
    destination=LocationQuery(name="Brașov", city="Brașov", coords=GeoPoint(latitude=45.6608, longitude=25.6144, city="Brașov"))
)
p3 = routing_service.generate_bucharest_to_brasov_plan(q3)

# 4. București Nord -> Arad Overnight Sleeper
q4 = TransitRouteQuery(
    origin=LocationQuery(name="București Nord", city="București", coords=GeoPoint(latitude=44.4473, longitude=26.0746, city="București")),
    destination=LocationQuery(name="Arad", city="Arad", coords=GeoPoint(latitude=46.1883, longitude=21.3235, city="Arad"))
)
leg4 = TransitLeg(
    id="leg-astra-ir-15531",
    legIndex=0,
    transportType=TransitMode.TRAIN,
    names=LegNames(
        originName="București Nord",
        originCity="București",
        destinationName="Gara Arad",
        destinationCity="Arad",
        lineCode="IR 15531",
        lineName="TransCarpatic Night Express",
        operatorName="Astra Trans Carpatic",
        operatorShortName="Astra",
        headsign="Arad",
        vehicleIdentifier="Astra Sleeper Coach"
    ),
    coords=LegCoordinates(
        originCoords=GeoPoint(latitude=44.4473, longitude=26.0746, city="București", platform="Linia 1"),
        destinationCoords=GeoPoint(latitude=46.1883, longitude=21.3235, city="Arad", platform="Linia 1"),
        intermediateStops=[
            IntermediateStop(stopSequence=1, name="Gara Brașov", coords=GeoPoint(latitude=45.6608, longitude=25.6144, city="Brașov")),
            IntermediateStop(stopSequence=2, name="Gara Sibiu", coords=GeoPoint(latitude=45.7981, longitude=24.1601, city="Sibiu")),
            IntermediateStop(stopSequence=3, name="Gara Deva", coords=GeoPoint(latitude=45.8821, longitude=22.9056, city="Deva"))
        ],
        geometry=GeoJSONLineString(
            type="LineString",
            coordinates=[
                (26.0746, 44.4473),
                (25.6144, 45.6608),
                (24.1601, 45.7981),
                (22.9056, 45.8821),
                (21.3235, 46.1883)
            ]
        )
    ),
    timings=LegTimings(
        scheduledDeparture="2026-10-21T21:40:00+03:00",
        scheduledArrival="2026-10-22T08:15:00+03:00",
        estimatedDeparture="2026-10-21T21:40:00+03:00",
        estimatedArrival="2026-10-22T08:15:00+03:00",
        durationMinutes=635,
        delayMinutes=0,
        isRealtime=True
    ),
    risk=LegRiskProfile(
        legRiskScore=10.0,
        historicalPunctualityPercent=92.0,
        transferBufferAfterMinutes=None,
        isShieldedBuffer=True,
        disruptions=[]
    ),
    fare=LegFare(
        amount=115.00,
        currency="RON",
        ticketCategory="RAIL_INTERREGIO",
        bookingUrl="https://www.astratranscarpatic.ro",
        providerPaymentMethods=["ONLINE_CARD", "ONBOARD"]
    ),
    amenities=LegAmenities(
        items=["WIFI", "POWER_OUTLETS", "DINING_CAR", "QUIET_ZONE"],
        crowdingLevel="LOW",
        stepFreeAccess=True
    ),
    instructions=LegInstructions(
        leadText="Board Astra Trans Carpatic IR 15531 at București Nord Linia 1",
        detailSteps=["Overnight journey with sleeping compartments across the Carpathians to Arad"],
        transferNotice="Arrive at Gara Arad terminal."
    )
)
p4 = TransitRoutePlan(
    id="itinerary-buc-arad-sleeper-001",
    query=q4,
    summary="Astra Trans Carpatic IR 15531 Overnight Sleeper",
    departureTime="2026-10-21T21:40:00+03:00",
    arrivalTime="2026-10-22T08:15:00+03:00",
    totalDurationMinutes=635,
    totalWalkMinutes=0,
    totalWalkDistanceMeters=0,
    transfersCount=0,
    curatedPillar=CuratedPillar.BEST_VALUE,
    mascotRecommendation=MascotRecommendation(
        persona="honey",
        badgeLabel="SLEEPER COMFORT",
        advice="Overnight rail sleeper journey. Wake up rested at your destination."
    ),
    riskAnalysis=RouteRiskAnalysis(
        overallRiskScore=10.0,
        riskLevel=RiskLevel.LOW,
        historicalPunctualityRate=0.92,
        tightestBufferMinutes=0,
        bufferAdequacy=BufferAdequacy.GENEROUS,
        riskSummaryText="Direct overnight sleeper train with smooth Carpathian transit.",
        factors=[],
        expectedDelayMinutes=0,
        missedConnectionProbability=0.0,
        riskFactors=["Direct overnight sleeper train."],
        isMlComputed=True
    ),
    fare=RouteFareSummary(
        totalAmountLei=115.00,
        totalAmountEur=23.00,
        isIntegratedTicketAvailable=True,
        legFares=[LegFareItem(legId="leg-astra-ir-15531", operator="Astra Trans Carpatic", amountLei=115.00, amountEur=23.00)]
    ),
    eco=EcoBenchmark(
        routeEmissionsKgCO2=18.5,
        carEmissionsKgCO2=110.2,
        savedKgCO2=91.7,
        percentageSaved=83.2,
        treeDaysEquivalent=15.2
    ),
    legs=[leg4],
    createdAt=now_iso,
    validUntil=valid_until
)

# 5. Cluj-Napoca -> Oradea Crișana Express
q5 = TransitRouteQuery(
    origin=LocationQuery(name="Cluj-Napoca", city="Cluj-Napoca", coords=GeoPoint(latitude=46.7842, longitude=23.5872, city="Cluj-Napoca")),
    destination=LocationQuery(name="Oradea", city="Oradea", coords=GeoPoint(latitude=47.0722, longitude=21.9344, city="Oradea"))
)
leg5 = TransitLeg(
    id="leg-cfr-ir-1533",
    legIndex=0,
    transportType=TransitMode.TRAIN,
    names=LegNames(
        originName="Gara Cluj-Napoca",
        originCity="Cluj-Napoca",
        destinationName="Gara Oradea",
        destinationCity="Oradea",
        lineCode="IR 1533",
        lineName="Crișana Express",
        operatorName="CFR Călători",
        operatorShortName="CFR",
        headsign="Oradea",
        vehicleIdentifier="Siemens Desiro DMU"
    ),
    coords=LegCoordinates(
        originCoords=GeoPoint(latitude=46.7842, longitude=23.5872, city="Cluj-Napoca", platform="Linia 2"),
        destinationCoords=GeoPoint(latitude=47.0722, longitude=21.9344, city="Oradea", platform="Linia 1"),
        intermediateStops=[
            IntermediateStop(stopSequence=1, name="Gara Aghireș", coords=GeoPoint(latitude=46.8715, longitude=23.2422, city="Aghireșu")),
            IntermediateStop(stopSequence=2, name="Gara Huedin", coords=GeoPoint(latitude=46.8667, longitude=23.0333, city="Huedin")),
            IntermediateStop(stopSequence=3, name="Gara Aleșd", coords=GeoPoint(latitude=47.0583, longitude=22.3917, city="Aleșd"))
        ],
        geometry=GeoJSONLineString(
            type="LineString",
            coordinates=[
                (23.5872, 46.7842),
                (23.2422, 46.8715),
                (23.0333, 46.8667),
                (22.3917, 47.0583),
                (21.9344, 47.0722)
            ]
        )
    ),
    timings=LegTimings(
        scheduledDeparture="2026-10-21T08:15:00+03:00",
        scheduledArrival="2026-10-21T11:00:00+03:00",
        durationMinutes=165,
        delayMinutes=0,
        estimatedDeparture="2026-10-21T08:15:00+03:00",
        estimatedArrival="2026-10-21T11:00:00+03:00",
        isRealtime=True
    ),
    risk=LegRiskProfile(
        legRiskScore=9.0,
        historicalPunctualityPercent=93.0,
        transferBufferAfterMinutes=None,
        isShieldedBuffer=True,
        disruptions=[]
    ),
    fare=LegFare(
        amount=38.00,
        currency="RON",
        ticketCategory="RAIL_INTERREGIO",
        bookingUrl="https://bilete.cfrcalatori.ro",
        providerPaymentMethods=["CONTACTLESS_CARD", "CFR_TICKET_OFFICE"]
    ),
    amenities=LegAmenities(
        items=["WIFI", "POWER_OUTLETS", "AIR_CONDITIONING"],
        crowdingLevel="LOW",
        stepFreeAccess=True
    ),
    instructions=LegInstructions(
        leadText="Board CFR IR 1533 at Gara Cluj-Napoca Linia 2",
        detailSteps=["Regional express journey through Crișana via Huedin and Aleșd to Oradea"],
        transferNotice="Arrive at Gara Oradea."
    )
)
p5 = TransitRoutePlan(
    id="itinerary-cjn-oradea-express-001",
    query=q5,
    summary="CFR IR 1533 Crișana Express",
    departureTime="2026-10-21T08:15:00+03:00",
    arrivalTime="2026-10-21T11:00:00+03:00",
    totalDurationMinutes=165,
    totalWalkMinutes=3,
    totalWalkDistanceMeters=120,
    transfersCount=0,
    curatedPillar=CuratedPillar.FASTEST,
    mascotRecommendation=MascotRecommendation(
        persona="barnaby",
        badgeLabel="CRIȘANA DIRECT",
        advice="Swift direct train connection connecting Cluj and Oradea in under 3 hours."
    ),
    riskAnalysis=RouteRiskAnalysis(
        overallRiskScore=9.0,
        riskLevel=RiskLevel.LOW,
        historicalPunctualityRate=0.93,
        tightestBufferMinutes=0,
        bufferAdequacy=BufferAdequacy.GENEROUS,
        riskSummaryText="Direct regional express with reliable timetable adherence.",
        factors=[],
        expectedDelayMinutes=0,
        missedConnectionProbability=0.0,
        riskFactors=["Direct regional express."],
        isMlComputed=True
    ),
    fare=RouteFareSummary(
        totalAmountLei=38.00,
        totalAmountEur=7.60,
        isIntegratedTicketAvailable=True,
        legFares=[LegFareItem(legId="leg-cfr-ir-1533", operator="CFR Călători", amountLei=38.00, amountEur=7.60)]
    ),
    eco=EcoBenchmark(
        routeEmissionsKgCO2=5.6,
        carEmissionsKgCO2=31.2,
        savedKgCO2=25.6,
        percentageSaved=82.0,
        treeDaysEquivalent=3.9
    ),
    legs=[leg5],
    createdAt=now_iso,
    validUntil=valid_until
)

# Escape single quotes for SQL insertion
sql_p1 = p1.model_dump_json().replace("'", "''")
sql_p2 = p2.model_dump_json().replace("'", "''")
sql_p3 = p3.model_dump_json().replace("'", "''")
sql_p4 = p4.model_dump_json().replace("'", "''")
sql_p5 = p5.model_dump_json().replace("'", "''")

sql_content = f"""-- ====================================================================
-- Beeline VoyageRail Relational Database Seed Data
-- Compatible with PostgreSQL 16 (Production) & SQLite 3.35+ (Local/Dev)
-- Course: Baze de Date Avansate (BD2)
-- SGBD Relațional: PostgreSQL 16 (beeline_postgres)
-- ====================================================================

-- 1. USERS & ROLES
-- Registered Traveler 1 (traveler@beeline.io / Password123!)
INSERT INTO users (id, email, username, hashed_password, full_name, role, preferences, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-traveler-001',
    'traveler@beeline.io',
    'andrei_popescu',
    '$2b$12$SEhFX5krLU5KP0/c048UFOFLgeyQPw.vakcN9uva/H2bbVQg3yVpe',
    'Andrei Popescu',
    'TRAVELER',
    '{{"preferredClass": "STANDARD", "seatPreference": "WINDOW", "smsNotifications": true}}',
    FALSE, TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- System Administrator with TOTP MFA (admin@beeline.io / AdminPass123!)
INSERT INTO users (id, email, username, hashed_password, full_name, role, preferences, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-admin-002',
    'admin@beeline.io',
    'admin_beeline',
    '$2b$12$fTRXhNrxTe3qQewgKStC2.RLy7ed0YX5.tRT/P1K50UWHR4HTlnka',
    'System Administrator',
    'ADMIN',
    '{{"theme": "dark", "language": "ro", "auditNotifications": true}}',
    FALSE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Transit Dispatcher / Operator (operator@cfrcalatori.ro / OperatorPass123!)
INSERT INTO users (id, email, username, hashed_password, full_name, role, preferences, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-operator-004',
    'operator@cfrcalatori.ro',
    'dispecer_cfr',
    '$2b$12$pUYGbYgxgvnRHNm.BPlSwuDzpJkuc9Fomb4IcryXNOxoiQ/19YZKS',
    'Dispecer Central Feroviar',
    'OPERATOR',
    '{{"assignedCorridor": "M500", "dispatchConsoleMode": "live"}}',
    FALSE, TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Registered Traveler 2 (elena.ionescu@beeline.io / Password123!)
INSERT INTO users (id, email, username, hashed_password, full_name, role, preferences, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-traveler-005',
    'elena.ionescu@beeline.io',
    'elena_ionescu',
    '$2b$12$SEhFX5krLU5KP0/c048UFOFLgeyQPw.vakcN9uva/H2bbVQg3yVpe',
    'Elena Ionescu',
    'TRAVELER',
    '{{"preferredClass": "FIRST", "seatPreference": "AISLE"}}',
    FALSE, TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Registered Traveler 3 (radu.stoica@beeline.io / Password123!)
INSERT INTO users (id, email, username, hashed_password, full_name, role, preferences, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-traveler-007',
    'radu.stoica@beeline.io',
    'radu_stoica',
    '$2b$12$SEhFX5krLU5KP0/c048UFOFLgeyQPw.vakcN9uva/H2bbVQg3yVpe',
    'Radu Stoica',
    'TRAVELER',
    '{{"preferredClass": "STANDARD", "seatPreference": "WINDOW"}}',
    FALSE, TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Ephemeral Guest Explorer
INSERT INTO users (id, email, username, hashed_password, full_name, role, preferences, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-guest-003',
    NULL,
    NULL,
    NULL,
    'Guest Explorer',
    'TRAVELER',
    '{{}}',
    TRUE, TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Ephemeral Guest Commuter
INSERT INTO users (id, email, username, hashed_password, full_name, role, preferences, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-guest-006',
    NULL,
    NULL,
    NULL,
    'Guest Commuter',
    'TRAVELER',
    '{{}}',
    TRUE, TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 2. MFA CREDENTIALS
-- RFC 6238 TOTP Secret and Emergency Recovery Hash for System Admin (Recovery Code: EMERG-RECOV-1)
INSERT INTO mfa_credentials (id, user_id, secret_key, backup_codes_hash, is_confirmed, created_at, updated_at)
VALUES (
    'mfa-seed-admin-001',
    'usr-seed-admin-002',
    'JBSWY3DPEHPK3PXP',
    '["f4eb58d77ecda1ea140f0343744112c1284100f50f036442640d4790610d86e0"]',
    TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 3. USER SESSIONS
-- Active and Revoked multi-device sessions with verified SHA-256 refresh tokens
-- Active: iPhone 15 Pro (Andrei Popescu)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-traveler-001',
    'usr-seed-traveler-001',
    '5bbe268ba2b84523f33ad4b5ad2b1cf93e799ad36613b20781a135382cd84bf5',
    'iPhone 15 Pro / iOS 17.4 / Beeline Mobile App',
    '86.120.45.12',
    FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

-- Revoked: Old iPad Air 2 (Andrei Popescu)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-traveler-002',
    'usr-seed-traveler-001',
    '9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d',
    'iPad Air 2 / iOS 15.8 / Safari Mobile',
    '86.120.45.14',
    TRUE, '2026-08-01 10:00:00', '2026-08-15 12:00:00', '2026-09-01 00:00:00'
) ON CONFLICT DO NOTHING;

-- Active: MacBook Pro M3 (System Admin)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-admin-001',
    'usr-seed-admin-002',
    'c49d895e4ebf219c52b01601122be5c4a116bd0cb037d5791fc0763f60473633',
    'MacBook Pro M3 / macOS Sonoma / Chrome 124',
    '193.226.5.10',
    FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

-- Revoked: Windows 10 Workstation (System Admin)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-admin-002',
    'usr-seed-admin-002',
    'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
    'Dell Precision / Windows 10 / Firefox ESR',
    '193.226.5.11',
    TRUE, '2026-07-01 08:00:00', '2026-07-20 18:00:00', '2026-08-01 00:00:00'
) ON CONFLICT DO NOTHING;

-- Active: CFR Dispatch Workstation (Operator)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-operator-001',
    'usr-seed-operator-004',
    'afe5d4e688ef9a0dddf17a3360ecd192df5c81f58fa6b6c9116394858046381e',
    'Workstation CFR / Windows 11 / Firefox ESR',
    '82.77.100.22',
    FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

-- Active: Samsung Galaxy S24 (Elena Ionescu)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-traveler-003',
    'usr-seed-traveler-005',
    '1d858e998a4e3fa52a8b9e67cb9d91f4b5f8842e6dc90d348a27d21c38fa85b1',
    'Samsung Galaxy S24 / Android 14 / Beeline App',
    '86.120.45.15',
    FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

-- Revoked: Safari MacOS Session (Elena Ionescu)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-traveler-004',
    'usr-seed-traveler-005',
    '2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
    'MacBook Air M2 / macOS Ventura / Safari 16',
    '86.120.45.16',
    TRUE, '2026-06-10 14:00:00', '2026-06-25 19:30:00', '2026-07-10 00:00:00'
) ON CONFLICT DO NOTHING;

-- Active: Google Pixel 8 (Radu Stoica)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-traveler-005',
    'usr-seed-traveler-007',
    '3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a',
    'Google Pixel 8 / Android 14 / Chrome Mobile',
    '109.166.130.45',
    FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

-- Active: Safari Mobile (Guest Explorer)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-guest-001',
    'usr-seed-guest-003',
    '4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
    'iPhone 13 / iOS 17.5 / Safari Mobile',
    '82.78.200.50',
    FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

-- Revoked: Ephemeral Guest Session (Guest Commuter)
INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, is_revoked, created_at, last_active_at, expires_at)
VALUES (
    'sess-seed-guest-002',
    'usr-seed-guest-006',
    '5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
    'OnePlus 11 / Android 13 / Chrome',
    '82.78.200.55',
    TRUE, '2026-09-01 11:00:00', '2026-09-01 11:45:00', '2026-09-02 00:00:00'
) ON CONFLICT DO NOTHING;

-- 4. PASSWORD RESET TOKENS
INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, is_used, created_at)
VALUES (
    'tok-seed-pw-001',
    'usr-seed-traveler-001',
    '81c78f0b8c667c05e07b447280ac923b29130054b7c0917d7ca87ead12801ded',
    '2027-01-01 00:00:00',
    FALSE, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, is_used, created_at)
VALUES (
    'tok-seed-pw-002',
    'usr-seed-operator-004',
    '4250265460dc0459829c510c43c642023f7902862e229d1aa29f69af2e7d888d',
    '2026-01-01 00:00:00',
    TRUE, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, is_used, created_at)
VALUES (
    'tok-seed-pw-003',
    'usr-seed-traveler-005',
    '6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
    '2026-06-01 00:00:00',
    TRUE, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 5. TRANSIT STATIONS & NODES (MAJOR ROMANIAN RAIL CORRIDORS)
INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('BCT', 'București Nord', 'București', 44.4473, 26.0746, '["TRAIN", "METRO", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('BCO', 'București Basarab', 'București', 44.4491, 26.0682, '["TRAIN", "METRO"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('BCOB', 'București Obor', 'București', 44.4485, 26.1362, '["TRAIN", "TRAM", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('GLT', 'Gara Galați', 'Galați', 45.4382, 28.0561, '["TRAIN", "TRAM", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('BRL', 'Gara Brăila', 'Brăila', 45.2751, 27.9554, '["TRAIN", "TRAM", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('BSV', 'Gara Brașov', 'Brașov', 45.6608, 25.6144, '["TRAIN", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('CJN', 'Gara Cluj-Napoca', 'Cluj-Napoca', 46.7842, 23.5872, '["TRAIN", "TRAM", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('TIM', 'Gara Timișoara Nord', 'Timișoara', 45.7511, 21.2084, '["TRAIN", "TRAM", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('IAS', 'Gara Iași', 'Iași', 47.1685, 27.5701, '["TRAIN", "TRAM", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('CTA', 'Gara Constanța', 'Constanța', 44.1704, 28.6302, '["TRAIN", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('CTN', 'Gara Constanța (Terminal)', 'Constanța', 44.1733, 28.6338, '["TRAIN", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('PLS', 'Ploiești Sud', 'Ploiești', 44.9272, 26.0354, '["TRAIN", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('PLV', 'Ploiești Vest', 'Ploiești', 44.9331, 25.9992, '["TRAIN", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('ARD', 'Gara Arad', 'Arad', 46.1883, 21.3235, '["TRAIN", "TRAM", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('SNA', 'Gara Sinaia', 'Sinaia', 45.3533, 25.5539, '["TRAIN", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('SBZ', 'Gara Sibiu', 'Sibiu', 45.7981, 24.1601, '["TRAIN", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('CRA', 'Gara Craiova', 'Craiova', 44.3328, 23.8153, '["TRAIN", "TRAM", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('ORD', 'Gara Oradea', 'Oradea', 47.0722, 21.9344, '["TRAIN", "TRAM", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

INSERT INTO stations (code, name, city, latitude, longitude, modes, is_active, created_at, updated_at)
VALUES ('SCV', 'Gara Suceava', 'Suceava', 47.6719, 26.2625, '["TRAIN", "BUS"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

-- 6. TRAINS & RAIL JOURNEYS (POPULAR ROMANIAN CORRIDORS)
-- Corridor 1: Galați ⇄ București Nord
INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1572', 'IR 1572', 'CFR Călători', 'CFR', 'GLT', 'BCT',
    '2026-10-21 07:30:00', '2026-10-21 10:45:00', 195, 'ON_TIME', 0, 62.50, 142,
    '["WIFI", "POWER_OUTLETS", "DINING_CAR", "WHEELCHAIR_ACCESSIBLE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1571', 'IR 1571', 'CFR Călători', 'CFR', 'BCT', 'GLT',
    '2026-10-21 06:15:00', '2026-10-21 09:30:00', 195, 'ON_TIME', 0, 62.50, 130,
    '["WIFI", "POWER_OUTLETS", "DINING_CAR"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-tfc-15021', 'TFC 15021', 'Transferoviar Călători', 'TFC', 'BCT', 'GLT',
    '2026-10-21 13:45:00', '2026-10-21 17:35:00', 230, 'ON_TIME', 0, 54.00, 42,
    '["WIFI", "POWER_OUTLETS", "BIKE_STORAGE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-tfc-re-10021', 'RE 10021', 'Transferoviar Călători', 'TFC', 'GLT', 'BCT',
    '2026-10-21 14:10:00', '2026-10-21 18:25:00', 255, 'ON_TIME', 0, 48.00, 110,
    '["POWER_OUTLETS", "BIKE_STORAGE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Corridor 2: București Nord ⇄ Brașov (Prahova Valley)
INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1631', 'IR 1631', 'CFR Călători', 'CFR', 'BCT', 'BSV',
    '2026-10-21 09:10:00', '2026-10-21 11:40:00', 150, 'ON_TIME', 0, 48.00, 60,
    '["WIFI", "POWER_OUTLETS", "WHEELCHAIR_ACCESSIBLE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1634', 'IR 1634', 'CFR Călători', 'CFR', 'BSV', 'BCT',
    '2026-10-21 07:15:00', '2026-10-21 09:45:00', 150, 'DELAYED', 15, 54.00, 88,
    '["WIFI", "POWER_OUTLETS", "WHEELCHAIR_ACCESSIBLE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-astra-ir-15531', 'IR 15531', 'Astra Trans Carpatic', 'Astra', 'BCT', 'ARD',
    '2026-10-21 21:40:00', '2026-10-22 08:15:00', 635, 'ON_TIME', 0, 115.00, 35,
    '["WIFI", "POWER_OUTLETS", "DINING_CAR", "QUIET_ZONE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-reg-16011', 'R 16011', 'Regio Călători', 'Regio', 'BSV', 'SBZ',
    '2026-10-21 10:15:00', '2026-10-21 13:05:00', 170, 'BOARDING', 0, 28.50, 50,
    '["WHEELCHAIR_ACCESSIBLE", "BIKE_STORAGE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Corridor 3: București Nord ⇄ Constanța (Sun Corridor)
INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1682', 'IR 1682', 'CFR Călători', 'CFR', 'CTA', 'BCT',
    '2026-10-21 16:20:00', '2026-10-21 18:30:00', 130, 'ON_TIME', 0, 72.00, 110,
    '["WIFI", "POWER_OUTLETS", "DINING_CAR"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1583', 'IR 1583', 'CFR Călători', 'CFR', 'BCT', 'CTA',
    '2026-10-21 09:30:00', '2026-10-21 11:40:00', 130, 'ON_TIME', 0, 72.00, 95,
    '["WIFI", "POWER_OUTLETS", "DINING_CAR"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Corridor 4: București Nord ⇄ Cluj-Napoca (M300)
INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1745', 'IR 1745', 'CFR Călători', 'CFR', 'BCT', 'CJN',
    '2026-10-21 06:00:00', '2026-10-21 15:20:00', 560, 'DELAYED', 15, 102.00, 24,
    '["POWER_OUTLETS", "WHEELCHAIR_ACCESSIBLE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1746', 'IR 1746', 'CFR Călători', 'CFR', 'CJN', 'BCT',
    '2026-10-21 10:30:00', '2026-10-21 19:50:00', 560, 'ON_TIME', 0, 102.00, 32,
    '["POWER_OUTLETS", "WHEELCHAIR_ACCESSIBLE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Corridor 5: Cluj-Napoca ⇄ Oradea
INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1533', 'IR 1533', 'CFR Călători', 'CFR', 'CJN', 'ORD',
    '2026-10-21 08:15:00', '2026-10-21 11:00:00', 165, 'ON_TIME', 0, 38.00, 85,
    '["WIFI", "POWER_OUTLETS", "AIR_CONDITIONING"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-tfc-15201', 'TFC 15201', 'Transferoviar Călători', 'TFC', 'ORD', 'CJN',
    '2026-10-21 14:00:00', '2026-10-21 16:45:00', 165, 'ON_TIME', 0, 34.00, 70,
    '["WIFI", "POWER_OUTLETS", "BIKE_STORAGE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Corridor 6: Timișoara Nord ⇄ Arad
INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-reg-14511', 'R 14511', 'Regio Călători', 'Regio', 'TIM', 'ARD',
    '2026-10-21 07:45:00', '2026-10-21 08:35:00', 50, 'ON_TIME', 0, 18.50, 90,
    '["WHEELCHAIR_ACCESSIBLE", "BIKE_STORAGE"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Corridor 7: București Nord ⇄ Iași (M500)
INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1661', 'IR 1661', 'CFR Călători', 'CFR', 'BCT', 'IAS',
    '2026-10-21 14:00:00', '2026-10-21 20:15:00', 375, 'ON_TIME', 0, 95.00, 75,
    '["WIFI", "POWER_OUTLETS", "DINING_CAR"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Corridor 8: București Nord ⇄ Craiova (M900)
INSERT INTO trains (id, train_number, operator_name, operator_code, origin_code, destination_code, departure_time, arrival_time, duration_minutes, status, delay_minutes, base_price_lei, available_seats, amenities, created_at, updated_at)
VALUES (
    'trn-cfr-ir-1823', 'IR 1823', 'CFR Călători', 'CFR', 'BCT', 'CRA',
    '2026-10-21 17:00:00', '2026-10-21 20:15:00', 195, 'ON_TIME', 0, 65.00, 90,
    '["WIFI", "POWER_OUTLETS"]',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 7. URBAN & REGIONAL TRANSIT SCHEDULES
INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-metro-m2', 'M2', 'Magistrala M2 Pipera - Berceni', 'București', 'METRO',
    'metrorex', 'Metrorex S.A.', 'Pipera', 'Berceni',
    4, '05:00', '23:30', 3.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-metro-m1', 'M1', 'Magistrala M1 Dristor 2 - Pantelimon', 'București', 'METRO',
    'metrorex', 'Metrorex S.A.', 'Dristor 2', 'Pantelimon',
    6, '05:00', '23:30', 3.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-stb-41', '41', 'Linia 41 Metrou Ușor Piața Presei - Ghencea', 'București', 'TRAM',
    'stb', 'Societatea de Transport București', 'Piața Presei', 'Ghencea',
    5, '04:45', '23:45', 3.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-stb-100', '100', 'Linia 100 Expres Piața Unirii - Aeroport Otopeni', 'București', 'BUS',
    'stb', 'Societatea de Transport București', 'Piața Unirii', 'Aeroport Henri Coandă',
    15, '00:00', '23:59', 3.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-stb-1', '1', 'Linia 1 Inelul Principal Banu Manta - Șura Mare', 'București', 'TRAM',
    'stb', 'Societatea de Transport București', 'Banu Manta', 'Șura Mare',
    7, '05:00', '23:30', 3.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-transurb-102', '102', 'Traseu 102 Micro 19 - Gara CFR Galați', 'Galați', 'BUS',
    'transurb', 'Transurb S.A. Galați', 'Micro 19', 'Gara Galați',
    10, '05:15', '22:45', 3.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-transurb-39', '39', 'Traseu 39 Micro 19 - Cimitirul Israelit', 'Galați', 'TRAM',
    'transurb', 'Transurb S.A. Galați', 'Micro 19', 'Cimitirul Israelit',
    15, '05:30', '22:30', 3.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-ctp-24b', '24B', 'Linia 24B Unirii - Polus Center', 'Cluj-Napoca', 'BUS',
    'ctp_cluj', 'Compania de Transport Public Cluj', 'Piața Unirii', 'Polus Center',
    12, '05:30', '23:00', 3.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-ctp-5', '5', 'Linia 5 Gara CFR Cluj - Aeroport Cluj', 'Cluj-Napoca', 'BUS',
    'ctp_cluj', 'Compania de Transport Public Cluj', 'Gara CFR Cluj', 'Aeroport Traian Vuia',
    15, '05:00', '22:30', 3.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-train-ir-1572', 'IR 1572', 'InterRegio Galați - București Nord', 'Galați', 'TRAIN',
    'cfr', 'CFR Călători', 'Gara Galați', 'București Nord',
    360, '07:30', '18:00', 62.50, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-train-ir-1631', 'IR 1631', 'InterRegio București Nord - Brașov', 'București', 'TRAIN',
    'cfr', 'CFR Călători', 'București Nord', 'Gara Brașov',
    60, '06:00', '22:00', 48.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO schedules (id, line_code, route_name, city, mode, provider_id, provider_name, origin_station, destination_station, frequency_minutes, first_departure, last_departure, fare_lei, is_active, created_at, updated_at)
VALUES (
    'sch-train-ir-1682', 'IR 1682', 'InterRegio Constanța - București Nord', 'Constanța', 'TRAIN',
    'cfr', 'CFR Călători', 'Gara Constanța', 'București Nord',
    120, '07:00', '21:00', 72.00, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 8. REAL-TIME SERVICE DISRUPTIONS
INSERT INTO disruptions (id, title, description, severity, affected_operator, affected_line, delay_minutes, status, starts_at, ends_at, created_at, updated_at)
VALUES (
    'disr-001', 'Track modernization on Ploiești Vest - Câmpina',
    'Lucrări de reabilitare a infrastructurii feroviare între stațiile Ploiești Vest și Florești Prahova - restricție de viteză.',
    'WARNING', 'CFR Călători', 'IR 1745', 15, 'ACTIVE',
    '2026-10-20 00:00:00', '2026-11-05 23:59:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO disruptions (id, title, description, severity, affected_operator, affected_line, delay_minutes, status, starts_at, ends_at, created_at, updated_at)
VALUES (
    'disr-002', 'Deviere operativă tramvai 41 zona Pod Ciurel',
    'Lucrări edilitare de mentenanță cale rulare - circulație pe un singur fir în ambele sensuri.',
    'INFO', 'STB', '41', 10, 'ACTIVE',
    '2026-10-21 07:00:00', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO disruptions (id, title, description, severity, affected_operator, affected_line, delay_minutes, status, starts_at, ends_at, created_at, updated_at)
VALUES (
    'disr-003', 'Interval de succedare redus Magistrala M2',
    'Comandă operativă ore de vârf: trenuri suplimentare la fiecare 3 minute între Pipera și Berceni.',
    'INFO', 'Metrorex', 'M2', 0, 'ACTIVE',
    '2026-10-21 07:30:00', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO disruptions (id, title, description, severity, affected_operator, affected_line, delay_minutes, status, starts_at, ends_at, created_at, updated_at)
VALUES (
    'disr-004', 'Lucrări carosabil Strada Brăilei Galați',
    'Reabilitare infrastructură rutieră în zona Țiglina 1 - autobuzele liniei 102 circulă deviat temporar pe Str. Cloșca.',
    'WARNING', 'Transurb S.A. Galați', '102', 8, 'ACTIVE',
    '2026-10-15 06:00:00', '2026-11-10 18:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO disruptions (id, title, description, severity, affected_operator, affected_line, delay_minutes, status, starts_at, ends_at, created_at, updated_at)
VALUES (
    'disr-005', 'Mentenanță instalație centralizare electronică Gara de Nord',
    'Revizie periodică electromecanică aparate de cale - posibile realocări de peron pentru trenurile de la linia 1 la 4.',
    'INFO', 'CFR Călători', 'IR 1572', 5, 'ACTIVE',
    '2026-10-25 00:00:00', '2026-11-15 23:59:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO disruptions (id, title, description, severity, affected_operator, affected_line, delay_minutes, status, starts_at, ends_at, created_at, updated_at)
VALUES (
    'disr-006', 'Restricție de viteză Predeal - Timișu de Sus',
    'Căderi de anrocamente pe versantul montan - limitare preventivă de viteză la 30 km/h pe firul II.',
    'WARNING', 'CFR Călători', 'IR 1631', 20, 'ACTIVE',
    '2026-10-21 08:30:00', '2026-10-22 18:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 9. SAVED ITINERARY WALLET (RICH MULTI-MODAL ROUTE PLANS WITH GEOJSON AND LEG DETAILS)
INSERT INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, notes, created_at)
VALUES (
    'route-seed-micro19-unirii-001',
    'usr-seed-guest-003',
    'Micro 19',
    'Piața Unirii',
    '{sql_p1}',
    'Traseu multimodal complet Galați Micro 19 spre București Unirii cu Transurb 102, CFR IR 1572 și Metrorex M2',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, notes, created_at)
VALUES (
    'route-seed-traveler-001',
    'usr-seed-traveler-001',
    'Galați',
    'București Nord',
    '{sql_p2}',
    'Navetă feroviară directă Galați spre București Nord cu IR 1572 Alstom Coradia',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, notes, created_at)
VALUES (
    'route-seed-traveler-002',
    'usr-seed-traveler-001',
    'București Nord',
    'Brașov',
    '{sql_p3}',
    'Excursie montană Valea Prahovei cu IR 1631 prin Sinaia și Predeal',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, notes, created_at)
VALUES (
    'route-seed-traveler-003',
    'usr-seed-traveler-005',
    'București Nord',
    'Arad',
    '{sql_p4}',
    'Călătorie de noapte cu vagon de dormit Astra Trans Carpatic IR 15531',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, notes, created_at)
VALUES (
    'route-seed-traveler-004',
    'usr-seed-traveler-007',
    'Cluj-Napoca',
    'Oradea',
    '{sql_p5}',
    'Legătură rapidă Crișana Express între Cluj și Oradea',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 10. BOOKINGS & PASSENGER RESERVATIONS
INSERT INTO bookings (id, user_id, booking_reference, status, total_amount_lei, currency, passenger_count, seat_preference, contact_email, contact_phone, raw_data, created_at, updated_at)
VALUES (
    'bkg-seed-001',
    'usr-seed-traveler-001',
    'BEE-1572',
    'CONFIRMED',
    78.50,
    'RON',
    1,
    'WINDOW',
    'traveler@beeline.io',
    '+40721000001',
    '{{"journeyId":"trn-cfr-ir-1572","travelDate":"2026-10-21","operator":"CFR Călători"}}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO bookings (id, user_id, booking_reference, status, total_amount_lei, currency, passenger_count, seat_preference, contact_email, contact_phone, raw_data, created_at, updated_at)
VALUES (
    'bkg-seed-002',
    'usr-seed-traveler-001',
    'BEE-1631',
    'COMPLETED',
    144.00,
    'RON',
    2,
    'AISLE',
    'traveler@beeline.io',
    '+40721000001',
    '{{"journeyId":"trn-cfr-ir-1631","travelDate":"2026-10-21","operator":"CFR Călători"}}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO bookings (id, user_id, booking_reference, status, total_amount_lei, currency, passenger_count, seat_preference, contact_email, contact_phone, raw_data, created_at, updated_at)
VALUES (
    'bkg-seed-003',
    'usr-seed-traveler-005',
    'BEE-15531',
    'CONFIRMED',
    240.00,
    'RON',
    1,
    'WINDOW',
    'elena.ionescu@beeline.io',
    '+40722333444',
    '{{"journeyId":"trn-astra-ir-15531","travelDate":"2026-10-21","operator":"Astra Trans Carpatic"}}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO bookings (id, user_id, booking_reference, status, total_amount_lei, currency, passenger_count, seat_preference, contact_email, contact_phone, raw_data, created_at, updated_at)
VALUES (
    'bkg-seed-004',
    'usr-seed-traveler-001',
    'BEE-1745',
    'CANCELLED',
    102.00,
    'RON',
    1,
    'WINDOW',
    'traveler@beeline.io',
    '+40721000001',
    '{{"journeyId":"trn-cfr-ir-1745","travelDate":"2026-10-21","operator":"CFR Călători"}}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO bookings (id, user_id, booking_reference, status, total_amount_lei, currency, passenger_count, seat_preference, contact_email, contact_phone, raw_data, created_at, updated_at)
VALUES (
    'bkg-seed-005',
    'usr-seed-traveler-005',
    'BEE-1682',
    'CONFIRMED',
    72.00,
    'RON',
    1,
    'AISLE',
    'elena.ionescu@beeline.io',
    '+40722333444',
    '{{"journeyId":"trn-cfr-ir-1682","travelDate":"2026-10-21","operator":"CFR Călători"}}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO bookings (id, user_id, booking_reference, status, total_amount_lei, currency, passenger_count, seat_preference, contact_email, contact_phone, raw_data, created_at, updated_at)
VALUES (
    'bkg-seed-006',
    'usr-seed-traveler-007',
    'BEE-1533',
    'CONFIRMED',
    38.00,
    'RON',
    1,
    'WINDOW',
    'radu.stoica@beeline.io',
    '+40733555666',
    '{{"journeyId":"trn-cfr-ir-1533","travelDate":"2026-10-21","operator":"CFR Călători"}}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO bookings (id, user_id, booking_reference, status, total_amount_lei, currency, passenger_count, seat_preference, contact_email, contact_phone, raw_data, created_at, updated_at)
VALUES (
    'bkg-seed-007',
    'usr-seed-guest-003',
    'BEE-GUEST-1572',
    'CONFIRMED',
    62.50,
    'RON',
    1,
    'WINDOW',
    'guest.explorer@beeline.io',
    '+40799888777',
    '{{"journeyId":"trn-cfr-ir-1572","travelDate":"2026-10-21","operator":"CFR Călători"}}',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 11. TICKETS
INSERT INTO tickets (id, booking_id, ticket_number, train_number, car_number, seat_number, class_type, passenger_name, qr_code_payload, departure_time, arrival_time, origin, destination, created_at)
VALUES (
    'tkt-seed-001',
    'bkg-seed-001',
    'TKT-BEE-1572-01',
    'IR 1572',
    '1',
    '24',
    'STANDARD',
    'Andrei Popescu',
    'https://beeline.io/t/BEE-TKT-1572-01',
    '2026-10-21T07:30:00+03:00',
    '2026-10-21T10:45:00+03:00',
    'Gara Galați',
    'București Nord',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO tickets (id, booking_id, ticket_number, train_number, car_number, seat_number, class_type, passenger_name, qr_code_payload, departure_time, arrival_time, origin, destination, created_at)
VALUES (
    'tkt-seed-002',
    'bkg-seed-002',
    'TKT-BEE-1631-01',
    'IR 1631',
    '2',
    '15',
    'FIRST',
    'Andrei Popescu',
    'https://beeline.io/t/BEE-TKT-1631-01',
    '2026-10-21T09:10:00+03:00',
    '2026-10-21T11:40:00+03:00',
    'București Nord',
    'Gara Brașov',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO tickets (id, booking_id, ticket_number, train_number, car_number, seat_number, class_type, passenger_name, qr_code_payload, departure_time, arrival_time, origin, destination, created_at)
VALUES (
    'tkt-seed-003',
    'bkg-seed-002',
    'TKT-BEE-1631-02',
    'IR 1631',
    '2',
    '16',
    'FIRST',
    'Elena Ionescu',
    'https://beeline.io/t/BEE-TKT-1631-02',
    '2026-10-21T09:10:00+03:00',
    '2026-10-21T11:40:00+03:00',
    'București Nord',
    'Gara Brașov',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO tickets (id, booking_id, ticket_number, train_number, car_number, seat_number, class_type, passenger_name, qr_code_payload, departure_time, arrival_time, origin, destination, created_at)
VALUES (
    'tkt-seed-004',
    'bkg-seed-003',
    'TKT-BEE-15531-01',
    'IR 15531',
    '3',
    '11',
    'SLEEPER',
    'Elena Ionescu',
    'https://beeline.io/t/BEE-TKT-15531-01',
    '2026-10-21T21:40:00+03:00',
    '2026-10-22T08:15:00+03:00',
    'București Nord',
    'Gara Arad',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO tickets (id, booking_id, ticket_number, train_number, car_number, seat_number, class_type, passenger_name, qr_code_payload, departure_time, arrival_time, origin, destination, created_at)
VALUES (
    'tkt-seed-005',
    'bkg-seed-004',
    'TKT-BEE-1745-01',
    'IR 1745',
    '1',
    '32',
    'STANDARD',
    'Andrei Popescu',
    'https://beeline.io/t/BEE-TKT-1745-01',
    '2026-10-21T06:00:00+03:00',
    '2026-10-21T15:20:00+03:00',
    'București Nord',
    'Gara Cluj-Napoca',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO tickets (id, booking_id, ticket_number, train_number, car_number, seat_number, class_type, passenger_name, qr_code_payload, departure_time, arrival_time, origin, destination, created_at)
VALUES (
    'tkt-seed-006',
    'bkg-seed-005',
    'TKT-BEE-1682-01',
    'IR 1682',
    '2',
    '45',
    'STANDARD',
    'Elena Ionescu',
    'https://beeline.io/t/BEE-TKT-1682-01',
    '2026-10-21T16:20:00+03:00',
    '2026-10-21T18:30:00+03:00',
    'Gara Constanța',
    'București Nord',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO tickets (id, booking_id, ticket_number, train_number, car_number, seat_number, class_type, passenger_name, qr_code_payload, departure_time, arrival_time, origin, destination, created_at)
VALUES (
    'tkt-seed-007',
    'bkg-seed-006',
    'TKT-BEE-1533-01',
    'IR 1533',
    '1',
    '18',
    'STANDARD',
    'Radu Stoica',
    'https://beeline.io/t/BEE-TKT-1533-01',
    '2026-10-21T08:15:00+03:00',
    '2026-10-21T11:00:00+03:00',
    'Gara Cluj-Napoca',
    'Gara Oradea',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO tickets (id, booking_id, ticket_number, train_number, car_number, seat_number, class_type, passenger_name, qr_code_payload, departure_time, arrival_time, origin, destination, created_at)
VALUES (
    'tkt-seed-008',
    'bkg-seed-007',
    'TKT-BEE-GUEST-01',
    'IR 1572',
    '1',
    '12',
    'STANDARD',
    'Guest Explorer',
    'https://beeline.io/t/BEE-TKT-GUEST-01',
    '2026-10-21T07:30:00+03:00',
    '2026-10-21T10:45:00+03:00',
    'Gara Galați',
    'București Nord',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- 12. IDEMPOTENCY RECORDS
INSERT INTO idempotency_records (id, user_id, idempotency_key, request_hash, status, response_code, response_payload, created_at, expires_at)
VALUES (
    'idem-seed-001',
    'usr-seed-traveler-001',
    'idem-booking-bee-1572-key',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'COMPLETED',
    201,
    '{{"bookingReference":"BEE-1572","status":"CONFIRMED","totalAmountLei":78.50}}',
    CURRENT_TIMESTAMP,
    '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

INSERT INTO idempotency_records (id, user_id, idempotency_key, request_hash, status, response_code, response_payload, created_at, expires_at)
VALUES (
    'idem-seed-002',
    'usr-seed-traveler-001',
    'idem-booking-bee-1631-key',
    'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    'COMPLETED',
    201,
    '{{"bookingReference":"BEE-1631","status":"COMPLETED","totalAmountLei":144.00}}',
    CURRENT_TIMESTAMP,
    '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

INSERT INTO idempotency_records (id, user_id, idempotency_key, request_hash, status, response_code, response_payload, created_at, expires_at)
VALUES (
    'idem-seed-003',
    'usr-seed-traveler-005',
    'idem-booking-bee-15531-key',
    '8f4b2a1c9e8d7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a',
    'COMPLETED',
    201,
    '{{"bookingReference":"BEE-15531","status":"CONFIRMED","totalAmountLei":240.00}}',
    CURRENT_TIMESTAMP,
    '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

INSERT INTO idempotency_records (id, user_id, idempotency_key, request_hash, status, response_code, response_payload, created_at, expires_at)
VALUES (
    'idem-seed-004',
    'usr-seed-traveler-005',
    'idem-booking-bee-1682-key',
    '7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d',
    'COMPLETED',
    201,
    '{{"bookingReference":"BEE-1682","status":"CONFIRMED","totalAmountLei":72.00}}',
    CURRENT_TIMESTAMP,
    '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

INSERT INTO idempotency_records (id, user_id, idempotency_key, request_hash, status, response_code, response_payload, created_at, expires_at)
VALUES (
    'idem-seed-005',
    'usr-seed-traveler-007',
    'idem-booking-bee-1533-key',
    '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    'COMPLETED',
    201,
    '{{"bookingReference":"BEE-1533","status":"CONFIRMED","totalAmountLei":38.00}}',
    CURRENT_TIMESTAMP,
    '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;

INSERT INTO idempotency_records (id, user_id, idempotency_key, request_hash, status, response_code, response_payload, created_at, expires_at)
VALUES (
    'idem-seed-006',
    'usr-seed-guest-003',
    'idem-guest-route-save-001',
    '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    'COMPLETED',
    201,
    '{{"status":"SAVED","routeId":"route-seed-micro19-unirii-001"}}',
    CURRENT_TIMESTAMP,
    '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;
"""

target = Path(__file__).resolve().parent.parent / "seed.sql"
target.write_text(sql_content, encoding="utf-8")
print(f"seed.sql successfully generated at {target} ({len(sql_content)} bytes)")
