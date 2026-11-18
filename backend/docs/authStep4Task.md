Act as a Principal Backend Security Architect and FastAPI/PostgreSQL/Redis Systems Engineer.

We are executing **STEP 4 OF 5** of the Beeline Authentication & User Lifecycle overhaul inside `backend/`:
**User Profile Self-Service (`GET/PATCH /users/me`, `POST /users/me/password`), Structured Travel Preferences (`GET/PATCH /users/me/preferences`), and the 30-Day Account Deletion Freeze Lifecycle (30-Day Block on `DELETE /users/me`, Email Unfreeze Challenge on Login While Frozen, Scheduled Lifecycle Emails at 30 / 15 / 0 Days Remaining, and Final Cascade Hard Delete at Day 0).**

---

## STEP 0: PRE-FLIGHT INSPECTION
Before writing code, inspect:
- `backend/schema.sql`, `backend/app/core/database.py`, `backend/app/models/user.py`, `backend/app/schemas/user.py`
- `backend/app/api/v1/endpoints/users.py`, `backend/app/api/v1/endpoints/auth.py`
- `backend/app/services/auth_service.py`, `backend/app/services/email_service.py`, `backend/app/services/mfa_service.py`
- `backend/tests/test_user_profile.py`, `backend/tests/test_crud_entities.py`, `backend/tests/test_auth.py`, `backend/tests/test_auth_step1_sessions.py`, `backend/tests/test_auth_step2_passwords_email_recovery.py`, and `backend/tests/test_auth_step3_mfa_totp.py`
Ensure 100% backward compatibility with all existing tests (including `test_user_profile.py` and `test_crud_entities.py`).

---

## 1. STEP 4 FREEZE CONTRACT (STRICTLY ENFORCED)

1. **DO NOT MODIFY ML, ROUTING, OR SCRAPER MODULES:** Leave `risk_service.py`, `routing_service.py`, `corridor_service.py`, `disruption_service.py`, `feature_store_service.py`, `backend/scraper/`, `backend/models/`, `frontend/`, and `mobile/` 100% untouched.
2. **PRESERVE ALL STEP 1, STEP 2, AND STEP 3 MECHANICS:**
   - Keep `beeline_auth_token` Fernet encryption, `beeline_device_proof` anti-hijack binding, 1-day vs. 30-day `remember_me` lifetimes, backend-only refresh vault, Redis session revocation middleware, `EmailService`, `PasswordVerifier`, the 3 obfuscated recovery codes, and TOTP 2FA 100% intact.
   - All 32 auth/session/MFA/password-reset tests from Steps 1–3 + legacy suites MUST remain 100% green.

---

## 2. TARGET ARCHITECTURE & OBJECTIVES FOR STEP 4

### Objective 1: Schema & Safe Startup Migration for Profile, Preferences & 30-Day Freeze State
- Update `backend/schema.sql`, `backend/app/models/user.py`, and `backend/app/core/database.py` (with idempotent `ALTER TABLE users ADD COLUMN IF NOT EXISTS ...` startup migrations) to add:
  - `phone_number VARCHAR(32) NULL`
  - `avatar_url VARCHAR(512) NULL`
  - `preferences TEXT NOT NULL DEFAULT '{}'` (JSON-serialized validated preferences)
  - `account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'` (`'ACTIVE'` or `'FROZEN_PENDING_DELETION'`)
  - `frozen_at TIMESTAMP NULL`
  - `deletion_scheduled_at TIMESTAMP NULL`
  - `deletion_reminder_15d_sent BOOLEAN NOT NULL DEFAULT FALSE`

### Objective 2: User Profile Self-Service & In-Account Password Change (`backend/app/api/v1/endpoints/users.py`)
- **`GET /api/v1/users/me` & `PATCH /api/v1/users/me`:**
  - Allow authenticated users to update `full_name`, `username` (enforcing case-insensitive uniqueness, returning `409 Conflict` if taken), `email` (enforcing uniqueness, returning `409 Conflict` if taken), `phone_number`, and `avatar_url`.
  - Return full profile details including `id`, `email`, `username`, `full_name`, `phone_number`, `avatar_url`, `role`, `is_guest`, `is_active`, `mfa_enabled`, `account_status`, `preferences`, and `created_at`.
