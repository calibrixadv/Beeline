-- ====================================================================
-- Beeline VoyageRail SQL Database Seed Data
-- ====================================================================

-- 1. Standard Traveler User (traveler@beeline.io / Password123!)
INSERT OR IGNORE INTO users (id, email, hashed_password, full_name, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-traveler-001',
    'traveler@beeline.io',
    '$2b$12$W/k7y8opbztBWW/uUkl.ve1cVJz.0MNAgD2noDbZrj1MRleunD1VG',
    'Andrei Popescu',
    0,
    1,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 2. Admin User with MFA enabled (admin@beeline.io / AdminPass123!)
INSERT OR IGNORE INTO users (id, email, hashed_password, full_name, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-admin-002',
    'admin@beeline.io',
    '$2b$12$mXxXc/Nng5TdEDk5qBSRqOcWRdWQ6Ta6iMzfPp/85l3MvjRRAiZO.',
    'System Administrator',
    0,
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- MFA credentials for Admin (Base32 Secret: JBSWY3DPEHPK3PXP)
INSERT OR IGNORE INTO mfa_credentials (id, user_id, secret_key, backup_codes_hash, is_confirmed, created_at, updated_at)
VALUES (
    'mfa-seed-admin-001',
    'usr-seed-admin-002',
    'JBSWY3DPEHPK3PXP',
    '["f5a8e7e1c3b4d2a9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5"]',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 3. Ephemeral Guest User
INSERT OR IGNORE INTO users (id, email, hashed_password, full_name, is_guest, is_active, mfa_enabled, created_at, updated_at)
VALUES (
    'usr-seed-guest-003',
    NULL,
    NULL,
    'Guest Explorer',
    1,
    1,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 4. Pre-saved Route Itinerary for Guest (Galați Micro 19 -> București Piața Unirii)
INSERT OR IGNORE INTO saved_routes (id, user_id, origin_name, destination_name, plan_data, created_at)
VALUES (
    'route-seed-micro19-unirii-001',
    'usr-seed-guest-003',
    'Micro 19',
    'Piața Unirii',
    '{"id":"itinerary-gl-micro19-buc-piata-unirii-001","summary":"Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2","departureTime":"2026-10-21T06:40:00+03:00","arrivalTime":"2026-10-21T11:15:00+03:00","totalDurationMinutes":275,"totalWalkMinutes":12,"totalWalkDistanceMeters":680,"transfersCount":2,"curatedPillar":"MOST_RELIABLE"}',
    CURRENT_TIMESTAMP
);
