from __future__ import annotations

import hashlib
import hmac
import secrets
import string
import time
from dataclasses import dataclass

from constants import RESET_TOKEN_EXPIRE_MINUTES, SECRET_KEY

_PASSWORD_HASH_ITERATIONS = 390000
_SESSION_TTL_SECONDS = 2 * 60 * 60  # 2 hours
_DEFAULT_PASSWORD_LENGTH = 8


def _require_secret_key() -> str:
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable must be set")
    return SECRET_KEY


def _derive_key(password: str, salt: str) -> str:
    secret_key = _require_secret_key()
    payload = f"{salt}{secret_key}".encode()
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        payload,
        _PASSWORD_HASH_ITERATIONS,
    )
    return digest.hex()


def hash_password(password: str, *, salt: str | None = None) -> str:
    if salt is None:
        salt = secrets.token_hex(16)
    key = _derive_key(password, salt)
    return f"{salt}${key}"


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        salt, key = hashed_password.split("$", 1)
    except ValueError:
        return False
    candidate = _derive_key(password, salt)
    return secrets.compare_digest(candidate, key)


def generate_session_token(user_identifier: str) -> tuple[str, int]:
    nonce = secrets.token_urlsafe(32)
    secret_key = _require_secret_key()
    payload = f"{user_identifier}:{nonce}".encode()
    signature = hmac.new(secret_key.encode(), payload, hashlib.sha256).hexdigest()
    token = f"{nonce}.{signature}"
    expires_at = int((time.time() + _SESSION_TTL_SECONDS) * 1000)
    return token, expires_at


@dataclass(slots=True)
class ResetToken:
    token: str
    expires_at: int


def generate_reset_token() -> ResetToken:
    token = secrets.token_urlsafe(32)
    expires_in_seconds = RESET_TOKEN_EXPIRE_MINUTES * 60
    expires_at = int((time.time() + expires_in_seconds) * 1000)
    return ResetToken(token=token, expires_at=expires_at)


def generate_random_password(length: int = _DEFAULT_PASSWORD_LENGTH) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))
