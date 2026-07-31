# 视频对标工具（外部提示词版）

把抖音单条视频或账号主页转换为可追溯的编导拆解报告，再结合目标账号资料生成 20 个选题和可直接拍摄的完整脚本。

## 当前状态

版本：`v0.3.0-external` 独立对比版。提示词包版本：`external-rtf-v3`。

- 单条视频：真实链接解析、下载、六板块专业拆解、20 个杂交选题、批量脚本。客观元数据由程序展示，不浪费模型分析。
- 账号主页：采集 50 条作品，均衡选择 30 条视频深拆，其余作品以元数据参与账号六板块综合研究。
- 账号资料：自然语言描述、缺少关键条件时逐问补齐、资料卡确认、编辑和多份保存。
- 工作台：真实历史、搜索、进度恢复、取消、失败重试和删除。
- 产物操作：选题编辑、单选/多选/全选生成脚本、失败脚本单独重试、复制和报告长图导出；脚本包含文案表格、互动设计与连续提词稿。
- 管理设置：模型、API、抖音 Cookie、运行参数与 7 段外部版提示词统一配置；可单独恢复任意一段默认值。

自动化测试、前端构建、桌面与移动端布局以及 Docker 健康检查已经通过。真实抖音单条视频已完成从采集、拆解、资料卡杂交、20 个选题到可拍脚本的全链路验收；账号主页的 50 条采集与 30 条深拆仍需另行完成长任务验收，因此当前不标记为正式发布版。

## 官方环境

项目只使用标准工具链和官方镜像：

- Docker Compose
- `python:3.11-slim`
- `node:22-alpine`
- `redis:7.4-alpine`
- RQ 官方命令行 Worker

本机可使用 OrbStack 或 Docker Desktop。不要把本地 Python 3.14 直接用于后端运行。

## 启动

在本目录执行：

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

默认地址：

- 产品首页：`http://127.0.0.1:4191/`
- 工作台：`http://127.0.0.1:4191/workspace`
- 管理设置：`http://127.0.0.1:4191/admin/settings`
- 后端健康检查：`http://127.0.0.1:8011/health/ready`

首次使用先进入管理设置，保存模型 API、模型名称和抖音 Cookie，然后分别运行连接测试。设置完成后再从首页提交公开抖音链接。

停止服务：

```bash
docker compose down
```

不要使用 `docker compose down -v`，否则会删除本版独立的 Redis 与业务数据卷。本版使用 `video-benchmark-external-redis-data` 和 `video-benchmark-external-app-data`，不与其他方案共享运行数据。

## 架构

```text
app/                 React + TypeScript + Vite 前端
backend/app/         FastAPI API、任务、数据与模型调用
backend/app/media/   抖音解析、下载、FFprobe、Ark Files/Responses
backend/tests/       后端自动化测试
data/                SQLite 和运行时临时文件（不提交）
compose.yml          Redis、API、前端和 3 个 RQ Worker
```

前端通过同源 `/api` 请求后端。FastAPI 将耗时任务投递到 Redis/RQ；三个独立 Worker 处理单条分析、账号样本分析和脚本生成。SQLite 保存报告、资料、选题、脚本与任务状态，视频临时文件按保留时间清理。

所有业务记录预留 `workspace_id`。本地阶段统一使用 `local`，部署阶段再接入登录与真实用户隔离。

## 账号取样

账号主页固定请求最近 50 条作品。只对有视频资源的作品进行深拆，默认选择 30 条：

- 高表现样本 12 条。
- 近期样本 8 条。
- 常态分布样本 10 条。

剩余作品和图文作品仅用点赞、评论、分享、收藏、发布时间等元数据辅助判断，不伪装成视频深拆结果。账号不足 30 条可分析视频时，使用全部可用视频并在覆盖信息中说明。

## 验证

后端测试：

```bash
cd backend
python3.11 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest -q
```

前端检查：

```bash
cd app
npm ci
npm run check
npm run build
```

容器检查：

```bash
docker compose config
docker compose ps
curl -fsS http://127.0.0.1:8011/health/ready
```

## 本地 Beta 边界

当前不包含服务器部署、域名和 HTTPS、登录注册、真实多用户权限、付费额度、Cookie 自动同步、自动发布、发布后数据回流、其他平台和本地上传。详情见 [CHANGELOG.md](CHANGELOG.md)。

第三方源码与许可证信息见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
