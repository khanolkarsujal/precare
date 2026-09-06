import os
import time
import json
import base64
import hmac
import hashlib
import secrets
import logging
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException, status

logger = logging.getLogger("precare.auth")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
SECRET_KEY_ENV = os.getenv("SECRET_KEY", "").strip()

# In production, disallow missing SECRET_KEY
if ENVIRONMENT == "production" and not SECRET_KEY_ENV:
    raise RuntimeError(
        "CRITICAL SECURITY CONFIGURATION: SECRET_KEY environment variable MUST be set in production mode!"
    )

SECRET_KEY = SECRET_KEY_ENV or "precare-development-secret-key-do-not-use-in-production"
TOKEN_EXPIRATION_SECONDS = 7 * 24 * 3600  # 7 days


# -----------------------------------------------------------------------------
# Password Hashing (PBKDF2-HMAC-SHA512)
# -----------------------------------------------------------------------------
def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Generate salted PBKDF2-HMAC-SHA512 hash with 10,000 iterations."""
    if not salt:
        salt = secrets.token_hex(16)
    
    dk = hashlib.pbkdf2_hmac(
        'sha512',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        10000
    )
    return dk.hex(), salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verify clear password against stored hash using constant-time comparison."""
    test_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(test_hash, stored_hash)


def sanitize_clinic(clinic: Dict[str, Any]) -> Dict[str, Any]:
    """Return clinic record without password hashes or salts."""
    if not clinic:
        return {}
    clean = dict(clinic)
    clean.pop("password_hash", None)
    clean.pop("passwordHash", None)
    clean.pop("salt", None)
    return clean


# -----------------------------------------------------------------------------
# Cryptographic Session Tokens (HMAC-SHA256)
# -----------------------------------------------------------------------------
def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')


def _base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4)) if len(data) % 4 != 0 else ''
    return base64.urlsafe_b64decode((data + padding).encode('utf-8'))


def create_access_token(clinic_id: str, email: str) -> str:
    """Generate a signed cryptographic token with expiration."""
    payload = {
        "clinic_id": clinic_id,
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRATION_SECONDS,
    }
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = _base64url_encode(payload_json.encode('utf-8'))
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return f"{payload_b64}.{signature}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify HMAC signature and decode payload. Returns None if invalid or expired."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        
        payload_b64, signature = parts
        expected_sig = hmac.new(
            SECRET_KEY.encode('utf-8'),
            payload_b64.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not secrets.compare_digest(expected_sig, signature):
            return None
        
        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        # Check token expiration
        if payload.get("exp", 0) < time.time():
            return None
            
        return payload
    except Exception as e:
        logger.debug(f"Token decode error: {e}")
        return None


# -----------------------------------------------------------------------------
# FastAPI Authentication Dependency
# -----------------------------------------------------------------------------
def get_current_clinic(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency that:
    1. Reads Authorization: Bearer <token>
    2. Validates cryptographic signature and expiration
    3. Verifies clinic exists in database
    4. Rejects missing/invalid tokens with HTTP 401
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ok": False, "error": "Authentication required. Missing Bearer token."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload or not payload.get("clinic_id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ok": False, "error": "Invalid or expired authentication session. Please log in again."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    clinic_id = payload["clinic_id"]

    # Late import to prevent circular dependency
    from .database import get_connection
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clinics WHERE id = ?", (clinic_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"ok": False, "error": "Clinic account no longer exists."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    clinic_data = dict(row)
    return sanitize_clinic(clinic_data)
