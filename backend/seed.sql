-- ====================================================================
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
    '{"preferredClass": "STANDARD", "seatPreference": "WINDOW", "smsNotifications": true}',
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
    '{"theme": "dark", "language": "ro", "auditNotifications": true}',
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
    '{"assignedCorridor": "M500", "dispatchConsoleMode": "live"}',
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
    '{"preferredClass": "FIRST", "seatPreference": "AISLE"}',
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
    '{"preferredClass": "STANDARD", "seatPreference": "WINDOW"}',
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
    '{}',
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
    '{}',
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
    '{"id":"itinerary-gl-micro19-buc-piata-unirii-001","query":{"origin":{"name":"Micro 19","coords":{"latitude":45.4125,"longitude":27.9982,"city":"Galați","address":null,"platform":null,"stopId":null},"city":"Galați"},"destination":{"name":"Piața Unirii","coords":{"latitude":44.4276,"longitude":26.1026,"city":"București","address":null,"platform":null,"stopId":null},"city":"București"},"departureTime":null,"allowedModes":["TRAIN","METRO","TRAM","BUS","WALK"],"optimizationPreference":"SAFE_BUFFERS","minimumBufferMinutes":20},"summary":"Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2","departureTime":"2026-10-21T06:40:00+03:00","arrivalTime":"2026-10-21T11:15:00+03:00","totalDurationMinutes":275,"totalWalkMinutes":12,"totalWalkDistanceMeters":680,"transfersCount":2,"curatedPillar":"MOST_RELIABLE","mascotRecommendation":{"persona":"bumble","badgeLabel":"HONEY SHIELD PROTECTED","advice":"Solid 28-min buffer at Gara Galați and 20-min buffer at Gara de Nord guarantee connection success."},"riskAnalysis":{"overallRiskScore":8.7,"riskLevel":"LOW","historicalPunctualityRate":0.94,"tightestBufferMinutes":20,"bufferAdequacy":"OPTIMAL","riskSummaryText":"Shielded connection: 20-min buffer safely absorbs standard Romanian transit delays.","factors":[],"expectedDelayMinutes":0,"missedConnectionProbability":0.03,"riskFactors":["Shielded connection: 20-min buffer safely absorbs standard Romanian transit delays."],"isMlComputed":false},"fare":{"totalAmountLei":69.0,"totalAmountEur":13.8,"isIntegratedTicketAvailable":false,"legFares":[{"legId":"leg-gl-bus-102","operator":"Transurb S.A. Galați","amountLei":3.0,"amountEur":0.6},{"legId":"leg-cfr-ir-1572","operator":"CFR Călători","amountLei":63.0,"amountEur":12.6},{"legId":"leg-metrorex-m2","operator":"Metrorex S.A.","amountLei":3.0,"amountEur":0.6}]},"eco":{"routeEmissionsKgCO2":8.4,"carEmissionsKgCO2":42.1,"savedKgCO2":33.7,"percentageSaved":80.0,"treeDaysEquivalent":5.6},"legs":[{"id":"leg-gl-bus-102","legIndex":0,"transportType":"BUS","names":{"originName":"Micro 19","originCity":"Galați","destinationName":"Gara CFR Galați","destinationCity":"Galați","lineCode":"102","lineName":"Micro 19 ⇄ Gara CFR Galați","operatorName":"Transurb S.A. Galați","operatorShortName":"Transurb","headsign":"Gara CFR","vehicleIdentifier":"Solaris Urbino 12"},"coords":{"originCoords":{"latitude":45.4125,"longitude":27.9982,"city":"Galați","address":null,"platform":"B","stopId":null},"destinationCoords":{"latitude":45.4418,"longitude":28.0583,"city":"Galați","address":null,"platform":"Terminal Gara","stopId":null},"intermediateStops":[{"stopSequence":1,"name":"Țiglina 1","coords":{"latitude":45.4241,"longitude":28.0256,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":2,"name":"Mazepa","coords":{"latitude":45.4312,"longitude":28.0415,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null}],"geometry":{"type":"LineString","coordinates":[[27.9982,45.4125],[28.0256,45.4241],[28.0415,45.4312],[28.0583,45.4418]]}},"timings":{"scheduledDeparture":"2026-10-21T06:40:00+03:00","scheduledArrival":"2026-10-21T07:07:00+03:00","estimatedDeparture":"2026-10-21T06:40:00+03:00","estimatedArrival":"2026-10-21T07:07:00+03:00","durationMinutes":27,"delayMinutes":0,"isRealtime":true},"risk":{"legRiskScore":8.0,"historicalPunctualityPercent":94.0,"transferBufferAfterMinutes":28,"isShieldedBuffer":true,"disruptions":[]},"fare":{"amount":3.0,"currency":"RON","ticketCategory":"URBAN_TRANSIT","bookingUrl":null,"providerPaymentMethods":["24PAY","SMS_VALIDATION","CONTACTLESS_CARD"]},"amenities":{"items":["AIR_CONDITIONING","LOW_FLOOR_ACCESSIBLE"],"crowdingLevel":"MEDIUM","stepFreeAccess":true},"instructions":{"leadText":"Board Transurb Bus 102 at Micro 19 Terminus Platform B","detailSteps":["Ride 12 stops via Brăilei St to Gara CFR Galați"],"transferNotice":"Exit bus and walk 80m into Gara Galați main concourse. Track 2."}},{"id":"leg-cfr-ir-1572","legIndex":1,"transportType":"TRAIN","names":{"originName":"Gara CFR Galați","originCity":"Galați","destinationName":"București Nord","destinationCity":"București","lineCode":"IR 1572","lineName":"Galați ⇄ București Nord","operatorName":"CFR Călători","operatorShortName":"CFR","headsign":"București Nord","vehicleIdentifier":"Alstom Coradia Stream / Desiro"},"coords":{"originCoords":{"latitude":45.4418,"longitude":28.0583,"city":"Galați","address":null,"platform":"Linia 2","stopId":null},"destinationCoords":{"latitude":44.4473,"longitude":26.0747,"city":"București","address":null,"platform":"Linia 5","stopId":null},"intermediateStops":[{"stopSequence":1,"name":"Brăila","coords":{"latitude":45.2715,"longitude":27.9622,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":2,"name":"Făurei","coords":{"latitude":45.0862,"longitude":27.2718,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":3,"name":"Buzău","coords":{"latitude":45.1432,"longitude":26.8306,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":4,"name":"Ploiești Sud","coords":{"latitude":44.9275,"longitude":26.0332,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null}],"geometry":{"type":"LineString","coordinates":[[28.0583,45.4418],[27.9622,45.2715],[27.2718,45.0862],[26.8306,45.1432],[26.0332,44.9275],[26.0747,44.4473]]}},"timings":{"scheduledDeparture":"2026-10-21T07:35:00+03:00","scheduledArrival":"2026-10-21T10:45:00+03:00","estimatedDeparture":"2026-10-21T07:35:00+03:00","estimatedArrival":"2026-10-21T10:45:00+03:00","durationMinutes":190,"delayMinutes":0,"isRealtime":true},"risk":{"legRiskScore":12.0,"historicalPunctualityPercent":91.0,"transferBufferAfterMinutes":20,"isShieldedBuffer":true,"disruptions":[]},"fare":{"amount":63.0,"currency":"RON","ticketCategory":"RAIL_INTERREGIO","bookingUrl":"https://bilete.cfrcalatori.ro","providerPaymentMethods":["CONTACTLESS_CARD","CFR_TICKET_OFFICE"]},"amenities":{"items":["WIFI","POWER_OUTLETS","AIR_CONDITIONING","RESTROOM"],"crowdingLevel":"LOW","stepFreeAccess":true},"instructions":{"leadText":"Board CFR IR 1572 at Linia 2","detailSteps":["Express journey via Buzău and Ploiești to București Nord"],"transferNotice":"Descend stairs to Metrorex M1/M4 passage, transfer to M2 at Piața Victoriei."}},{"id":"leg-metrorex-m2","legIndex":2,"transportType":"METRO","names":{"originName":"Gara de Nord","originCity":"București","destinationName":"Piața Unirii","destinationCity":"București","lineCode":"M2","lineName":"Pipera ⇄ Berceni","operatorName":"Metrorex S.A.","operatorShortName":"Metrorex","headsign":"Berceni","vehicleIdentifier":"CAF / Alstom Metropolis"},"coords":{"originCoords":{"latitude":44.4473,"longitude":26.0747,"city":"București","address":null,"platform":"M1/M2 Connection","stopId":null},"destinationCoords":{"latitude":44.4276,"longitude":26.1026,"city":"București","address":null,"platform":"Piața Unirii 1/2","stopId":null},"intermediateStops":[{"stopSequence":1,"name":"Piața Victoriei","coords":{"latitude":44.4523,"longitude":26.0863,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":2,"name":"Piața Romană","coords":{"latitude":44.4447,"longitude":26.0975,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":3,"name":"Universitate","coords":{"latitude":44.4355,"longitude":26.1022,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null}],"geometry":{"type":"LineString","coordinates":[[26.0747,44.4473],[26.0863,44.4523],[26.0975,44.4447],[26.1022,44.4355],[26.1026,44.4276]]}},"timings":{"scheduledDeparture":"2026-10-21T11:05:00+03:00","scheduledArrival":"2026-10-21T11:15:00+03:00","estimatedDeparture":"2026-10-21T11:05:00+03:00","estimatedArrival":"2026-10-21T11:15:00+03:00","durationMinutes":10,"delayMinutes":0,"isRealtime":true},"risk":{"legRiskScore":4.0,"historicalPunctualityPercent":98.0,"transferBufferAfterMinutes":null,"isShieldedBuffer":true,"disruptions":[]},"fare":{"amount":3.0,"currency":"RON","ticketCategory":"METRO_SINGLE","bookingUrl":null,"providerPaymentMethods":["CONTACTLESS_CARD","SMS_VALIDATION"]},"amenities":{"items":["AIR_CONDITIONING","LOW_FLOOR_ACCESSIBLE"],"crowdingLevel":"MEDIUM","stepFreeAccess":true},"instructions":{"leadText":"Board Metrorex M2 towards Berceni","detailSteps":["Ride 3 stops to Piața Unirii"],"transferNotice":"Arrive at Piața Unirii central station."}}],"createdAt":"2026-11-10T12:22:19.363407+00:00","validUntil":"2026-11-10T14:22:19.380430+00:00"}',
    'Traseu multimodal complet Galați Micro 19 spre București Unirii cu Transurb 102, CFR IR 1572 și Metrorex M2',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, notes, created_at)
