from __future__ import annotations

import json
from typing import Any


DEFAULT_PROMPTS = {
    "globalFacts": """你是短视频编导研究助手。严格区分来源事实、平台数据和AI推断；没有证据时明确说未获取或待验证。不要把相关性写成确定因果，不编造播放量、作者原话、镜头或声音。所有输出使用简体中文。""",
    "videoBreakdown": """完整理解输入视频，输出JSON。拆解内容主题、前三秒钩子、按时间推进的文案与画面、拍摄剪辑声音字幕、传播机制证据、可迁移原则和不可照搬内容。originalCopy只能填写视频中确实表达的内容，无法确认逐字稿时用忠实概括并在boundary说明。""",
    "profileIntake": """把用户的一段自然语言整理为短视频复刻所需的内容生产上下文。资料不足时只问一个最关键问题，最多两轮；不要把用户没有说过的内容伪装成事实，推断字段必须列入inferredFields。""",
    "videoTopics": """基于单条视频报告中可迁移的结构机制和目标账号资料，生成20个彼此有明显差异、可以实际拍摄的选题。迁移机制，不复制原作者具体话术和事实。""",
    "accountSummary": """综合账号元数据和真实逐条深拆报告，输出账号在当前样本范围内的定位、内容支柱、阶段变化、钩子模式、高表现与常态差异、可迁移规则和风险。所有结论注明证据边界。""",
    "accountTopics": """基于账号综合报告和目标资料生成20个可执行选题。吸收账号的内容方法和组合思路，不复制其个人经历、品牌事实和原话。""",
    "scriptGeneration": """把选中的选题写成编导可拍稿：标题、前三秒钩子、完整口播文案、分段表达任务、画面或录屏提示、节奏、结尾互动和制作注意事项。内容必须符合目标资料的资源和限制。""",
}


def video_breakdown_prompt(source: dict[str, Any], configured: dict[str, str]) -> str:
    schema = {
        "summary": "",
        "theme": "",
        "hook": {"copy": "", "mechanism": "", "visualAction": ""},
        "beats": [{"timecode": "00:00-00:03", "originalCopy": "", "role": "", "emotion": "", "visual": "", "transition": ""}],
        "craft": {"filming": [], "editing": [], "audio": [], "captions": []},
        "evidence": [{"label": "", "evidence": "", "confidence": "高|中|待验证"}],
        "transferable": [], "avoidCopying": [], "boundary": "",
    }
    return _compose(configured, "videoBreakdown", source, schema)


def account_summary_prompt(payload: dict[str, Any], configured: dict[str, str]) -> str:
    schema = {
        "promise": "", "pillars": [{"name": "", "ratio": 0, "note": ""}],
        "timeline": [{"phase": "", "range": "", "action": "", "signal": ""}],
        "hookPatterns": [],
        "viralVsNormal": [{"dimension": "", "viral": "", "normal": "", "conclusion": ""}],
        "transferable": [{"rule": "", "evidence": "", "boundary": ""}],
        "risks": [], "testTopics": [{"title": "", "reason": "", "priority": "优先|备选"}],
        "boundary": "",
    }
    return _compose(configured, "accountSummary", payload, schema)


def topics_prompt(kind: str, report: dict[str, Any], profile: dict[str, Any], configured: dict[str, str]) -> str:
    schema = {"topics": [{"title": "", "angle": "", "hook": "", "reason": "", "inheritedMechanism": "", "adaptation": ""}]}
    key = "videoTopics" if kind == "video" else "accountTopics"
    return _compose(configured, key, {"report": report, "profile": profile, "required_count": 20}, schema)


def script_prompt(topic: dict[str, Any], profile: dict[str, Any], configured: dict[str, str]) -> str:
    schema = {
        "title": "", "openingHook": "", "duration": "", "fullCopy": "",
        "segments": [{"time": "00:00-00:03", "task": "", "copy": "", "shooting": "", "rhythm": ""}],
        "cta": "", "productionNotes": [],
    }
    return _compose(configured, "scriptGeneration", {"topic": topic, "profile": profile}, schema)


def intake_prompt(description: str, answers: list[str], configured: dict[str, str]) -> str:
    schema = {
        "status": "followup|complete", "question": "",
        "draft": {"name": "", "industry": "", "creatorIdentity": "", "audience": "", "valuePromise": "", "formatsAndResources": "", "constraints": "", "originalDescription": description, "inferredFields": []},
    }
    return _compose(configured, "profileIntake", {"description": description, "answers": answers, "remaining_followups": max(0, 2 - len(answers))}, schema)


def _compose(configured: dict[str, str], key: str, payload: Any, schema: Any) -> str:
    global_rule = configured.get("globalFacts") or DEFAULT_PROMPTS["globalFacts"]
    scene = configured.get(key) or DEFAULT_PROMPTS[key]
    return f"""{global_rule}\n\n{scene}\n\n输入材料：\n{json.dumps(payload, ensure_ascii=False)}\n\n只返回一个JSON对象，不要使用Markdown代码块。结构必须符合：\n{json.dumps(schema, ensure_ascii=False)}"""
