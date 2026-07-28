import type {CSSProperties, ReactNode} from "react";
import {Easing, interpolate} from "remotion";

export const FPS = 30;
export const DURATION = 180;

export const enter = (frame: number, start: number, duration = 18) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const glide = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const snap = (frame: number, start: number, duration = 14) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const countToTwenty = (frame: number) =>
  Math.round(
    interpolate(frame, [84, 150], [1, 20], {
      easing: Easing.bezier(0.45, 0, 0.55, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

type PresenterProps = {
  readonly accent: string;
  readonly background: string;
  readonly foreground: string;
  readonly frame: number;
  readonly label?: string;
  readonly style?: CSSProperties;
  readonly variant?: "portrait" | "cutout" | "mono";
};

export const Presenter = ({
  accent,
  background,
  foreground,
  frame,
  label = "真人口播",
  style,
  variant = "portrait",
}: PresenterProps) => {
  const intro = enter(frame, 5, 20);
  const breathe = 1 + Math.sin((frame / FPS) * Math.PI * 0.8) * 0.012;

  return (
    <div
      style={{
        background,
        color: foreground,
        overflow: "hidden",
        position: "relative",
        scale: breathe,
        ...style,
      }}
    >
      <div
        style={{
          height: "100%",
          opacity: intro,
          position: "relative",
          translate: `0 ${28 * (1 - intro)}px`,
          width: "100%",
        }}
      >
        <div
          style={{
            background: foreground,
            borderRadius: variant === "cutout" ? "48% 52% 46% 54%" : "50%",
            height: "29%",
            left: "36%",
            opacity: variant === "mono" ? 0.9 : 0.82,
            position: "absolute",
            top: "16%",
            width: "28%",
          }}
        />
        <div
          style={{
            background: foreground,
            borderRadius: variant === "cutout" ? "44% 56% 0 0" : "46% 46% 8% 8%",
            bottom: variant === "cutout" ? "-10%" : "-2%",
            height: "58%",
            left: "17%",
            opacity: variant === "mono" ? 0.9 : 0.82,
            position: "absolute",
            width: "66%",
          }}
        />
        <div
          style={{
            background: accent,
            height: variant === "cutout" ? 18 : 10,
            left: "29%",
            position: "absolute",
            rotate: variant === "cutout" ? "-8deg" : "0deg",
            top: "49%",
            width: "42%",
          }}
        />
      </div>
      <div
        style={{
          background: accent,
          bottom: 18,
          color: foreground,
          fontFamily: '"PingFang SC", sans-serif',
          fontSize: 24,
          fontWeight: 700,
          left: 18,
          padding: "8px 12px",
          position: "absolute",
        }}
      >
        {label}
      </div>
    </div>
  );
};

type ScreenMockProps = {
  readonly accent: string;
  readonly background: string;
  readonly foreground: string;
  readonly frame: number;
  readonly line?: string;
  readonly style?: CSSProperties;
  readonly title?: string;
};

export const ScreenMock = ({
  accent,
  background,
  foreground,
  frame,
  line = "爆款结构 → 行业关键词 → 新选题",
  style,
  title = "选题迁移器",
}: ScreenMockProps) => {
  const intro = enter(frame, 48, 18);
  const progress = glide(frame, 72, 150);
  const rows = ["痛点切入", "反常识对比", "结果证明", "步骤拆解"];

  return (
    <div
      style={{
        background,
        color: foreground,
        opacity: intro,
        overflow: "hidden",
        position: "relative",
        translate: `0 ${42 * (1 - intro)}px`,
        ...style,
      }}
    >
      <div
        style={{
          alignItems: "center",
          borderBottom: `2px solid ${foreground}24`,
          display: "flex",
          fontSize: 22,
          fontWeight: 700,
          height: 64,
          justifyContent: "space-between",
          padding: "0 22px",
        }}
      >
        <span>{title}</span>
        <span style={{color: accent}}>LIVE BUILD</span>
      </div>
      <div style={{padding: 22}}>
        <div style={{fontSize: 20, opacity: 0.64}}>输入结构</div>
        <div
          style={{
            border: `2px solid ${foreground}`,
            fontSize: 24,
            fontWeight: 700,
            marginTop: 10,
            padding: "14px 16px",
          }}
        >
          {line}
        </div>
        <div
          style={{
            alignItems: "end",
            display: "flex",
            justifyContent: "space-between",
            marginTop: 18,
          }}
        >
          <div>
            <div style={{fontSize: 20, opacity: 0.64}}>已生成</div>
            <div style={{fontSize: 62, fontWeight: 900, lineHeight: 1}}>
              {countToTwenty(frame)}
            </div>
          </div>
          <div style={{fontSize: 22, fontWeight: 700}}>个新选题</div>
        </div>
        <div style={{display: "grid", gap: 8, marginTop: 18}}>
          {rows.map((row, index) => (
            <div
              key={row}
              style={{
                alignItems: "center",
                display: "flex",
                fontSize: 19,
                gap: 10,
                opacity: progress > index * 0.18 ? 1 : 0.18,
              }}
            >
              <span
                style={{
                  background: progress > index * 0.18 ? accent : `${foreground}26`,
                  display: "block",
                  height: 8,
                  width: 24,
                }}
              />
              {String(index + 1).padStart(2, "0")} / {row}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const SafeFrame = ({children}: {readonly children: ReactNode}) => (
  <div
    style={{
      bottom: 118,
      left: 62,
      pointerEvents: "none",
      position: "absolute",
      right: 62,
      top: 96,
    }}
  >
    {children}
  </div>
);

export const StepRail = ({
  accent,
  frame,
  foreground,
  style,
}: {
  readonly accent: string;
  readonly frame: number;
  readonly foreground: string;
  readonly style?: CSSProperties;
}) => {
  const labels = ["拆结构", "换行业", "生成"];
  const active = Math.min(2, Math.floor(glide(frame, 42, 138) * 3));

  return (
    <div
      style={{
        alignItems: "center",
        color: foreground,
        display: "flex",
        gap: 12,
        ...style,
      }}
    >
      {labels.map((label, index) => (
        <div key={label} style={{alignItems: "center", display: "flex", gap: 12}}>
          <span
            style={{
              background: index <= active ? accent : `${foreground}22`,
              color: index <= active ? foreground : `${foreground}88`,
              display: "grid",
              fontSize: 21,
              fontWeight: 700,
              height: 42,
              placeItems: "center",
              width: 42,
            }}
          >
            {index + 1}
          </span>
          <span style={{fontSize: 24, fontWeight: 700}}>{label}</span>
          {index < labels.length - 1 ? <span style={{opacity: 0.42}}>→</span> : null}
        </div>
      ))}
    </div>
  );
};

