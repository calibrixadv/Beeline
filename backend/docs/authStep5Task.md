Act as a Principal Backend Security Architect and FastAPI/PostgreSQL/Redis Systems Engineer.

We are executing **STEP 5 OF 5 (FINAL CONSOLIDATION & PRODUCTION HARDENING)** of the Beeline Authentication & User Lifecycle overhaul inside `backend/`:
**Global Auth Rate-Limit & Brute-Force Middleware, Full End-to-End User Lifecycle Integration Test (Steps 1–4 Unified), and Final API Documentation Sync (`backend/api.md` & `api.md`).**

---

## STEP 0: PRE-FLIGHT INSPECTION
Before writing code, inspect:
- `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/api/v1/endpoints/auth.py`, `backend/app/api/v1/endpoints/users.py`
- `backend/api.md` and root `api.md` (if present)
- `backend/tests/test_auth_step1_sessions.py`, `test_auth_step2_passwords_email_recovery.py`, `test_auth_step3_mfa_totp.py`, and `test_auth_step4_profile_preferences_deletion.py`

---

## 1. STEP 5 FREEZE CONTRACT (STRICTLY ENFORCED)

1. **DO NOT MODIFY ML, ROUTING, OR SCRAPER MODULES:** Leave `risk_service.py`, `routing_service.py`, `corridor_service.py`, `disruption_service.py`, `feature_store_service.py`, `backend/scraper/`, `backend/models/`, `frontend/`, and `mobile/` 100% untouched.
2. **PRESERVE 100% OF STEPS 1–4 BEHAVIOR:** Do not alter any cookie names (`beeline_auth_token`, `beeline_device_proof`), token TTLs (1 day vs. 30 days `remember_me`), recovery code mechanics, TOTP 2FA endpoints, or 30-day account freeze semantics. All existing 224 passing backend tests MUST remain green.

---

## 2. TARGET ARCHITECTURE & OBJECTIVES FOR STEP 5

### Objective 1: Global Auth Endpoint Rate-Limiter Middleware (`backend/app/main.py` & `backend/app/core/config.py`)
- Add configurable settings in `backend/app/core/config.py`:
  - `AUTH_RATE_LIMIT_ENABLED: bool = True`
  - `AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 60`
  - `AUTH_RATE_LIMIT_MAX_REQUESTS: int = 30` (generous per-IP burst ceiling for legitimate traffic and test suites, while blocking automated credential-stuffing floods; also allow explicit `X-Test-Rate-Limit-Bypass` or configurable threshold so legitimate multi-test runs never hit false positives while dedicated rate-limit tests can verify `429 Too Many Requests` + `Retry-After` header).
- Implement `auth_rate_limit_middleware` in `backend/app/main.py` covering `/api/v1/auth/*` mutation endpoints (`POST`), backed by Redis sliding-window counters (`ratelimit:auth:{client_ip}:{path}`) with graceful in-memory fallback when Redis is unavailable.

### Objective 2: Unified End-to-End Lifecycle Integration Test (`backend/tests/test_auth_step5_e2e_lifecycle.py`)
- Create a comprehensive end-to-end test file `backend/tests/test_auth_step5_e2e_lifecycle.py` verifying:
  1. **Test 1 — Complete User Lifecycle Journey (Steps 1 $\rightarrow$ 2 $\rightarrow$ 3 $\rightarrow$ 4):**
     - `POST /api/v1/auth/signup` $\rightarrow$ verifies encrypted `beeline_auth_token` + `beeline_device_proof` cookies, 1-day session, and **3 obfuscated recovery codes** (`BEE-XXXX-XXXX`).
     - `PATCH /api/v1/users/me` & `PATCH /api/v1/users/me/preferences` $\rightarrow$ updates profile and travel preferences (`default_pillar="safe"`, `home_station_code="GLT"`).
     - `POST /api/v1/auth/mfa/setup` & `/mfa/verify` $\rightarrow$ enables RFC 6238 2FA (verifying `otpauth_uri`, `apple_passwords_uri`, `qr_code_svg`, and Fernet-encrypted DB secret).
     - `POST /api/v1/auth/logout` $\rightarrow$ confirms instant Redis session revocation.
     - 2-Step Login with `remember_me=True` (`/login` $\rightarrow$ `mfa_required=True` $\rightarrow$ `/mfa/challenge` with TOTP code) $\rightarrow$ verifies **30-day session** and encrypted cookies.
     - **Anti-Hijack Defense:** Replaying the stolen `beeline_auth_token` cookie from a different `User-Agent` / missing `beeline_device_proof` returns `401 Unauthorized` and immediately revokes the session.
     - **Lost-Phone Recovery Login:** Authenticating via `POST /api/v1/auth/recovery-login` using 1 of the 3 obfuscated signup codes succeeds and decrements remaining recovery codes to 2.
     - **30-Day Account Deletion Freeze & Unfreeze:** Calling `DELETE /api/v1/users/me` freezes the account (`FROZEN_PENDING_DELETION`, +30 days, sends 30-day email); attempting `/login` triggers `403 ACCOUNT_FROZEN_UNFREEZE_EMAIL_SENT` and sends the unfreeze link; calling `POST /api/v1/auth/unfreeze` restores `ACTIVE` status and logs the user back in.
     - **Final Sweep to Hard Delete:** Re-freezing the account and advancing simulated time to Day 15 (sends 15-day reminder email) and Day 30 / 0 days remaining (sends 0-day final email and executes cascade hard delete of user and related records).
  2. **Test 2 — Global Auth Rate-Limit Middleware Enforcement:**
     - Verifies that exceeding the configured sliding-window threshold on `/api/v1/auth/login` triggers `429 Too Many Requests` with a valid `Retry-After` header.

