Act as a Principal Backend Security Architect and FastAPI/PostgreSQL/Redis Systems Engineer.

We are executing **STEP 1 OF 5** of the Beeline Authentication & User Lifecycle overhaul inside `backend/`:
**Encrypted Session Cookie (`beeline_auth_token`), Backend-Only Refresh Token Vault (1 Day vs. 30 Days `remember_me`), Anti-Hijack Device-Context Binding, and Redis Session Activity/Revocation Middleware.**

---

## 1. STEP 1 FREEZE CONTRACT (STRICTLY ENFORCED)

1. **DO NOT MODIFY ML, ROUTING, OR SCRAPER MODULES:** Leave `risk_service.py`, `routing_service.py`, `corridor_service.py`, `disruption_service.py`, `feature_store.py`, `backend/scraper/`, `backend/models/`, `frontend/`, and `mobile/` 100% untouched.
2. **DO NOT IMPLEMENT STEP 2, 3, OR 4 FEATURES YET:** Do not modify email templates, TOTP QR generation, or the 30-day account deletion freeze in Step 1. Keep existing endpoints for `/forgot-password`, `/reset-password`, and `/mfa/*` working without breaking existing tests.
3. **BACKWARD COMPATIBILITY FOR EXISTING PYTEST SUITE:**
   - The system must support our new **Encrypted HttpOnly Cookie (`beeline_auth_token`)** for browsers AND continue accepting `Authorization: Bearer <token>` headers so existing automated test suites (`backend/tests/`) and CLI clients continue to function seamlessly.

---

## 2. TARGET ARCHITECTURE & OBJECTIVES FOR STEP 1

### Objective 1: Token Lifetimes (1 Day Standard vs. 30 Days `remember_me`)
- Add `remember_me: bool = False` to `LoginRequest` in `backend/app/schemas/auth.py`.
- **If `remember_me == False`:** The device session lifetime is **1 Day (24 hours)**.
- **If `remember_me == True`:** The device session lifetime is **30 Days (720 hours)**.
- **Short-Lived Auth Token Window:** The client-facing `beeline_auth_token` embeds an internal rotation timestamp (`rot_exp` = 15 minutes), while the **Refresh Token** lives for the full 1-day or 30-day session duration exclusively inside the backend.

### Objective 2: Backend-Only Refresh Token Vault (Never Shared With Browser)
- When a user logs in (`/api/v1/auth/login`), signs up (`/api/v1/auth/signup`), or converts a guest account (`/api/v1/auth/guest/convert`):
  1. Generate a high-entropy internal `refresh_secret` (`secrets.token_urlsafe(48)`).
  2. Store **only its SHA-256 hash** (`refresh_token_hash`) inside PostgreSQL `user_sessions` (and cache session metadata in Redis `session:vault:{session_id}` with TTL = 1 day or 30 days).
  3. **NEVER expose the raw backend refresh secret in browser cookies.** (For legacy API/test callers that explicitly inspect `refresh_token` in JSON or call `POST /api/v1/auth/refresh`, return a signed session-reference token bound to the server-side vault so existing tests pass while keeping the actual refresh secret strictly inside the backend).

### Objective 3: Encrypted `beeline_auth_token` Cookie + Anti-Hijack Device Binding
- **Symmetric Encryption (`Fernet` AES-128-CBC + HMAC-SHA256):**
  - In `backend/app/core/security.py`, derive a deterministic 32-byte URL-safe base64 Fernet key from `settings.SECRET_KEY` using `hashlib.sha256`.
  - Encrypt the session payload (`sub` user_id, `sid` session_id, `dfp` device_fingerprint_hmac, `iat`, `rot_exp`, `exp`) using `Fernet.encrypt(...)` so that inspecting `beeline_auth_token` in browser DevTools reveals only an opaque encrypted token that cannot be decoded on `jwt.io`.
