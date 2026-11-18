Act as a Principal Backend Security Architect and FastAPI/PostgreSQL/Redis Systems Engineer.

We are executing **STEP 3 OF 5** of the Beeline Authentication & User Lifecycle overhaul inside `backend/`:
**Phone 2FA / TOTP Authenticator (`Proton Pass`, `Apple iPhone Passwords`, `Google/Microsoft Authenticator` — RFC 6238), Fernet Encryption at Rest for TOTP Secrets, Inline SVG QR Code & Deep-Link Provisioning, 2-Step Login Challenge with Anti-Brute-Force & Replay Shield, and Seamless Integration with the 3 Obfuscated Recovery Codes.**

---

## STEP 0: PRE-FLIGHT INSPECTION
Before modifying any files, inspect:
- `backend/app/services/mfa_service.py`, `backend/app/services/auth_service.py`, `backend/app/services/email_service.py`
- `backend/app/api/v1/endpoints/auth.py`, `backend/app/schemas/auth.py`, `backend/app/models/user.py`, `backend/app/core/security.py`
- `backend/tests/test_mfa.py`, `backend/tests/test_auth.py`, `backend/tests/test_auth_step1_sessions.py`, and `backend/tests/test_auth_step2_passwords_email_recovery.py`
Ensure 100% backward compatibility with all 26 existing auth/session/MFA/password-reset tests.

---

## 1. STEP 3 FREEZE CONTRACT (STRICTLY ENFORCED)

1. **DO NOT MODIFY ML, ROUTING, OR SCRAPER MODULES:** Leave `risk_service.py`, `routing_service.py`, `corridor_service.py`, `disruption_service.py`, `feature_store_service.py`, `backend/scraper/`, `backend/models/`, `frontend/`, and `mobile/` 100% untouched.
2. **PRESERVE ALL STEP 1 & STEP 2 MECHANICS:**
   - Keep `beeline_auth_token` Fernet encryption, `beeline_device_proof` anti-hijack binding, 1-day vs. 30-day `remember_me` lifetimes, backend-only refresh vault, Redis session revocation middleware, `EmailService`, `PasswordVerifier`, and the 3 obfuscated post-signup recovery codes 100% intact.
   - All 8 tests in `test_auth_step1_sessions.py`, all 6 tests in `test_auth_step2_passwords_email_recovery.py`, and all legacy tests in `test_auth.py`, `test_password_reset.py`, and `test_mfa.py` MUST continue to pass.
3. **DO NOT IMPLEMENT STEP 4 (USER PREFERENCES & 30-DAY ACCOUNT DELETION FREEZE) YET:** Keep Step 3 strictly scoped to 2FA / TOTP Authenticator & Recovery Code integration.

---

## 2. TARGET ARCHITECTURE & OBJECTIVES FOR STEP 3

### Objective 1: Fernet Encryption at Rest for TOTP Secrets (`backend/app/services/mfa_service.py` & `security.py`)
- **Never Store Raw Base32 TOTP Secrets in Plaintext for New Setups:**
  - Implement `encrypt_totp_secret(raw_secret: str) -> str` and `decrypt_totp_secret(stored_secret: str) -> str` using `get_fernet()` in `backend/app/core/security.py` (or `mfa_service.py`).
  - `decrypt_totp_secret` must transparently decrypt Fernet ciphertext (`gAAAAA...`) AND gracefully return legacy plaintext Base32 secrets if a seeded user from `seed.sql` is loaded, ensuring zero breakage on seeded data.
  - Ensure `mfa_credentials.secret_key` column in `schema.sql` and `models/user.py` can store the Fernet-encrypted string (`VARCHAR(255)` or `TEXT`).

