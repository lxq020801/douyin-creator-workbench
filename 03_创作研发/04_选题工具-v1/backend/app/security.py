from __future__ import annotations

import os
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from .config import settings


def _load_or_create_key(path: Path) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        return path.read_bytes().strip()
    key = Fernet.generate_key()
    path.write_bytes(key)
    os.chmod(path, 0o600)
    return key


def encrypt_secret(value: str) -> str:
    if not value:
        return ""
    return Fernet(_load_or_create_key(settings.secret_key_path)).encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    if not value:
        return ""
    try:
        return Fernet(_load_or_create_key(settings.secret_key_path)).decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise RuntimeError("本地凭据无法解密，请重新配置") from exc


def mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:3]}{'*' * 8}{value[-3:]}"