- **Anti-Hijack Device-Context Binding:**
  - Compute `device_fingerprint_hmac = HMAC-SHA256(SECRET_KEY, f"{normalized_user_agent}|{sec_ch_ua}|{accept_language}")` and issue a secondary `HttpOnly` binding cookie `beeline_device_proof` (`HMAC-SHA256(SECRET_KEY, f"{session_id}|{device_fingerprint_hmac}")`).
  - Store `device_fingerprint`, `ip_address`, `user_agent`, `device_name`, `remember_me`, and `last_active_at` in `user_sessions`.
  - **Hijack Verification:** When a request arrives via `beeline_auth_token` cookie, verify that the request's `device_fingerprint_hmac` and `beeline_device_proof` match the session's bound fingerprint. If an attacker copies `beeline_auth_token` from Inspect Element into another browser/machine with a mismatched fingerprint or missing `beeline_device_proof`, **reject with `401 Unauthorized` and immediately revoke `session_id` in Redis + PostgreSQL!**
- **Transparent Server-Side Auto-Refresh:**
  - If `beeline_auth_token` has passed its 15-minute `rot_exp` window, the backend middleware automatically checks the Backend-Only Refresh Vault in `user_sessions` / Redis. If the 1-day or 30-day session is still valid and not revoked, the middleware transparently re-encrypts a fresh `beeline_auth_token` and attaches it via `Set-Cookie` on the response.

### Objective 4: Session Activity & Instant Revocation Middleware
- **Redis Instant Revocation Check (`< 0.5ms`):**
  - Whenever a session is revoked (`POST /api/v1/auth/logout`, `DELETE /api/v1/users/me/sessions/{session_id}`, or `DELETE /api/v1/users/me/sessions`), write `session:revoked:{session_id} = 1` in Redis (with graceful fallback to SQL if Redis is offline) and mark `is_revoked = TRUE` in PostgreSQL `user_sessions`.
- **Throttled Activity Tracking:**
  - Update `last_active_at` and `ip_address` in `user_sessions` at most once every 5 minutes per `session_id` (throttled via Redis key `session:active_touch:{session_id}` with 300s TTL) so `GET /api/v1/users/me/sessions` always shows accurate live device activity without write-amplifying PostgreSQL.

---

## 3. STEP 1 IMPLEMENTATION CHECKLIST

- [ ] **3.1 Schema & Database Migration (`backend/schema.sql` & `backend/app/core/database.py`):**
  - Ensure `user_sessions` has columns for `device_fingerprint VARCHAR(128)`, `remember_me BOOLEAN NOT NULL DEFAULT FALSE`, `last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`, `ip_address`, `user_agent`, `device_name`, `expires_at`, and `is_revoked`.
  - Add safe startup migration (`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ...`) in `database.py` so running containers upgrade cleanly without dropping data.
- [ ] **3.2 Encrypted Token & Device Binding Engine (`backend/app/core/security.py`):**
  - Implement `encrypt_auth_token(...)` and `decrypt_auth_token(...)` using `cryptography.fernet.Fernet` (with fallback support for standard JWT decoding so existing unit tests using Bearer JWTs remain 100% compatible).
  - Implement `compute_device_fingerprint(request: Request)` and `compute_device_proof(session_id: str, fingerprint: str)`.
- [ ] **3.3 Auth Service & Endpoints (`backend/app/services/auth_service.py` & `backend/app/api/v1/endpoints/auth.py`):**
  - Update `/login`, `/signup`, `/guest`, `/guest/convert`, `/refresh`, and `/logout` to:
    * Honor `remember_me` (`1 day` default vs. `30 days` when `remember_me=True`).
    * Create the backend-only refresh record in `user_sessions` + Redis vault.
    * Set `beeline_auth_token` and `beeline_device_proof` as `HttpOnly`, `SameSite=Lax`, `Path=/` cookies (and clear them on `/logout`).
