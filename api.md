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
8. [Transit Schedules & Line Timetables (`/schedules`)](#8-transit-schedules--line-timetables)
9. [Station Search & Live Station Boards (`/stations`)](#9-station-search--live-station-boards)
10. [Trip Bookings & Wallet Checkout (`/bookings`)](#10-trip-bookings--wallet-checkout)
11. [Real-Time Transit Disruptions (`/disruptions`)](#11-real-time-transit-disruptions)
12. [Backend Implementation Status Matrix](#12-backend-implementation-status-matrix)

---

## 1. Architecture & Design Principles

### 1.1 Contract-First & Predictable Naming
- **Resource-Oriented REST:** Endpoints use plural nouns without verbs (`/trains`, `/routes/plan`, `/schedules`, `/bookings`).
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

All list endpoints (`GET /trains`, `GET /schedules`, `GET /routes/saved`, `GET /bookings`) return a standardized paginated envelope:

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

### 5.1 Traveler Sign Up
```http
POST /api/v1/auth/signup
```
Registers a permanent traveler account and returns immediate authentication tokens.

- **Request Body:**
```json
{
  "email": "traveler@beeline.io",
  "password": "StrongPassword123!",
  "full_name": "Andrei Popescu",
  "device_info": "Next.js Web / Chrome macOS"
}
```
- **Response `201 Created`:**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "usr-uuid-001",
    "email": "traveler@beeline.io",
    "full_name": "Andrei Popescu",
    "is_guest": false,
    "is_active": true,
    "mfa_enabled": false,
    "created_at": "2026-11-01T10:00:00Z"
  }
}
```

### 5.2 Traveler Login
```http
POST /api/v1/auth/login
```
Authenticates user. If 2FA is active, returns an MFA challenge instead of access tokens.

- **Request Body:**
```json
{
  "email": "traveler@beeline.io",
  "password": "StrongPassword123!",
  "device_info": "Next.js Web / Safari iOS"
}
```
- **Response `200 OK` (Standard):** Returns `TokenResponse` as in `5.1`.
- **Response `200 OK` (MFA Challenge Required):**
```json
{
  "mfa_required": true,
  "mfa_session_token": "mfa-challenge-jwt-token...",
  "message": "Enter your 6-digit TOTP verification code"
}
```

### 5.3 Ephemeral Guest Session
```http
POST /api/v1/auth/guest
```
Enables instantaneous frictionless booking and route exploration without signup.

- **Request Body:**
```json
{
  "device_info": "Next.js Web / Chrome"
}
```
- **Response `201 Created`:** Returns `TokenResponse` with `is_guest: true`.

### 5.4 Convert Guest to Registered Traveler
```http
POST /api/v1/auth/guest/convert
```
**Auth:** Bearer Token (Guest Session). Promotes the guest to a permanent user while preserving all saved routes and wallet bookings.

- **Request Body:**
```json
{
  "email": "converted@beeline.io",
  "password": "NewPermanentPassword123!",
  "full_name": "Andrei Popescu"
}
```
- **Response `200 OK`:** Returns updated `UserProfile`.

### 5.5 Token Refresh & Rotation
```http
POST /api/v1/auth/refresh
```
Exchanges a valid refresh token for a newly issued access token and rotating refresh token. Old refresh token is revoked atomically.

- **Request Body:**
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```
- **Response `200 OK`:** Returns fresh `TokenResponse`.

### 5.6 Traveler Logout
```http
POST /api/v1/auth/logout
```
**Auth:** Bearer Token. Revokes current device session.

- **Response `200 OK`:**
```json
{ "message": "Successfully logged out" }
```

### 5.7 Two-Factor Authentication (TOTP)
- `POST /api/v1/auth/mfa/setup`: Generates RFC 6238 TOTP secret, otpauth URI, and QR code SVG.
- `POST /api/v1/auth/mfa/verify`: Confirms TOTP setup with 6-digit test code; generates 8 emergency recovery backup codes.
- `POST /api/v1/auth/mfa/challenge`: Validates challenge token + TOTP or backup code during login.
- `POST /api/v1/auth/mfa/disable`: Disables MFA with password confirmation.

### 5.8 Current User & Device Sessions
- `GET /api/v1/users/me`: Retrieves authenticated traveler profile.
- `PATCH /api/v1/users/me`: Partial updates to name or preferences.
- `GET /api/v1/users/me/sessions`: Lists all active logged-in device sessions (IP, device name, last active).
- `DELETE /api/v1/users/me/sessions/{sessionId}`: Revokes a specific session remotely.
- `DELETE /api/v1/users/me/sessions`: Revokes all other sessions except current.

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
        "overallRiskScore": 14,
        "riskLevel": "LOW",
        "historicalPunctualityRate": 0.94,
        "tightestBufferMinutes": 25,
        "bufferAdequacy": "OPTIMAL",
        "delayRiskFactors": [
          "CFR InterRegio punctuality on Ploiești-București is 92%"
        ]
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

### 6.5 Delete Saved Itinerary
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

### 7.3 List Romanian Railway Operators
```http
GET /api/v1/trains/operators
```
Returns registered operators, contact channels, live GTFS-RT feed health, and logo URLs.

---

## 8. Transit Schedules & Line Timetables

Base path: `/api/v1/schedules`

Powers the `/schedules` page for city-wide transit lookup (Metrorex, STB, Transurb, CTP).

### 8.1 List Transit Schedules
```http
GET /api/v1/schedules?section=URBAN&city=Gala%C8%9Bi&mode=BUS&search=102&page=1&pageSize=20
```

- **Query Parameters:**
  - `section`: `URBAN` | `TRAIN`
  - `city`: e.g. `Galați`, `București`, `Cluj-Napoca`, `Brașov`
  - `mode`: `METRO` | `TRAIN` | `TRAM` | `BUS`
  - `search`: Filter by line number, name, or terminal stop
  - `page`: default `1`
  - `pageSize`: default `20`

- **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "transurb-bus-102",
      "lineCode": "102",
      "lineName": "Linia 102 (Micro 19 ⇄ Parc CFR)",
      "mode": "BUS",
      "operator": "Transurb Galați",
      "city": "Galați",
      "section": "URBAN",
      "frequencyMinutes": 8,
      "operatingHours": "05:00 - 23:15",
      "totalStopsCount": 24,
      "firstDeparture": "05:00",
      "lastDeparture": "23:15",
      "isRealtimeAvailable": true,
      "primaryColorHex": "#F59E0B",
      "stopsPreview": ["Micro 19", "Cinema Dacia", "Spitalul Județean", "Piața Centrală", "Gara CFR"]
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

### 8.2 Get Schedule Stop Details
```http
GET /api/v1/schedules/{scheduleId}
```
Returns the complete list of stops with GPS coordinates and scheduled timetable departure matrices.

### 8.3 Supported Cities
```http
GET /api/v1/schedules/cities
```
Returns supported cities and coverage flags.

---

## 9. Station Search & Live Station Boards

Base path: `/api/v1/stations`

### 9.1 Autocomplete Station Search
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

### 9.2 Live Station Departure / Arrival Board
```http
GET /api/v1/stations/{stationCode}/board?type=DEPARTURES&windowHours=2
```
Returns live arrivals or departures for station monitors with real-time delay minutes and track/platform numbers.

---

## 10. Trip Bookings & Wallet Checkout

Base path: `/api/v1/bookings`

Powers the `/my-trip` itinerary page, ticket reservation, and wallet synchronization.

### 10.1 Create Booking / Reserve Itinerary
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

### 10.2 List Traveler Bookings
```http
GET /api/v1/bookings?page=1&pageSize=10
```
**Auth:** Bearer Token. Returns paginated list of active and archived traveler bookings.

### 10.3 Cancel Booking
```http
DELETE /api/v1/bookings/{bookingId}
```
**Auth:** Bearer Token. Idempotently cancels booking and triggers refund according to operator policies.

---

## 11. Real-Time Transit Disruptions

Base path: `/api/v1/disruptions`

### 11.1 Fetch Active Network Disruptions
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

---

## 12. Backend Implementation Status Matrix

| Module | Route | HTTP Method | Status | Frontend Consumer |
|---|---|:---:|:---:|---|
| **Auth** | `/auth/signup` | `POST` | ✅ Implemented | `AuthContext.signup()` |
| **Auth** | `/auth/login` | `POST` | ✅ Implemented | `AuthContext.login()` |
| **Auth** | `/auth/guest` | `POST` | ✅ Implemented | `AuthContext.continueAsGuest()` |
| **Auth** | `/auth/guest/convert` | `POST` | ✅ Implemented | `AuthContext.convertGuest()` |
| **Auth** | `/auth/refresh` | `POST` | ✅ Implemented | `apiClient.refreshToken()` |
| **Auth** | `/auth/logout` | `POST` | ✅ Implemented | `AuthContext.logout()` |
| **Auth** | `/auth/forgot-password` | `POST` | ✅ Implemented | `apiClient.forgotPassword()` |
| **Auth** | `/auth/reset-password` | `POST` | ✅ Implemented | `apiClient.resetPassword()` |
| **MFA** | `/auth/mfa/setup` | `POST` | ✅ Implemented | `apiClient.setupMFA()` |
| **MFA** | `/auth/mfa/verify` | `POST` | ✅ Implemented | `AuthContext.verifyMFA()` |
| **MFA** | `/auth/mfa/challenge` | `POST` | ✅ Implemented | `apiClient.verifyMFAChallenge()` |
| **MFA** | `/auth/mfa/disable` | `POST` | ✅ Implemented | `apiClient.disableMFA()` |
| **Users** | `/users/me` | `GET` | ✅ Implemented | `AuthContext.refreshUser()` |
| **Users** | `/users/me` | `PATCH` | ✅ Implemented | Profile settings modal |
| **Users** | `/users/me/sessions` | `GET` | ✅ Implemented | Security settings |
| **Users** | `/users/me/sessions/{id}` | `DELETE` | ✅ Implemented | Security settings |
| **Routes** | `/routes/plan` | `POST` | ✅ Implemented | HomePage (`/`), TripsPage (`/trips`) |
| **Routes** | `/routes/corridors/popular` | `GET` | ✅ Implemented | HomePage Corridor Pills |
| **Routes** | `/routes/saved` | `POST` | ✅ Implemented | `apiClient.saveRoute()` |
| **Routes** | `/routes/saved` | `GET` | ✅ Implemented | `MyTripPage` (`/my-trip`) |
| **Routes** | `/routes/saved/{id}` | `DELETE` | ✅ Implemented | `MyTripPage` (`/my-trip`) |
| **Trains** | `/trains` | `GET` | ✅ Implemented | `TrainsPage` (`/trains`) |
| **Trains** | `/trains/{id}` | `GET` | ✅ Implemented | `TrainDetailModal` |
| **Trains** | `/trains/operators` | `GET` | ✅ Implemented | `TrainsPage` operator filter |
| **Schedules** | `/schedules` | `GET` | ✅ Implemented | `SchedulesPage` (`/schedules`) |
| **Schedules** | `/schedules/{id}` | `GET` | ✅ Implemented | Schedule detail modal |
| **Schedules** | `/schedules/cities` | `GET` | ✅ Implemented | Schedule city dropdown |
| **Stations** | `/stations/search` | `GET` | ✅ Implemented | Autocomplete in inputs |
| **Stations** | `/stations/{code}/board`| `GET` | ✅ Implemented | Live Station Departure view |
| **Bookings** | `/bookings` | `POST` | ✅ Implemented | `MyTripPage` checkout |
| **Bookings** | `/bookings` | `GET` | ✅ Implemented | User travel history |
| **Bookings** | `/bookings/{id}` | `DELETE` | ✅ Implemented | Booking cancellation |
| **Disruptions**| `/disruptions` | `GET` | ✅ Implemented | Transfer Shield live warnings |

---

### Verification Checklist & Sign-off

- [x] **Contract First:** All inputs, outputs, query parameters, and error shapes are explicitly typed.
- [x] **Unified Error Envelope:** Single error JSON structure across all HTTP failure codes.
- [x] **Idempotency Standard:** State-changing endpoints accept `Idempotency-Key` and enforce atomic claim + fingerprinting.
- [x] **Pagination Standard:** Enforces standard `page`, `pageSize`, `totalItems`, `totalPages`.
- [x] **Zero Breaking Changes:** Extends existing FastAPI endpoints without breaking existing implementations.
- [x] **Security:** Password hashing (bcrypt), token rotation, TOTP MFA, and scoped session invalidation.
