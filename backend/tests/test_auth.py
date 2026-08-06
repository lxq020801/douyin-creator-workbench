from __future__ import annotations

import asyncio
import json
import uuid

from fastapi.testclient import TestClient

import app.main as main_module
from app.db import Analysis, Profile, Script, ScriptVersion, SessionLocal, Topic, TopicBatch
from app.schemas import RuntimeSettingsIn


ADMIN_LOGIN = {"username": "admin", "password": "test-admin-password"}


def profile_payload(name: str) -> dict[str, str]:
    return {
        "name": name,
        "creatorAndAccount": "短视频创作者",
        "businessAndGoals": "验证工作空间隔离",
        "audienceAndAction": "目标观众关注账号",
        "availableMaterials": "真人与录屏",
        "productionConditions": "单人手机拍摄",
        "toneAndBoundaries": "真实，不编造",
        "originalDescription": "自动化测试资料",
    }


def test_login_session_is_required_and_logout_invalidates_cookie():
    with TestClient(main_module.app) as client:
        assert client.get("/api/analyses").status_code == 401
        assert client.get("/api/settings").status_code == 401
        assert client.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"}).status_code == 401

        login = client.post("/api/auth/login", json=ADMIN_LOGIN)
        assert login.status_code == 200
        assert login.json()["role"] == "admin"
        assert login.json()["workspaceId"] == "local"
        assert client.get("/api/auth/me").status_code == 200

        assert client.post("/api/auth/logout").status_code == 204
        assert client.get("/api/auth/me").status_code == 401


def test_admin_user_management_and_workspace_isolation(monkeypatch):
    suffix = uuid.uuid4().hex[:8]
    username = f"creator-{suffix}"
    first_password = "creator-password-1"
    second_password = "creator-password-2"

    async def runtime_ready(_db):
        return RuntimeSettingsIn(
            apiKey="test-key",
            model="test-model",
            analysisModel="test-model",
            replicationModel="test-model",
            douyinCookie="sessionid=test",
        )

    monkeypatch.setattr(main_module, "get_runtime_settings", runtime_ready)
    monkeypatch.setattr(main_module, "enqueue", lambda *args, **kwargs: "job-test")

    with TestClient(main_module.app) as admin_client, TestClient(main_module.app) as user_client:
        assert admin_client.post("/api/auth/login", json=ADMIN_LOGIN).status_code == 200
        created = admin_client.post("/api/admin/users", json={
            "username": username,
            "displayName": "测试创作者",
            "password": first_password,
            "role": "user",
        })
        assert created.status_code == 200
        user = created.json()
        assert user["workspaceId"] != "local"

        admin_profile = admin_client.post("/api/profiles", json=profile_payload("管理员资料")).json()
        admin_analysis = admin_client.post("/api/analyses/video", json={"source": "https://v.douyin.com/admin-test/"}).json()

        assert user_client.post("/api/auth/login", json={"username": username, "password": first_password}).status_code == 200
        assert user_client.get("/api/settings").status_code == 403
        assert user_client.get("/api/settings/prompts/defaults").status_code == 403
        assert user_client.get("/api/profiles").json() == []

        user_profile = user_client.post("/api/profiles", json=profile_payload("普通用户资料"))
        assert user_profile.status_code == 200
        user_profile_id = user_profile.json()["id"]
        user_analysis = user_client.post("/api/analyses/video", json={"source": "https://v.douyin.com/user-test/"})
        assert user_analysis.status_code == 200
        user_analysis_id = user_analysis.json()["id"]

        assert [item["id"] for item in user_client.get("/api/profiles").json()] == [user_profile_id]
        assert [item["id"] for item in user_client.get("/api/analyses").json()] == [user_analysis_id]
        assert user_client.get(f"/api/analyses/{admin_analysis['id']}").status_code == 404
        assert user_client.put(f"/api/profiles/{admin_profile['id']}", json=profile_payload("越权修改")).status_code == 404
        assert user_client.delete(f"/api/analyses/{admin_analysis['id']}").status_code == 404

        admin_profiles = [item["id"] for item in admin_client.get("/api/profiles").json()]
        admin_analyses = [item["id"] for item in admin_client.get("/api/analyses").json()]
        assert user_profile_id not in admin_profiles
        assert user_analysis_id not in admin_analyses

        reset = admin_client.put(f"/api/admin/users/{user['id']}/password", json={"password": second_password})
        assert reset.status_code == 204
        assert user_client.get("/api/auth/me").status_code == 401
        assert user_client.post("/api/auth/login", json={"username": username, "password": first_password}).status_code == 401
        assert user_client.post("/api/auth/login", json={"username": username, "password": second_password}).status_code == 200

        assert admin_client.delete(f"/api/admin/users/{user['id']}").status_code == 204
        assert user_client.get("/api/auth/me").status_code == 401
        assert user_client.post("/api/auth/login", json={"username": username, "password": second_password}).status_code == 401
        assert all(item["id"] != user["id"] for item in admin_client.get("/api/admin/users").json())


