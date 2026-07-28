import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Presenter, ScreenMock, countToTwenty, glide, snap} from "./shared";

const yellow = "#f2df31";
const ink = "#11110f";
const cream = "#f7f1df";
const red = "#f0472f";

export const StyleGPoster: React.FC = () => {
  const frame = useCurrentFrame();
  const hook = snap(frame, 0, 12);
  const shift = glide(frame, 38, 78);
  const count = countToTwenty(frame);
  const slash = interpolate(frame, [0, 179], [-220, 1180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{backgroundColor: yellow, color: ink, fontFamily: '"Arial Black", "PingFang SC", sans-serif'}}>
      <div style={{background: cream, height: 620, left: 0, position: "absolute", top: 0, width: "100%"}} />
      <div style={{background: ink, bottom: 0, height: 640, left: 0, position: "absolute", width: "100%"}} />
      <div style={{background: red, height: 18, left: slash, position: "absolute", rotate: "-28deg", top: 610, width: 620}} />

      <div style={{fontFamily: '"DIN Condensed", "Arial Narrow", sans-serif', fontSize: 24, fontWeight: 900, left: 54, position: "absolute", top: 50}}>
        AI × DIRECTING / ISSUE 001
      </div>
      <div style={{fontFamily: '"DIN Condensed", "Arial Narrow", sans-serif', fontSize: 24, fontWeight: 900, position: "absolute", right: 54, top: 50}}>
        STYLE G / POSTER
      </div>

      <div
        style={{
          fontFamily: '"DIN Condensed", "Arial Narrow", sans-serif',
          fontSize: 160,
          fontWeight: 900,
          left: 50,
          lineHeight: 0.82,
          opacity: hook,
          position: "absolute",
          top: 130,
          translate: `${-70 * (1 - hook)}px 0`,
        }}
      >
        一个爆款
        <br />
        <span style={{color: red}}>不够拍？</span>
      </div>

      <Presenter
        accent={red}
        background={cream}
        foreground={ink}
        frame={frame}
        label="REAL TALK"
        variant="cutout"
        style={{
          height: 690,
          left: -34,
          position: "absolute",
          top: 612,
          width: 430,
        }}
      />

      <div
        style={{
          color: red,
          fontFamily: '"Arial Black", sans-serif',
          fontSize: 520,
          fontWeight: 900,
          letterSpacing: 0,
          lineHeight: 0.72,
          opacity: 0.16 + shift * 0.84,
          position: "absolute",
          right: -40,
          top: 606,
          translate: `${90 * (1 - shift)}px 0`,
        }}
      >
        {count}
      </div>
      <div style={{fontSize: 38, fontWeight: 900, position: "absolute", right: 74, top: 1032}}>个新的拍法</div>

      <ScreenMock
        accent={red}
        background={cream}
        foreground={ink}
        frame={frame}
        style={{
          border: `8px solid ${ink}`,
          height: 520,
          opacity: shift,
          position: "absolute",
          right: 58,
          top: 1228,
          width: 660,
        }}
      />

      <div style={{bottom: 72, color: cream, fontSize: 42, fontWeight: 900, left: 58, lineHeight: 1.15, position: "absolute", width: 296}}>
        拆结构
        <br />
        换行业
        <br />
        批量生成
      </div>
      <div style={{background: red, bottom: 0, color: cream, fontFamily: "Menlo, monospace", fontSize: 18, padding: "18px 58px", position: "absolute", width: "100%"}}>
        一秒看懂结论，再看工具如何做到
      </div>
    </AbsoluteFill>
  );
};