### Objective 2: Multi-Authenticator Provisioning (`Proton Pass`, `iPhone Passwords`, & Basic Authenticators) + SVG QR Code (`POST /api/v1/auth/mfa/setup`)
- When an authenticated non-guest user calls `POST /api/v1/auth/mfa/setup`:
  1. Generate a 160-bit (32-character Base32) RFC 6238 secret and store it **Fernet-encrypted** in `mfa_credentials.secret_key` with `is_confirmed = False`.
  2. **Preserve Existing Obfuscated Recovery Codes:** If the user already has obfuscated recovery code hashes in `mfa_credentials.backup_codes` / `backup_codes_hash` from signup, preserve them! Only generate 3 new obfuscated recovery codes if the user had none (or return the 3 fresh backup codes as required by `MFASetupResponse` while storing only their salted HMAC-SHA256 hashes in the DB).
  3. **Standardized RFC 6238 URI & Deep Links (`MFASetupResponse`):**
     - `secret`: The Base32 secret for manual entry in any basic authenticator app.
     - `qr_uri` (and alias/field `otpauth_uri`): `otpauth://totp/Beeline:{url_encoded_email}?secret={secret}&issuer=Beeline&algorithm=SHA1&digits=6&period=30` (100% compatible with **Proton Pass**, **Google Authenticator**, **Microsoft Authenticator**, **Authy**, and **1Password**).
     - `apple_passwords_uri`: `apple-otpauth://totp/Beeline:{url_encoded_email}?secret={secret}&issuer=Beeline&algorithm=SHA1&digits=6&period=30` (native deep-link for **Apple Passwords on iPhone / iOS / macOS**).
     - `qr_code_svg`: A self-contained `data:image/svg+xml;base64,...` QR code image encoding the `otpauth://` URI (generated cleanly via `segno` / `qrcode` if installed, or a deterministic pure-Python SVG QR/matrix generator fallback so no external network call is ever needed).
     - `supported_authenticators`: `["Proton Pass", "Apple iPhone Passwords", "Google Authenticator", "Microsoft Authenticator", "1Password", "Authy"]`.

### Objective 3: TOTP Verification with Clock-Drift Tolerance, Anti-Replay & Security Email (`POST /api/v1/auth/mfa/verify`)
- **Clock-Drift Tolerance (`±1` step / `±30s`):**
  - Update `MFAService.verify_totp(secret_or_encrypted, code, window=1)` to decrypt the secret and verify the 6-digit code across `[-1, 0, +1]` 30-second windows to handle slight mobile clock drift on iPhones/Androids.
- **TOTP Replay Protection & Brute-Force Guard:**
  - Once a 6-digit TOTP code succeeds for a user, record `mfa:used_totp:{user_id}:{code}` in Redis (and in-memory fallback) with a 60-second TTL so an attacker who intercepts a 6-digit code cannot replay the exact same code within the same 30s window.
  - Protect `/api/v1/auth/mfa/verify` with `AntiBruteForceShield` (max 5 failed verification attempts per 15 minutes before returning `429 Too Many Requests`).
- **Activation & Security Email:**
  - Upon valid code verification in `POST /api/v1/auth/mfa/verify`, set `mfa_credentials.is_confirmed = True`, `user.mfa_enabled = True`, and dispatch a **"Beeline Security Alert: Two-Factor Authentication (2FA) Enabled"** email via `EmailService`.

### Objective 4: Hardened 2-Step Login Challenge (`POST /api/v1/auth/login` -> `POST /api/v1/auth/mfa/challenge`)
- **Step 1 (`POST /api/v1/auth/login` when `user.mfa_enabled == True`):**
  - Verify password first. Do NOT issue session cookies yet.
  - Generate a single-use `mfa_temp_token` (5-minute TTL) that embeds `sub` (`user.id`), `type: "mfa_temp"`, `jti` (unique challenge ID), and `remember_me: payload.remember_me`.
  - Register the active challenge `mfa:challenge:{jti}` in Redis (and in-memory fallback) with 300s TTL.