def test_topic_script_and_version_ids_cannot_cross_workspaces():
    suffix = uuid.uuid4().hex[:8]
    username = f"isolated-{suffix}"
    password = "isolated-password"

    async def seed_admin_content() -> tuple[str, str, str, str]:
        async with SessionLocal() as session:
            profile = Profile(
                workspace_id="local",
                name="管理员专属资料",
                data_json=json.dumps(profile_payload("管理员专属资料"), ensure_ascii=False),
            )
            analysis = Analysis(
                workspace_id="local",
                kind="video",
                source="https://v.douyin.com/private-admin/",
                status="completed",
                report_json="{}",
            )
            session.add_all([profile, analysis])
            await session.flush()
            batch = TopicBatch(
                workspace_id="local",
                analysis_id=analysis.id,
                profile_id=profile.id,
                kind="video",
                direction="管理员方向",
                spread_summary="管理员发散",
            )
            session.add(batch)
            await session.flush()
            topic = Topic(
                workspace_id="local",
                batch_id=batch.id,
                analysis_id=analysis.id,
                profile_id=profile.id,
                position=1,
                data_json=json.dumps({
                    "title": "管理员选题",
                    "concept": "角度",
                    "hook": "钩子",
                    "inheritedValue": "机制",
                    "profileConnection": "迁移",
                    "fitReason": "理由",
                    "accountRole": "",
                }, ensure_ascii=False),
            )
            session.add(topic)
            await session.flush()
            script = Script(
                workspace_id="local",
                topic_id=topic.id,
                status="failed",
                data_json="{}",
                active_version=1,
                version_count=1,
            )
            session.add(script)
            await session.flush()
            session.add(ScriptVersion(script_id=script.id, version=1, data_json="{}"))
            await session.commit()
            return profile.id, analysis.id, topic.id, script.id

    with TestClient(main_module.app) as admin_client, TestClient(main_module.app) as user_client:
        assert admin_client.post("/api/auth/login", json=ADMIN_LOGIN).status_code == 200
        created = admin_client.post("/api/admin/users", json={
            "username": username,
            "displayName": "隔离测试用户",
            "password": password,
            "role": "user",
        })
        assert created.status_code == 200
        user_id = created.json()["id"]
        assert user_client.post("/api/auth/login", json={"username": username, "password": password}).status_code == 200

        profile_id, analysis_id, topic_id, script_id = asyncio.run(seed_admin_content())
        topic_update = {
            "title": "试图越权修改",
            "concept": "",
            "hook": "",
            "inheritedValue": "",
            "profileConnection": "",
            "fitReason": "",
            "accountRole": "",
        }

        assert user_client.get(f"/api/analyses/{analysis_id}/topics").status_code == 404
        assert user_client.post(
            f"/api/analyses/{analysis_id}/topics",
            json={"profileId": profile_id},
        ).status_code == 404
        assert user_client.put(f"/api/topics/{topic_id}", json=topic_update).status_code == 404
        assert user_client.post("/api/scripts/batch", json={"topicIds": [topic_id]}).status_code == 404
        assert user_client.get(f"/api/scripts?topicId={topic_id}").json() == []
        assert user_client.get(f"/api/scripts?analysisId={analysis_id}").json() == []
        assert user_client.post(f"/api/scripts/{script_id}/retry").status_code == 404
        assert user_client.post(f"/api/scripts/{script_id}/regenerate").status_code == 404
        assert user_client.get(f"/api/scripts/{script_id}/versions").status_code == 404
        assert user_client.post(f"/api/scripts/{script_id}/versions/1/activate").status_code == 404

        assert admin_client.delete(f"/api/admin/users/{user_id}").status_code == 204