VALUES (
    'route-seed-traveler-001',
    'usr-seed-traveler-001',
    'Galați',
    'București Nord',
    '{"id":"itinerary-gl-bct-direct-001","query":{"origin":{"name":"Galați","coords":{"latitude":45.4382,"longitude":28.0561,"city":"Galați","address":null,"platform":"Linia 1","stopId":null},"city":"Galați"},"destination":{"name":"București Nord","coords":{"latitude":44.4473,"longitude":26.0746,"city":"București","address":null,"platform":"Linia 3","stopId":null},"city":"București"},"departureTime":null,"allowedModes":["TRAIN","METRO","TRAM","BUS","WALK"],"optimizationPreference":"SAFE_BUFFERS","minimumBufferMinutes":20},"summary":"CFR IR 1572 Direct Express","departureTime":"2026-10-21T07:30:00+03:00","arrivalTime":"2026-10-21T10:45:00+03:00","totalDurationMinutes":195,"totalWalkMinutes":5,"totalWalkDistanceMeters":250,"transfersCount":0,"curatedPillar":"FASTEST","mascotRecommendation":{"persona":"barnaby","badgeLabel":"DIRECT EXPRESS","advice":"Single direct train connection between Galați and București. 0 transfers needed."},"riskAnalysis":{"overallRiskScore":8.0,"riskLevel":"LOW","historicalPunctualityRate":0.94,"tightestBufferMinutes":0,"bufferAdequacy":"GENEROUS","riskSummaryText":"Direct train service with high historical on-time performance.","factors":[],"expectedDelayMinutes":0,"missedConnectionProbability":0.0,"riskFactors":["Direct train service with high historical on-time performance."],"isMlComputed":true},"fare":{"totalAmountLei":62.5,"totalAmountEur":12.5,"isIntegratedTicketAvailable":true,"legFares":[{"legId":"leg-cfr-ir-1572-direct","operator":"CFR Călători","amountLei":62.5,"amountEur":12.5}]},"eco":{"routeEmissionsKgCO2":7.2,"carEmissionsKgCO2":36.4,"savedKgCO2":29.2,"percentageSaved":80.2,"treeDaysEquivalent":4.8},"legs":[{"id":"leg-cfr-ir-1572-direct","legIndex":0,"transportType":"TRAIN","names":{"originName":"Gara Galați","originCity":"Galați","destinationName":"București Nord","destinationCity":"București","lineCode":"IR 1572","lineName":"Galați ⇄ București Nord","operatorName":"CFR Călători","operatorShortName":"CFR","headsign":"București Nord","vehicleIdentifier":"Alstom Coradia Stream"},"coords":{"originCoords":{"latitude":45.4382,"longitude":28.0561,"city":"Galați","address":null,"platform":"Linia 1","stopId":null},"destinationCoords":{"latitude":44.4473,"longitude":26.0746,"city":"București","address":null,"platform":"Linia 3","stopId":null},"intermediateStops":[{"stopSequence":1,"name":"Gara Brăila","coords":{"latitude":45.2751,"longitude":27.9554,"city":"Brăila","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":2,"name":"Gara Făurei","coords":{"latitude":45.0862,"longitude":27.2718,"city":"Făurei","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":3,"name":"Gara Buzău","coords":{"latitude":45.1432,"longitude":26.8306,"city":"Buzău","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":4,"name":"Ploiești Sud","coords":{"latitude":44.9272,"longitude":26.0354,"city":"Ploiești","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null}],"geometry":{"type":"LineString","coordinates":[[28.0561,45.4382],[27.9554,45.2751],[27.2718,45.0862],[26.8306,45.1432],[26.0354,44.9272],[26.0746,44.4473]]}},"timings":{"scheduledDeparture":"2026-10-21T07:30:00+03:00","scheduledArrival":"2026-10-21T10:45:00+03:00","estimatedDeparture":"2026-10-21T07:30:00+03:00","estimatedArrival":"2026-10-21T10:45:00+03:00","durationMinutes":195,"delayMinutes":0,"isRealtime":true},"risk":{"legRiskScore":8.0,"historicalPunctualityPercent":94.0,"transferBufferAfterMinutes":null,"isShieldedBuffer":true,"disruptions":[]},"fare":{"amount":62.5,"currency":"RON","ticketCategory":"RAIL_INTERREGIO","bookingUrl":"https://bilete.cfrcalatori.ro","providerPaymentMethods":["CONTACTLESS_CARD","CFR_TICKET_OFFICE"]},"amenities":{"items":["WIFI","POWER_OUTLETS","DINING_CAR","WHEELCHAIR_ACCESSIBLE"],"crowdingLevel":"LOW","stepFreeAccess":true},"instructions":{"leadText":"Board CFR IR 1572 at Gara Galați Linia 1","detailSteps":["Direct express journey via Brăila, Buzău, and Ploiești to București Nord"],"transferNotice":"Arrive at București Nord main concourse."}}],"createdAt":"2026-10-21T06:00:00Z","validUntil":"2026-10-21T23:59:59Z"}',
    'Navetă feroviară directă Galați spre București Nord cu IR 1572 Alstom Coradia',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, notes, created_at)