- **`POST /api/v1/users/me/password`:**
  - Accepts `current_password` and `new_password`.
  - Verifies `current_password` (`401 Unauthorized` if wrong).
  - Validates `new_password` using the unified `verify_password_policy_and_breach(new_password, user.email)` from Step 2 (`400 Bad Request` if weak or breached).
  - Updates `user.hashed_password`, **revokes all OTHER active sessions** of that user (preserving the current session so the user stays logged in on their current device), and sends the Password Changed security alert email via `EmailService`.

### Objective 3: Validated Travel & Notification Preferences (`GET/PATCH /api/v1/users/me/preferences`)
- Define `UserPreferencesSchema` in `backend/app/schemas/user.py` with domain-specific defaults and strict Pydantic validation:
  - `default_pillar: Literal["safe", "fast", "economy"] = "safe"`
  - `home_station_code: Optional[str] = "GLT"`
  - `min_transfer_buffer_minutes: int = Field(default=15, ge=5, le=120)`
  - `preferred_operators: List[str] = Field(default_factory=list)`
  - `email_security_alerts: bool = True`
  - `email_delay_alerts: bool = True`
  - `theme: Literal["cozy_hive", "high_contrast"] = "cozy_hive"`
- Implement `GET /api/v1/users/me/preferences` and `PATCH /api/v1/users/me/preferences` (supporting partial updates merged cleanly onto existing preferences).

### Objective 4: 30-Day Account Deletion Freeze Lifecycle (`DELETE /api/v1/users/me`, Login Unfreeze Email, `POST /api/v1/auth/unfreeze`, & 30/15/0-Day Scheduler)
- **Step 4A — Account Freeze on `DELETE /api/v1/users/me`:**
  - Accept optional/structured `DeleteAccountRequest` (`password: Optional[str] = None`, `mfa_code: Optional[str] = None`, `reason: Optional[str] = None`) — keep `password` optional in the schema ONLY if legacy `test_crud_entities.py` calls `DELETE /api/v1/users/me` without a JSON body; when a body/password IS provided (or when `mfa_enabled=True` with body), strictly verify `password` (and `mfa_code` if 2FA is active, rejecting wrong credentials with `401 Unauthorized`).
  - **Do NOT immediately hard-delete the user!** Instead:
    1. Set `user.account_status = "FROZEN_PENDING_DELETION"`, `user.is_active = False`, `user.frozen_at = utcnow()`, `user.deletion_scheduled_at = utcnow() + timedelta(days=30)`, and `user.deletion_reminder_15d_sent = False`.
    2. Immediately revoke all active sessions for the user in PostgreSQL and Redis (`AuthService.revoke_all_user_sessions`) and clear `beeline_auth_token` & `beeline_device_proof` cookies.
    3. Dispatch **Email #1 (30 Days Remaining Notice)** via `EmailService` informing the user that their account is frozen and scheduled for permanent deletion in **30 days**, and that logging back in before then will send an unfreeze confirmation link.
  - Return `200 OK` (or `204` / JSON confirmation depending on `Accept` header; check `test_crud_entities.py` first so both legacy tests and structured JSON callers succeed!) with `status="FROZEN_PENDING_DELETION"`, `days_remaining=30`, and `deletion_scheduled_at`.