- **Step 2 (`POST /api/v1/auth/mfa/challenge`):**
  - Enforce **Anti-Brute-Force Shield**: Track failed attempts per `jti` and per `user_id` (`auth:mfa_bf:{user_id}` and `auth:mfa_bf_jti:{jti}`). After **3 failed attempts**, immediately revoke the `mfa_temp_token` (`mfa:challenge:revoked:{jti} = 1`) and return **`429 Too Many Requests`** (`detail="Too many failed 2FA attempts. Challenge token invalidated; please log in again."`).
  - Accept **EITHER**:
    1. A valid 6-digit TOTP code from Proton Pass / iPhone Passwords / Authenticator (checked with `window=1` and replay protection), **OR**
    2. One of the user's **3 obfuscated recovery codes** (`BEE-XXXX-XXXX`), verified in constant time against `mfa_credentials.backup_codes_hash` and consumed one-time!
  - Upon success:
    - Mark the `mfa_temp_token` `jti` as consumed/used so the same `mfa_temp_token` cannot be used a second time.
    - Honor the `remember_me` boolean embedded in `mfa_temp_token` (or in `MFAChallengeRequest` if provided) to create a **1-day** (`remember_me=False`) or **30-day** (`remember_me=True`) session in the backend refresh vault.
    - Set the encrypted `beeline_auth_token` and `beeline_device_proof` `HttpOnly` cookies on the response.

### Objective 5: 2FA Status Inspection (`GET /api/v1/auth/mfa/status`) & Secure Disable (`POST /api/v1/auth/mfa/disable`)
- Add `GET /api/v1/auth/mfa/status` returning:
  - `mfa_enabled: bool`
  - `is_confirmed: bool`
  - `remaining_recovery_codes: int` (count of unconsumed obfuscated recovery code hashes remaining for the user)
  - `supported_authenticators: List[str]`
- Update `POST /api/v1/auth/mfa/disable`:
  - Keep backward compatibility with existing calls that only send Bearer/Cookie auth (`test_mfa.py::test_disable_mfa_flow`), while optionally validating `password` or `code` if provided in an optional body.
  - When disabled, set `user.mfa_enabled = False`, `mfa_credentials.is_confirmed = False`, and send a **"Beeline Security Alert: Two-Factor Authentication (2FA) Disabled"** email via `EmailService`.

---

## 3. STEP 3 IMPLEMENTATION CHECKLIST

- [ ] **3.1 Schema & Model Verification (`backend/schema.sql`, `backend/app/models/user.py`, `backend/app/schemas/auth.py`):**
  - Ensure `mfa_credentials.secret_key` supports Fernet ciphertext length (`VARCHAR(255)` / `TEXT`).
  - Extend `MFASetupResponse` in `backend/app/schemas/auth.py` with `otpauth_uri: str`, `apple_passwords_uri: str`, `qr_code_svg: str`, and `supported_authenticators: List[str]` (keeping `secret`, `qr_uri`, and `backup_codes` intact for backward compatibility).
  - Add `MFAStatusResponse` schema and optional `remember_me: Optional[bool] = None` on `MFAChallengeRequest`.
- [ ] **3.2 Encrypted TOTP Engine, QR SVG Generator & Replay Protection (`backend/app/services/mfa_service.py`):**
  - Encrypt `secret_key` at rest using `Fernet` (`encrypt_totp_secret` / `decrypt_totp_secret`).
  - Generate RFC 6238 `otpauth://` URI, `apple-otpauth://` URI, and `data:image/svg+xml;base64,...` QR SVG.
  - Add TOTP replay protection (blocking reuse of the same 6-digit TOTP code within the same 30s window, while keeping existing `test_mfa.py` green—note: in `test_mfa.py`, `/mfa/verify` and `/mfa/challenge` are called sequentially in the same second with `MFAService.generate_totp_code(secret)`, so track replay specifically across login challenges `mfa:used_challenge_totp:{user_id}:{code}` so `/mfa/verify` setup confirmation followed immediately by `/mfa/challenge` login in unit tests works seamlessly while preventing a second `/mfa/challenge` replay with the same code!).
- [ ] **3.3 2FA Anti-Brute-Force Shield & Single-Use `mfa_temp_token` (`backend/app/services/auth_service.py` & `endpoints/auth.py`):**
  - Embed `jti` and `remember_me` in `mfa_temp_token`.
  - Enforce 3-strike brute-force lockout (`429 Too Many Requests`) and immediate `mfa_temp_token` invalidation on `/api/v1/auth/mfa/challenge`.
  - Enforce single-use consumption of `mfa_temp_token` once `/mfa/challenge` succeeds.
