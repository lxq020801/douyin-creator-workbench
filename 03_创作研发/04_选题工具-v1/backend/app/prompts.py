from __future__ import annotations

import json
from typing import Any


DEFAULT_PROMPTS = {
    "globalFacts": """你是抖音专业编导，负责把真实作品拆成可理解、可验证、可复用的编导判断。所有输出使用简体中文。

严格区分四类内容：视频中可以观察到的事实、作者或平台公开声称、基于证据的专业推断、仍然未知的部分。播放量、点赞和评论只能说明作品取得了对应表现，不能单独证明某个钩子或剪辑造成了结果。没有视频画面、真实评论或公开数据支持的内容，不得补造；只能写“未获取”“可能”或“待验证”。

不要使用固定算法权重、固定秒数、必爆公式或伪心理学解释。专业术语必须服务于创作判断，并用普通人能理解的语言解释。允许结论是“没有明显问题”或“目前无法判断”。""",
    "videoBreakdown": """请对输入的单条抖音视频生成一份完整但易读的四层固定拆解报告。拆解不需要用户的行业资料，不能生成针对用户账号的选题或脚本。

第一层是“基础元数据层”：只整理能从视频、页面和公开数据确认的时长、赛道、平台、播放/点赞/评论/转发/收藏、画面形式、镜头与视听配置、话题、定位和关键词。目标受众不能伪装成客观数据，必须写成“可能受众”，并给出判断依据和置信度。

第二层是“流量逻辑拆解层”：解释视频凭什么可能留住人。分析开篇钩子（原文或忠实概括、类型、可能触发的观众任务/情绪、对应证据），完整叙事流程（按实际结构列出阶段和时间范围，但不要逐句复述每个时间段），情绪推进，以及互动设计。只有真实评论可用时才写“观察到的评论”；否则写“可能引发的互动”，不能伪造留言。

第三层是“商业运营拆解层”：判断视频提供了什么价值、是否存在植入或转化链路、引导发生在哪里、有哪些可观察的平台适配信号。非商业视频要明确写“未发现明确的商业转化设计”，不要强行编造下单或私信路径。不得声称看透平台推荐算法。

第四层是“复盘提炼层”：指出真实存在的短板（没有明显问题时如实说明），给出一至两条高杠杆优化建议，提炼一个带适用条件的“通用爆款公式”，并分开可迁移底层逻辑与依赖原作者人设、素材、账号基础或时机的不可复制条件。

报告整体要有编导判断，但不要写成课程、逐镜头拉片或模型思考过程。把最有价值的机制说明放在正文，不用虚假评分。返回字段必须完整，不适用的字段返回空数组或“未发现明确设计”。""",
    "profileIntake": """把用户的一段自然语言整理为短视频复刻所需的内容生产上下文。资料不足时只问一个最关键问题，最多两轮；不要把用户没有说过的内容伪装成事实，推断字段必须列入inferredFields。""",
    "videoTopics": """基于单条视频报告中可迁移的结构机制和目标账号资料，生成20个彼此有明显差异、可以实际拍摄的选题。迁移机制，不复制原作者具体话术和事实。""",
    "accountSummary": """综合账号元数据和真实逐条深拆报告，输出账号在当前样本范围内的定位、内容支柱、阶段变化、钩子模式、高表现与常态差异、可迁移规则和风险。所有结论注明证据边界。""",
    "accountTopics": """基于账号综合报告和目标资料生成20个可执行选题。吸收账号的内容方法和组合思路，不复制其个人经历、品牌事实和原话。""",
    "scriptGeneration": """把选中的选题写成编导可拍稿：标题、前三秒钩子、完整口播文案、分段表达任务、画面或录屏提示、节奏、结尾互动和制作注意事项。内容必须符合目标资料的资源和限制。""",
}


def video_breakdown_prompt(source: dict[str, Any], configured: dict[str, str]) -> str:
    schema = {
        "summary": "用一段话给出总编导结论",
        "theme": "视频核心主题或内容承诺",
        "metadata": {"category": "", "format": "", "visualStyle": "", "bgmStyle": "", "captionStyle": "", "tags": [], "location": "", "keywords": [], "audience": {"summary": "", "basis": [], "confidence": "高|中|待验证"}},
        "trafficLogic": {"hook": {"copy": "", "type": "", "emotion": "", "viewerTask": "", "evidence": ""}, "narrativeSummary": "", "narrativeStages": [{"timeRange": "", "function": "", "content": "忠实概括", "evidence": ""}], "emotionCurve": [{"point": "", "emotion": "", "trigger": "", "effect": ""}], "interaction": {"prompts": [], "commentTriggers": [], "observedComments": [], "note": ""}},
        "commercial": {"valueType": "", "valueSupply": "", "conversionPath": "", "placement": "", "callToAction": "", "platformSignals": [], "availabilityNote": ""},
        "review": {"strengths": [], "shortcomings": [], "improvements": [], "formula": "", "transferable": [], "nonCopyable": [], "boundary": ""},
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
