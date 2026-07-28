from app.sampling import balanced_sample


def item(index: int, *, media_type: str = "video") -> dict:
    return {
        "video_id": str(index), "video_url": "https://example.com/video.mp4",
        "media_type": media_type, "view_count": 1000 + index,
        "like_count": index * 10, "comment_count": index,
        "share_count": index, "collect_count": index,
        "published_at": f"2026-07-{(index % 28) + 1:02d}",
    }


def test_balanced_sample_has_expected_mix_and_no_duplicates():
    result = balanced_sample([item(index) for index in range(50)])
    assert len(result) == 30
    assert len({entry["video_id"] for entry, _ in result}) == 30
    assert [role for _, role in result].count("high_performance") == 12
    assert [role for _, role in result].count("recent") == 8
    assert [role for _, role in result].count("baseline") == 10


def test_image_posts_are_metadata_only_and_short_accounts_use_all_videos():
    result = balanced_sample([item(index) for index in range(9)] + [item(99, media_type="image_post")])
    assert len(result) == 9
    assert all(role == "available" for _, role in result)
