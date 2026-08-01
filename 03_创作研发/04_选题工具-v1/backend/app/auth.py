from __future__ import annotations

import asyncio
import hashlib
import secrets
from dataclasses import dataclass
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import (
    Analysis,
    LoginSession,
    Profile,
    Script,
    ScriptVersion,
    SessionLocal,
    Topic,
    TopicBatch,
    User,
    Workspace,
    get_db,
    now,
)
from .schemas import LoginRequest, PasswordChange, UserCreate, UserOut, UserPasswordReset


password_hasher = PasswordHasher(time_cost=3, memory_cost=65_536, parallelism=2)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    username: str
    display_name: str
    role: str
    workspace_id: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def normalize_username(value: str) -> str:
    return value.strip().lower()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def user_out(row: User) -> UserOut:
    return UserOut(
        id=row.id,
        username=row.username,
        displayName=row.display_name,
        role=row.role,
        workspaceId=row.workspace_id,
        createdAt=row.created_at,
    )


def request_user(request: Request) -> AuthenticatedUser:
    value = getattr(request.state, "auth_user", None)
    if not isinstance(value, AuthenticatedUser):
        raise HTTPException(status_code=401, detail="请先登录")
    return value


def require_admin(user: AuthenticatedUser = Depends(request_user)) -> AuthenticatedUser:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="仅管理员可以访问此功能")
    return user


async def ensure_initial_admin() -> None:
    async with SessionLocal() as session:
        await session.execute(delete(LoginSession).where(LoginSession.expires_at <= now()))
        await session.commit()
        existing_count = await session.scalar(select(func.count(User.id)))
        if existing_count:
            return

        username = normalize_username(settings.initial_admin_username) or "admin"
        password = settings.initial_admin_password.strip()
        generated = not password
        if generated:
            password = secrets.token_urlsafe(18)

        workspace = await session.get(Workspace, settings.local_workspace_id)
        if workspace is None:
            workspace = Workspace(id=settings.local_workspace_id, name="管理员工作空间")
            session.add(workspace)
            await session.flush()
        session.add(User(
            workspace_id=workspace.id,
            username=username,
            display_name=settings.initial_admin_display_name.strip() or "管理员",
            password_hash=await asyncio.to_thread(password_hasher.hash, password),
            role="admin",
        ))
        await session.commit()

        if generated:
            credential_file = settings.data_dir / "initial-admin.txt"
            credential_file.write_text(
                f"username={username}\npassword={password}\n",
                encoding="utf-8",
            )
            credential_file.chmod(0o600)
            print(f"Initial admin credentials were written to {credential_file}")


async def resolve_session(token: str | None) -> AuthenticatedUser | None:
    if not token:
        return None
    async with SessionLocal() as session:
        result = (
            await session.execute(
                select(LoginSession, User)
                .join(User, User.id == LoginSession.user_id)
                .where(LoginSession.token_hash == hash_token(token))
            )
        ).one_or_none()
        if result is None:
            return None
        login_session, user = result
        if login_session.expires_at <= now() or not user.is_active:
            await session.delete(login_session)
            await session.commit()
            return None
        if login_session.last_seen_at <= now() - timedelta(minutes=15):
            login_session.last_seen_at = now()
            await session.commit()
        return AuthenticatedUser(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            role=user.role,
            workspace_id=user.workspace_id,
        )


async def _verify_password(password_hash: str, password: str) -> bool:
    try:
        return await asyncio.to_thread(password_hasher.verify, password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def _set_session_cookie(response: Response, token: str) -> None:
    max_age = settings.session_days * 24 * 60 * 60
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=max_age,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/",
    )


async def _new_login_session(db: AsyncSession, user_id: str) -> str:
    token = secrets.token_urlsafe(48)
    db.add(LoginSession(
        user_id=user_id,
        token_hash=hash_token(token),
        expires_at=now() + timedelta(days=settings.session_days),
    ))
    await db.commit()
    return token


router = APIRouter(prefix="/api")


@router.post("/auth/login", response_model=UserOut)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    username = normalize_username(payload.username)
    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if user is None or not user.is_active or not await _verify_password(user.password_hash, payload.password):
        raise HTTPException(status_code=401, detail="用户名或密码不正确")
    token = await _new_login_session(db, user.id)
    _set_session_cookie(response, token)

    credential_file = settings.data_dir / "initial-admin.txt"
    if user.username == normalize_username(settings.initial_admin_username) and credential_file.exists():
        try:
            credential_file.unlink()
        except OSError:
            pass
    return user_out(user)


