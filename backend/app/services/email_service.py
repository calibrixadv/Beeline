import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
import email.message
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
import html
import json
import logging
import smtplib
import time
from typing import Any, Dict, List, Optional, Tuple
import uuid

from app.core.config import settings
from app.core.redis import get_redis

logger = logging.getLogger(__name__)


@dataclass
class EmailMessageRecord:
    to_email: str
    subject: str
    html_body: str
    text_body: str
    template_name: str
    context: Dict[str, Any]
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "queued"  # "queued", "sent", "failed", "fallback_dev_sink"
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    error: Optional[str] = None


class TokenBucketRateLimiter:
    """
    High-capacity asynchronous token bucket rate limiter.
    Configured for high production throughput (e.g. 500 emails/sec, burst 1000).
    """
    def __init__(self, rate: float = 500.0, capacity: float = 1000.0):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    def _refill(self) -> None:
        now = time.monotonic()
        delta = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + delta * self.rate)
        self.last_refill = now

    def has_capacity(self, count: int = 1) -> bool:
        self._refill()
        return self.tokens >= count

    async def acquire(self, count: int = 1, timeout: float = 5.0) -> bool:
        start = time.monotonic()
        while True:
            async with self._lock:
                self._refill()
                if self.tokens >= count:
                    self.tokens -= count
                    return True
            
            elapsed = time.monotonic() - start
            if elapsed >= timeout:
                return False
            
            # Brief sleep to yield and let tokens refill
            await asyncio.sleep(min(0.01, 1.0 / self.rate))


class EmailCircuitBreaker:
    """
    Circuit breaker for SMTP transport failures.
    Automatically transitions between CLOSED, OPEN, and HALF_OPEN.
    """
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.consecutive_failures = 0
        self.last_failure_time = 0.0
        self.state = "CLOSED"  # "CLOSED", "OPEN", "HALF_OPEN"
        self._lock = asyncio.Lock()

    async def can_execute(self) -> bool:
        async with self._lock:
            if self.state == "CLOSED":
                return True
            now = time.monotonic()
            if self.state == "OPEN":
                if now - self.last_failure_time >= self.recovery_timeout:
                    self.state = "HALF_OPEN"
                    logger.info("EmailCircuitBreaker: Transitioned from OPEN to HALF_OPEN")
                    return True
                return False
            if self.state == "HALF_OPEN":
                return True
            return False

    async def record_success(self) -> None:
        async with self._lock:
            self.consecutive_failures = 0
            if self.state != "CLOSED":
                logger.info("EmailCircuitBreaker: Resetting to CLOSED after successful transport")
                self.state = "CLOSED"

    async def record_failure(self) -> None:
        async with self._lock:
            self.consecutive_failures += 1
            self.last_failure_time = time.monotonic()
            if self.consecutive_failures >= self.failure_threshold and self.state != "OPEN":
                self.state = "OPEN"
                logger.warning(
                    f"EmailCircuitBreaker: Tripped to OPEN state after {self.consecutive_failures} failures"
                )


class EmailRenderer:
    """
    Renders styled HTML ('The Cozy Hive' theme) and companion plain text emails.
    """
    @staticmethod
    def render_welcome_recovery_codes(
        email_addr: str,
        recovery_codes: Optional[List[str]] = None,
        full_name: Optional[str] = None
    ) -> Tuple[str, str, str]:
        # Rule: Never send plaintext recovery codes in emails
        return EmailRenderer.render_welcome_verified(email_addr=email_addr, full_name=full_name)

    @staticmethod
    def render_welcome_verified(
        email_addr: str,
        full_name: Optional[str] = None
    ) -> Tuple[str, str, str]:
        greeting = f"Hello {html.escape(full_name)}," if full_name else "Hello Traveler,"
        subject = "Welcome to Beeline VoyageRail - Account Verified"

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline VoyageRail
              </h1>
              <p style="margin: 4px 0 0 0; color: #D1FAE5; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Welcome Aboard
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">{greeting}</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Welcome to <strong>Beeline VoyageRail</strong>! Your email address (<strong>{html.escape(email_addr)}</strong>) has been successfully verified, and your account is now fully active.
              </p>

              <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 16px 20px; border-radius: 4px; margin: 25px 0;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #065F46; font-size: 14px;">
                  🔑 Emergency Recovery Codes:
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #047857;">
                  Your 3 emergency account recovery codes were securely displayed on your screen immediately after email verification. For your security, recovery codes are never sent over email. Please ensure you have copied or saved them in an offline password vault.
                </p>
              </div>

              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #475569;">
                🚉 Explore synchronized Romanian national rail routes, urban transit schedules, and breach-protected journeys anytime in your traveler portal.
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Safe travels,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline VoyageRail — Welcome Aboard
======================================
{greeting}

Welcome to Beeline VoyageRail! Your email address ({email_addr}) has been verified and your account is active.

EMERGENCY RECOVERY CODES NOTICE:
Your 3 emergency account recovery codes were securely displayed on your screen during verification. For your security, recovery codes are NEVER transmitted in emails. Ensure you have stored them safely offline.

Safe travels,
The Beeline VoyageRail Security Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_email_verification(
        email_addr: str,
        otp_code: str,
        verify_url: str,
        full_name: Optional[str] = None,
        expires_minutes: int = 15
    ) -> Tuple[str, str, str]:
        subject = f"Verify your Beeline account - Code: {otp_code}"
        greeting = f"Hello {html.escape(full_name)}," if full_name else "Hello Traveler,"

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline VoyageRail
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEF3C7; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Email Verification
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">{greeting}</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Thank you for creating an account with <strong>Beeline VoyageRail</strong>!
                To verify ownership of <strong>{html.escape(email_addr)}</strong> and activate your account, please enter the 6-digit verification code below or click the verification button:
              </p>

              <div style="background-color: #FFFBEB; border: 2px dashed #F59E0B; border-radius: 12px; padding: 24px; margin: 25px 0; text-align: center;">
                <p style="margin: 0 0 8px 0; font-weight: 700; color: #92400E; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
                  Your 6-Digit Verification Code:
                </p>
                <div style="font-family: monospace; font-size: 36px; font-weight: 800; color: #B45309; letter-spacing: 8px; margin: 10px 0;">
                  {html.escape(otp_code)}
                </div>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #78350F;">
                  Valid for {expires_minutes} minutes
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{html.escape(verify_url)}" style="display: inline-block; background-color: #F59E0B; color: #1E293B; font-size: 16px; font-weight: 800; text-decoration: none; padding: 14px 36px; border-radius: 8px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);">
                  Verify Email
                </a>
              </div>

              <div style="background-color: #F1F5F9; border-left: 4px solid #64748B; padding: 14px 18px; border-radius: 4px; margin: 25px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                ⏱️ <strong>Expiration:</strong> This verification code and link expire in <strong>{expires_minutes} minutes</strong>.<br>
                🔒 <strong>Security Notice:</strong> If you did not create a Beeline VoyageRail account, you can safely ignore this email. The account will remain inactive and no session will be created.
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Safe travels,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline VoyageRail — Email Verification
========================================
{greeting}

