from __future__ import annotations

import json
import re
from typing import Any, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from .schemas import RuntimeSettingsIn

T = TypeVar("T", bound=BaseModel)


class ModelOutputError(RuntimeError):
    pass


def _response_text(response: Any) -> str:
    direct = getattr(response, "output_text", None)
    if direct:
        return str(direct)
    chunks: list[str] = []
    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            text = getattr(content, "text", None)
            if text:
                chunks.append(str(text))
    return "\n".join(chunks)


def parse_json_text(text: str) -> Any:
    cleaned = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.S)
    if fenced:
        cleaned = fenced.group(1).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start:end + 1])
        raise


class ModelClient:
    def __init__(self, settings: RuntimeSettingsIn):
        if not settings.apiKey or not settings.model:
            raise RuntimeError("模型 API Key 或模型名称尚未配置")
        self.settings = settings
        self.client = OpenAI(api_key=settings.apiKey, base_url=settings.baseUrl.rstrip("/"), timeout=settings.timeout)

    def text(self, prompt: str, *, max_output_tokens: int = 8000) -> str:
        response = self.client.responses.create(
            model=self.settings.model,
            input=prompt,
            max_output_tokens=max_output_tokens,
            store=False,
        )
        text = _response_text(response)
        if not text.strip():
            raise ModelOutputError("模型没有返回文本")
        return text

    def json(self, prompt: str, schema: type[T], *, max_output_tokens: int = 12000) -> T:
        first = self.text(prompt, max_output_tokens=max_output_tokens)
        try:
            return schema.model_validate(parse_json_text(first))
        except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as first_error:
            schema_json = json.dumps(schema.model_json_schema(), ensure_ascii=False)
            repair = self.text(
                "以下输出没有满足JSON结构。保留原有专业内容，"
                "只修复字段与格式，不要重新分析或压缩信息。只返回JSON对象，不增加解释。\n"
                f"目标JSON Schema：\n{schema_json}\n校验错误：\n{first_error}\n原输出：\n{first}",
                max_output_tokens=max_output_tokens,
            )
            try:
                return schema.model_validate(parse_json_text(repair))
            except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as exc:
                raise ModelOutputError(f"模型输出两次校验失败：{exc}") from exc

    def raw_json(self, prompt: str, *, max_output_tokens: int = 12000) -> dict[str, Any]:
        first = self.text(prompt, max_output_tokens=max_output_tokens)
        try:
            value = parse_json_text(first)
            if not isinstance(value, dict):
                raise TypeError("顶层必须是对象")
            return value
        except Exception as first_error:
            repair = self.text(
                f"请把下面内容修复成一个JSON对象，只返回JSON。\n错误：{first_error}\n{first}",
                max_output_tokens=max_output_tokens,
            )
            value = parse_json_text(repair)
            if not isinstance(value, dict):
                raise ModelOutputError("修复后的顶层仍不是JSON对象")
            return value