- [ ] **3.4 Email Security Alerts & `/api/v1/auth/mfa/status` Endpoint (`backend/app/services/email_service.py` & `endpoints/auth.py`):**
  - Add Cozy Hive HTML/text email dispatch for 2FA Enabled and 2FA Disabled events in `EmailService`.
  - Implement `GET /api/v1/auth/mfa/status` returning `mfa_enabled`, `is_confirmed`, `remaining_recovery_codes`, and `supported_authenticators`.
- [ ] **3.5 Step 3 Automated Test Suite (`backend/tests/test_auth_step3_mfa_totp.py`):**
  - Test 1: `POST /api/v1/auth/mfa/setup` returns RFC 6238 `otpauth_uri` (Proton Pass / Google Auth compatible), `apple_passwords_uri` (iPhone Passwords compatible), `qr_code_svg` (`data:image/svg+xml;base64,...`), and stores `mfa_credentials.secret_key` **Fernet-encrypted** in the database (assert raw DB `secret_key != plaintext_secret` and starts with `gAAAAA`).
  - Test 2: `POST /api/v1/auth/mfa/verify` confirms 2FA (including with $\pm 30\text{s}$ clock-drift tolerance), activates `mfa_enabled = True`, dispatches the 2FA Enabled email in `EmailService`, and `GET /api/v1/auth/mfa/status` reports `mfa_enabled=True` and `remaining_recovery_codes=3`.
  - Test 3: 2-Step Login with `remember_me=True` -> `/login` returns `mfa_required=True` and `mfa_temp_token` (without setting auth cookies yet) -> `/mfa/challenge` with 6-digit TOTP code issues a **30-day session** and sets encrypted `beeline_auth_token` + `beeline_device_proof` cookies.
  - Test 4: **TOTP Replay & Single-Use `mfa_temp_token` Defense:** Replaying the same `mfa_temp_token` or replaying the exact same 6-digit TOTP code on a second `/mfa/challenge` call within the same 30s window is rejected (`401 Unauthorized`).
  - Test 5: **Lost-Phone 2FA Challenge Fallback:** Completing `/api/v1/auth/mfa/challenge` using one of the **3 obfuscated signup recovery codes** (`BEE-XXXX-XXXX`) instead of a 6-digit TOTP code succeeds, sets session cookies, and decrements `remaining_recovery_codes` from `3` to `2` in `GET /api/v1/auth/mfa/status`.
  - Test 6: **Anti-Brute-Force on 2FA Challenge:** Submitting 3 wrong 6-digit codes to `POST /api/v1/auth/mfa/challenge` locks out the challenge with `429 Too Many Requests` and permanently invalidates that `mfa_temp_token` (even if the correct TOTP code is submitted on the 4th attempt).

---

## 4. VERIFICATION GATE (DEFINITION OF DONE)

- [ ] Run `pytest backend/tests/test_auth_step3_mfa_totp.py -v` and confirm **100% passing tests**.
- [ ] Run `pytest backend/tests/test_auth_step1_sessions.py backend/tests/test_auth_step2_passwords_email_recovery.py backend/tests/test_auth.py backend/tests/test_password_reset.py backend/tests/test_mfa.py -v` and confirm **100% passing tests**.
- [ ] Run the full backend test suite (`pytest backend/tests/`) to verify **zero regressions**.

---

## 5. MANDATORY DELIVERABLE: GENERATE `backend/docs/STEP_3_AUDIT_REPORT.md`

After all code and tests are completed and verified, write a comprehensive technical audit report to `backend/docs/STEP_3_AUDIT_REPORT.md` containing:
1. **Executive Gate Status (`PASS` / `FAIL`)** with test counts and regression rate.
2. **Freeze Contract Compliance Table** verifying zero changes made to ML, routing, scraper, frontend, or mobile modules during Step 3, and 100% preservation of Step 1 & Step 2 suites.
3. **Architectural Objectives Audit (Objectives 1–5)** with exact file paths, function names, line numbers, and implementation mechanics.
4. **Checklist Completion Matrix (`3.1` through `3.5`)** mapped to concrete code evidence and Pytest test functions.
5. **Modified & Created Files Manifest** for Step 3 with diff stats.
6. **Verification Gate & Pytest Execution Output** (verbatim output of `pytest backend/tests/test_auth_step3_mfa_totp.py -v`, combined auth suite, and summary of full `pytest backend/tests/`).