- [ ] **3.4 Dual-Transport Dependency & Transparent Rotation Middleware (`backend/app/api/deps.py` & `backend/app/main.py`):**
  - Update `get_current_user` / `get_current_session` in `deps.py` to extract credentials from either `beeline_auth_token` cookie or `Authorization: Bearer` header.
  - Enforce anti-hijack device fingerprint verification and Redis revocation lookup on every authenticated request.
  - Add middleware in `main.py` that transparently attaches a rotated `beeline_auth_token` cookie when the 15-minute internal rotation window elapses while the 1-day/30-day backend refresh vault is still valid.
- [ ] **3.5 Session Management Endpoints (`backend/app/api/v1/endpoints/users.py`):**
  - Ensure `GET /api/v1/users/me/sessions` returns active sessions with `session_id`, `device_name`, `ip_address`, `user_agent`, `remember_me`, `created_at`, `last_active_at`, `expires_at`, and `is_current: bool`.
  - Ensure `DELETE /api/v1/users/me/sessions/{session_id}` and `DELETE /api/v1/users/me/sessions` immediately revoke the target session(s) in both PostgreSQL and Redis.
- [ ] **3.6 Step 1 Automated Tests (`backend/tests/test_auth_step1_sessions.py`):**
  - Test 1: Login with `remember_me=False` creates a 1-day (24h) session and sets encrypted `HttpOnly` cookies (`beeline_auth_token`, `beeline_device_proof`).
  - Test 2: Login with `remember_me=True` creates a 30-day session.
  - Test 3: Verify `beeline_auth_token` cookie value is Fernet-encrypted (not plaintext/base64-readable JSON).
  - Test 4: **Anti-Hijack Test:** Attempting to use a stolen `beeline_auth_token` cookie with a different `User-Agent` or missing `beeline_device_proof` returns `401 Unauthorized` and revokes the session in the backend.
  - Test 5: Transparent token rotation when `rot_exp` passes using the backend-only refresh vault.
  - Test 6: Listing active sessions (`GET /users/me/sessions`) and revoking a specific session or all other sessions (`DELETE /users/me/sessions`).

---

## 4. VERIFICATION GATE (DEFINITION OF DONE)

- [ ] Run `pytest backend/tests/test_auth_step1_sessions.py -v` (or inside Docker if applicable) and confirm **100% passing tests**.
- [ ] Run the full existing backend test suite (`pytest backend/tests/`) to verify **zero regressions**.

---

## 5. MANDATORY DELIVERABLE: GENERATE `backend/docs/STEP_1_AUDIT_REPORT.md`

After all code and tests are completed and verified, you **MUST** write a comprehensive, structured technical audit report to `backend/docs/STEP_1_AUDIT_REPORT.md` containing the following exact sections:

1. **Executive Gate Status (`PASS` / `FAIL`):** Summary of completion, timestamp, and test pass counts.
2. **Freeze Contract Compliance Table:**
   - Include the exact output of `git status --short` and `git diff --name-only`.
   - Explicitly verify that each frozen module (`risk_service.py`, `routing_service.py`, `corridor_service.py`, `disruption_service.py`, `feature_store.py`, `backend/scraper/`, `backend/models/`, `frontend/`, `mobile/`) has **0 modifications**.
3. **Architectural Objectives Audit (Objectives 1–4):**
   - For each objective, state `STATUS: ACHIEVED`, the exact file path(s), function/class names, line ranges, and a brief explanation of the implementation mechanics.
4. **Checklist Completion Matrix (`3.1` through `3.6`):**
   - Markdown table mapping every checklist item (`3.1` to `3.6`) to `[x] COMPLETED`, concrete code evidence, and the specific Pytest test function(s) that verify it.
5. **Modified & Created Files Manifest:**
   - Complete table of every file created or modified in Step 1, including line diff stats (`+added / -removed`) and a summary of changes per file.
6. **Verification Gate & Pytest Execution Output:**
   - Paste the exact verbatim output of `pytest backend/tests/test_auth_step1_sessions.py -v` and the summary line of the full `pytest backend/tests/` run.