- **Step 4B — Login Attempt While Account is Frozen (`POST /api/v1/auth/login`):**
  - When a user with `account_status == "FROZEN_PENDING_DELETION"` attempts `POST /api/v1/auth/login`:
    - First verify their password (`401 Unauthorized` if password is wrong).
    - If `utcnow() >= user.deletion_scheduled_at`, trigger immediate hard delete and return `404` / `401`.
    - Otherwise, **do NOT issue session cookies or auth tokens**! Instead:
      1. Generate a single-use cryptographic `unfreeze_token` (stored in `password_reset_tokens` or Redis/vault with prefix `unfreeze:` and 24-hour TTL).
      2. Dispatch **Unfreeze Account Confirmation Email** via `EmailService` containing the `unfreeze_token`, unfreeze link (`{FRONTEND_URL}/unfreeze?token={unfreeze_token}`), and remaining days before permanent deletion.
      3. Return **`403 Forbidden`** with structured detail: `{"code": "ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT", "message": "Your account is currently frozen for scheduled deletion. We have sent an unfreeze confirmation link to your email address.", "days_remaining": days_remaining}`.
- **Step 4C — Email Unfreeze Confirmation (`POST /api/v1/auth/unfreeze`):**
  - Implement `POST /api/v1/auth/unfreeze` accepting `{"token": "<unfreeze_token>", "remember_me": false}`.
  - Validate the single-use `unfreeze_token`, restore `user.account_status = "ACTIVE"`, `user.is_active = True`, `user.frozen_at = None`, `user.deletion_scheduled_at = None`, `user.deletion_reminder_15d_sent = False`, invalidate the unfreeze token, dispatch an **"Account Restored"** confirmation email via `EmailService`, create a fresh session, set encrypted `HttpOnly` cookies, and return `TokenResponse`.
- **Step 4D — Automated Lifecycle Sweep (15-Day Reminder Email & Day-0 Final Email + Hard Delete):**
  - Create `AccountLifecycleService.run_lifecycle_sweep(db: AsyncSession, now: Optional[datetime] = None)` (wired into a background asyncio loop in `main.py` lifespan AND directly callable with a simulated `now` timestamp for deterministic testing):
    1. **15-Day Reminder (`days_remaining <= 15` and `now < deletion_scheduled_at` and not `deletion_reminder_15d_sent`):**
       - Send **Email #2 (15 Days Remaining Warning)** via `EmailService` reminding the user they have 15 days left to log in and unfreeze their account, and set `user.deletion_reminder_15d_sent = True`.
    2. **Day-0 Expiration (`now >= deletion_scheduled_at`):**
       - Send **Email #3 (0 Days Remaining — Final Permanent Deletion Notice)** via `EmailService`.
       - Execute **Cascade Hard Delete** removing all user sessions (in Redis & PostgreSQL), MFA credentials, reset tokens, saved routes, bookings/tickets, and finally the `User` row from PostgreSQL!

---

## 3. STEP 4 IMPLEMENTATION CHECKLIST

- [ ] **3.1 Schema & Startup Migration (`backend/schema.sql`, `backend/app/models/user.py`, `backend/app/core/database.py`):**
  - Add `phone_number`, `avatar_url`, `preferences`, `account_status`, `frozen_at`, `deletion_scheduled_at`, and `deletion_reminder_15d_sent` columns to `users` and idempotent startup `ALTER TABLE` migrations.
- [ ] **3.2 Profile & Preferences Schemas & Endpoints (`backend/app/schemas/user.py`, `backend/app/api/v1/endpoints/users.py`):**
  - Implement `GET/PATCH /api/v1/users/me`, `POST /api/v1/users/me/password`, `GET/PATCH /api/v1/users/me/preferences`, and `DELETE /api/v1/users/me`.
- [ ] **3.3 Email Templates & Lifecycle Service (`backend/app/services/email_service.py`, `backend/app/services/account_lifecycle_service.py`):**
  - Add Cozy Hive HTML/text email templates for:
    1. Account Frozen — 30 Days Remaining Notice
    2. Account Unfreeze Verification Link (triggered on login attempt while frozen)
    3. Account Unfrozen / Restored Confirmation
    4. Account Deletion Reminder — 15 Days Remaining
    5. Account Permanently Deleted — 0 Days Final Notice
  - Implement `AccountLifecycleService` handling freeze, login unfreeze email trigger, token unfreeze restoration, 15-day reminder sweep, and Day-0 cascade hard delete.
