import asyncio

from app.media.douyin import _collect_account_items


def raw_item(source_id: str) -> dict:
    return {
        "aweme_id": source_id,
        "desc": f"作品 {source_id}",
        "aweme_type": 0,
        "video": {
            "duration": 10000,
            "play_addr": {"url_list": [f"https://example.com/{source_id}.mp4"]},
            "cover": {"url_list": [f"https://example.com/{source_id}.jpg"]},
        },
        "statistics": {"digg_count": 10},
        "create_time": 100,
    }


def test_account_collection_deduplicates_and_stops_on_stalled_cursor():
    class FakeCrawler:
        def __init__(self):
            self.cursors: list[int] = []

        async def fetch_user_post_videos(self, *, sec_user_id: str, max_cursor: int, count: int):
            self.cursors.append(max_cursor)
            if max_cursor == 0:
                return {"aweme_list": [raw_item("1"), raw_item("2")], "has_more": True, "max_cursor": 10}
            return {"aweme_list": [raw_item("2"), raw_item("3")], "has_more": True, "max_cursor": 10}

    crawler = FakeCrawler()
    items = asyncio.run(_collect_account_items(crawler, "sec-user", 50))

    assert [item["video_id"] for item in items] == ["1", "2", "3"]
    assert crawler.cursors == [0, 10]
