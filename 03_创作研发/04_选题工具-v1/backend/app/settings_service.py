from __future__ import annotations

import json

from sqlalchemy.ext.asyncio import AsyncSession

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
    for key in ("apiKey", "baseUrl", "model", "timeout", "videoFps", "maxConcurrent", "douyinCookie", "prompts"):
        raw = await _read(session, key)
        if raw is None:
            continue
        if key in {"timeout", "maxConcurrent"}:
            values[key] = int(raw)
        elif key == "videoFps":
            values[key] = float(raw)
        elif key == "prompts":
            saved_prompts = json.loads(raw)
            # Upgrade the old placeholder prompts on first read. A custom
            # prompt that is already substantial remains untouched.
            upgraded = dict(saved_prompts)
            for prompt_key, default in DEFAULT_PROMPTS.items():
                current = str(saved_prompts.get(prompt_key, ""))
                if not current.strip() or (prompt_key in {"videoBreakdown", "globalFacts"} and len(current) < 200):
                    upgraded[prompt_key] = default
            values[key] = {**DEFAULT_PROMPTS, **upgraded}
        else:
            values[key] = raw
    return RuntimeSettingsIn.model_validate(values)


async def get_public_settings(session: AsyncSession) -> RuntimeSettingsOut:
    value = await get_runtime_settings(session)
    raw = value.model_dump()
    raw["apiKeyConfigured"] = bool(value.apiKey)
    raw["douyinCookieConfigured"] = bool(value.douyinCookie)
    return RuntimeSettingsOut.model_validate(raw)


async def save_runtime_settings(session: AsyncSession, incoming: RuntimeSettingsIn) -> RuntimeSettingsOut:
    values = incoming.model_dump()
    values["prompts"] = {**DEFAULT_PROMPTS, **values.get("prompts", {})}
    for key, value in values.items():
        raw = json.dumps(value, ensure_ascii=False) if key == "prompts" else str(value)
        await _write(session, key, raw)
    await session.commit()
    return await get_public_settings(session)
