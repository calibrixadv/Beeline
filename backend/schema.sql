-- ====================================================================
-- Beeline VoyageRail Relational Database Schema
-- Compatible with PostgreSQL 16 (Production) & SQLite 3.35+ (Local/Dev)
-- Course: Baze de Date Avansate (BD2)
-- SGBD Relațional: PostgreSQL 16 (beeline_postgres)
-- ====================================================================

-- 1. USERS TABLE
-- Manages registered travelers, transit operators, system admins, and ephemeral guest accounts
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(255) UNIQUE,
    hashed_password VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'TRAVELER' CONSTRAINT ck_users_role CHECK (role IN ('TRAVELER', 'OPERATOR', 'ADMIN')),
    preferences TEXT DEFAULT '{}',
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. USER SESSIONS TABLE
-- Tracks multi-device sessions with rotating refresh token hashes and client metadata
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    refresh_token_hash VARCHAR(64) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(64),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_revoked ON user_sessions(is_revoked);

-- 3. MFA CREDENTIALS TABLE
-- Stores RFC 6238 TOTP secrets and hashed emergency recovery backup codes
CREATE TABLE IF NOT EXISTS mfa_credentials (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    secret_key VARCHAR(64) NOT NULL,
    backup_codes_hash TEXT NOT NULL DEFAULT '[]',
    is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mfa_credentials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mfa_credentials_user_id ON mfa_credentials(user_id);

-- 4. PASSWORD RESET TOKENS TABLE
-- Cryptographic tokens for password recovery with single-use revocation
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pw_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pw_reset_token_hash ON password_reset_tokens(token_hash);

-- 5. STATIONS TABLE
-- Romanian national rail and urban transit stations/nodes with GPS coordinates and multimodal flags
CREATE TABLE IF NOT EXISTS stations (
    code VARCHAR(16) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CONSTRAINT ck_stations_latitude CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude DOUBLE PRECISION NOT NULL CONSTRAINT ck_stations_longitude CHECK (longitude BETWEEN -180.0 AND 180.0),
    modes TEXT NOT NULL DEFAULT '["TRAIN"]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stations_city ON stations(city);
CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);

-- 6. TRAINS TABLE
-- InterCity, Regio, and InterRegio rail services operating on Romanian corridors
CREATE TABLE IF NOT EXISTS trains (
    id VARCHAR(64) PRIMARY KEY,
    train_number VARCHAR(32) NOT NULL UNIQUE,
    operator_name VARCHAR(100) NOT NULL,
    operator_code VARCHAR(16) NOT NULL,
    origin_code VARCHAR(16) NOT NULL,
    destination_code VARCHAR(16) NOT NULL,
    departure_time TIMESTAMPTZ NOT NULL,
    arrival_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CONSTRAINT ck_trains_duration CHECK (duration_minutes > 0),
    status VARCHAR(32) NOT NULL DEFAULT 'ON_TIME' CONSTRAINT ck_trains_status CHECK (status IN ('ON_TIME', 'DELAYED', 'CANCELLED', 'BOARDING')),
    delay_minutes INTEGER NOT NULL DEFAULT 0 CONSTRAINT ck_trains_delay CHECK (delay_minutes >= 0),
    base_price_lei DOUBLE PRECISION NOT NULL CONSTRAINT ck_trains_price CHECK (base_price_lei >= 0),
    available_seats INTEGER NOT NULL DEFAULT 100 CONSTRAINT ck_trains_seats CHECK (available_seats >= 0),
    amenities TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trains_origin FOREIGN KEY (origin_code) REFERENCES stations(code) ON DELETE RESTRICT,
    CONSTRAINT fk_trains_destination FOREIGN KEY (destination_code) REFERENCES stations(code) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_trains_number ON trains(train_number);
CREATE INDEX IF NOT EXISTS idx_trains_origin ON trains(origin_code);
CREATE INDEX IF NOT EXISTS idx_trains_destination ON trains(destination_code);
CREATE INDEX IF NOT EXISTS idx_trains_operator ON trains(operator_code);
CREATE INDEX IF NOT EXISTS idx_trains_status ON trains(status);
CREATE INDEX IF NOT EXISTS idx_trains_departure ON trains(departure_time);

-- 7. SCHEDULES TABLE
-- Urban and regional transit schedules (Metrorex, STB, Transurb, CTP Cluj, National Rail)
CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(64) PRIMARY KEY,
    line_code VARCHAR(32) NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    mode VARCHAR(32) NOT NULL CONSTRAINT ck_schedules_mode CHECK (mode IN ('TRAIN', 'BUS', 'TRAM', 'METRO')),
    provider_id VARCHAR(64) NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    origin_station VARCHAR(255) NOT NULL,
    destination_station VARCHAR(255) NOT NULL,
    frequency_minutes INTEGER NOT NULL DEFAULT 15 CONSTRAINT ck_schedules_frequency CHECK (frequency_minutes > 0),
    first_departure VARCHAR(8) NOT NULL DEFAULT '05:00',
    last_departure VARCHAR(8) NOT NULL DEFAULT '23:30',
    fare_lei DOUBLE PRECISION NOT NULL DEFAULT 3.0 CONSTRAINT ck_schedules_fare CHECK (fare_lei >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_line ON schedules(line_code);
CREATE INDEX IF NOT EXISTS idx_schedules_city ON schedules(city);
CREATE INDEX IF NOT EXISTS idx_schedules_mode ON schedules(mode);

-- 8. DISRUPTIONS TABLE
-- Real-time service disruptions, track maintenance, severe weather, and corridor delay incidents
CREATE TABLE IF NOT EXISTS disruptions (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'WARNING' CONSTRAINT ck_disruptions_severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    affected_operator VARCHAR(100) NOT NULL,
    affected_line VARCHAR(32) NOT NULL,
    delay_minutes INTEGER NOT NULL DEFAULT 0 CONSTRAINT ck_disruptions_delay CHECK (delay_minutes >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CONSTRAINT ck_disruptions_status CHECK (status IN ('ACTIVE', 'RESOLVED', 'SCHEDULED')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disruptions_severity ON disruptions(severity);
CREATE INDEX IF NOT EXISTS idx_disruptions_status ON disruptions(status);
CREATE INDEX IF NOT EXISTS idx_disruptions_line ON disruptions(affected_line);

-- 9. SAVED ROUTES TABLE (TRIP WALLET)
-- Multi-modal route plans saved by users for quick access and live monitoring
CREATE TABLE IF NOT EXISTS saved_routes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    origin_name VARCHAR(255) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    plan_data TEXT NOT NULL,
    notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_saved_routes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);

-- 10. BOOKINGS TABLE
-- Passenger booking reservations, reference numbers (BEE-XXXX), and payment status
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    booking_reference VARCHAR(32) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED' CONSTRAINT ck_bookings_status CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUNDED')),
    total_amount_lei DOUBLE PRECISION NOT NULL CONSTRAINT ck_bookings_total_amount CHECK (total_amount_lei >= 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'RON',
    passenger_count INTEGER NOT NULL DEFAULT 1 CONSTRAINT ck_bookings_passenger_count CHECK (passenger_count >= 1),
    seat_preference VARCHAR(32) DEFAULT 'WINDOW',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(64),
    raw_data TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 11. TICKETS TABLE
-- Individual passenger tickets issued under a confirmed booking reservation
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL,
    ticket_number VARCHAR(64) NOT NULL UNIQUE,
    train_number VARCHAR(32) NOT NULL,
    car_number VARCHAR(16) NOT NULL,
    seat_number VARCHAR(16) NOT NULL,
    class_type VARCHAR(32) NOT NULL DEFAULT 'STANDARD' CONSTRAINT ck_tickets_class_type CHECK (class_type IN ('STANDARD', 'FIRST', 'BUSINESS', 'SLEEPER')),
    passenger_name VARCHAR(255) NOT NULL,
    qr_code_payload VARCHAR(255) NOT NULL,
    departure_time VARCHAR(64) NOT NULL,
    arrival_time VARCHAR(64) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tickets_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);

-- 12. IDEMPOTENCY RECORDS TABLE
-- Enforces idempotent request processing and avoids duplicate charges/mutations
CREATE TABLE IF NOT EXISTS idempotency_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED' CONSTRAINT ck_idempotency_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    response_code INTEGER DEFAULT 200,
    response_payload TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_user_idempotency_key UNIQUE (user_id, idempotency_key),
    CONSTRAINT fk_idempotency_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_idempotency_user_key ON idempotency_records(user_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_records(idempotency_key);
