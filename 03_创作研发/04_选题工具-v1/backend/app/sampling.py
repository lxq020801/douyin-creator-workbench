from __future__ import annotations

from typing import Any


def performance_score(item: dict[str, Any]) -> float:
    views = max(0, int(item.get("view_count") or 0))
    likes = max(0, int(item.get("like_count") or 0))
    comments = max(0, int(item.get("comment_count") or 0))
    shares = max(0, int(item.get("share_count") or 0))
    collects = max(0, int(item.get("collect_count") or 0))
    if views:
        return (likes + comments * 3 + shares * 4 + collects * 3) / views
    return likes + comments * 3 + shares * 4 + collects * 3


def balanced_sample(items: list[dict[str, Any]], target: int = 30) -> list[tuple[dict[str, Any], str]]:
    videos = [item for item in items if item.get("media_type", "video") == "video" and item.get("video_url")]
    if len(videos) <= target:
        return [(item, "available") for item in videos]

    selected: list[tuple[dict[str, Any], str]] = []
    used: set[str] = set()

    def add(candidates: list[dict[str, Any]], count: int, role: str) -> None:
        added = 0
        for item in candidates:
            source_id = str(item.get("video_id"))
            if not source_id or source_id in used:
                continue
            selected.append((item, role))
            used.add(source_id)
            added += 1
            if added >= count:
                break

    add(sorted(videos, key=performance_score, reverse=True), 12, "high_performance")
    add(sorted(videos, key=lambda item: item.get("published_at") or "", reverse=True), 8, "recent")

    remaining = [item for item in videos if str(item.get("video_id")) not in used]
    remaining.sort(key=lambda item: (item.get("published_at") or "", performance_score(item)))
    if remaining:
        stride = max(1, len(remaining) / 10)
        spread = [remaining[min(len(remaining) - 1, int(index * stride))] for index in range(10)]
        add(spread + remaining, 10, "baseline")

    if len(selected) < target:
        add([item for item in videos if str(item.get("video_id")) not in used], target - len(selected), "fill")
    return selected[:target]