VALUES (
    'route-seed-traveler-002',
    'usr-seed-traveler-001',
    'București Nord',
    'Brașov',
    '{"id":"itinerary-buc-nord-brasov-001","query":{"origin":{"name":"București Nord","coords":{"latitude":44.4473,"longitude":26.0746,"city":"București","address":null,"platform":null,"stopId":null},"city":"București"},"destination":{"name":"Brașov","coords":{"latitude":45.6608,"longitude":25.6144,"city":"Brașov","address":null,"platform":null,"stopId":null},"city":"Brașov"},"departureTime":null,"allowedModes":["TRAIN","METRO","TRAM","BUS","WALK"],"optimizationPreference":"SAFE_BUFFERS","minimumBufferMinutes":20},"summary":"CFR IR 1631 Direct Express","departureTime":"2026-10-21T09:10:00+03:00","arrivalTime":"2026-10-21T11:28:00+03:00","totalDurationMinutes":138,"totalWalkMinutes":4,"totalWalkDistanceMeters":150,"transfersCount":0,"curatedPillar":"FASTEST","mascotRecommendation":{"persona":"barnaby","badgeLabel":"FASTEST DIRECT FLIGHT","advice":"Direct high-speed mountain corridor with 0 transfers. Clean and swift."},"riskAnalysis":{"overallRiskScore":3.6,"riskLevel":"LOW","historicalPunctualityRate":0.96,"tightestBufferMinutes":0,"bufferAdequacy":"GENEROUS","riskSummaryText":"Shielded connection: 999-min buffer safely absorbs standard Romanian transit delays.","factors":[],"expectedDelayMinutes":0,"missedConnectionProbability":0.03,"riskFactors":["Shielded connection: 999-min buffer safely absorbs standard Romanian transit delays."],"isMlComputed":false},"fare":{"totalAmountLei":48.0,"totalAmountEur":9.6,"isIntegratedTicketAvailable":true,"legFares":[{"legId":"leg-cfr-ir-1631","operator":"CFR Călători","amountLei":48.0,"amountEur":9.6}]},"eco":{"routeEmissionsKgCO2":4.8,"carEmissionsKgCO2":28.5,"savedKgCO2":23.7,"percentageSaved":83.0,"treeDaysEquivalent":4.1},"legs":[{"id":"leg-cfr-ir-1631","legIndex":0,"transportType":"TRAIN","names":{"originName":"București Nord","originCity":"București","destinationName":"Gara Brașov","destinationCity":"Brașov","lineCode":"IR 1631","lineName":"București Nord ⇄ Brașov","operatorName":"CFR Călători","operatorShortName":"CFR","headsign":"Brașov","vehicleIdentifier":"Softronic Hyperion EMU"},"coords":{"originCoords":{"latitude":44.4473,"longitude":26.0747,"city":"București","address":null,"platform":"Linia 3","stopId":null},"destinationCoords":{"latitude":45.6622,"longitude":25.6172,"city":"Brașov","address":null,"platform":"Linia 1","stopId":null},"intermediateStops":[{"stopSequence":1,"name":"Ploiești Vest","coords":{"latitude":44.9312,"longitude":25.9984,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":2,"name":"Sinaia","coords":{"latitude":45.3533,"longitude":25.5524,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":3,"name":"Predeal","coords":{"latitude":45.5056,"longitude":25.5786,"city":null,"address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null}],"geometry":{"type":"LineString","coordinates":[[26.0747,44.4473],[25.9984,44.9312],[25.5524,45.3533],[25.5786,45.5056],[25.6172,45.6622]]}},"timings":{"scheduledDeparture":"2026-10-21T09:10:00+03:00","scheduledArrival":"2026-10-21T11:28:00+03:00","estimatedDeparture":"2026-10-21T09:10:00+03:00","estimatedArrival":"2026-10-21T11:28:00+03:00","durationMinutes":138,"delayMinutes":0,"isRealtime":true},"risk":{"legRiskScore":6.0,"historicalPunctualityPercent":96.0,"transferBufferAfterMinutes":null,"isShieldedBuffer":true,"disruptions":[]},"fare":{"amount":48.0,"currency":"RON","ticketCategory":"RAIL_INTERREGIO","bookingUrl":"https://bilete.cfrcalatori.ro","providerPaymentMethods":["CONTACTLESS_CARD","CFR_TICKET_OFFICE"]},"amenities":{"items":["WIFI","POWER_OUTLETS","AIR_CONDITIONING","RESTROOM","BICYCLE_RACK"],"crowdingLevel":"LOW","stepFreeAccess":true},"instructions":{"leadText":"Board CFR IR 1631 at București Nord Linia 3","detailSteps":["Scenic journey across Prahova Valley through Sinaia and Predeal to Brașov"],"transferNotice":"Arrive directly at Brașov Central Station."}}],"createdAt":"2026-11-10T12:22:19.380501+00:00","validUntil":"2026-11-10T14:22:19.380537+00:00"}',
    'Excursie montană Valea Prahovei cu IR 1631 prin Sinaia și Predeal',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, notes, created_at)
