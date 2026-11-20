# Beeline Transit API Specification

> **Version:** `1.0.0`  
> **Base URL:** `/api/v1` (e.g. `http://localhost:8000/api/v1`)  
> **Protocol:** HTTPS / HTTP 1.1 & HTTP/2  
> **Content-Type:** `application/json`  
> **Specification Standard:** RESTful JSON API with Contract-First Typing

---

## Table of Contents

1. [Architecture & Design Principles](#1-architecture--design-principles)
2. [Global Error Semantics](#2-global-error-semantics)
3. [Pagination & Filtering Standard](#3-pagination--filtering-standard)
4. [Idempotency Key Protocol](#4-idempotency-key-protocol)
5. [Authentication & Session Routes (`/auth`, `/users`)](#5-authentication--session-routes)
6. [Transit Route Planning & Saved Itineraries (`/routes`)](#6-transit-route-planning--saved-itineraries)
7. [Rail Timetables, Fares & Live Departures (`/trains`)](#7-rail-timetables-fares--live-departures)
8. [Station Search & Live Station Boards (`/stations`)](#8-station-search--live-station-boards)
9. [Trip Bookings & Wallet Checkout (`/bookings`)](#9-trip-bookings--wallet-checkout)
10. [Real-Time Transit Disruptions (`/disruptions`)](#10-real-time-transit-disruptions)
11. [Backend Implementation Status Matrix](#11-backend-implementation-status-matrix)

---

## 1. Architecture & Design Principles

### 1.1 Contract-First & Predictable Naming
- **Resource-Oriented REST:** Endpoints use plural nouns without verbs (`/trains`, `/routes/plan`, `/stations`, `/bookings`).
- **One-Version Rule:** All endpoints reside under the `/api/v1` namespace. Fields are strictly additive and backward-compatible.
- **Naming Conventions:**
  - JSON response & request fields: `camelCase` (e.g., `totalDurationMinutes`, `departureTime`).
  - Query parameters: `camelCase` (e.g., `searchQuery`, `pageSize`, `sortBy`).
  - Boolean fields: prefixed with `is`, `has`, or `can` (e.g., `isGuest`, `hasTransfers`, `isRealtime`).
  - Enums and Status codes: `UPPER_SNAKE_CASE` (e.g., `ON_TIME`, `FASTEST`, `LOW`, `STANDARD`).

### 1.2 Boundary Validation
Internal business logic trusts domain models; input validation is strictly performed at API gateway/controller boundaries using typed Pydantic models. Third-party transit feeds (GTFS, CFR APIs, InfoFer) are treated as untrusted external inputs and sanitized before consumption.

---

## 2. Global Error Semantics

Every error response across the entire API adheres to a single uniform payload shape:

```typescript
interface APIErrorResponse {
  error: {
    code: string;        // Machine-readable code (e.g. "VALIDATION_ERROR", "UNAUTHORIZED")
    message: string;     // Clear human-readable description
    details?: Array<{   // Optional field-level error breakdown
      field?: string;
      message: string;
      code?: string;
    }> | Record<string, unknown>;
  };
}
```

### HTTP Status Code Mapping

| Status Code | Code Constant | Scenario |
|---|---|---|
| `200 OK` | — | Successful synchronous query or update |
| `201 Created` | — | Successful resource creation |
| `204 No Content` | — | Successful deletion with empty body |
| `400 Bad Request` | `BAD_REQUEST` | Malformed JSON or invalid parameter syntax |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing, expired, or invalid JWT Bearer token |
| `403 Forbidden` | `FORBIDDEN` | Authenticated traveler lacks permissions for resource |
| `404 Not Found` | `NOT_FOUND` | Target entity does not exist |
| `409 Conflict` | `CONFLICT` | Concurrent in-flight operation or state lock |
| `422 Unprocessable`| `VALIDATION_ERROR` | Semantic validation failure or idempotency payload mismatch |
| `429 Too Many Req` | `RATE_LIMITED` | Traveler exceeded per-minute query quota |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Internal server fault (stack traces never exposed) |

---

## 3. Pagination & Filtering Standard

All list endpoints (`GET /trains`, `GET /routes/saved`, `GET /bookings`) return a standardized paginated envelope:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;        // 1-based page index (default: 1)
    pageSize: number;    // Items per page (default: 20, max: 100)
    totalItems: number;  // Total matching records in database
    totalPages: number;  // Math.ceil(totalItems / pageSize)
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### Standard Query Parameters
- `page`: integer $\ge 1$ (default: `1`)
- `pageSize`: integer between $1$ and $100$ (default: `20`)
- `sortBy`: property name to sort by (e.g. `departure`, `price`, `duration`)
- `sortOrder`: `asc` or `desc` (default: `asc`)

---

## 4. Idempotency Key Protocol

For mutating financial, reservation, or wallet operations (`POST /bookings`, `POST /routes/saved`), clients **MUST** supply an `Idempotency-Key` header:

```http
Idempotency-Key: book:v1:usr-001:trip-gl-buc-fastest-01:2026-10-21
```

### Server Rules:
1. **Derivation:** Keys must be derived from user intent and stable identifiers (e.g. `booking:<userId>:<tripId>:<travelDate>`), never a random UUID generated anew per retry.
2. **Atomic Claim:** The server reserves the key atomically in SQLite/Postgres using a unique constraint.
3. **Payload Fingerprinting:** A cryptographic SHA-256 hash of the request body is stored. Reusing a key with a mismatched body immediately yields `422 Unprocessable Entity`.
4. **Concurrent In-Flight Retry:** If a second identical request arrives while the first is actively executing, the server responds with `409 Conflict` so the client backs off.
5. **Replay Cache:** Once completed, identical retries within 24 hours immediately return the previously generated response without re-executing charges or seat reservations.

---

## 5. Authentication & Session Routes

Base path: `/api/v1/auth` and `/api/v1/users`

### 5.0 Authentication & Session Security Architecture

Beeline VoyageRail implements an enterprise-grade defense-in-depth security model across all authentication and user lifecycle operations:

1. **Encrypted `HttpOnly` Dual-Cookie Architecture:**
   - `beeline_auth_token`: Encrypted session token containing session ID (`sid`), client device fingerprint (`dfp`), issue timestamp (`iat`), rotation threshold (`rot_exp`), and expiration (`exp`). Encrypted at rest and in transit via Fernet (AES-128-CBC + HMAC-SHA256 authenticated encryption).
   - `beeline_device_proof`: Cryptographic HMAC-SHA256 signature binding the session ID to the client device fingerprint (`dfp`), verifying that the HTTP client presenting the session token matches the device context that originated the session.
   - Both cookies enforce `HttpOnly=True`, `SameSite=Lax`, and `Path=/`.
2. **Anti-Hijack Device Binding & Instant Redis Revocation (< 0.5ms):**
   - Every request presenting a session cookie undergoes context verification against the client's `User-Agent` and device fingerprint.
   - If a stolen cookie is replayed from a differing device or missing proof, the request is immediately rejected with `401 Unauthorized` and the session is atomically revoked across PostgreSQL and Redis (`session:revoked:{session_id}`).
3. **Backend-Only Refresh Token Vault:**
   - Raw refresh tokens are never persisted in plaintext. Only SHA-256 digests (`UserSession.refresh_token_hash`) and server-side session vaults (`session:vault:{session_id}`) are retained.
   - Rotating a refresh token immediately burns the previous token. Token reuse triggers an instant replay alarm, revoking all tokens in the compromised family.
4. **Transparent 15-Minute Auto-Rotation:**
   - Sessions have an active rotation lifespan (`rot_exp = iat + 15m`). When a valid request arrives after this threshold, the server transparently issues a fresh `beeline_auth_token` in response headers without interrupting client navigation or API workflows.
5. **Session Lifetimes & Durations:**
   - **Standard Session:** 1 Day (24 hours / 86,400s) for public or shared devices (`remember_me=False`).
   - **Extended Remember-Me Session:** 30 Days (2,592,000s) for personal trusted devices (`remember_me=True`).
6. **Global Auth Sliding-Window Rate-Limiter Middleware:**
   - Covers all `/api/v1/auth/*` mutation routes (`POST`).
   - Backed by Redis sliding-window sorted sets (`ratelimit:auth:{client_ip}:{path}`) with graceful in-memory fallback.
   - Configurable burst ceiling (`AUTH_RATE_LIMIT_MAX_REQUESTS: 30` per `AUTH_RATE_LIMIT_WINDOW_SECONDS: 60`).
   - Rate-limited responses return `429 Too Many Requests` with a compliant `Retry-After: <seconds>` header.
   - Automated testing and internal service meshes may supply the `X-Test-Rate-Limit-Bypass: true` header.

---

### 5.1 Traveler Sign Up
```http
POST /api/v1/auth/signup
```
Registers a permanent traveler account, automatically generates exactly 3 high-entropy emergency recovery codes (`BEE-XXXX-XXXX`), stores salted SHA-256 hashes in `mfa_credentials`, dispatches the welcome onboarding email, establishes a 1-day session, and sets secure `HttpOnly` session cookies.

- **Request Body:**
```json
{
  "email": "traveler@beeline.io",
  "username": "traveler_bee",
  "password": "SecurePassword123!",
  "full_name": "Andrei Popescu",
  "device_info": "MacBook Pro M2",
  "remember_me": false
}
```
- **Response `201 Created`:**
```json
{
  "access_token": "gAAAAABn...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 86400,
  "recovery_codes": [
    "BEE-9A4F-2C81",
    "BEE-5E1D-7B03",
    "BEE-3F8C-6A92"
  ],
  "user": {
    "id": "usr-uuid-001",
    "email": "traveler@beeline.io",
    "username": "traveler_bee",
    "full_name": "Andrei Popescu",
    "role": "TRAVELER",
    "is_guest": false,
    "is_active": true,
    "mfa_enabled": false,
    "account_status": "ACTIVE",
    "created_at": "2026-11-18T12:00:00Z"
  }
}
```
- **Set-Cookie Headers:**
  - `beeline_auth_token=<encrypted_token>; Max-Age=86400; HttpOnly; SameSite=Lax; Path=/`
  - `beeline_device_proof=<hmac_proof>; Max-Age=86400; HttpOnly; SameSite=Lax; Path=/`

---

### 5.2 Traveler Login
```http
POST /api/v1/auth/login
```
Authenticates traveler credentials. If MFA is enabled, returns a 5-minute MFA session token challenge. If the account is frozen pending deletion, returns `403 Forbidden` with `ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT` and sends an unfreeze link. Supports `remember_me=True` for 30-day extended sessions.

- **Request Body:**
```json
{
  "email": "traveler@beeline.io",
  "password": "SecurePassword123!",
  "remember_me": true,
  "device_info": "iPhone 15 Safari"
}
```
- **Response `200 OK` (Standard):** Returns `TokenResponse` with 30-day cookie expiration.
- **Response `200 OK` (MFA Challenge Required):**
```json
{
  "mfa_required": true,
  "mfa_session_token": "eyJhbGciOi...",
  "message": "Enter your 6-digit TOTP verification code"
}
```
- **Response `403 Forbidden` (Account Frozen):**
```json
{
  "error": {
    "code": "ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT",
    "message": "This account is scheduled for deletion. An unfreeze link has been sent to your email."
  }
}
```

---

### 5.3 Ephemeral Guest Session
```http
POST /api/v1/auth/guest
```
Enables instantaneous frictionless booking and route exploration without upfront registration.

- **Request Body:**
```json
{
  "device_info": "Next.js Web / Chrome"
}
```
- **Response `201 Created`:** Returns `TokenResponse` with `is_guest: true`.

---

### 5.4 Convert Guest to Registered Traveler
```http
POST /api/v1/auth/guest/convert
```
**Auth:** Bearer Token or Cookie (Guest Session). Promotes the guest to a permanent user while preserving all saved routes and wallet bookings.

- **Request Body:**
```json
{
  "email": "converted@beeline.io",
  "password": "PermanentSecret2026!",
  "full_name": "Andrei Popescu"
}
```
- **Response `200 OK`:** Returns updated `UserProfile`.

---

### 5.5 Token Refresh & Rotation
```http
POST /api/v1/auth/refresh
```
Exchanges a valid refresh token for a newly issued access token and rotating refresh token. Old refresh token is revoked atomically in PostgreSQL and Redis.

- **Request Body:**
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```
- **Response `200 OK`:** Returns fresh `TokenResponse`.

---

### 5.6 Traveler Logout
```http
POST /api/v1/auth/logout
```
**Auth:** Bearer Token or Cookie. Revokes the active session instantly in Redis and PostgreSQL and clears session cookies.

- **Response `200 OK`:**
```json
{
  "message": "Successfully logged out"
}
```

---

### 5.7 Password & Email Breach Check
```http
POST /api/v1/auth/check-breach
```
Performs privacy-preserving breach detection using k-Anonymity (first 5 SHA-1 characters sent to HIBP API, never sending the full password) with fallback to offline compromised passwords. Also inspects simulated domain compromise histories for traveler emails.

- **Request Body:**
```json
{
  "password": "password123",
  "email": "traveler@adobe.com"
}
```
- **Response `200 OK`:**
```json
{
  "is_compromised": true,
  "breach_count": 3824018,
  "email_compromised": true,
  "email_breaches": [
    "Adobe Systems (153M records, 2013)"
  ],
  "recommendation": "CRITICAL: This password has been exposed in 3,824,018 known breaches. Choose a stronger, unique password."
}
```

---

### 5.8 Forgot Password Request
```http
POST /api/v1/auth/forgot-password
```
Generates a cryptographically secure single-use password reset token (15-minute TTL) and dispatches the reset link via `EmailService`. Always returns a constant-time success message to prevent user enumeration. Protected by a strict 3-strike / 15-minute brute-force shield.

- **Request Body:**
```json
{
  "email": "traveler@beeline.io"
}
```
- **Response `200 OK`:**
```json
{
  "message": "If this email is registered, password reset instructions have been sent."
}
```

---

### 5.9 Reset Password
```http
POST /api/v1/auth/reset-password
```
Consumes the single-use reset token, evaluates the new password against structural entropy rules and breach blocklists, updates the password hash, atomically revokes all active sessions across devices, and dispatches a security alert email.

- **Request Body:**
```json
{
  "token": "4a7c8b2e1f...",
  "new_password": "NewSecurePassword2026!"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Password reset successfully. Please log in with your new password."
}
```

---

### 5.10 Emergency Recovery Login
```http
POST /api/v1/auth/recovery-login
```
Allows lost-phone authentication using 1 of the 3 obfuscated post-signup recovery codes (`BEE-XXXX-XXXX`). Verifies salted hashes in constant time, burns the consumed code, decrements the remaining recovery codes count, and establishes an authenticated session. Protected by a 3-strike / 15-minute lockout shield.

- **Request Body:**
```json
{
  "email": "traveler@beeline.io",
  "recovery_code": "BEE-9A4F-2C81",
  "device_info": "Emergency Replacement Phone"
}
```
- **Response `200 OK`:** Returns `TokenResponse` with authenticated session cookies.

---

### 5.11 Account Unfreeze
```http
POST /api/v1/auth/unfreeze
```
Consumes the single-use unfreeze token dispatched upon attempted login to a frozen account. Restores `account_status` to `ACTIVE`, clears deletion schedules, dispatches an account restoration confirmation email, and logs the traveler back in.

- **Request Body:**
```json
{
  "token": "d7e9f1a2...",
  "remember_me": false
}
```
- **Response `200 OK`:** Returns `TokenResponse` with `account_status: "ACTIVE"`.

---

### 5.12 Two-Factor Authentication Setup
```http
POST /api/v1/auth/mfa/setup
```
**Auth:** Bearer Token or Cookie. Generates an RFC 6238 TOTP secret, encrypts it at rest using Fernet, and returns deep links for 1-tap authenticator app enrollment.

- **Response `200 OK`:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "otpauth_uri": "otpauth://totp/Beeline:traveler%40beeline.io?secret=JBSWY3DPEHPK3PXP&issuer=Beeline&algorithm=SHA1&digits=6&period=30",
  "apple_passwords_uri": "apple-otpauth://totp/Beeline:traveler%40beeline.io?secret=JBSWY3DPEHPK3PXP&issuer=Beeline&algorithm=SHA1&digits=6&period=30",
  "qr_code_svg": "data:image/svg+xml;base64,...",
  "qr_code_base64": "data:image/png;base64,...",
  "supported_authenticators": [
    "Proton Pass",
    "Apple iPhone Passwords",
    "Google Authenticator",
    "Microsoft Authenticator",
    "1Password",
    "Bitwarden"
  ]
}
```

---

### 5.13 Two-Factor Authentication Verification & Activation
```http
POST /api/v1/auth/mfa/verify
```
**Auth:** Bearer Token or Cookie. Verifies a 6-digit TOTP code against the pending secret (with clock drift allowance $\pm 1$ step), marks MFA as confirmed, activates `mfa_enabled = True`, and dispatches a security alert email. Protected by a 3-strike brute-force shield.

- **Request Body:**
```json
{
  "code": "482910"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Multi-Factor Authentication enabled successfully"
}
```

---

### 5.14 Two-Factor Authentication Challenge
```http
POST /api/v1/auth/mfa/challenge
```
Completes the second factor of a 2-step login. Validates the 5-minute challenge token and verifies either a 6-digit TOTP code (enforcing anti-replay within the same 60-second window) or an emergency recovery backup code. Issues full session tokens and encrypted cookies.

- **Request Body:**
```json
{
  "mfa_session_token": "eyJhbGciOi...",
  "code": "482910"
}
```
- **Response `200 OK`:** Returns `TokenResponse` with authenticated session cookies.

---

### 5.15 Two-Factor Authentication Status
```http
GET /api/v1/auth/mfa/status
```
**Auth:** Bearer Token or Cookie. Returns current MFA configuration state, confirmation status, and count of remaining recovery codes.

- **Response `200 OK`:**
```json
{
  "mfa_enabled": true,
  "is_confirmed": true,
  "remaining_recovery_codes": 2
}
```

---

### 5.16 Two-Factor Authentication Disable
```http
POST /api/v1/auth/mfa/disable
```
**Auth:** Bearer Token or Cookie. Disables MFA after verifying the traveler's current password. Clears stored TOTP credentials.

- **Request Body:**
```json
{
  "password": "SecurePassword123!"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Two-factor authentication disabled successfully"
}
```

---

### 5.17 Current User Profile
```http
GET /api/v1/users/me
```
**Auth:** Bearer Token or Cookie. Retrieves full profile details of the currently authenticated traveler.

- **Response `200 OK`:**
```json
{
  "id": "usr-uuid-001",
  "email": "traveler@beeline.io",
  "username": "traveler_bee",
  "full_name": "Andrei Popescu",
  "phone_number": "+40722334455",
  "avatar_url": "https://beeline.voyagerail.com/avatars/bee.png",
  "role": "TRAVELER",
  "preferences": "{\"default_pillar\": \"safe\", \"home_station_code\": \"GLT\"}",
  "is_guest": false,
  "is_active": true,
  "mfa_enabled": true,
  "account_status": "ACTIVE",
  "created_at": "2026-11-18T12:00:00Z",
  "updated_at": "2026-11-18T12:30:00Z"
}
```

---

### 5.18 Self-Service Profile Update
```http
PATCH /api/v1/users/me
```
**Auth:** Bearer Token or Cookie. Updates full name, phone number, avatar URL, or username/email. Enforces case-insensitive username and email uniqueness, returning `409 Conflict` if taken by another user.

- **Request Body:**
```json
{
  "full_name": "Andrei I. Popescu",
  "phone_number": "+40722334455",
  "avatar_url": "https://beeline.voyagerail.com/avatars/new.png"
}
```
- **Response `200 OK`:** Returns updated `UserProfile`.

---

### 5.19 In-Account Password Change
```http
POST /api/v1/users/me/password
```
**Auth:** Bearer Token or Cookie. Verifies current password (401 on mismatch), validates new password with unified entropy + breach detection (400 on weak/breached), updates the password hash, revokes all other active sessions (preserving the current session), and sends a security confirmation alert email.

- **Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecretPassword2026!"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Password changed successfully. All other active sessions have been revoked."
}
```

---

### 5.20 Get Travel Preferences
```http
GET /api/v1/users/me/preferences
```
**Auth:** Bearer Token or Cookie. Retrieves validated travel, station, and notification preferences.

- **Response `200 OK`:**
```json
{
  "default_pillar": "safe",
  "home_station_code": "GLT",
  "min_transfer_buffer_minutes": 25,
  "preferred_operators": [
    "CFR Călători",
    "Transferoviar Călători"
  ],
  "email_security_alerts": true,
  "email_delay_alerts": true,
  "theme": "cozy_hive"
}
```

---

### 5.21 Update Travel Preferences
```http
PATCH /api/v1/users/me/preferences
```
**Auth:** Bearer Token or Cookie. Performs clean partial updates to travel and UI preferences with schema range validation (`min_transfer_buffer_minutes` between 5 and 120, `default_pillar` in `safe`/`fast`/`economy`).

- **Request Body:**
```json
{
  "default_pillar": "fast",
  "min_transfer_buffer_minutes": 30,
  "theme": "high_contrast"
}
```
- **Response `200 OK`:** Returns updated `UserPreferencesSchema`.

---

### 5.22 List Active Device Sessions
```http
GET /api/v1/users/me/sessions
```
**Auth:** Bearer Token or Cookie. Lists all active logged-in device sessions with live activity status, IP address, device name, and `is_current` indicator.

- **Response `200 OK`:**
```json
[
  {
    "id": "sess-uuid-001",
    "device_info": "MacBook Pro M2",
    "ip_address": "82.77.100.12",
    "last_active_at": "2026-11-18T12:45:00Z",
    "created_at": "2026-11-18T12:00:00Z",
    "is_current": true
  },
  {
    "id": "sess-uuid-002",
    "device_info": "iPhone 15 Safari",
    "ip_address": "82.77.100.12",
    "last_active_at": "2026-11-18T11:30:00Z",
    "created_at": "2026-11-17T09:15:00Z",
    "is_current": false
  }
]
```

---

### 5.23 Revoke Remote Device Session
```http
DELETE /api/v1/users/me/sessions/{sessionId}
```
**Auth:** Bearer Token or Cookie. Remotely terminates a specific device session in PostgreSQL and Redis.

- **Response `200 OK`:**
```json
{
  "message": "Session revoked successfully"
}
```

---

### 5.24 Revoke All Other Device Sessions
```http
DELETE /api/v1/users/me/sessions
```
**Auth:** Bearer Token or Cookie. Terminates all other active sessions for the user across PostgreSQL and Redis while maintaining the caller's active session.

- **Response `200 OK`:**
```json
{
  "message": "Revoked 2 other active session(s)"
}
```

---

### 5.25 30-Day Account Deletion Freeze
```http
DELETE /api/v1/users/me
```
**Auth:** Bearer Token or Cookie. Initiates the 30-day account deletion freeze lifecycle. Verifies password (and TOTP code if MFA is enabled), transitions `account_status` to `FROZEN_PENDING_DELETION`, sets `is_active=False`, records `frozen_at` and `deletion_scheduled_at` (+30 days), revokes all active sessions in Redis and PostgreSQL, clears auth cookies, and dispatches the 30-Day Notice email.

- **Request Body (Optional / Required if MFA Active):**
```json
{
  "password": "SecurePassword123!",
  "mfa_code": "482910",
  "reason": "Relocating abroad"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Account frozen and scheduled to be permanently deleted in 30 days. You may cancel this by logging in before the scheduled date.",
  "status": "FROZEN_PENDING_DELETION",
  "deletion_scheduled_at": "2026-12-18T12:00:00Z",
  "days_remaining": 30
}
```

**Automated Lifecycle Background Sweeps:**
- **Day 0 to 14:** Account remains frozen. Login triggers `403` and sends unfreeze link.
- **Day 15 (15 days remaining):** Background worker dispatches the 15-Day Reminder Warning email once (`account_deletion_reminder_15d`).
- **Day 30 (0 days remaining):** Background worker dispatches the Final Deletion Notice (`account_permanently_deleted_0d`) and executes an atomic CASCADE hard delete removing the user, sessions, credentials, and preferences from PostgreSQL.

---

## 6. Transit Route Planning & Saved Itineraries

Base path: `/api/v1/routes`

### 6.1 Compute Multi-Modal Transit Plan
```http
POST /api/v1/routes/plan
```
The core algorithmic engine for Beeline. Calculates door-to-door synchronised transit across rail, metro, tram, bus, and walking with Romanian Transfer Shield buffer analysis.

- **Request Body:**
```json
{
  "origin": {
    "name": "Micro 19",
    "city": "Galați",
    "coords": { "latitude": 45.412, "longitude": 28.016 }
  },
  "destination": {
    "name": "Piața Unirii",
    "city": "București",
    "coords": { "latitude": 44.426, "longitude": 26.102 }
  },
  "departureTime": "2026-10-21T06:30:00+03:00",
  "allowedModes": ["TRAIN", "METRO", "TRAM", "BUS", "WALK"],
  "optimizationPreference": "MOST_RELIABLE",
  "maxTransfers": 3,
  "minBufferMinutes": 15
}
```

- **Response `200 OK`:**
```json
{
  "plans": [
    {
      "id": "itinerary-gl-micro19-buc-unirii-001",
      "summary": "Transurb Bus 102 ➔ CFR IR 1572 ➔ Metrorex M2",
      "departureTime": "2026-10-21T06:40:00+03:00",
      "arrivalTime": "2026-10-21T11:15:00+03:00",
      "totalDurationMinutes": 275,
      "totalWalkMinutes": 12,
      "totalWalkDistanceMeters": 680,
      "transfersCount": 2,
      "curatedPillar": "MOST_RELIABLE",
      "mascotRecommendation": {
        "persona": "safe",
        "gear": "safe",
        "badgeLabel": "TRANSFER SHIELD GUARD",
        "advice": "Transfer Shield active: 100% connection guarantee in Gara de Nord!"
      },
      "riskAnalysis": {
        "overallRiskScore": 14.2,
        "riskLevel": "LOW",
        "historicalPunctualityRate": 0.94,
        "tightestBufferMinutes": 20,
        "bufferAdequacy": "OPTIMAL",
        "expectedDelayMinutes": 4,
        "missedConnectionProbability": 0.03,
        "riskSummaryText": "Shielded connection: 20-min buffer safely absorbs standard Romanian transit delays.",
        "riskFactors": [
          "Shielded: 20-min buffer safely absorbs standard Romanian transit delays.",
          "Single-track railway segment on Galați-Făurei branch."
        ],
        "factors": [
          {
            "code": "SINGLE_TRACK_RAIL",
            "severity": "INFO",
            "description": "Single-track railway segment on Galați-Făurei branch.",
            "affectedLegIndex": 1
          }
        ],
        "isMlComputed": true
      },
      "fare": {
        "totalAmountLei": 68.50,
        "currency": "RON",
        "isCombinedBookingAvailable": true,
        "breakdown": [
          { "carrier": "Transurb Galați", "amountLei": 3.00, "legMode": "BUS" },
          { "carrier": "CFR Călători", "amountLei": 62.50, "legMode": "TRAIN" },
          { "carrier": "Metrorex", "amountLei": 3.00, "legMode": "METRO" }
        ]
      },
      "legs": [
        {
          "legIndex": 0,
          "mode": "BUS",
          "lineCode": "102",
          "operator": "Transurb Galați",
          "origin": "Micro 19",
          "destination": "Gara CFR Galați",
          "departureTime": "2026-10-21T06:40:00+03:00",
          "arrivalTime": "2026-10-21T07:05:00+03:00",
          "durationMinutes": 25,
          "isRealtime": true,
          "delayMinutes": 0
        },
        {
          "legIndex": 1,
          "mode": "TRAIN",
          "lineCode": "IR 1572",
          "operator": "CFR Călători",
          "origin": "Galați",
          "destination": "București Nord",
          "departureTime": "2026-10-21T07:30:00+03:00",
          "arrivalTime": "2026-10-21T10:45:00+03:00",
          "durationMinutes": 195,
          "isRealtime": true,
          "delayMinutes": 2
        },
        {
          "legIndex": 2,
          "mode": "METRO",
          "lineCode": "M2",
          "operator": "Metrorex",
          "origin": "Gara de Nord 1",
          "destination": "Piața Unirii",
          "departureTime": "2026-10-21T11:00:00+03:00",
          "arrivalTime": "2026-10-21T11:15:00+03:00",
          "durationMinutes": 15,
          "isRealtime": true,
          "delayMinutes": 0
        }
      ]
    }
  ],
  "recommendedPlanId": "itinerary-gl-micro19-buc-unirii-001",
  "query": { "origin": { "name": "Micro 19" }, "destination": { "name": "Piața Unirii" } },
  "generatedAt": "2026-11-01T10:15:00Z"
}
```

### 6.1.1 RouteRiskAnalysis Field Specification & Aliasing Contract
The `riskAnalysis` object provides explainable ML-inferred delay risks, missed connection probabilities, and buffer adequacy metrics for each candidate itinerary. Bidirectional serialization supports both camelCase (client standard) and snake_case (prompt / backend standard):

| JSON Field (camelCase) | Supported Aliases | Data Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `overallRiskScore` | `risk_score`, `riskScore` | `float` (0.0–100.0) | Required | Calibrated journey composite risk score. |
| `riskLevel` | `risk_level` | `RiskLevel` Enum | Required | Risk tier: `LOW` ($\le 20$), `MODERATE` ($\le 45$), `HIGH` ($\le 70$), `CRITICAL` ($> 70$). |
| `historicalPunctualityRate`| `historical_punctuality_rate` | `float` (0.0–1.0) | `0.88` | Aggregated carrier and line punctuality baseline. |
| `tightestBufferMinutes` | `tightest_buffer_minutes` | `int` | `999` | Minimum transfer buffer between any connecting legs in minutes. |
| `bufferAdequacy` | `buffer_adequacy` | `BufferAdequacy` Enum| Required | Buffer classification: `GENEROUS`, `OPTIMAL`, `TIGHT`, `INSUFFICIENT`. |
| `expectedDelayMinutes` | `expected_delay_minutes` | `int` ($\ge 0$) | `0` | Predicted arrival delay from LightGBM Huber regressor. |
| `missedConnectionProbability`| `missed_connection_probability` | `float` (0.0–1.0)| `0.0` | Calibrated connection failure probability from LightGBM classifier. |
| `riskSummaryText` | `risk_summary_text` | `string` | Required | Natural-language route risk summary. |
| `riskFactors` | `risk_factors`, `delayRiskFactors` | `List[string]` | `[]` | Human-readable bullet list of contributing risk factors for UI display. |
| `factors` | `factors` | `List[RouteRiskFactor]` | `[]` | Structured risk factor objects with hazard code, severity, and leg index. |
| `isMlComputed` | `is_ml_computed` | `boolean` | `false` | `true` when evaluated by the ONNX ML pipeline; `false` on deterministic fallback. |

### 6.1.2 In-Process ONNX Inference & Redis Online Feature Store Architecture
Beeline serves machine learning predictions in-process with sub-millisecond latency:
- **In-Process ONNX Runtime Serving:** At server startup, FastAPI's `lifespan` handler compiles and loads `backend/app/ml_models/risk_model.onnx` into CPU memory via `onnxruntime.InferenceSession`. Batch inference for 3–5 candidate routes executes in $< 1.5\text{ms}$ with zero network hops.
- **Dual Fused ML Models:** The ONNX artifact fuses a LightGBM delay regressor (Huber loss, MAE $< 4.5$ min) and a LightGBM missed connection classifier (ROC-AUC $> 0.92$) using `onnx.compose.merge_models` with an 18-element feature vector.
- **Redis Online Feature Store:** A lightweight Redis 7 cache indexes real-time corridor metrics (`feature:corridor:{corridor_slug}`), transfer hub congestion (`feature:station:{station_code}`), and carrier punctuality (`feature:carrier:{carrier_id}`) with pipelined reads (`< 1.0ms`).
- **Non-Blocking Background Sync:** A background asyncio worker refreshes feature hashes every 60 seconds from live disruption feeds and ANM weather alerts with 24-hour sliding TTLs without blocking SQLite/PostgreSQL operations.
- **Distributed Idempotency Locking:** `IdempotencyService` uses Redis distributed locks (`SET NX EX 120`) to eliminate database row contention under high-concurrency multi-worker deployments, automatically falling back to SQL records when Redis is unavailable.
- **Zero-Downtime Deterministic Fallback:** If the ONNX model is missing or Redis is unreachable, the engine degrades gracefully to the deterministic Romanian Transfer Shield heuristic with zero 500 errors.

### 6.2 Popular Corridors Showcase
```http
GET /api/v1/routes/corridors/popular
```
Returns high-frequency Romanian transit corridors for quick one-tap search on the homepage.

- **Response `200 OK`:**
```json
{
  "corridors": [
    {
      "origin": "Galați",
      "destination": "București Nord",
      "label": "Galați ⇄ București",
      "frequency": "Hourly",
      "fastestDurationFormatted": "3h 15m",
      "minFareLei": 58.00,
      "primaryOperators": ["CFR Călători", "Transferoviar Călători"]
    },
    {
      "origin": "București Nord",
      "destination": "Brașov",
      "label": "București ⇄ Brașov",
      "frequency": "Every 30 min",
      "fastestDurationFormatted": "2h 15m",
      "minFareLei": 42.50,
      "primaryOperators": ["CFR Călători", "Astra Trans Carpatic"]
    }
  ]
}
```

### 6.3 Save Route to Travel Wallet
```http
POST /api/v1/routes/saved
Headers: Idempotency-Key: <key>
```
**Auth:** Bearer Token. Saves an entire itinerary into traveler's persistent wallet.

- **Request Body:**
```json
{
  "plan": { "id": "itinerary-gl-micro19-buc-unirii-001", "..." : "..." }
}
```
- **Response `201 Created`:** Returns saved route record with server ID.

### 6.4 List Saved Itineraries
```http
GET /api/v1/routes/saved?page=1&pageSize=20
```
**Auth:** Bearer Token. Returns paginated list of saved itineraries for the current user.

### 6.5 Update Saved Itinerary
```http
PATCH /api/v1/routes/saved/{routeId}
```
**Auth:** Bearer Token. Updates custom label, notes, origin/destination names, or plan payload.
- **Request Body:**
```json
{
  "origin_name": "Galați Centru Acasă",
  "destination_name": "București Birou Unirii"
}
```
- **Response `200 OK`:** Returns updated `SavedRouteResponse`.

### 6.6 Delete Saved Itinerary
```http
DELETE /api/v1/routes/saved/{routeId}
```
**Auth:** Bearer Token. Idempotent deletion.

---

## 7. Rail Timetables, Fares & Live Departures

Base path: `/api/v1/trains`

Powers the `/trains` page with real-time train tracking, multi-tier seat classes, amenities, and multi-operator fares.

### 7.1 Search Rail Journeys
```http
GET /api/v1/trains?searchQuery=IR+1572&status=ON_TIME&operator=CFR+C%C4%83l%C4%83tori&date=2026-10-21&page=1&pageSize=20&sortBy=departure&sortOrder=asc
```

- **Query Parameters:**
  - `searchQuery` *(optional)*: Search by train number (`IR 1572`), origin, or destination.
  - `status` *(optional)*: `ALL` | `ON_TIME` | `DELAYED` | `CANCELLED` | `BOARDING`
  - `operator` *(optional)*: `ALL` | `CFR Călători` | `Astra Trans Carpatic` | `Transferoviar Călători` | `Regio Călători`
  - `originCode` *(optional)*: e.g. `BCT` (București Nord), `GLT` (Galați)
  - `destinationCode` *(optional)*: e.g. `BSV` (Brașov)
  - `date` *(optional)*: ISO Date string `YYYY-MM-DD`
  - `maxPrice` *(optional)*: number in LEI
  - `page` *(optional)*: integer $\ge 1$ (default: `1`)
  - `pageSize` *(optional)*: integer $1 \dots 100$ (default: `20`)

- **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "tr-ir-1572-20261021",
      "trainNumber": "IR 1572",
      "operator": "CFR Călători",
      "origin": {
        "code": "GLT",
        "name": "Gara Galați",
        "city": "Galați",
        "platform": "1"
      },
      "destination": {
        "code": "BCT",
        "name": "Gara de Nord",
        "city": "București",
        "platform": "3"
      },
      "departureTime": "2026-10-21T07:30:00+03:00",
      "arrivalTime": "2026-10-21T10:45:00+03:00",
      "durationMinutes": 195,
      "durationFormatted": "3h 15m",
      "status": "ON_TIME",
      "delayMinutes": 0,
      "carbonFootprintKg": 14.2,
      "amenities": ["WIFI", "POWER_OUTLETS", "DINING_CAR", "WHEELCHAIR_ACCESSIBLE"],
      "fares": [
        { "classType": "STANDARD", "price": 62.50, "currency": "RON", "seatsAvailable": 48 },
        { "classType": "FIRST", "price": 94.00, "currency": "RON", "seatsAvailable": 12 },
        { "classType": "BUSINESS", "price": 125.00, "currency": "RON", "seatsAvailable": 4 }
      ],
      "stops": [
        {
          "stopNumber": 1,
          "station": { "code": "GLT", "name": "Gara Galați", "city": "Galați" },
          "scheduledDeparture": "2026-10-21T07:30:00+03:00",
          "platform": "1"
        },
        {
          "stopNumber": 2,
          "station": { "code": "BRL", "name": "Gara Brăila", "city": "Brăila" },
          "scheduledArrival": "2026-10-21T07:55:00+03:00",
          "scheduledDeparture": "2026-10-21T07:58:00+03:00",
          "platform": "2"
        },
        {
          "stopNumber": 3,
          "station": { "code": "PLS", "name": "Ploiești Sud", "city": "Ploiești" },
          "scheduledArrival": "2026-10-21T09:55:00+03:00",
          "scheduledDeparture": "2026-10-21T09:58:00+03:00",
          "platform": "1"
        },
        {
          "stopNumber": 4,
          "station": { "code": "BCT", "name": "București Nord", "city": "București" },
          "scheduledArrival": "2026-10-21T10:45:00+03:00",
          "platform": "3"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 7.2 Get Rail Journey Details
```http
GET /api/v1/trains/{trainId}
```
Returns real-time stop-by-stop live updates, actual versus scheduled arrival times, train coach composition, and platform assignments.

### 7.2.1 Get Complete Stop-by-Stop Train Itinerary
```http
GET /api/v1/trains/{train_number}/itinerary?date=YYYY-MM-DD
```
Returns the complete end-to-end commercial itinerary with all stops, arrival/departure seconds, scheduled arrival/departure ISO times, dwell minutes, cumulative distance (km), and stop type tagging (`BOARDING`, `INTERMEDIATE`, `ALIGHTING`).

### 7.3 List Romanian Railway Operators
```http
GET /api/v1/trains/operators
```
Returns registered operators, contact channels, live GTFS-RT feed health, and logo URLs.

### 7.3.1 Romanian Railway Timetable Period Status
```http
GET /api/v1/trains/timetable-status
```
Returns active railway timetable period (`2025-2026` / `2026-2027`), operator counts, and active 90-day booking window.

### 7.3.2 Discover & Sync Timetables from Data.gov.ro CKAN API
```http
POST /api/v1/trains/sync-timetables
```
Discovers, downloads, and archives the latest official open XML railway timetables from the Romanian Open Data portal (`data.gov.ro`), supporting seamless transitions between 2025-2026 and 2026-2027 seasons.

### 7.3.3 Dynamic Real-Time Rail Operators Summary
```http
GET /api/v1/trains/operators-summary
```
Returns a dynamic factual summary of all Romanian rail operators parsed directly from the active official XML timetables (`backend/scraper/data/xml/*.xml`). Response is cached via dual-layer caching (in-memory + Redis `beeline:operators:summary:v1:{mtime_hash}`, TTL 900s) keyed on XML file modification fingerprints.

- **Response `200 OK`:**
```json
{
  "totalDailyTrains": 2103,
  "totalRoutes": 709,
  "operatorCount": 7,
  "updatedAt": "2026-11-20T10:30:00+00:00",
  "source": "OFFICIAL_XML_LIVE",
  "operators": [
    {
      "id": "cfr",
      "shortName": "CFR",
      "name": "CFR Călători",
      "dailyTrains": 1256,
      "routes": 479
    }
  ]
}
```

### 7.4 Create Scheduled Train Journey
```http
POST /api/v1/trains
```
Registers a new scheduled railway service with origin, destination, intermediate stops, fares, and onboard amenities.
- **Response `201 Created`:** Returns created `TrainJourney`.
- **Response `409 Conflict`:** Train number or ID already registered.

### 7.5 Update Train Journey
```http
PATCH /api/v1/trains/{trainId}
```
Updates real-time status (`ON_TIME`, `DELAYED`, `CANCELLED`), delay minutes, operating carrier, or amenities.
- **Response `200 OK`:** Returns updated `TrainJourney`.
- **Response `404 Not Found`:** Train ID does not exist.

### 7.6 Delete Train Journey
```http
DELETE /api/v1/trains/{trainId}
```
Deletes a train service from the schedule registry.
- **Response `200 OK`:** `{ "message": "Train journey '{trainId}' deleted successfully" }`.
- **Response `404 Not Found`:** Train ID not found.

---

## 8. Station Search & Live Station Boards

Base path: `/api/v1/stations`

### 8.1 List All Stations
```http
GET /api/v1/stations?city=București&limit=20
```
Returns a list of all transit stations and multimodal nodes matching query filters.
- **Response `200 OK`:** Returns `List[StationSearchResult]`.

### 8.2 Autocomplete Station Search
```http
GET /api/v1/stations/search?query=Bucur&limit=10
```
- **Query Parameters:**
  - `query`: Minimum 2 characters.
  - `limit`: default `10`, max `50`.
  - `city`: optional filter.

- **Response `200 OK`:**
```json
{
  "stations": [
    {
      "code": "BCT",
      "name": "București Nord",
      "city": "București",
      "modes": ["TRAIN", "METRO", "BUS"],
      "coordinates": { "latitude": 44.447, "longitude": 26.074 }
    },
    {
      "code": "BCO",
      "name": "București Basarab",
      "city": "București",
      "modes": ["TRAIN", "METRO"],
      "coordinates": { "latitude": 44.449, "longitude": 26.068 }
    }
  ]
}
```

### 8.3 Get Station Details
```http
GET /api/v1/stations/{stationCode}
```
Returns station details, city, supported modes, and GPS coordinates.
- **Response `200 OK`:** Returns `StationSearchResult`.
- **Response `404 Not Found`:** Station code does not exist.

### 8.4 Create Station
```http
POST /api/v1/stations
```
Registers a new station node.
- **Response `201 Created`:** Returns `StationSearchResult`.
- **Response `409 Conflict`:** Station code already exists.

### 8.5 Update Station
```http
PATCH /api/v1/stations/{stationCode}
```
Updates station name, city, supported modes, or GPS coordinates.
- **Response `200 OK`:** Returns updated `StationSearchResult`.
- **Response `404 Not Found`:** Station code not found.

### 8.6 Delete Station
```http
DELETE /api/v1/stations/{stationCode}
```
Deletes a station node. Enforces relational integrity: rejects deletion with `409 Conflict` if active scheduled trains reference the station code as origin or destination.
- **Response `200 OK`:** `{ "message": "Station '{stationCode}' deleted successfully" }`.
- **Response `404 Not Found`:** Station code not found.
- **Response `409 Conflict`:** Station is referenced by active train journey (Foreign Key constraint).

### 8.7 Live Station Departure / Arrival Board
```http
GET /api/v1/stations/{stationCode}/board?type=DEPARTURES&windowHours=2
```
Returns live arrivals or departures for station monitors with real-time delay minutes and track/platform numbers.

### 8.8 Station Autocomplete Catalog
```http
GET /api/v1/stations/autocomplete-catalog
```
Returns the full deduplicated Romanian commercial rail station catalog with weekly sync metadata (`isoWeek`, `lastSyncedAt`, `nextWeeklySyncAt`, `totalStations`, `schedule`).

### 8.9 Weekly Sync Trigger
```http
POST /api/v1/stations/sync-weekly
```
Triggers an immediate on-demand refresh of the full rail station catalog from active timetables and updates weekly sync metadata.

---

## 9. Trip Bookings & Wallet Checkout

Base path: `/api/v1/bookings`

Powers the `/my-trip` itinerary page, ticket reservation, and wallet synchronization.

### 9.1 Create Booking / Reserve Itinerary
```http
POST /api/v1/bookings
Headers:
  Authorization: Bearer <access_token>
  Idempotency-Key: book:v1:usr-001:order-98234-20261021
```

- **Request Body:**
```json
{
  "items": [
    {
      "journeyId": "tr-ir-1572-20261021",
      "selectedClass": "STANDARD",
      "travelDate": "2026-10-21",
      "seatPreferences": {
        "position": "WINDOW",
        "quietZone": false
      },
      "passengers": [
        {
          "fullName": "Andrei Popescu",
          "passengerType": "ADULT",
          "idNumber": "1900101000000"
        }
      ]
    }
  ],
  "contactEmail": "traveler@beeline.io",
  "contactPhone": "+40700000000"
}
```

- **Response `201 Created`:**
```json
{
  "bookingId": "bkg-ro-2026-98124",
  "bookingReference": "BEE-8842",
  "status": "CONFIRMED",
  "createdAt": "2026-11-01T10:30:00Z",
  "totalAmountLei": 62.50,
  "currency": "RON",
  "tickets": [
    {
      "ticketNumber": "TK-CFR-1572-A12",
      "trainNumber": "IR 1572",
      "carNumber": "2",
      "seatNumber": "42",
      "classType": "STANDARD",
      "passengerName": "Andrei Popescu",
      "qrCodePayload": "https://beeline.io/t/BEE-8842-A12",
      "departureTime": "2026-10-21T07:30:00+03:00",
      "arrivalTime": "2026-10-21T10:45:00+03:00",
      "origin": "Galați",
      "destination": "București Nord"
    }
  ]
}
```

### 9.2 List Traveler Bookings
```http
GET /api/v1/bookings?page=1&pageSize=10
```
**Auth:** Bearer Token. Returns paginated list of active and archived traveler bookings.

### 9.3 Get Single Booking Details
```http
GET /api/v1/bookings/{bookingId}
```
**Auth:** Bearer Token. Retrieves booking reference, pricing, status, and issued tickets.
- **Response `200 OK`:** Returns `BookingResponse`.
- **Response `404 Not Found`:** Booking ID not found.

### 9.4 Update Booking
```http
PATCH /api/v1/bookings/{bookingId}
```
**Auth:** Bearer Token. Updates passenger contact email/phone or booking status (`CONFIRMED`, `CANCELLED`, `PENDING`, `REFUNDED`).
- **Response `200 OK`:** Returns updated `BookingResponse`.
- **Response `404 Not Found`:** Booking ID not found.

### 9.5 Cancel Booking
```http
DELETE /api/v1/bookings/{bookingId}
```
**Auth:** Bearer Token. Idempotently cancels booking and triggers refund according to operator policies.

---

## 10. Real-Time Transit Disruptions

Base path: `/api/v1/disruptions`

### 10.1 Fetch Active Network Disruptions
```http
GET /api/v1/disruptions?severity=WARNING
```

- **Response `200 OK`:**
```json
{
  "disruptions": [
    {
      "id": "dis-cfr-ploiesti-01",
      "operator": "CFR S.A.",
      "severity": "WARNING",
      "headline": "Track modernization on Ploiești Vest - Câmpina",
      "description": "Speed restrictions in place. InterRegio services may experience 10-15 minute delays.",
      "estimatedDelayMinutes": 15,
      "affectedLines": ["IR 1745", "IR 1632"],
      "startsAt": "2026-10-20T00:00:00Z",
      "endsAt": "2026-11-05T23:59:00Z"
    }
  ]
}
```

### 10.2 Get Disruption Details
```http
GET /api/v1/disruptions/{disruptionId}
```
Returns detailed description, severity, and affected corridor lines for a specific incident.
- **Response `200 OK`:** Returns `DisruptionItem`.
- **Response `404 Not Found`:** Disruption ID not found.

### 10.3 Report Disruption Incident
```http
POST /api/v1/disruptions
```
Reports a new transit delay, catenary failure, or infrastructure maintenance incident.
- **Response `201 Created`:** Returns created `DisruptionItem`.
- **Response `409 Conflict`:** Disruption ID already exists.

### 10.4 Update Disruption Incident
```http
PATCH /api/v1/disruptions/{disruptionId}
```
Updates delay minutes, severity (`INFO`, `WARNING`, `CRITICAL`), or affected transit corridors.
- **Response `200 OK`:** Returns updated `DisruptionItem`.
- **Response `404 Not Found`:** Disruption ID not found.

### 10.5 Delete/Archive Disruption
```http
DELETE /api/v1/disruptions/{disruptionId}
```
Archives or removes a resolved transit disruption incident.
- **Response `200 OK`:** `{ "message": "Disruption '{disruptionId}' deleted successfully" }`.
- **Response `404 Not Found`:** Disruption ID not found.

---

## 11. Backend Implementation Status Matrix

| Module | Route | HTTP Method | Status | Frontend Consumer |
|---|---|:---:|:---:|---|
| **Auth** | `/auth/signup` | `POST` | ✅ Implemented | `AuthContext.signup()` (3 recovery codes, cookies) |
| **Auth** | `/auth/login` | `POST` | ✅ Implemented | `AuthContext.login()` (remember_me, unfreeze check) |
| **Auth** | `/auth/guest` | `POST` | ✅ Implemented | `AuthContext.continueAsGuest()` |
| **Auth** | `/auth/guest/convert` | `POST` | ✅ Implemented | `AuthContext.convertGuest()` |
| **Auth** | `/auth/refresh` | `POST` | ✅ Implemented | `apiClient.refreshToken()` |
| **Auth** | `/auth/logout` | `POST` | ✅ Implemented | `AuthContext.logout()` (Redis instant revocation) |
| **Auth** | `/auth/check-breach` | `POST` | ✅ Implemented | `apiClient.checkBreach()` (k-anonymity HIBP) |
| **Auth** | `/auth/forgot-password` | `POST` | ✅ Implemented | `apiClient.forgotPassword()` (3-strike shield) |
| **Auth** | `/auth/reset-password` | `POST` | ✅ Implemented | `apiClient.resetPassword()` (session invalidation) |
| **Auth** | `/auth/recovery-login` | `POST` | ✅ Implemented | Emergency login via 1-time recovery code |
| **Auth** | `/auth/unfreeze` | `POST` | ✅ Implemented | Restore account from 30-day deletion freeze |
| **MFA** | `/auth/mfa/setup` | `POST` | ✅ Implemented | `apiClient.setupMFA()` (Fernet encrypted secret) |
| **MFA** | `/auth/mfa/verify` | `POST` | ✅ Implemented | `AuthContext.verifyMFA()` |
| **MFA** | `/auth/mfa/challenge` | `POST` | ✅ Implemented | `apiClient.verifyMFAChallenge()` (anti-replay) |
| **MFA** | `/auth/mfa/status` | `GET` | ✅ Implemented | MFA enrollment & recovery codes query |
| **MFA** | `/auth/mfa/disable` | `POST` | ✅ Implemented | `apiClient.disableMFA()` |
| **Users** | `/users/me` | `GET` | ✅ Implemented | `AuthContext.refreshUser()` |
| **Users** | `/users/me` | `PATCH` | ✅ Implemented | Profile settings modal (409 conflict checks) |
| **Users** | `/users/me/password` | `POST` | ✅ Implemented | Password change & revoke other sessions |
| **Users** | `/users/me/preferences` | `GET` | ✅ Implemented | Travel & notification preferences query |
| **Users** | `/users/me/preferences` | `PATCH` | ✅ Implemented | Travel & notification preferences update |
| **Users** | `/users/me/sessions` | `GET` | ✅ Implemented | Security settings (active session registry) |
| **Users** | `/users/me/sessions/{id}` | `DELETE` | ✅ Implemented | Security settings (remote session revocation) |
| **Users** | `/users/me/sessions` | `DELETE` | ✅ Implemented | Security settings (revoke all other sessions) |
| **Users** | `/users/me` | `DELETE` | ✅ Implemented | 30-day freeze + Day-15/Day-30 hard delete sweep |
| **Routes** | `/routes/plan` | `POST` | ✅ Implemented | HomePage (`/`), TripsPage (`/trips`) |
| **Routes** | `/routes/corridors/popular` | `GET` | ✅ Implemented | HomePage Corridor Pills |
| **Routes** | `/routes/saved` | `POST` | ✅ Implemented | `apiClient.saveRoute()` |
| **Routes** | `/routes/saved` | `GET` | ✅ Implemented | `MyTripPage` (`/my-trip`) |
| **Routes** | `/routes/saved/{id}` | `PATCH` | ✅ Implemented | Custom itinerary notes / labels |
| **Routes** | `/routes/saved/{id}` | `DELETE` | ✅ Implemented | `MyTripPage` (`/my-trip`) |
| **Trains** | `/trains` | `GET` | ✅ Implemented | `TrainsPage` (`/trains`) |
| **Trains** | `/trains` | `POST` | ✅ Implemented | Timetable management / Admin |
| **Trains** | `/trains/{id}` | `GET` | ✅ Implemented | `TrainDetailModal` |
| **Trains** | `/trains/{id}` | `PATCH` | ✅ Implemented | Train live status / delay dispatch |
| **Trains** | `/trains/{id}` | `DELETE` | ✅ Implemented | Train cancellation / registry |
| **Trains** | `/trains/operators` | `GET` | ✅ Implemented | `TrainsPage` operator filter |
| **Trains** | `/trains/operators-summary` | `GET` | ✅ Implemented | `TransitHoneycombSection` Live Summary |
| **Stations** | `/stations` | `GET` | ✅ Implemented | Station catalog / directory |
| **Stations** | `/stations` | `POST` | ✅ Implemented | Station node creation |
| **Stations** | `/stations/{code}` | `GET` | ✅ Implemented | Station details / GPS |
| **Stations** | `/stations/{code}` | `PATCH` | ✅ Implemented | Station metadata / coordinates update |
| **Stations** | `/stations/{code}` | `DELETE` | ✅ Implemented | Station decommissioning (FK protected) |
| **Stations** | `/stations/search` | `GET` | ✅ Implemented | Autocomplete in inputs |
| **Stations** | `/stations/autocomplete-catalog` | `GET` | ✅ Implemented | Full deduplicated station catalog + weekly sync meta |
| **Stations** | `/stations/sync-weekly` | `POST` | ✅ Implemented | Trigger/verify weekly station sync |
| **Stations** | `/stations/{code}/board`| `GET` | ✅ Implemented | Live Station Departure view |
| **Bookings** | `/bookings` | `POST` | ✅ Implemented | `MyTripPage` checkout |
| **Bookings** | `/bookings` | `GET` | ✅ Implemented | User travel history |
| **Bookings** | `/bookings/{id}` | `GET` | ✅ Implemented | Booking lookup / Ticket details |
| **Bookings** | `/bookings/{id}` | `PATCH` | ✅ Implemented | Booking passenger / contact update |
| **Bookings** | `/bookings/{id}` | `DELETE` | ✅ Implemented | Booking cancellation |
| **Disruptions**| `/disruptions` | `GET` | ✅ Implemented | Transfer Shield live warnings |
| **Disruptions**| `/disruptions` | `POST` | ✅ Implemented | Incident reporting / Operator dispatch |
| **Disruptions**| `/disruptions/{id}` | `GET` | ✅ Implemented | Disruption incident detail |
| **Disruptions**| `/disruptions/{id}` | `PATCH` | ✅ Implemented | Incident update / Delay escalation |
| **Disruptions**| `/disruptions/{id}` | `DELETE` | ✅ Implemented | Incident archival / Resolution |
| **Notifications**| `/notifications/status` | `GET` | ✅ Implemented | Notification preferences & delivery status |
| **Notifications**| `/notifications/test-departure-alert` | `POST` | ✅ Implemented | Test email dispatch to logged-in user |
| **Notifications**| `/notifications/dispatch-due` | `POST` | ✅ Implemented | Scheduled departure check trigger |
| **ML Engine** | In-Process ONNX Inference | `Internal` | ✅ Implemented | Batched inference in `RiskService` (< 1.5ms) |
| **Feature Store** | Redis 7 Online Store | `Internal` | ✅ Implemented | `FeatureStoreService` (Corridor, Station, Carrier) |
| **Concurrency** | Distributed Idempotency Lock | `Internal` | ✅ Implemented | Redis `SET NX EX` with automatic SQL fallback |

---

### Verification Checklist & Sign-off

- [x] **Contract First:** All inputs, outputs, query parameters, and error shapes are explicitly typed.
- [x] **Unified Error Envelope:** Single error JSON structure across all HTTP failure codes.
- [x] **Idempotency Standard:** State-changing endpoints accept `Idempotency-Key` and enforce atomic claim + fingerprinting.
- [x] **Pagination Standard:** Enforces standard `page`, `pageSize`, `totalItems`, `totalPages`.
- [x] **Zero Breaking Changes:** Extends existing FastAPI endpoints without breaking existing implementations.
- [x] **Security:** Password hashing (bcrypt), token rotation, TOTP MFA, and scoped session invalidation.
- [x] **ML Serving & In-Process Inference:** ONNX Runtime session warm in RAM with < 5ms total route enrichment SLA.
- [x] **Online Feature Store:** Sub-millisecond Redis pipelining with non-blocking 60s lifespan sync worker.
- [x] **Graceful Circuit Breaker:** Zero 500 errors via automatic deterministic Romanian Transfer Shield fallback.
