# Animation Lab

这里放账号视频的两个代码动画实验环境，彼此隔离，不与 Agent Vicky、抖音策划台或其他项目共用依赖。

## 目录

- `remotion/`：React + Remotion，适合组件化、数据驱动和复杂时间线。
- `hyperframes/`：HTML + GSAP + HyperFrames，适合快速做讲解页、字幕包装和动效实验。

两个目录都预置了一个 4 秒、1080×1920、30 FPS 的竖屏测试样片。样片只是安装验证，不是账号首条视频模板。

## Remotion

```bash
cd "animation-lab/remotion"
npm run dev
npm run lint
npx remotion render VerticalDemo out/remotion-demo.mp4
```

## HyperFrames

```bash
cd "animation-lab/hyperframes"
npm run dev
npm run check
npm run render -- --output renders/hyperframes-demo.mp4
```

HyperFrames 的正式渲染建议先在预览页确认画面，再执行 `npm run render`。