### Objective 3: API Documentation Synchronization (`backend/api.md` & `api.md`)
- Update `backend/api.md` (and root `api.md` if it exists) with a complete, accurate reference section covering:
  - Encrypted `HttpOnly` Cookie Architecture (`beeline_auth_token`, `beeline_device_proof`, Anti-Hijack Device Binding, Backend-Only Refresh Vault, 1-day vs. 30-day `remember_me`).
  - All `/api/v1/auth/*` endpoints (`/signup`, `/login`, `/refresh`, `/logout`, `/check-breach`, `/forgot-password`, `/reset-password`, `/recovery-login`, `/unfreeze`, `/mfa/setup`, `/mfa/verify`, `/mfa/challenge`, `/mfa/status`, `/mfa/disable`).
  - All `/api/v1/users/*` endpoints (`GET/PATCH /me`, `POST /me/password`, `GET/PATCH /me/preferences`, `GET/DELETE /me/sessions`, `DELETE /me`).

---

## 3. STEP 5 IMPLEMENTATION CHECKLIST

- [ ] **3.1 Global Auth Rate-Limit Middleware (`backend/app/core/config.py`, `backend/app/main.py`):**
  - Implement sliding-window rate limiter on `/api/v1/auth/*` POST routes with Redis + in-memory fallback and `Retry-After` header.
- [ ] **3.2 Unified End-to-End Lifecycle & Rate-Limit Tests (`backend/tests/test_auth_step5_e2e_lifecycle.py`):**
  - Implement and pass both comprehensive tests (`test_complete_user_security_and_deletion_lifecycle` and `test_global_auth_rate_limit_middleware`).
- [ ] **3.3 API Documentation Sync (`backend/api.md` & `api.md`):**
  - Document all authentication, 2FA, recovery, profile, preferences, and 30-day deletion lifecycle endpoints and security headers/cookies.

---

## 4. FINAL VERIFICATION GATE (DEFINITION OF DONE)

- [ ] Run `pytest backend/tests/test_auth_step5_e2e_lifecycle.py -v` and confirm **100% passing tests**.
- [ ] Run the entire backend Pytest suite (`pytest backend/tests/`) and confirm **100% pass rate with 0 regressions**.

---

## 5. MANDATORY DELIVERABLE: GENERATE `backend/docs/STEP_5_FINAL_AUDIT_REPORT.md`

After all code, docs, and tests are verified, write the final audit report to `backend/docs/STEP_5_FINAL_AUDIT_REPORT.md` containing:
1. **Final Executive Gate Status (`PASS` / `FAIL`)** across all 5 steps.
2. **Freeze Contract Compliance Verification** (confirming ML, routing, scraper, frontend, and mobile modules remain 100% untouched).
3. **Summary of All 5 Completed Steps (Steps 1–5)** with endpoints, security mechanisms, and test coverage counts.
4. **Modified & Created Files Manifest** for Step 5.
5. **Verbatim Pytest Execution Output** for `test_auth_step5_e2e_lifecycle.py` and the full `pytest backend/tests/` suite.