Thank you for creating an account with Beeline VoyageRail!
To verify ownership of {email_addr} and activate your account, use your 6-digit code or visit the link below:

Verification Code: {otp_code}

Verify Link: {verify_url}

This verification code and link expire in {expires_minutes} minutes.

SECURITY NOTICE:
If you did not sign up for a Beeline VoyageRail account, please ignore this email. The account will remain completely inactive.

Safe travels,
The Beeline VoyageRail Security Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_password_reset(
        email_addr: str,
        reset_token: str,
        reset_link: str,
        ip_address: Optional[str] = None,
        expires_minutes: int = 15,
        timestamp: Optional[str] = None
    ) -> (str, str, str):
        subject = "Beeline Password Reset Request"
        ip_display = html.escape(ip_address or "Unknown IP")
        time_display = html.escape(timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline VoyageRail
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEF3C7; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Password Reset Request
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Password Reset Requested</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                We received a request to reset the password for your account associated with <strong>{html.escape(email_addr)}</strong>.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{html.escape(reset_link)}" style="display: inline-block; background-color: #F59E0B; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);">
                  Reset Your Password
                </a>
              </div>

              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 25px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #92400E;">
                  Direct Reset Token:
                </p>
                <div style="font-family: monospace; font-size: 14px; word-break: break-all; background-color: #FFFFFF; padding: 8px 12px; border-radius: 4px; border: 1px solid #FCD34D; color: #B45309;">
                  {html.escape(reset_token)}
                </div>
              </div>

              <div style="background-color: #F1F5F9; border-left: 4px solid #64748B; padding: 14px 18px; border-radius: 4px; margin: 25px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                ⏱️ <strong>Expiration:</strong> This reset link and token expire in <strong>{expires_minutes} minutes</strong>.<br>
                🌐 <strong>Requesting IP:</strong> {ip_display}<br>
                🕒 <strong>Timestamp:</strong> {time_display}
              </div>

              <p style="font-size: 13px; line-height: 1.5; color: #64748B; margin: 20px 0 0 0;">
                If you did not request this password reset, please ignore this email. Your existing password remains completely secure.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline VoyageRail — Password Reset Request
=============================================
We received a request to reset the password for your account ({email_addr}).

Reset Link: {reset_link}
Reset Token: {reset_token}

This reset token will expire in {expires_minutes} minutes.
Requesting IP: {ip_address or 'Unknown IP'}
Timestamp: {timestamp or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

If you did not request this, please ignore this message. Your password remains safe.
"""
        return subject, html_body, text_body

    @staticmethod
    def render_password_changed(
        email_addr: str,
        ip_address: Optional[str] = None,
        timestamp: Optional[str] = None
    ) -> (str, str, str):
        subject = "Beeline Security Alert: Your Password Was Changed"
        ip_display = html.escape(ip_address or "Unknown IP")
        time_display = html.escape(timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Security Alert
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEE2E2; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Account Security Notice
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Your Password Was Changed</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                This is a confirmation that the password for your Beeline VoyageRail account (<strong>{html.escape(email_addr)}</strong>) has been successfully changed.
              </p>
              
              <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px 20px; border-radius: 4px; margin: 25px 0;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #991B1B; font-size: 14px;">
                  🔒 Immediate Security Actions Taken:
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #7F1D1D;">
                  All active sessions across all your web and mobile devices have been <strong>immediately revoked</strong>. You will need to log in again using your new password.
                </p>
              </div>

              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #475569;">
                🌐 <strong>Originating IP:</strong> {ip_display}<br>
                🕒 <strong>Timestamp:</strong> {time_display}
              </div>

              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; padding: 15px; border-radius: 6px; margin: 25px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #92400E;">
                  ⚠️ <strong>Did not perform this action?</strong> Contact our incident response team immediately at <strong>security@beeline.voyagerail.com</strong> or use your emergency recovery codes.
                </p>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Sincerely,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Security Alert: Your Password Was Changed
===================================================
The password for your Beeline VoyageRail account ({email_addr}) has been successfully updated.

All existing active sessions have been immediately revoked for your protection.
Originating IP: {ip_address or 'Unknown IP'}
Timestamp: {timestamp or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

If you did not perform this change, contact security@beeline.voyagerail.com immediately.
"""
        return subject, html_body, text_body

    @staticmethod
    def render_2fa_enabled(
        email_addr: str,
        ip_address: Optional[str] = None,
        timestamp: Optional[str] = None
    ) -> (str, str, str):
        subject = "Beeline Security Alert: Two-Factor Authentication (2FA) Enabled"
        ip_display = html.escape(ip_address or "Unknown IP")
        time_display = html.escape(timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Security Alert
              </h1>
              <p style="margin: 4px 0 0 0; color: #D1FAE5; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Two-Factor Authentication Protection
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Two-Factor Authentication (2FA) Activated</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Two-Factor Authentication (RFC 6238 TOTP) has been successfully activated for your Beeline account (<strong>{html.escape(email_addr)}</strong>).
              </p>

              <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 16px 20px; border-radius: 4px; margin: 25px 0;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #065F46; font-size: 14px;">
                  🛡️ Enhanced Account Defense Enabled:
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #047857;">
                  Future logins will now require a 6-digit TOTP code from your authenticator app (Proton Pass, Apple iPhone Passwords, Google Authenticator) or an emergency recovery code.
                </p>
              </div>

              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #475569;">
                🌐 <strong>Configured From IP:</strong> {ip_display}<br>
                🕒 <strong>Timestamp:</strong> {time_display}
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Sincerely,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Security Alert: Two-Factor Authentication (2FA) Enabled
=============================================================
Two-Factor Authentication (TOTP) is now active on your account ({email_addr}).

Configured From IP: {ip_address or 'Unknown IP'}
Timestamp: {timestamp or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

If you did not enable 2FA, contact security@beeline.voyagerail.com immediately.
"""
        return subject, html_body, text_body

    @staticmethod
    def render_2fa_disabled(
        email_addr: str,
        ip_address: Optional[str] = None,
        timestamp: Optional[str] = None
    ) -> (str, str, str):
        subject = "Beeline Security Alert: Two-Factor Authentication (2FA) Disabled"
        ip_display = html.escape(ip_address or "Unknown IP")
        time_display = html.escape(timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Security Alert
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEE2E2; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Security Notice
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Two-Factor Authentication Has Been Disabled</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Two-Factor Authentication (2FA) was deactivated for your Beeline account (<strong>{html.escape(email_addr)}</strong>).
              </p>

              <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px 20px; border-radius: 4px; margin: 25px 0;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #991B1B; font-size: 14px;">
                  ⚠️ Security Notice:
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #7F1D1D;">
                  Your account is now protected only by your password. We strongly recommend re-enabling 2FA to keep your account safe from credential stuffing.
                </p>
              </div>

              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #475569;">
                🌐 <strong>Disabled From IP:</strong> {ip_display}<br>
                🕒 <strong>Timestamp:</strong> {time_display}
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Sincerely,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Security Alert: Two-Factor Authentication (2FA) Disabled
==============================================================
Two-Factor Authentication (TOTF) was deactivated for your account ({email_addr}).

Action IP: {ip_address or 'Unknown IP'}
Timestamp: {timestamp or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

If you did not perform this action, contact security@beeline.voyagerail.com immediately.
"""
        return subject, html_body, text_body

    @staticmethod
    def render_account_frozen(
        email_addr: str,
        days_remaining: int = 30,
        deletion_scheduled_at: Optional[str] = None
    ) -> (str, str, str):
        subject = f"Beeline Security Notice: Account Frozen ({days_remaining} Days Remaining)"
        date_display = html.escape(deletion_scheduled_at or "30 days from now")

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Security Notice
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEF3C7; font-size: 14px; font-weight: 500;">
                The Cozy Hive • 30-Day Account Deletion Freeze
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Account Frozen Pending Deletion</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Your Beeline account (<strong>{html.escape(email_addr)}</strong>) has been frozen upon request and is scheduled for permanent deletion in <strong>{days_remaining} days</strong> ({date_display}).
              </p>
              <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px 20px; border-radius: 4px; margin: 25px 0;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #B45309; font-size: 14px;">
                  Changed your mind?
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #92400E;">
                  You can restore your account at any time before the scheduled deletion date. Simply attempt to log in with your credentials, and an unfreeze confirmation link will be delivered to this email.
                </p>
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Sincerely,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Security Notice: Account Frozen ({days_remaining} Days Remaining)
============================================================
Your Beeline account ({email_addr}) has been frozen and scheduled for permanent deletion in {days_remaining} days ({deletion_scheduled_at or 'in 30 days'}).

If you wish to keep your account, log in at any time before the deadline to receive an unfreeze verification link.

The Beeline VoyageRail Security Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_account_unfreeze_challenge(
        email_addr: str,
        unfreeze_token: str,
        unfreeze_link: str,
        days_remaining: int = 30,
        ip_address: Optional[str] = None
    ) -> (str, str, str):
        subject = "Beeline Account Action Required: Confirm Account Unfreeze"
        ip_display = html.escape(ip_address or "Unknown IP")

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Security Verification
              </h1>
              <p style="margin: 4px 0 0 0; color: #DBEAFE; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Account Unfreeze Challenge
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Unfreeze Confirmation Requested</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                A login attempt was made for your frozen account (<strong>{html.escape(email_addr)}</strong>). You have <strong>{days_remaining} days</strong> remaining before scheduled permanent deletion.
              </p>
              <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px 20px; border-radius: 4px; margin: 25px 0;">
                <p style="margin: 0 0 8px 0; font-weight: 700; color: #1E40AF; font-size: 14px;">
                  Click the button below to reactivate your account immediately:
                </p>
                <div style="margin: 18px 0; text-align: center;">
                  <a href="{html.escape(unfreeze_link)}" style="display: inline-block; background: #2563EB; color: #FFFFFF; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
                    Unfreeze My Account
                  </a>
                </div>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748B;">
                  This link and token ({html.escape(unfreeze_token)}) are valid for 24 hours.
                </p>
              </div>
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #475569;">
                🌐 <strong>Request Origin IP:</strong> {ip_display}
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Sincerely,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Account Action Required: Confirm Account Unfreeze
======================================================
A login attempt was made for your frozen account ({email_addr}).
You have {days_remaining} days remaining before permanent deletion.

To unfreeze and reactivate your account, visit:
{unfreeze_link}

Token: {unfreeze_token}
Valid for 24 hours. Request Origin IP: {ip_address or 'Unknown IP'}

The Beeline VoyageRail Security Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_account_unfrozen(
        email_addr: str,
        ip_address: Optional[str] = None,
        timestamp: Optional[str] = None
    ) -> (str, str, str):
        subject = "Beeline Security Notice: Account Successfully Restored"
        ip_display = html.escape(ip_address or "Unknown IP")
        time_display = html.escape(timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Security Notice
              </h1>
              <p style="margin: 4px 0 0 0; color: #D1FAE5; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Account Successfully Restored
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Welcome Back, Traveler!</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Your Beeline account (<strong>{html.escape(email_addr)}</strong>) has been successfully unfrozen. The scheduled deletion has been canceled, and full account access has been restored.
              </p>
              <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 4px; margin: 25px 0; font-size: 13px; color: #065F46;">
                🕒 <strong>Restored at:</strong> {time_display}<br>
                🌐 <strong>Restored from IP:</strong> {ip_display}
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Sincerely,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Security Notice: Account Successfully Restored
======================================================
Your Beeline account ({email_addr}) has been successfully unfrozen.
Scheduled deletion has been canceled and your account is ACTIVE.

Timestamp: {timestamp or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
Origin IP: {ip_address or 'Unknown IP'}

The Beeline VoyageRail Security Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_account_deletion_reminder_15d(
        email_addr: str,
        days_remaining: int = 15,
        deletion_scheduled_at: Optional[str] = None
    ) -> (str, str, str):
        subject = f"Beeline Warning: {days_remaining} Days Remaining Until Permanent Account Deletion"
        date_display = html.escape(deletion_scheduled_at or "in 15 days")

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Security Alert
              </h1>
              <p style="margin: 4px 0 0 0; color: #FFEDD5; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Deletion Reminder
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">15 Days Until Permanent Deletion</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                This is a courtesy reminder that your Beeline account (<strong>{html.escape(email_addr)}</strong>) is scheduled for permanent hard deletion in <strong>{days_remaining} days</strong> ({date_display}).
              </p>
              <div style="background-color: #FFF7ED; border-left: 4px solid #F97316; padding: 16px 20px; border-radius: 4px; margin: 25px 0;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #C2410C; font-size: 14px;">
                  Action Required to Keep Your Account:
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9A3412;">
                  If you do not want your account, booking records, and saved journeys deleted, simply log in before the deadline to unfreeze your account.
                </p>
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Sincerely,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Warning: {days_remaining} Days Remaining Until Permanent Account Deletion
========================================================================
Your Beeline account ({email_addr}) will be permanently deleted in {days_remaining} days ({deletion_scheduled_at or 'in 15 days'}).

To unfreeze and keep your account, log in before the scheduled date.

The Beeline VoyageRail Security Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_account_permanently_deleted(
        email_addr: str,
        timestamp: Optional[str] = None
    ) -> (str, str, str):
        subject = "Beeline Notice: Account Permanently Deleted"
        time_display = html.escape(timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #64748B 0%, #475569 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Account Notice
              </h1>
              <p style="margin: 4px 0 0 0; color: #E2E8F0; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Deletion Complete
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Account Permanently Deleted</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                As scheduled, your Beeline account (<strong>{html.escape(email_addr)}</strong>) and all associated personal data, sessions, MFA credentials, bookings, and preferences have been permanently removed from our databases.
              </p>
              <div style="background-color: #F1F5F9; border-left: 4px solid #64748B; padding: 14px 18px; border-radius: 4px; margin: 25px 0; font-size: 13px; color: #475569;">
                🕒 <strong>Completed At:</strong> {time_display}
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Thank you for traveling with us.<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Notice: Account Permanently Deleted
=============================================
Your Beeline account ({email_addr}) has been permanently deleted as scheduled.
All associated data has been purged from our databases.

Completed At: {timestamp or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

The Beeline VoyageRail Security Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_booking_confirmation(
        email_addr: str,
        booking_reference: str,
        train_number: str,
        origin: str,
        destination: str,
        departure_time: str,
        arrival_time: str,
        total_amount_lei: float,
        tickets_count: int,
        passenger_name: Optional[str] = None
    ) -> Tuple[str, str, str]:
        subject = f"Beeline Booking Confirmed: {booking_reference} ({origin} → {destination})"
        name_greeting = f"Hello {html.escape(passenger_name)}," if passenger_name else "Hello Traveler,"
        total_str = f"{total_amount_lei:.2f} LEI"

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline VoyageRail
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEF3C7; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Booking Confirmation
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">{name_greeting}</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Your journey has been successfully booked! Your booking reference is <strong>{html.escape(booking_reference)}</strong>.
              </p>
              
              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <table width="100%" cellspacing="0" cellpadding="4" style="font-size: 14px; color: #1E293B;">
                  <tr>
                    <td style="font-weight: 600; color: #92400E; width: 140px;">Booking Ref:</td>
                    <td style="font-weight: 700; color: #B45309; font-family: monospace; font-size: 16px;">{html.escape(booking_reference)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Train:</td>
                    <td style="font-weight: 700;">{html.escape(train_number)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Route:</td>
                    <td><strong>{html.escape(origin)}</strong> ➔ <strong>{html.escape(destination)}</strong></td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Departure:</td>
                    <td>{html.escape(departure_time)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Arrival:</td>
                    <td>{html.escape(arrival_time)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Tickets / Passengers:</td>
                    <td>{tickets_count} ticket(s)</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Total Paid:</td>
                    <td style="font-weight: 800; color: #047857; font-size: 16px;">{html.escape(total_str)}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #F8FAFC; border-left: 4px solid #F59E0B; padding: 14px 18px; border-radius: 4px; margin: 25px 0; font-size: 13px; color: #475569;">
                🚉 <strong>Travel Tip:</strong> Please arrive at the station at least 15 minutes before departure. Have your QR code or ticket number ready on your device.
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Safe travels,<br>
                <strong>The Beeline VoyageRail Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline VoyageRail — Booking Confirmed
========================================
{name_greeting}

Your journey has been confirmed!

Booking Reference: {booking_reference}
Train: {train_number}
Route: {origin} -> {destination}
Departure: {departure_time}
Arrival: {arrival_time}
Tickets: {tickets_count}
Total Paid: {total_str}

Please arrive at the station at least 15 minutes before scheduled departure.
Safe travels,
The Beeline VoyageRail Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_booking_cancellation(
        email_addr: str,
        booking_reference: str,
        origin: Optional[str] = None,
        destination: Optional[str] = None
    ) -> Tuple[str, str, str]:
        subject = f"Beeline Booking Cancelled: {booking_reference}"
        route_text = f" ({origin} → {destination})" if origin and destination else ""

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #64748B 0%, #475569 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline VoyageRail
              </h1>
              <p style="margin: 4px 0 0 0; color: #E2E8F0; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Booking Cancellation
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Reservation Cancelled</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Your booking with reference <strong>{html.escape(booking_reference)}</strong>{html.escape(route_text)} has been successfully cancelled.
              </p>
              
              <div style="background-color: #F1F5F9; border-left: 4px solid #64748B; padding: 14px 18px; border-radius: 4px; margin: 25px 0; font-size: 13px; color: #475569;">
                ℹ️ <strong>Refund & Credits:</strong> If your ticket was eligible for refund or travel credit, our ticketing support system will process it according to railway operator fare terms.
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Best regards,<br>
                <strong>The Beeline VoyageRail Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline VoyageRail — Booking Cancelled
========================================
Your booking with reference {booking_reference}{route_text} has been successfully cancelled.

If your ticket was eligible for a refund, it will be processed according to railway operator terms.

Best regards,
The Beeline VoyageRail Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_saved_trip_confirmation(
        email_addr: str,
        origin: str,
        destination: str,
        departure_time: str,
        train_summary: Optional[str] = None
    ) -> Tuple[str, str, str]:
        subject = f"Beeline Saved Trip: {origin} → {destination}"
        summary_display = html.escape(train_summary) if train_summary else f"{html.escape(origin)} to {html.escape(destination)}"

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline VoyageRail
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEF3C7; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Saved Journey
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">Itinerary Saved to Your Wallet</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                You've saved <strong>{html.escape(origin)} → {html.escape(destination)}</strong> to your Beeline trip wallet.
              </p>
              
              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 18px; margin: 25px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #92400E;">
                  Route Details:
                </p>
                <div style="font-size: 14px; color: #1E293B; line-height: 1.5;">
                  <strong>Summary:</strong> {summary_display}<br>
                  <strong>Scheduled Departure:</strong> {html.escape(departure_time)}
                </div>
              </div>

              <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 4px; margin: 25px 0; font-size: 13px; color: #065F46;">
                🔔 <strong>Departure Reminders Active:</strong> You will automatically receive a departure alert and live delay notifications before this train departs.
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Safe travels,<br>
                <strong>The Beeline VoyageRail Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline VoyageRail — Saved Trip
========================================
You've saved {origin} -> {destination} to your Beeline wallet.

Summary: {train_summary or (origin + ' -> ' + destination)}
Scheduled Departure: {departure_time}

Departure reminders are active for your account. You will receive an alert before the train departs.

Safe travels,
The Beeline VoyageRail Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_train_departure_reminder(
        email_addr: str,
        train_number: str,
        origin: str,
        destination: str,
        departure_time: str,
        minutes_until_departure: int,
        platform: Optional[str] = None,
        delay_minutes: int = 0,
        transfer_note: Optional[str] = None,
        user_name: Optional[str] = None
    ) -> Tuple[str, str, str]:
        if delay_minutes >= 10:
            subject = f"⚠️ Beeline Delay Alert (+{delay_minutes}m): Train {train_number} ({origin} → {destination}) departs in {minutes_until_departure} min"
        else:
            subject = f"Beeline: Train {train_number} ({origin} → {destination}) departs in {minutes_until_departure} min"

        greeting = f"Hello {html.escape(user_name)}," if user_name else "Hello Traveler,"
        platform_str = html.escape(platform) if platform else "Check Station Display"
        delay_badge = f'<span style="background: #FEE2E2; color: #991B1B; font-weight: 700; padding: 3px 8px; border-radius: 4px; font-size: 12px;">+{delay_minutes} min delay</span>' if delay_minutes > 0 else '<span style="background: #D1FAE5; color: #065F46; font-weight: 700; padding: 3px 8px; border-radius: 4px; font-size: 12px;">On Time</span>'
        delay_text = f"+{delay_minutes} min delay" if delay_minutes > 0 else "On Time"

        transfer_html = f"""
              <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; border-radius: 4px; margin: 15px 0; font-size: 13px; color: #1E40AF;">
                🛡️ <strong>Transfer Shield:</strong> {html.escape(transfer_note)}
              </div>""" if transfer_note else ""

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline VoyageRail
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEF3C7; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Train Departure Reminder
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">{greeting}</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Your train <strong>{html.escape(train_number)}</strong> from <strong>{html.escape(origin)}</strong> to <strong>{html.escape(destination)}</strong> departs in <strong>{minutes_until_departure} minutes</strong>!
              </p>
              
              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table width="100%" cellspacing="0" cellpadding="4" style="font-size: 14px; color: #1E293B;">
                  <tr>
                    <td style="font-weight: 600; color: #92400E; width: 140px;">Train:</td>
                    <td style="font-weight: 700; font-size: 16px;">{html.escape(train_number)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Route:</td>
                    <td><strong>{html.escape(origin)}</strong> ➔ <strong>{html.escape(destination)}</strong></td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Departure Time:</td>
                    <td>{html.escape(departure_time)}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Status:</td>
                    <td>{delay_badge}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600; color: #92400E;">Platform:</td>
                    <td><strong>{platform_str}</strong></td>
                  </tr>
                </table>
              </div>{transfer_html}

              <div style="background-color: #F8FAFC; border-left: 4px solid #F59E0B; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-size: 13px; color: #475569;">
                🚶 <strong>Departure Checklist:</strong> Head towards your departure platform now. Have your booking reference or ticket ready for inspection.
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Have a pleasant trip,<br>
                <strong>The Beeline VoyageRail Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline VoyageRail — Train Departure Reminder
===============================================
{greeting}

Train {train_number} ({origin} -> {destination}) departs in {minutes_until_departure} minutes!

Departure Time: {departure_time}
Live Status: {delay_text}
Platform: {platform or 'Check Station Display'}
{f'Transfer Shield: {transfer_note}' if transfer_note else ''}

Please proceed to your platform and have your ticket ready.
Have a pleasant trip,
The Beeline VoyageRail Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_train_delay_alert(
        email_addr: str,
        train_number: str,
        origin: str,
        destination: str,
        departure_time: str,
        delay_minutes: int,
        user_name: Optional[str] = None
    ) -> Tuple[str, str, str]:
        subject = f"⚠️ Beeline Delay Alert: Train {train_number} is delayed by {delay_minutes} min"
        greeting = f"Hello {html.escape(user_name)}," if user_name else "Hello Traveler,"

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Live Alert
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEE2E2; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Train Delay Notice
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">{greeting}</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Live CFR Călători telematics indicate that train <strong>{html.escape(train_number)}</strong> ({html.escape(origin)} ➔ {html.escape(destination)}) is currently running with a delay of <strong>+{delay_minutes} minutes</strong>.
              </p>
              
              <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px 20px; border-radius: 4px; margin: 25px 0;">
                <p style="margin: 0 0 8px 0; font-weight: 700; color: #991B1B; font-size: 14px;">
                  Updated Departure Information:
                </p>
                <div style="font-size: 14px; color: #7F1D1D; line-height: 1.6;">
                  <strong>Scheduled Departure:</strong> {html.escape(departure_time)}<br>
                  <strong>Reported Delay:</strong> +{delay_minutes} minutes<br>
                  <strong>Route:</strong> {html.escape(origin)} ➔ {html.escape(destination)}
                </div>
              </div>

              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px 18px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #475569;">
                ℹ️ We are continuously tracking the live train status. You will receive further updates if the expected arrival changes significantly.
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Safe travels,<br>
                <strong>The Beeline VoyageRail Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Live Alert: Train Delay Notice
=======================================
{greeting}

Train {train_number} ({origin} -> {destination}) is currently delayed by +{delay_minutes} minutes.

Scheduled Departure: {departure_time}
Current Delay: +{delay_minutes} min

We are continuously monitoring this train and will provide updates as needed.

Safe travels,
The Beeline VoyageRail Team
"""
        return subject, html_body, text_body

    @staticmethod
    def render_mfa_status_changed(
        email_addr: str,
        enabled: bool,
        ip_address: Optional[str] = None,
        timestamp: Optional[str] = None
    ) -> Tuple[str, str, str]:
        if enabled:
            return EmailRenderer.render_2fa_enabled(email_addr, ip_address, timestamp)
        else:
            return EmailRenderer.render_2fa_disabled(email_addr, ip_address, timestamp)

    @staticmethod
    def render_account_status(
        email_addr: str,
        action: str,
        details: str
    ) -> Tuple[str, str, str]:
        subject = f"Beeline Account Update: {action}"
        action_escaped = html.escape(action)
        details_escaped = html.escape(details)
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #E2E8F0;">
          <tr>
            <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 25px 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                🐝 Beeline Security Notice
              </h1>
              <p style="margin: 4px 0 0 0; color: #FEF3C7; font-size: 14px; font-weight: 500;">
                The Cozy Hive • Account Status Update
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #0F172A;">{action_escaped}</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Your account ({html.escape(email_addr)}) status has been updated: <strong>{action_escaped}</strong>.
              </p>
              
              <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px 20px; border-radius: 4px; margin: 25px 0; font-size: 14px; color: #92400E; line-height: 1.6;">
                {details_escaped}
              </div>

              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #475569;">
                🕒 <strong>Timestamp:</strong> {now_str}
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 25px 0 0 0;">
                Sincerely,<br>
                <strong>The Beeline VoyageRail Security Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = f"""Beeline Account Update: {action}
========================================
Your account ({email_addr}) status has been updated: {action}.

Details: {details}
Timestamp: {now_str}

Sincerely,
The Beeline VoyageRail Security Team
"""
        return subject, html_body, text_body


class EmailService:
    """
    High-throughput email service supporting asynchronous queuing, token bucket rate limiting,
    circuit breaker protection, and dual operation modes ('dev_sink' and 'smtp').
    """
    def __init__(self):
        self.rate_limiter = TokenBucketRateLimiter(
            rate=float(getattr(settings, "EMAIL_RATE_LIMIT_PER_SEC", 500)),
            capacity=float(getattr(settings, "EMAIL_RATE_LIMIT_PER_SEC", 500) * 2)
        )
        self.circuit_breaker = EmailCircuitBreaker(failure_threshold=5, recovery_timeout=30.0)
        self._outbox: List[EmailMessageRecord] = []
        self._queue: asyncio.Queue = asyncio.Queue()
        self._workers: List[asyncio.Task] = []
        self._lock = asyncio.Lock()
        self._renderer = EmailRenderer()

    # ==========================================
    # Dev Sink Outbox Inspection & Clearing
    # ==========================================

    def get_outbox(self) -> List[EmailMessageRecord]:
        """Returns all messages collected in the dev outbox."""
        return list(self._outbox)

    def get_last_email_for(self, to_email: str) -> Optional[EmailMessageRecord]:
        """Finds the most recent email dispatched to the specified address."""
        clean = to_email.strip().lower()
        for msg in reversed(self._outbox):
            if msg.to_email.strip().lower() == clean:
                return msg
        return None

    def clear_outbox(self) -> None:
        """Clears all messages stored in the dev sink outbox."""
        self._outbox.clear()

    # ==========================================
    # Core Dispatch Engine
    # ==========================================

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        template_name: str = "custom",
        context: Optional[Dict[str, Any]] = None
    ) -> EmailMessageRecord:
        """
        Direct awaitable email dispatch with rate limiting and circuit breaker.
        In 'dev_sink' mode, persists message directly into dev outbox.
        In 'smtp' mode, delivers via SMTP relay.
        """
        # 1. Rate limiter check
        acquired = await self.rate_limiter.acquire(count=1, timeout=5.0)
        if not acquired:
            logger.warning("EmailService rate limiter throttled email dispatch")

        record = EmailMessageRecord(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name=template_name,
            context=context or {},
            created_at=datetime.now(timezone.utc),
            status="queued"
        )

        mode = getattr(settings, "EMAIL_MODE", "dev_sink").lower()

        if mode == "dev_sink":
            record.status = "sent"
            async with self._lock:
                self._outbox.append(record)
            
            # Optional mirror to Redis
            try:
                redis = get_redis()
                await redis.lpush("email:dev_sink", json.dumps({
                    "id": record.id,
                    "to": record.to_email,
                    "subject": record.subject,
                    "created_at": record.created_at.isoformat()
                }))
                await redis.ltrim("email:dev_sink", 0, 999)
            except Exception:
                pass

            return record

        # SMTP mode
        can_exec = await self.circuit_breaker.can_execute()
        if not can_exec:
            record.status = "fallback_dev_sink"
            record.error = "Circuit breaker OPEN: transport paused"
            async with self._lock:
                self._outbox.append(record)
            logger.warning(f"Email fallback to dev_sink for {to_email} due to OPEN circuit breaker")
            return record

        try:
            await asyncio.to_thread(self._dispatch_smtp_sync, record)
            await self.circuit_breaker.record_success()
            record.status = "sent"
            async with self._lock:
                self._outbox.append(record)
        except Exception as exc:
            await self.circuit_breaker.record_failure()
            record.status = "fallback_dev_sink"
            record.error = str(exc)
            async with self._lock:
                self._outbox.append(record)
            logger.error(f"SMTP dispatch failed: {exc}. Falling back to dev_sink.")

        return record

    def _build_mime_message(self, record: EmailMessageRecord) -> MIMEMultipart:
        """
        Builds a compliant RFC 5322 MIME message with UTF-8 encoding for both text and HTML parts,
        and proper headers (Subject, From, To, Date, Message-ID).
        """
        msg = MIMEMultipart("alternative")
        msg["Subject"] = record.subject
        from_email = getattr(settings, "SMTP_FROM_EMAIL", "noreply@beeline.voyagerail.com")
        msg["From"] = from_email
        msg["To"] = record.to_email
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain="beeline.local")

        part_text = MIMEText(record.text_body, "plain", "utf-8")
        part_html = MIMEText(record.html_body, "html", "utf-8")
        msg.attach(part_text)
        msg.attach(part_html)
        return msg

    def _dispatch_smtp_sync(self, record: EmailMessageRecord) -> None:
        """Synchronous SMTP helper executed in threadpool worker."""
        msg = self._build_mime_message(record)

        host = getattr(settings, "SMTP_HOST", "localhost")
        port = int(getattr(settings, "SMTP_PORT", 1025))
        user = getattr(settings, "SMTP_USER", "")
        password = getattr(settings, "SMTP_PASSWORD", "")

        with smtplib.SMTP(host, port, timeout=10) as server:
            if user and password:
                server.starttls()
                server.login(user, password)
            server.send_message(msg)

    # ==========================================
    # Asynchronous Queue & Worker Pool
    # ==========================================

    async def enqueue_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str,
        template_name: str = "custom",
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Non-blocking background enqueue to producer-consumer queue."""
        task_id = str(uuid.uuid4())
        await self._queue.put({
            "task_id": task_id,
            "to_email": to_email,
            "subject": subject,
            "html_body": html_body,
            "text_body": text_body,
            "template_name": template_name,
            "context": context or {}
        })
        return task_id

    async def _worker_loop(self) -> None:
        while True:
            try:
                task = await self._queue.get()
                await self.send_email(
                    to_email=task["to_email"],
                    subject=task["subject"],
                    html_body=task["html_body"],
                    text_body=task["text_body"],
                    template_name=task["template_name"],
                    context=task["context"]
                )
                self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Error in EmailService worker: {exc}")

    def start_worker_pool(self, concurrency: int = 4) -> None:
        """Starts background worker tasks for asynchronous queue processing."""
        if not self._workers:
            for _ in range(concurrency):
                task = asyncio.create_task(self._worker_loop())
                self._workers.append(task)

    async def stop_worker_pool(self) -> None:
        """Stops and cancels all active background worker tasks."""
        for task in self._workers:
            task.cancel()
        if self._workers:
            await asyncio.gather(*self._workers, return_exceptions=True)
            self._workers.clear()

    # ==========================================
    # High-Level Domain Convenience Methods
    # ==========================================

    async def send_email_verification(
        self,
        to_email: str,
        otp_code: str,
        verify_url: str,
        full_name: Optional[str] = None,
        expires_minutes: int = 15
    ) -> EmailMessageRecord:
        subject, html_body, text_body = self._renderer.render_email_verification(
            email_addr=to_email,
            otp_code=otp_code,
            verify_url=verify_url,
            full_name=full_name,
            expires_minutes=expires_minutes
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="email_verification",
            context={
                "otp_code": otp_code,
                "verify_url": verify_url,
                "full_name": full_name,
                "expires_minutes": expires_minutes
            }
        )

    async def send_welcome_verified(
        self,
        to_email: str,
        full_name: Optional[str] = None
    ) -> EmailMessageRecord:
        subject, html_body, text_body = self._renderer.render_welcome_verified(
            email_addr=to_email,
            full_name=full_name
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="welcome_verified",
            context={"full_name": full_name}
        )

    async def send_welcome_recovery_codes(
        self,
        to_email: str,
        recovery_codes: Optional[List[str]] = None,
        full_name: Optional[str] = None
    ) -> EmailMessageRecord:
        # Backward compatibility wrapper: never send plaintext recovery codes in emails
        return await self.send_welcome_verified(to_email=to_email, full_name=full_name)

    async def send_password_reset_email(
        self,
        to_email: str,
        reset_token: str,
        ip_address: Optional[str] = None
    ) -> EmailMessageRecord:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        expires_minutes = getattr(settings, "PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", 15)
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        subject, html_body, text_body = self._renderer.render_password_reset(
            email_addr=to_email,
            reset_token=reset_token,
            reset_link=reset_link,
            ip_address=ip_address,
            expires_minutes=expires_minutes,
            timestamp=now_str
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="password_reset",
            context={
                "reset_token": reset_token,
                "reset_link": reset_link,
                "ip_address": ip_address,
                "expires_minutes": expires_minutes
            }
        )

    async def send_password_changed_alert(
        self,
        to_email: str,
        ip_address: Optional[str] = None
    ) -> EmailMessageRecord:
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        subject, html_body, text_body = self._renderer.render_password_changed(
            email_addr=to_email,
            ip_address=ip_address,
            timestamp=now_str
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="password_changed",
            context={"ip_address": ip_address, "timestamp": now_str}
        )

    async def send_2fa_enabled_alert(
        self,
        to_email: str,
        ip_address: Optional[str] = None
    ) -> EmailMessageRecord:
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        subject, html_body, text_body = self._renderer.render_2fa_enabled(
            email_addr=to_email,
            ip_address=ip_address,
            timestamp=now_str
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="mfa_enabled",
            context={"ip_address": ip_address, "timestamp": now_str}
        )

    async def send_2fa_disabled_alert(
        self,
        to_email: str,
        ip_address: Optional[str] = None
    ) -> EmailMessageRecord:
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        subject, html_body, text_body = self._renderer.render_2fa_disabled(
            email_addr=to_email,
            ip_address=ip_address,
            timestamp=now_str
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="mfa_disabled",
            context={"ip_address": ip_address, "timestamp": now_str}
        )

    async def send_account_frozen_notice(
        self,
        to_email: str,
        days_remaining: int = 30,
        deletion_scheduled_at: Optional[datetime] = None
    ) -> EmailMessageRecord:
        sched_str = deletion_scheduled_at.strftime("%Y-%m-%d %H:%M:%S UTC") if deletion_scheduled_at else None
        subject, html_body, text_body = self._renderer.render_account_frozen(
            email_addr=to_email,
            days_remaining=days_remaining,
            deletion_scheduled_at=sched_str
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="account_frozen_30d",
            context={"days_remaining": days_remaining, "deletion_scheduled_at": sched_str}
        )

    async def send_account_unfreeze_challenge(
        self,
        to_email: str,
        unfreeze_token: str,
        days_remaining: int = 30,
        ip_address: Optional[str] = None
    ) -> EmailMessageRecord:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        unfreeze_link = f"{frontend_url}/unfreeze?token={unfreeze_token}"
        subject, html_body, text_body = self._renderer.render_account_unfreeze_challenge(
            email_addr=to_email,
            unfreeze_token=unfreeze_token,
            unfreeze_link=unfreeze_link,
            days_remaining=days_remaining,
            ip_address=ip_address
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="account_unfreeze_challenge",
            context={
                "unfreeze_token": unfreeze_token,
                "unfreeze_link": unfreeze_link,
                "days_remaining": days_remaining,
                "ip_address": ip_address
            }
        )

    async def send_account_unfrozen_confirmation(
        self,
        to_email: str,
        ip_address: Optional[str] = None
    ) -> EmailMessageRecord:
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        subject, html_body, text_body = self._renderer.render_account_unfrozen(
            email_addr=to_email,
            ip_address=ip_address,
            timestamp=now_str
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="account_unfrozen_confirmed",
            context={"ip_address": ip_address, "timestamp": now_str}
        )

    async def send_account_deletion_reminder_15d(
        self,
        to_email: str,
        days_remaining: int = 15,
        deletion_scheduled_at: Optional[datetime] = None
    ) -> EmailMessageRecord:
        sched_str = deletion_scheduled_at.strftime("%Y-%m-%d %H:%M:%S UTC") if deletion_scheduled_at else None
        subject, html_body, text_body = self._renderer.render_account_deletion_reminder_15d(
            email_addr=to_email,
            days_remaining=days_remaining,
            deletion_scheduled_at=sched_str
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="account_deletion_reminder_15d",
            context={"days_remaining": days_remaining, "deletion_scheduled_at": sched_str}
        )

    async def send_account_permanently_deleted_notice(
        self,
        to_email: str
    ) -> EmailMessageRecord:
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        subject, html_body, text_body = self._renderer.render_account_permanently_deleted(
            email_addr=to_email,
            timestamp=now_str
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="account_permanently_deleted_0d",
            context={"timestamp": now_str}
        )

    async def send_booking_confirmation_email(
        self,
        to_email: str,
        booking_reference: str,
        train_number: str,
        origin: str,
        destination: str,
        departure_time: str,
        arrival_time: str,
        total_amount_lei: float,
        tickets_count: int,
        passenger_name: Optional[str] = None
    ) -> EmailMessageRecord:
        subject, html_body, text_body = self._renderer.render_booking_confirmation(
            email_addr=to_email,
            booking_reference=booking_reference,
            train_number=train_number,
            origin=origin,
            destination=destination,
            departure_time=departure_time,
            arrival_time=arrival_time,
            total_amount_lei=total_amount_lei,
            tickets_count=tickets_count,
            passenger_name=passenger_name
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="booking_confirmation",
            context={
                "booking_reference": booking_reference,
                "train_number": train_number,
                "origin": origin,
                "destination": destination,
                "departure_time": departure_time,
                "arrival_time": arrival_time,
                "total_amount_lei": total_amount_lei,
                "tickets_count": tickets_count,
                "passenger_name": passenger_name
            }
        )

    async def send_booking_cancellation_email(
        self,
        to_email: str,
        booking_reference: str,
        origin: Optional[str] = None,
        destination: Optional[str] = None
    ) -> EmailMessageRecord:
        subject, html_body, text_body = self._renderer.render_booking_cancellation(
            email_addr=to_email,
            booking_reference=booking_reference,
            origin=origin,
            destination=destination
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="booking_cancellation",
            context={
                "booking_reference": booking_reference,
                "origin": origin,
                "destination": destination
            }
        )

    async def send_saved_trip_confirmation_email(
        self,
        to_email: str,
        origin: str,
        destination: str,
        departure_time: str,
        train_summary: Optional[str] = None
    ) -> EmailMessageRecord:
        subject, html_body, text_body = self._renderer.render_saved_trip_confirmation(
            email_addr=to_email,
            origin=origin,
            destination=destination,
            departure_time=departure_time,
            train_summary=train_summary
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="saved_trip_confirmation",
            context={
                "origin": origin,
                "destination": destination,
                "departure_time": departure_time,
                "train_summary": train_summary
            }
        )

    async def send_train_departure_reminder_email(
        self,
        to_email: str,
        train_number: str,
        origin: str,
        destination: str,
        departure_time: str,
        minutes_until_departure: int,
        platform: Optional[str] = None,
        delay_minutes: int = 0,
        transfer_note: Optional[str] = None,
        user_name: Optional[str] = None
    ) -> EmailMessageRecord:
        subject, html_body, text_body = self._renderer.render_train_departure_reminder(
            email_addr=to_email,
            train_number=train_number,
            origin=origin,
            destination=destination,
            departure_time=departure_time,
            minutes_until_departure=minutes_until_departure,
            platform=platform,
            delay_minutes=delay_minutes,
            transfer_note=transfer_note,
            user_name=user_name
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="train_departure_reminder",
            context={
                "train_number": train_number,
                "origin": origin,
                "destination": destination,
                "departure_time": departure_time,
                "minutes_until_departure": minutes_until_departure,
                "platform": platform,
                "delay_minutes": delay_minutes,
                "transfer_note": transfer_note,
                "user_name": user_name
            }
        )

    async def send_train_delay_alert_email(
        self,
        to_email: str,
        train_number: str,
        origin: str,
        destination: str,
        departure_time: str,
        delay_minutes: int,
        user_name: Optional[str] = None
    ) -> EmailMessageRecord:
        subject, html_body, text_body = self._renderer.render_train_delay_alert(
            email_addr=to_email,
            train_number=train_number,
            origin=origin,
            destination=destination,
            departure_time=departure_time,
            delay_minutes=delay_minutes,
            user_name=user_name
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="train_delay_alert",
            context={
                "train_number": train_number,
                "origin": origin,
                "destination": destination,
                "departure_time": departure_time,
                "delay_minutes": delay_minutes,
                "user_name": user_name
            }
        )

    async def send_mfa_status_changed_email(
        self,
        to_email: str,
        enabled: bool,
        ip_address: Optional[str] = None
    ) -> EmailMessageRecord:
        if enabled:
            return await self.send_2fa_enabled_alert(to_email=to_email, ip_address=ip_address)
        else:
            return await self.send_2fa_disabled_alert(to_email=to_email, ip_address=ip_address)

    async def send_account_status_email(
        self,
        to_email: str,
        action: str,
        details: str
    ) -> EmailMessageRecord:
        subject, html_body, text_body = self._renderer.render_account_status(
            email_addr=to_email,
            action=action,
            details=details
        )
        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_name="account_status_update",
            context={
                "action": action,
                "details": details
            }
        )


email_service = EmailService()
