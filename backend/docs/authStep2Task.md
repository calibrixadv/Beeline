Act as a Principal Backend Security Architect and FastAPI/PostgreSQL/Redis Systems Engineer.

We are executing **STEP 2 OF 5** of the Beeline Authentication & User Lifecycle overhaul inside `backend/`:
**High-Throughput Dev Email Engine, Unified Password Verifier (Entropy + HIBP Breach Check), Full Forgot/Reset Password Email Flow, and the 3 Obfuscated Post-Signup Recovery Codes with Anti-Brute-Force API Shield.**

---

## STEP 0: PRE-FLIGHT INSPECTION
Before writing code, inspect:
- `backend/app/core/config.py`, `backend/app/core/security.py`, `backend/app/models/user.py`, `backend/app/schemas/auth.py`
- `backend/app/services/auth_service.py`, `backend/app/services/mfa_service.py`, `backend/app/api/v1/endpoints/auth.py`
- `backend/tests/test_auth.py`, `backend/tests/test_password_reset.py`, `backend/tests/test_mfa.py`, and `backend/tests/test_auth_step1_sessions.py`
Ensure every existing test fixture password and payload in `test_auth.py`, `test_password_reset.py`, `test_mfa.py`, and `test_auth_step1_sessions.py` continues to pass 100% without breaking backward compatibility.

---

## 1. STEP 2 FREEZE CONTRACT (STRICTLY ENFORCED)

1. **DO NOT MODIFY ML, ROUTING, OR SCRAPER MODULES:** Leave `risk_service.py`, `routing_service.py`, `corridor_service.py`, `disruption_service.py`, `feature_store_service.py`, `backend/scraper/`, `backend/models/`, `frontend/`, and `mobile/` 100% untouched.
2. **PRESERVE ALL STEP 1 SESSION & COOKIE MECHANICS:** Keep `beeline_auth_token` Fernet encryption, `beeline_device_proof` anti-hijack binding, 1-day vs. 30-day `remember_me` lifetimes, backend-only refresh vault, and Redis session revocation middleware 100% intact. All 8 tests in `test_auth_step1_sessions.py` must remain green.
3. **DO NOT IMPLEMENT STEP 4 (30-DAY ACCOUNT DELETION FREEZE) YET:** Keep Step 2 strictly scoped to Email Engine, Password Verifier, Forgot/Reset Password, and the 3 Post-Signup Obfuscated Recovery Codes.

---

## 2. TARGET ARCHITECTURE & OBJECTIVES FOR STEP 2