- [ ] **3.4 Auth Integration & Background Lifespan Worker (`backend/app/api/v1/endpoints/auth.py`, `backend/app/api/deps.py`, `backend/app/main.py`):**
  - Block frozen accounts in `get_current_user` (`deps.py`) and in `/api/v1/auth/login` (triggering the unfreeze email and returning `403 ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT`).
  - Add `POST /api/v1/auth/unfreeze` endpoint.
  - Register periodic background sweep task in `backend/app/main.py` lifespan.
- [ ] **3.5 Step 4 Automated Test Suite (`backend/tests/test_auth_step4_profile_preferences_deletion.py`):**
  - Test 1: Profile self-service (`GET/PATCH /users/me` updating `full_name`, `username`, `phone_number`, duplicate username `409` guard) + `POST /users/me/password` (verifies current password, enforces `PasswordVerifier`, revokes other sessions while keeping current session active).
  - Test 2: Travel preferences (`GET/PATCH /users/me/preferences` validating `default_pillar`, `home_station_code`, `min_transfer_buffer_minutes`, and partial updates).
  - Test 3: `DELETE /api/v1/users/me` freezes the account (`account_status == "FROZEN_PENDING_DELETION"`, `deletion_scheduled_at == +30 days`), revokes all active sessions in Redis/PostgreSQL, and dispatches the **30-Day Deletion Notice** email.
  - Test 4: Logging in while frozen (`POST /auth/login`) rejects with `403` (`ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT`), sends the **Unfreeze Link Email**, and calling `POST /api/v1/auth/unfreeze` with that token restores `account_status == "ACTIVE"` and logs the user in with valid encrypted cookies.
  - Test 5: **30 -> 15 -> 0 Days Lifecycle Sweep:** Advancing simulated time to Day 15 (`+15 days`) sends the **15-Day Reminder Email** once (`deletion_reminder_15d_sent=True`); advancing to Day 30 (`+30 days`, 0 days remaining) sends the **0-Day Final Deletion Email** and executes **Cascade Hard Delete** so the `User` row and related data are permanently removed from the database.

---

## 4. VERIFICATION GATE (DEFINITION OF DONE)

- [ ] Run `pytest backend/tests/test_auth_step4_profile_preferences_deletion.py -v` and confirm **100% passing tests**.
- [ ] Run `pytest backend/tests/test_auth_step1_sessions.py backend/tests/test_auth_step2_passwords_email_recovery.py backend/tests/test_auth_step3_mfa_totp.py backend/tests/test_user_profile.py backend/tests/test_crud_entities.py backend/tests/test_auth.py -v` and confirm **100% passing tests**.
- [ ] Run the full backend test suite (`pytest backend/tests/`) to verify **zero regressions**.

---

## 5. MANDATORY DELIVERABLE: GENERATE `backend/docs/STEP_4_AUDIT_REPORT.md`

After all code and tests are completed and verified, write a comprehensive technical audit report to `backend/docs/STEP_4_AUDIT_REPORT.md` containing:
1. **Executive Gate Status (`PASS` / `FAIL`)** with test counts and regression rate.
2. **Freeze Contract Compliance Table** verifying zero changes made to ML, routing, scraper, frontend, or mobile modules during Step 4, and 100% preservation of Steps 1–3.
3. **Architectural Objectives Audit (Objectives 1–4)** with exact file paths, function names, line numbers, and implementation mechanics.
4. **Checklist Completion Matrix (`3.1` through `3.5`)** mapped to concrete code evidence and Pytest test functions.
5. **Modified & Created Files Manifest** for Step 4 with diff stats.
6. **Verification Gate & Pytest Execution Output** (verbatim output of `pytest backend/tests/test_auth_step4_profile_preferences_deletion.py -v`, combined suites, and summary of full `pytest backend/tests/`).
