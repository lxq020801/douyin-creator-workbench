import {
  AbsoluteFill,
  Composition,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";

type Props = {
  readonly engine: string;
};

export const MyComponent: React.FC<Props> = ({ engine }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f3f5ef",
        color: "#171915",
        fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
        padding: "132px 84px 120px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            backgroundColor: "#171915",
            borderRadius: 6,
            color: "#ffffff",
            fontSize: 28,
            fontWeight: 700,
            padding: "13px 22px",
          }}
        >
          ANIMATION LAB
        </div>
        <div style={{ color: "#575c53", fontSize: 28, fontWeight: 600 }}>
          9:16 / 30 FPS
        </div>
      </div>

      <div style={{ marginTop: 150 }}>
        <div
          style={{
            color: "#e94f37",
            fontSize: 34,
            fontWeight: 800,
            opacity: interpolate(frame, [0, 15], [0, 1], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [0, 15], ["0px 42px", "0px 0px"], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {engine.toUpperCase()} READY
        </div>
        <div
          style={{
            fontSize: 118,
            fontWeight: 900,
            lineHeight: 1.04,
            marginTop: 34,
            maxWidth: 860,
            opacity: interpolate(frame, [8, 28], [0, 1], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [8, 28], ["0px 64px", "0px 0px"], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          一次搞定
          <span style={{ color: "#e94f37" }}> 20 个</span>
          <br />
          视频选题
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "3px solid #171915",
          borderRadius: 8,
          boxShadow: "18px 18px 0 #b8df4a",
          marginTop: 116,
          opacity: interpolate(frame, [20, 42], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          padding: "58px 54px 52px",
          translate: interpolate(frame, [20, 42], ["0px 84px", "0px 0px"], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div style={{ color: "#6b7067", fontSize: 28, fontWeight: 700 }}>
          选题生成进度
        </div>
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            gap: 18,
            marginTop: 24,
          }}
        >
          <span style={{ fontSize: 96, fontWeight: 900 }}>
            {Math.round(
              interpolate(frame, [28, 105], [0, 20], {
                easing: Easing.bezier(0.45, 0, 0.55, 1),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            )}
          </span>
          <span style={{ color: "#6b7067", fontSize: 32, fontWeight: 700 }}>
            / 20
          </span>
        </div>
        <div
          style={{
            backgroundColor: "#e5e8df",
            borderRadius: 5,
            height: 18,
            marginTop: 36,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              backgroundColor: "#00a9a5",
              borderRadius: 5,
              height: "100%",
              scale: `${interpolate(frame, [28, 105], [0.04, 1], {
                easing: Easing.bezier(0.45, 0, 0.55, 1),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })} 1`,
              transformOrigin: "left center",
              width: "100%",
            }}
          />
        </div>
      </div>

      <div
        style={{
          bottom: 120,
          color: "#575c53",
          fontSize: 28,
          fontWeight: 600,
          left: 84,
          position: "absolute",
        }}
      >
        AI × 编导工作流 · 本地测试样片
      </div>
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="VerticalDemo"
      component={MyComponent}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ engine: "Remotion" }}
    />
  );
};
