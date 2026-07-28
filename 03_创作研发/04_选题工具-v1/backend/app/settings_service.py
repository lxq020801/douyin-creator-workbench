from __future__ import annotations

import json

from sqlalchemy.ext.asyncio import AsyncSession

from .db import Setting
from .prompts import DEFAULT_PROMPTS
from .schemas import RuntimeSettingsIn, RuntimeSettingsOut
from .security import decrypt_secret, encrypt_secret, mask_secret


DEFAULTS = RuntimeSettingsIn(prompts=DEFAULT_PROMPTS)
SECRET_KEYS = {"apiKey", "douyinCookie"}


async def _read(session: AsyncSession, key: str) -> str | None:
    row = await session.get(Setting, key)
    if row is None:
        return None
    return decrypt_secret(row.value) if row.encrypted else row.value


async def _write(session: AsyncSession, key: str, value: str, encrypted: bool = False) -> None:
    row = await session.get(Setting, key)
    stored = encrypt_secret(value) if encrypted else value
    if row is None:
        session.add(Setting(key=key, value=stored, encrypted=encrypted))
    else:
        row.value = stored
        row.encrypted = encrypted


async def get_runtime_settings(session: AsyncSession) -> RuntimeSettingsIn:
    values = DEFAULTS.model_dump()
    for key in ("apiKey", "baseUrl", "model", "timeout", "videoFps", "maxConcurrent", "douyinCookie", "prompts"):
        raw = await _read(session, key)
        if raw is None:
            continue
        if key in {"timeout", "maxConcurrent"}:
            values[key] = int(raw)
        elif key == "videoFps":
            values[key] = float(raw)
        elif key == "prompts":
            values[key] = {**DEFAULT_PROMPTS, **json.loads(raw)}
        else:
            values[key] = raw
    return RuntimeSettingsIn.model_validate(values)


async def get_public_settings(session: AsyncSession) -> RuntimeSettingsOut:
    value = await get_runtime_settings(session)
    raw = value.model_dump()
    raw["apiKeyConfigured"] = bool(value.apiKey)
    raw["douyinCookieConfigured"] = bool(value.douyinCookie)
    raw["apiKey"] = mask_secret(value.apiKey)
    raw["douyinCookie"] = mask_secret(value.douyinCookie)
    return RuntimeSettingsOut.model_validate(raw)


async def save_runtime_settings(session: AsyncSession, incoming: RuntimeSettingsIn) -> RuntimeSettingsOut:
    current = await get_runtime_settings(session)
    values = incoming.model_dump()
    for key in SECRET_KEYS:
        if "*" in values[key]:
            values[key] = getattr(current, key)
    values["prompts"] = {**DEFAULT_PROMPTS, **values.get("prompts", {})}
    for key, value in values.items():
        raw = json.dumps(value, ensure_ascii=False) if key == "prompts" else str(value)
        await _write(session, key, raw, encrypted=key in SECRET_KEYS)
    await session.commit()
    return await get_public_settings(session)