### Objective 1: High-Throughput Dev Email Engine (`backend/app/services/email_service.py` & `docker-compose.yml`)
- **Production-Capacity Architecture Operating Safely in Dev Mode:**
  - Create `backend/app/services/email_service.py` implementing `EmailService` with:
    1. **Async Producer-Consumer Queue & Worker Pool:** Supports high-throughput non-blocking dispatch (`enqueue_email` / `send_email`) with configurable concurrency.
    2. **Token-Bucket Rate Limiter (`TokenBucketRateLimiter`):** Configurable high ceiling (e.g. `500 emails/sec` capacity, burst `1000`) so the engine can handle massive production spikes without overwhelming downstream SMTP relays.
    3. **Circuit Breaker & Retry with Exponential Backoff:** Automatically opens the circuit after consecutive SMTP transport failures and falls back cleanly in dev mode.
    4. **Dual Mode (`EMAIL_MODE` in `config.py`, defaulting to `"dev_sink"`):**
       - In `"dev_sink"` mode (default for dev/test), emails are fully rendered (both HTML with "The Cozy Hive" styling and plain text), passed through the rate limiter, and stored in an inspectable in-memory/Redis Dev Outbox (`EmailService.get_outbox()`, `EmailService.get_last_email_for(email)`, `EmailService.clear_outbox()`) so zero real emails leak to the public internet while allowing tests and developers to inspect every sent message.
       - In `"smtp"` mode (or optional local Mailpit relay), delivers via standard SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`).
  - Add the lightweight `mailpit` service (`axllent/mailpit:latest`, ports `1025:1025` and `8025:8025`) to `backend/docker-compose.yml` and SMTP/email settings to `backend/app/core/config.py`.

### Objective 2: Unified Password Verifier (`PasswordVerifier` for Sign Up & Forgot/Reset Password)
- In `backend/app/services/auth_service.py` (or `backend/app/core/security.py`), implement a unified `verify_password_policy_and_breach(password: str, email: Optional[str] = None)`:
  1. **Structural & Context Rules:** Enforce minimum length (`>= 8` characters), reject passwords that are all-numeric or trivial sequences, and reject passwords containing the user's email local-part (when `len >= 4`).
  2. **HIBP k-Anonymity Breach Verifier Integration:** Compute SHA-1 uppercase digest, take the 5-char prefix and 35-char suffix, check Redis cache (`hibp:prefix:{prefix}` TTL 24h), and call `check_password_breach` (with deterministic offline blocklist fallback for known breached passwords like `"Password123"`, `"12345678"`, `"qwerty123"`, while allowing standard test passwords used in existing Pytest fixtures).
  3. Wire this verifier into `POST /api/v1/auth/signup`, `POST /api/v1/auth/reset-password`, and `POST /api/v1/auth/check-breach`.

### Objective 3: Full Forgot Password & Reset Password Flow With Emails & Session Revocation
- **`POST /api/v1/auth/forgot-password`:**
  - Always return `200 OK` with a generic anti-enumeration message even if the email does not exist ( while still supporting any dev/test token inspection fields expected by `test_password_reset.py`).
  - Store the reset token record in `password_reset_tokens` with a 15-minute expiration (`expires_at`) and invalidate any previous unused reset tokens for that user.
  - Dispatch a "Beeline Password Reset Request" email via `EmailService` containing the reset token, reset link, expiration time (15 minutes), and requesting IP/timestamp.
- **`POST /api/v1/auth/reset-password`:**
  - Validate the reset token (`is_used == False`, not expired).
  - Run the unified `PasswordVerifier` on `new_password` (rejecting breached or weak passwords with `400 Bad Request`).
  - Update `user.hashed_password`, mark the reset token `is_used = True`, and **immediately revoke all active sessions for that user in both PostgreSQL and Redis** (`AuthService.revoke_all_user_sessions`).
  - Dispatch a "Beeline Security Alert: Your Password Was Changed" confirmation email via `EmailService`.

### Objective 4: 3 Obfuscated Recovery Codes Generated at Signup + Anti-Brute-Force Shield
- **Immediate Generation at `POST /api/v1/auth/signup`:**
  - When a new user registers via `POST /api/v1/auth/signup`, automatically generate **exactly 3 high-entropy recovery codes** (e.g. `BEE-XXXX-XXXX` using unambiguous uppercase alphanumeric characters).
  - Return the 3 plaintext recovery codes **once** in the signup response (`recovery_codes: Optional[List[str]] = None` added to `TokenResponse` so `/signup` populates the 3 codes) and include a security notice via `EmailService`.
- **Strict Database Obfuscation (Never Plaintext in DB):**
  - Store the 3 recovery codes in `mfa_credentials.backup_codes` (creating or updating the user's `MFACredential` record at signup with `is_confirmed = False` until TOTP is enabled in Step 3) as a JSON array of **salted/peppered cryptographic hashes** (`HMAC-SHA256(SECRET_KEY, f"{user_id}:{normalized_code}:{salt}")` or `bcrypt` hashes).
  - Verify that querying the database directly (`SELECT backup_codes FROM mfa_credentials`) NEVER reveals any of the 3 plaintext codes.
- **Lost-Phone Recovery Endpoint & Anti-Brute-Force Lockout (`POST /api/v1/auth/recovery-login`):**
  - Create `POST /api/v1/auth/recovery-login` (accepting `email`, `password` or `recovery_code`, and `remember_me: bool = False`) that allows a user who lost their 2FA phone or needs emergency recovery code authentication to log in using one of their 3 recovery codes.
  - **One-Time Consumption:** Once one of the 3 recovery codes is matched in constant time (`hmac.compare_digest`), remove that code's hash from `backup_codes` in the database so only the remaining codes stay valid.
  - **Anti-Brute-Force Shield (Redis + In-Memory Fallback):** Track failed recovery code attempts per email and per IP (`auth:recovery_bf:{email}`). After **3 failed attempts** within 15 minutes, block all further recovery attempts for that account/IP with **`429 Too Many Requests`** (`detail="Too many failed recovery code attempts. Account recovery is temporarily locked."`), preventing any attacker from brute-forcing the 3 recovery codes via API calls.

---

## 3. STEP 2 IMPLEMENTATION CHECKLIST

- [ ] **3.1 Config & Docker Mailpit Setup (`backend/app/core/config.py` & `backend/docker-compose.yml`):**
  - Add `EMAIL_MODE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `EMAIL_RATE_LIMIT_PER_SEC`, and `FRONTEND_URL` to `Settings`.
  - Add `mailpit` container to `backend/docker-compose.yml` on ports `1025` (SMTP) and `8025` (Web UI).