VALUES (
    'route-seed-traveler-003',
    'usr-seed-traveler-005',
    'București Nord',
    'Arad',
    '{"id":"itinerary-buc-arad-sleeper-001","query":{"origin":{"name":"București Nord","coords":{"latitude":44.4473,"longitude":26.0746,"city":"București","address":null,"platform":null,"stopId":null},"city":"București"},"destination":{"name":"Arad","coords":{"latitude":46.1883,"longitude":21.3235,"city":"Arad","address":null,"platform":null,"stopId":null},"city":"Arad"},"departureTime":null,"allowedModes":["TRAIN","METRO","TRAM","BUS","WALK"],"optimizationPreference":"SAFE_BUFFERS","minimumBufferMinutes":20},"summary":"Astra Trans Carpatic IR 15531 Overnight Sleeper","departureTime":"2026-10-21T21:40:00+03:00","arrivalTime":"2026-10-22T08:15:00+03:00","totalDurationMinutes":635,"totalWalkMinutes":0,"totalWalkDistanceMeters":0,"transfersCount":0,"curatedPillar":"BEST_VALUE","mascotRecommendation":{"persona":"honey","badgeLabel":"SLEEPER COMFORT","advice":"Overnight rail sleeper journey. Wake up rested at your destination."},"riskAnalysis":{"overallRiskScore":10.0,"riskLevel":"LOW","historicalPunctualityRate":0.92,"tightestBufferMinutes":0,"bufferAdequacy":"GENEROUS","riskSummaryText":"Direct overnight sleeper train with smooth Carpathian transit.","factors":[],"expectedDelayMinutes":0,"missedConnectionProbability":0.0,"riskFactors":["Direct overnight sleeper train."],"isMlComputed":true},"fare":{"totalAmountLei":115.0,"totalAmountEur":23.0,"isIntegratedTicketAvailable":true,"legFares":[{"legId":"leg-astra-ir-15531","operator":"Astra Trans Carpatic","amountLei":115.0,"amountEur":23.0}]},"eco":{"routeEmissionsKgCO2":18.5,"carEmissionsKgCO2":110.2,"savedKgCO2":91.7,"percentageSaved":83.2,"treeDaysEquivalent":15.2},"legs":[{"id":"leg-astra-ir-15531","legIndex":0,"transportType":"TRAIN","names":{"originName":"București Nord","originCity":"București","destinationName":"Gara Arad","destinationCity":"Arad","lineCode":"IR 15531","lineName":"TransCarpatic Night Express","operatorName":"Astra Trans Carpatic","operatorShortName":"Astra","headsign":"Arad","vehicleIdentifier":"Astra Sleeper Coach"},"coords":{"originCoords":{"latitude":44.4473,"longitude":26.0746,"city":"București","address":null,"platform":"Linia 1","stopId":null},"destinationCoords":{"latitude":46.1883,"longitude":21.3235,"city":"Arad","address":null,"platform":"Linia 1","stopId":null},"intermediateStops":[{"stopSequence":1,"name":"Gara Brașov","coords":{"latitude":45.6608,"longitude":25.6144,"city":"Brașov","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":2,"name":"Gara Sibiu","coords":{"latitude":45.7981,"longitude":24.1601,"city":"Sibiu","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":3,"name":"Gara Deva","coords":{"latitude":45.8821,"longitude":22.9056,"city":"Deva","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null}],"geometry":{"type":"LineString","coordinates":[[26.0746,44.4473],[25.6144,45.6608],[24.1601,45.7981],[22.9056,45.8821],[21.3235,46.1883]]}},"timings":{"scheduledDeparture":"2026-10-21T21:40:00+03:00","scheduledArrival":"2026-10-22T08:15:00+03:00","estimatedDeparture":"2026-10-21T21:40:00+03:00","estimatedArrival":"2026-10-22T08:15:00+03:00","durationMinutes":635,"delayMinutes":0,"isRealtime":true},"risk":{"legRiskScore":10.0,"historicalPunctualityPercent":92.0,"transferBufferAfterMinutes":null,"isShieldedBuffer":true,"disruptions":[]},"fare":{"amount":115.0,"currency":"RON","ticketCategory":"RAIL_INTERREGIO","bookingUrl":"https://www.astratranscarpatic.ro","providerPaymentMethods":["ONLINE_CARD","ONBOARD"]},"amenities":{"items":["WIFI","POWER_OUTLETS","DINING_CAR","QUIET_ZONE"],"crowdingLevel":"LOW","stepFreeAccess":true},"instructions":{"leadText":"Board Astra Trans Carpatic IR 15531 at București Nord Linia 1","detailSteps":["Overnight journey with sleeping compartments across the Carpathians to Arad"],"transferNotice":"Arrive at Gara Arad terminal."}}],"createdAt":"2026-10-21T06:00:00Z","validUntil":"2026-10-21T23:59:59Z"}',
    'Călătorie de noapte cu vagon de dormit Astra Trans Carpatic IR 15531',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

INSERT INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, notes, created_at)
VALUES (
    'route-seed-traveler-004',
    'usr-seed-traveler-007',
    'Cluj-Napoca',
    'Oradea',
    '{"id":"itinerary-cjn-oradea-express-001","query":{"origin":{"name":"Cluj-Napoca","coords":{"latitude":46.7842,"longitude":23.5872,"city":"Cluj-Napoca","address":null,"platform":null,"stopId":null},"city":"Cluj-Napoca"},"destination":{"name":"Oradea","coords":{"latitude":47.0722,"longitude":21.9344,"city":"Oradea","address":null,"platform":null,"stopId":null},"city":"Oradea"},"departureTime":null,"allowedModes":["TRAIN","METRO","TRAM","BUS","WALK"],"optimizationPreference":"SAFE_BUFFERS","minimumBufferMinutes":20},"summary":"CFR IR 1533 Crișana Express","departureTime":"2026-10-21T08:15:00+03:00","arrivalTime":"2026-10-21T11:00:00+03:00","totalDurationMinutes":165,"totalWalkMinutes":3,"totalWalkDistanceMeters":120,"transfersCount":0,"curatedPillar":"FASTEST","mascotRecommendation":{"persona":"barnaby","badgeLabel":"CRIȘANA DIRECT","advice":"Swift direct train connection connecting Cluj and Oradea in under 3 hours."},"riskAnalysis":{"overallRiskScore":9.0,"riskLevel":"LOW","historicalPunctualityRate":0.93,"tightestBufferMinutes":0,"bufferAdequacy":"GENEROUS","riskSummaryText":"Direct regional express with reliable timetable adherence.","factors":[],"expectedDelayMinutes":0,"missedConnectionProbability":0.0,"riskFactors":["Direct regional express."],"isMlComputed":true},"fare":{"totalAmountLei":38.0,"totalAmountEur":7.6,"isIntegratedTicketAvailable":true,"legFares":[{"legId":"leg-cfr-ir-1533","operator":"CFR Călători","amountLei":38.0,"amountEur":7.6}]},"eco":{"routeEmissionsKgCO2":5.6,"carEmissionsKgCO2":31.2,"savedKgCO2":25.6,"percentageSaved":82.0,"treeDaysEquivalent":3.9},"legs":[{"id":"leg-cfr-ir-1533","legIndex":0,"transportType":"TRAIN","names":{"originName":"Gara Cluj-Napoca","originCity":"Cluj-Napoca","destinationName":"Gara Oradea","destinationCity":"Oradea","lineCode":"IR 1533","lineName":"Crișana Express","operatorName":"CFR Călători","operatorShortName":"CFR","headsign":"Oradea","vehicleIdentifier":"Siemens Desiro DMU"},"coords":{"originCoords":{"latitude":46.7842,"longitude":23.5872,"city":"Cluj-Napoca","address":null,"platform":"Linia 2","stopId":null},"destinationCoords":{"latitude":47.0722,"longitude":21.9344,"city":"Oradea","address":null,"platform":"Linia 1","stopId":null},"intermediateStops":[{"stopSequence":1,"name":"Gara Aghireș","coords":{"latitude":46.8715,"longitude":23.2422,"city":"Aghireșu","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":2,"name":"Gara Huedin","coords":{"latitude":46.8667,"longitude":23.0333,"city":"Huedin","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null},{"stopSequence":3,"name":"Gara Aleșd","coords":{"latitude":47.0583,"longitude":22.3917,"city":"Aleșd","address":null,"platform":null,"stopId":null},"scheduledArrival":null,"scheduledDeparture":null,"platform":null}],"geometry":{"type":"LineString","coordinates":[[23.5872,46.7842],[23.2422,46.8715],[23.0333,46.8667],[22.3917,47.0583],[21.9344,47.0722]]}},"timings":{"scheduledDeparture":"2026-10-21T08:15:00+03:00","scheduledArrival":"2026-10-21T11:00:00+03:00","estimatedDeparture":"2026-10-21T08:15:00+03:00","estimatedArrival":"2026-10-21T11:00:00+03:00","durationMinutes":165,"delayMinutes":0,"isRealtime":true},"risk":{"legRiskScore":9.0,"historicalPunctualityPercent":93.0,"transferBufferAfterMinutes":null,"isShieldedBuffer":true,"disruptions":[]},"fare":{"amount":38.0,"currency":"RON","ticketCategory":"RAIL_INTERREGIO","bookingUrl":"https://bilete.cfrcalatori.ro","providerPaymentMethods":["CONTACTLESS_CARD","CFR_TICKET_OFFICE"]},"amenities":{"items":["WIFI","POWER_OUTLETS","AIR_CONDITIONING"],"crowdingLevel":"LOW","stepFreeAccess":true},"instructions":{"leadText":"Board CFR IR 1533 at Gara Cluj-Napoca Linia 2","detailSteps":["Regional express journey through Crișana via Huedin and Aleșd to Oradea"],"transferNotice":"Arrive at Gara Oradea."}}],"createdAt":"2026-10-21T06:00:00Z","validUntil":"2026-10-21T23:59:59Z"}',
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
    '{"journeyId":"trn-cfr-ir-1572","travelDate":"2026-10-21","operator":"CFR Călători"}',
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
    '{"journeyId":"trn-cfr-ir-1631","travelDate":"2026-10-21","operator":"CFR Călători"}',
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
    '{"journeyId":"trn-astra-ir-15531","travelDate":"2026-10-21","operator":"Astra Trans Carpatic"}',
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
    '{"journeyId":"trn-cfr-ir-1745","travelDate":"2026-10-21","operator":"CFR Călători"}',
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
    '{"journeyId":"trn-cfr-ir-1682","travelDate":"2026-10-21","operator":"CFR Călători"}',
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
    '{"journeyId":"trn-cfr-ir-1533","travelDate":"2026-10-21","operator":"CFR Călători"}',
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
    '{"journeyId":"trn-cfr-ir-1572","travelDate":"2026-10-21","operator":"CFR Călători"}',
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
    '{"bookingReference":"BEE-1572","status":"CONFIRMED","totalAmountLei":78.50}',
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
    '{"bookingReference":"BEE-1631","status":"COMPLETED","totalAmountLei":144.00}',
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
    '{"bookingReference":"BEE-15531","status":"CONFIRMED","totalAmountLei":240.00}',
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
    '{"bookingReference":"BEE-1682","status":"CONFIRMED","totalAmountLei":72.00}',
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
    '{"bookingReference":"BEE-1533","status":"CONFIRMED","totalAmountLei":38.00}',
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
    '{"status":"SAVED","routeId":"route-seed-micro19-unirii-001"}',
    CURRENT_TIMESTAMP,
    '2027-01-01 00:00:00'
) ON CONFLICT DO NOTHING;