@router.get("/auth/me", response_model=UserOut)
async def me(user: AuthenticatedUser = Depends(request_user), db: AsyncSession = Depends(get_db)):
    row = await db.get(User, user.id)
    if row is None:
        raise HTTPException(status_code=401, detail="登录已失效")
    return user_out(row)


@router.post("/auth/logout", status_code=204)
async def logout(request: Request, response: Response, _user: AuthenticatedUser = Depends(request_user), db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        await db.execute(delete(LoginSession).where(LoginSession.token_hash == hash_token(token)))
        await db.commit()
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=settings.secure_cookies,
        httponly=True,
        samesite="lax",
    )
    response.status_code = 204
    return response


@router.post("/auth/password", status_code=204)
async def change_password(
    payload: PasswordChange,
    response: Response,
    user: AuthenticatedUser = Depends(request_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(User, user.id)
    if row is None or not await _verify_password(row.password_hash, payload.currentPassword):
        raise HTTPException(status_code=400, detail="当前密码不正确")
    if payload.currentPassword == payload.newPassword:
        raise HTTPException(status_code=400, detail="新密码不能与当前密码相同")
    row.password_hash = await asyncio.to_thread(password_hasher.hash, payload.newPassword)
    await db.execute(delete(LoginSession).where(LoginSession.user_id == row.id))
    await db.commit()
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=settings.secure_cookies,
        httponly=True,
        samesite="lax",
    )
    response.status_code = 204
    return response


@router.get("/admin/users", response_model=list[UserOut])
async def users_list(_admin: AuthenticatedUser = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(User).order_by(User.created_at.asc()))).scalars().all()
    return [user_out(row) for row in rows]


@router.post("/admin/users", response_model=UserOut)
async def users_create(
    payload: UserCreate,
    _admin: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    username = normalize_username(payload.username)
    display_name = payload.displayName.strip()
    if not username:
        raise HTTPException(status_code=422, detail="用户名不能为空")
    if not display_name:
        raise HTTPException(status_code=422, detail="显示名称不能为空")
    workspace = Workspace(name=f"{display_name}的工作空间")
    db.add(workspace)
    await db.flush()
    row = User(
        workspace_id=workspace.id,
        username=username,
        display_name=display_name,
        password_hash=await asyncio.to_thread(password_hasher.hash, payload.password),
        role=payload.role,
    )
    db.add(row)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="这个用户名已经存在") from exc
    await db.refresh(row)
    return user_out(row)


@router.put("/admin/users/{user_id}/password", status_code=204)
async def users_reset_password(
    user_id: str,
    payload: UserPasswordReset,
    admin: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=409, detail="请从账号菜单修改自己的密码")
    row = await db.get(User, user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    row.password_hash = await asyncio.to_thread(password_hasher.hash, payload.password)
    await db.execute(delete(LoginSession).where(LoginSession.user_id == row.id))
    await db.commit()
    return Response(status_code=204)


async def _delete_workspace_data(db: AsyncSession, workspace_id: str) -> None:
    script_ids = select(Script.id).where(Script.workspace_id == workspace_id)
    await db.execute(delete(ScriptVersion).where(ScriptVersion.script_id.in_(script_ids)))
    await db.execute(delete(Script).where(Script.workspace_id == workspace_id))
    await db.execute(delete(Topic).where(Topic.workspace_id == workspace_id))
    await db.execute(delete(TopicBatch).where(TopicBatch.workspace_id == workspace_id))
    await db.execute(delete(Analysis).where(Analysis.workspace_id == workspace_id))
    await db.execute(delete(Profile).where(Profile.workspace_id == workspace_id))


@router.delete("/admin/users/{user_id}", status_code=204)
async def users_delete(
    user_id: str,
    admin: AuthenticatedUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=409, detail="不能删除当前登录的管理员")
    row = await db.get(User, user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    if row.role == "admin":
        admin_count = await db.scalar(select(func.count(User.id)).where(User.role == "admin"))
        if not admin_count or admin_count <= 1:
            raise HTTPException(status_code=409, detail="系统至少需要保留一名管理员")
    workspace_id = row.workspace_id
    await _delete_workspace_data(db, workspace_id)
    await db.delete(row)
    await db.flush()
    workspace = await db.get(Workspace, workspace_id)
    if workspace is not None:
        await db.delete(workspace)
    await db.commit()
    return Response(status_code=204)
