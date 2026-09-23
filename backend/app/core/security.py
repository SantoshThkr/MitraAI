import hashlib
import secrets

import bcrypt

PASSWORD_MAX_BYTES = 72


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Sessions are looked up by digest so a database leak cannot replay cookies."""
    return hashlib.sha256(token.encode()).hexdigest()