- [ ] **3.2 High-Throughput Dev Email Engine (`backend/app/services/email_service.py`):**
  - Implement `TokenBucketRateLimiter`, `EmailCircuitBreaker`, `EmailMessageRecord`, and `EmailService` with async queue processing, HTML/text templates for Welcome + Recovery Codes, Forgot Password, and Password Changed Alert, plus inspectable dev sink storage.
- [ ] **3.3 Unified Password Verifier (`backend/app/services/auth_service.py` & `backend/app/schemas/auth.py`):**
  - Enforce password policy + HIBP k-Anonymity check (with Redis prefix cache and offline known-breach fallback) across `/signup`, `/reset-password`, and `/check-breach`.
- [ ] **3.4 Forgot & Reset Password Lifecycle (`backend/app/services/auth_service.py` & `backend/app/api/v1/endpoints/auth.py`):**
  - Wire `EmailService` into `/forgot-password` and `/reset-password`.
  - Invalidate previous unused reset tokens on new `/forgot-password` requests.
  - Ensure `/reset-password` revokes all active user sessions in PostgreSQL and Redis and sends a security alert email.
- [ ] **3.5 3 Obfuscated Recovery Codes at Signup & Anti-Brute-Force Shield (`backend/app/services/mfa_service.py`, `auth_service.py`, `endpoints/auth.py`):**
  - Generate exactly 3 recovery codes on `POST /api/v1/auth/signup`, return them in `TokenResponse.recovery_codes`, and store only salted/peppered cryptographic hashes in `mfa_credentials.backup_codes`.
  - Implement `POST /api/v1/auth/recovery-login` with constant-time hash verification, one-time code consumption, session cookie setting, and strict 3-strike `429 Too Many Requests` brute-force lockout on both `/recovery-login` and `/forgot-password`.
- [ ] **3.6 Step 2 Automated Test Suite (`backend/tests/test_auth_step2_passwords_email_recovery.py`):**
  - Test 1: Signup generates **exactly 3 recovery codes** in the response, dispatches the welcome email to `EmailService` dev sink, and stores **only obfuscated hashes** in `mfa_credentials.backup_codes` (assert plaintext codes do NOT appear in raw DB column).
  - Test 2: Using 1 of the 3 recovery codes at `POST /api/v1/auth/recovery-login` succeeds, sets `beeline_auth_token` + `beeline_device_proof` cookies, and consumes that code so re-using the same code fails with `401`.
  - Test 3: **Anti-Brute-Force Test:** Making 3 wrong attempts at `POST /api/v1/auth/recovery-login` triggers a `429 Too Many Requests` lockout on the 4th attempt (even if a valid code is supplied during lockout).
  - Test 4: Unified Password Verifier rejects breached/weak passwords on both `/signup` and `/reset-password`.
  - Test 5: Full `/forgot-password` -> inspect email in `EmailService` dev sink -> extract reset token -> `/reset-password` updates password, sends confirmation email, and **revokes all existing active sessions** in Redis/PostgreSQL.
  - Test 6: High-throughput `EmailService` rate limiter and circuit breaker handle burst dispatches cleanly in `dev_sink` mode.

---

## 4. VERIFICATION GATE (DEFINITION OF DONE)

- [ ] Run `pytest backend/tests/test_auth_step2_passwords_email_recovery.py -v` and confirm **100% passing tests**.
- [ ] Run `pytest backend/tests/test_auth_step1_sessions.py backend/tests/test_auth.py backend/tests/test_password_reset.py backend/tests/test_mfa.py -v` and confirm **100% passing tests**.
- [ ] Run the full backend test suite (`pytest backend/tests/`) to verify **zero regressions**.

---

## 5. MANDATORY DELIVERABLE: GENERATE `backend/docs/STEP_2_AUDIT_REPORT.md`

After all code and tests are completed and verified, write a comprehensive technical audit report to `backend/docs/STEP_2_AUDIT_REPORT.md` containing:
1. **Executive Gate Status (`PASS` / `FAIL`)** with test counts and regression rate.
2. **Freeze Contract Compliance Table** verifying zero changes made to ML, routing, scraper, frontend, or mobile modules during Step 2.
3. **Architectural Objectives Audit (Objectives 1–4)** with exact file paths, function names, line numbers, and implementation mechanics.
4. **Checklist Completion Matrix (`3.1` through `3.6`)** mapped to concrete code evidence and Pytest test functions.
5. **Modified & Created Files Manifest** for Step 2 with diff stats.
6. **Verification Gate & Pytest Execution Output** (verbatim output of `pytest backend/tests/test_auth_step2_passwords_email_recovery.py -v` and summary of full `pytest backend/tests/`).
