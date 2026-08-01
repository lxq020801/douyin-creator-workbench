from __future__ import annotations

import json

from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import Setting
from .prompts import DEFAULT_PROMPTS
from .schemas import RuntimeSettingsIn, RuntimeSettingsOut


DEFAULTS = RuntimeSettingsIn(prompts=DEFAULT_PROMPTS)


async def _read(session: AsyncSession, key: str) -> str | None:
    row = await session.get(Setting, key)
    if row is None:
        return None
    return row.value


async def _write(session: AsyncSession, key: str, value: str) -> None:
    row = await session.get(Setting, key)
    if row is None:
        session.add(Setting(key=key, value=value))
    else:
        row.value = value


async def get_runtime_settings(session: AsyncSession) -> RuntimeSettingsIn:
    values = DEFAULTS.model_dump()
    saved_prompt_version = await _read(session, "promptPackVersion")
    for key in ("apiKey", "baseUrl", "model", "timeout", "videoFps", "maxConcurrent", "douyinCookie", "prompts"):
        raw = await _read(session, key)
        if raw is None:
            continue
        if key in {"timeout", "maxConcurrent"}:
            values[key] = int(raw)
        elif key == "videoFps":
            values[key] = float(raw)
        elif key == "prompts":
            if saved_prompt_version == settings.prompt_pack_version:
                try:
                    saved_prompts = json.loads(raw)
                    values[key] = {
                        prompt_key: str(saved_prompts.get(prompt_key, default))
                        for prompt_key, default in DEFAULT_PROMPTS.items()
                    }
                except (TypeError, ValueError, json.JSONDecodeError):
                    values[key] = dict(DEFAULT_PROMPTS)
        else:
            values[key] = raw
    return RuntimeSettingsIn.model_validate(values)


async def get_public_settings(session: AsyncSession) -> RuntimeSettingsOut:
    value = await get_runtime_settings(session)
    raw = value.model_dump()
    raw["apiKeyConfigured"] = bool(value.apiKey)
    raw["douyinCookieConfigured"] = bool(value.douyinCookie)
    raw["apiKey"] = ""
    raw["douyinCookie"] = ""
    raw["promptPackVersion"] = settings.prompt_pack_version
    return RuntimeSettingsOut.model_validate(raw)


async def save_runtime_settings(session: AsyncSession, incoming: RuntimeSettingsIn) -> RuntimeSettingsOut:
    values = incoming.model_dump()
    current = await get_runtime_settings(session)
    if not values["apiKey"].strip() and current.apiKey:
        values["apiKey"] = current.apiKey
    if not values["douyinCookie"].strip() and current.douyinCookie:
        values["douyinCookie"] = current.douyinCookie
    submitted_prompts = values.get("prompts", {})
    values["prompts"] = {
        prompt_key: str(submitted_prompts.get(prompt_key, default))
        for prompt_key, default in DEFAULT_PROMPTS.items()
    }
    for key, value in values.items():
        raw = json.dumps(value, ensure_ascii=False) if key == "prompts" else str(value)
        await _write(session, key, raw)
    await _write(session, "promptPackVersion", settings.prompt_pack_version)
    await session.commit()
    return await get_public_settings(session)
