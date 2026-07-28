from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

import httpx

from .scripts.downloader import (
    CookieInvalidError,
    DouyinError,
    VideoMeta,
    _patch_cookie,
    download_video,
    fetch_metadata,
)


VENDOR_PATH = Path(__file__).resolve().parent / "vendor"
if str(VENDOR_PATH) not in sys.path:
    sys.path.insert(0, str(VENDOR_PATH))


class DouyinAdapterError(RuntimeError):
    pass


def extract_url(text: str) -> str:
    match = re.search(r"https?://[^\s，。！？、；：）)]+", text or "")
    if not match:
        raise DouyinAdapterError("没有识别到抖音链接")
    return match.group(0)


def _cookie_file(cookie: str, root: Path) -> Path:
    root.mkdir(parents=True, exist_ok=True)
    path = root / "douyin-cookie.txt"
    path.write_text(cookie, encoding="utf-8")
    path.chmod(0o600)
    return path


def _statistics(detail: dict[str, Any]) -> dict[str, int | None]:
    stats = detail.get("statistics") or {}
    return {
        "views": stats.get("play_count") or stats.get("play_cnt"),
        "likes": stats.get("digg_count"),
        "comments": stats.get("comment_count"),
        "shares": stats.get("share_count"),
        "collects": stats.get("collect_count") or stats.get("collect_cnt"),
    }


async def fetch_single(source: str, cookie: str, temp_root: Path) -> tuple[VideoMeta, dict[str, Any]]:
    if not cookie.strip():
        raise CookieInvalidError("抖音 Cookie 尚未配置")
    cookie_path = _cookie_file(cookie, temp_root)
    meta = await fetch_metadata(extract_url(source), cookie_path)
    detail = meta.raw.get("aweme_detail") or meta.raw
    metrics = _statistics(detail)
    published = detail.get("create_time")
    return meta, {
        "id": meta.aweme_id,
        "url": meta.source_url,
        "title": meta.title,
        "author": meta.author,
        "duration": _duration_label(meta.duration_sec),
        "coverUrl": meta.cover_url,
        "metrics": {**metrics, "publishedAt": str(published or "")},
    }


async def download_single(meta: VideoMeta, target_dir: Path) -> Path:
    return await download_video(meta, target_dir)


async def fetch_account(source: str, cookie: str, count: int = 50) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    if not cookie.strip():
        raise CookieInvalidError("抖音 Cookie 尚未配置")
    _patch_cookie(cookie)
    from crawlers.douyin.web.web_crawler import DouyinWebCrawler  # type: ignore

    crawler = DouyinWebCrawler()
    try:
        url = extract_url(source)
        sec_uid = await crawler.get_sec_user_id(url)
        if not sec_uid:
            raise DouyinAdapterError("无法从主页链接识别账号")
        raw_profile = await crawler.handler_user_profile(sec_uid)
        if not raw_profile:
            raise CookieInvalidError("账号主页采集失败，Cookie 可能已失效")
        profile = _parse_profile(raw_profile, sec_uid)
        items = await _collect_account_items(crawler, sec_uid, count)
        if not items:
            raise DouyinAdapterError("没有采集到可分析的作品")
        return profile, items
    finally:
        try:
            await crawler.close()
        except Exception:
            pass


async def _collect_account_items(crawler: Any, sec_uid: str, count: int) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    seen_cursors = {0}
    cursor = 0

    while len(items) < count:
        response = await crawler.fetch_user_post_videos(
            sec_user_id=sec_uid,
            max_cursor=cursor,
            count=min(20, count - len(items)),
        )
        if not response:
            break
        batch = response.get("aweme_list") or []
        for raw in batch:
            parsed = _parse_account_item(raw)
            if not parsed or parsed["video_id"] in seen_ids:
                continue
            seen_ids.add(parsed["video_id"])
            items.append(parsed)
            if len(items) >= count:
                break
        if len(items) >= count or not response.get("has_more") or not batch:
            break
        next_cursor = int(response.get("max_cursor") or 0)
        if next_cursor in seen_cursors:
            break
        seen_cursors.add(next_cursor)
        cursor = next_cursor
    return items


def _parse_profile(raw: dict[str, Any], sec_uid: str) -> dict[str, Any]:
    data = raw.get("data") if isinstance(raw.get("data"), dict) else raw
    user = data.get("user") or data.get("user_info") or raw.get("user") or data
    return {
        "name": user.get("nickname") or "未知账号",
        "handle": user.get("unique_id") or user.get("short_id") or sec_uid,
        "secUid": user.get("sec_uid") or sec_uid,
        "followers": user.get("follower_count") or 0,
        "videos": user.get("aweme_count") or 0,
        "signature": user.get("signature") or "",
    }


def _urls(node: Any) -> list[str]:
    if not isinstance(node, dict):
        return []
    values = node.get("url_list") or node.get("download_url_list") or []
    return [str(value) for value in values if value]


def _parse_account_item(item: dict[str, Any]) -> dict[str, Any] | None:
    source_id = str(item.get("aweme_id") or "")
    if not source_id:
        return None
    video = item.get("video") or {}
    images = item.get("images") or item.get("image_post_info") or []
    media_type = "image_post" if item.get("aweme_type") == 68 or images else "video"
    play = video.get("play_addr") or video.get("download_addr") or {}
    video_urls = _urls(play)
    video_url = video_urls[0].replace("playwm", "play") if video_urls else ""
    cover_urls = _urls(video.get("origin_cover") or video.get("cover") or {})
    stats = item.get("statistics") or {}
    published = item.get("create_time")
    return {
        "video_id": source_id,
        "url": f"https://www.douyin.com/video/{source_id}",
        "title": item.get("desc") or "无标题作品",
        "cover_url": cover_urls[0] if cover_urls else "",
        "video_url": video_url,
        "media_type": media_type,
        "view_count": stats.get("play_count") or stats.get("play_cnt"),
        "like_count": stats.get("digg_count") or 0,
        "comment_count": stats.get("comment_count") or 0,
        "share_count": stats.get("share_count") or 0,
        "collect_count": stats.get("collect_count") or stats.get("collect_cnt") or 0,
        "duration": float(video.get("duration") or 0) / 1000,
        "published_at": str(published or ""),
    }


async def download_account_video(item: dict[str, Any], target_dir: Path) -> Path:
    meta = VideoMeta(
        aweme_id=str(item["video_id"]),
        title=str(item.get("title") or "untitled"),
        author="",
        author_sec_uid="",
        duration_sec=float(item.get("duration") or 0),
        cover_url=str(item.get("cover_url") or ""),
        play_url=str(item.get("video_url") or ""),
        source_url=str(item.get("url") or ""),
        raw=item,
    )
    return await download_video(meta, target_dir)


async def probe_cookie(cookie: str) -> tuple[bool, str]:
    if "=" not in cookie or len(cookie.strip()) < 20:
        return False, "Cookie 格式不完整"
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            response = await client.get("https://www.douyin.com/", headers={"Cookie": cookie, "User-Agent": "Mozilla/5.0"})
        if response.status_code >= 500:
            return False, f"抖音返回 {response.status_code}"
        return True, "Cookie 格式与抖音连接正常；实际权限会在采集任务中继续验证"
    except httpx.HTTPError as exc:
        return False, f"无法连接抖音：{exc.__class__.__name__}"


def _duration_label(seconds: float) -> str:
    total = max(0, int(seconds))
    return f"{total // 60:02d}:{total % 60:02d}"
