import base64
import io
import secrets
from typing import List, Tuple

import pyotp
import qrcode
from qrcode.image.pil import PilImage

from app.core.config import settings
from app.core.security import hash_token


class MFAService:
    @staticmethod
    def generate_secret() -> str:
        """Generates a cryptographically random base32 TOTP secret."""
        return pyotp.random_base32()

    @staticmethod
    def get_provisioning_uri(secret: str, user_email: str) -> str:
        """Returns the standard otpauth:// provisioning URI."""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=user_email,
            issuer_name=settings.MFA_ISSUER_NAME
        )

    @staticmethod
    def generate_qr_code_base64(provisioning_uri: str) -> str:
        """Generates a base64 encoded PNG data URI of the QR code."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_b64}"

    @staticmethod
    def generate_backup_codes(count: int = 8) -> Tuple[List[str], List[str]]:
        """
        Generates `count` single-use emergency backup recovery codes.
        Returns:
            Tuple of (raw_backup_codes, hashed_backup_codes)
        """
        raw_codes = []
        hashed_codes = []
        for _ in range(count):
            # Format: XXXX-XXXX (e.g., A7B2-9F1C)
            token = f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
            raw_codes.append(token)
            hashed_codes.append(hash_token(token))
        return raw_codes, hashed_codes

    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        """
        Verifies a 6-digit TOTP code against the secret.
        Allows a clock drift window of 1 interval (+/- 30 seconds).
        """
        if not secret or not code:
            return False
        # Normalize code (strip spaces/dashes)
        clean_code = code.strip().replace(" ", "").replace("-", "")
        totp = pyotp.TOTP(secret)
        return totp.verify(clean_code, valid_window=1)

    @staticmethod
    def verify_and_consume_backup_code(
        raw_code: str,
        hashed_codes: List[str]
    ) -> Tuple[bool, List[str]]:
        """
        Verifies if raw_code matches any hashed backup code.
        If matched, returns (True, updated_hashed_codes_without_used_code).
        Otherwise returns (False, hashed_codes).
        """
        clean_code = raw_code.strip().upper()
        target_hash = hash_token(clean_code)
        
        if target_hash in hashed_codes:
            updated_list = [h for h in hashed_codes if h != target_hash]
            return True, updated_list
        return False, hashed_codes


mfa_service = MFAService()
