# 视频对标工具前端

本目录是本地 Beta 的 React + TypeScript + Vite 前端。页面已经接入 FastAPI 真实接口，不再以 Mock 数据驱动主要流程。

## 页面

- `/`：单条视频与账号主页入口。
- `/workspace`：历史记录、搜索、状态恢复和任务管理。
- `/workspace/result/:id`：拆解报告、账号资料、20 个选题与脚本工作区。
- `/admin/settings`：模型 API、抖音 Cookie、运行参数和提示词配置。

## 本地开发

```bash
npm ci
npm run dev
```

默认地址：`http://127.0.0.1:4178`

Vite 会把 `/api` 代理到 `VITE_API_PROXY_TARGET`，默认值为 `http://127.0.0.1:8010`。Compose 环境会覆盖为后端容器地址。

## 检查与构建

```bash
npm run check
npm run build
```

## 数据边界

API Key 和抖音 Cookie 保存在本机后端数据库，设置页会直接显示完整内容，方便核对和修改。报告、账号资料、选题、脚本和任务状态全部来自后端持久化数据。

`src/data/mockData.ts` 只保留展示标签、默认资料形状等静态 UI 数据，不作为真实分析结果来源。
