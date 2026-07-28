import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Presenter, SafeFrame, ScreenMock, enter, glide} from "./shared";

const bg = "#f4f2ec";
const ink = "#101725";
const blue = "#2453d4";
const red = "#e43d32";

export const StyleDBroadcast: React.FC = () => {
  const frame = useCurrentFrame();
  const title = enter(frame, 2, 14);
  const secondBeat = glide(frame, 38, 76);
  const tickerX = interpolate(frame, [0, 179], [0, -610], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{backgroundColor: bg, color: ink, fontFamily: '"PingFang SC", sans-serif'}}>
      <div style={{background: blue, height: 78, left: 0, position: "absolute", right: 0, top: 0}} />
      <div style={{background: red, height: 12, left: 0, position: "absolute", right: 0, top: 78}} />
      <div style={{color: "white", fontSize: 26, fontWeight: 800, left: 62, position: "absolute", top: 20}}>AI BREAKDOWN / LIVE</div>
      <div style={{color: "white", fontFamily: "Menlo, monospace", fontSize: 20, position: "absolute", right: 62, top: 25}}>NO. 001</div>

      <SafeFrame>
        <div
          style={{
            opacity: title,
            position: "absolute",
            top: 64,
            translate: `${-36 * (1 - title)}px 0`,
            width: 910,
          }}
        >
          <div style={{color: red, fontSize: 30, fontWeight: 900}}>本期结论</div>
          <div style={{fontFamily: '"Arial Black", "PingFang SC", sans-serif', fontSize: 104, fontWeight: 900, lineHeight: 1.02, marginTop: 14}}>
            一个爆款，
            <br />
            不止一个答案
          </div>
        </div>

        <Presenter
          accent={red}
          background="#d7d8da"
          foreground={ink}
          frame={frame}
          label="主播 / 编导"
          variant="portrait"
          style={{
            borderBottom: `12px solid ${red}`,
            height: 720,
            left: 0,
            position: "absolute",
            top: 366,
            width: 400,
          }}
        />

        <ScreenMock
          accent={red}
          background="#ffffff"
          foreground={ink}
          frame={frame}
          style={{
            borderTop: `14px solid ${blue}`,
            height: 720,
            opacity: secondBeat,
            position: "absolute",
            right: 0,
            top: 366,
            width: 500,
          }}
        />

        <div
          style={{
            alignItems: "center",
            background: ink,
            color: "white",
            display: "flex",
            fontSize: 26,
            fontWeight: 800,
            gap: 18,
            left: 0,
            padding: "18px 22px",
            position: "absolute",
            top: 1110,
            width: 900,
          }}
        >
          <span style={{background: red, padding: "8px 12px"}}>BREAKING</span>
          <span>拆结构 → 换行业 → 生成 20 个选题</span>
        </div>

        <div
          style={{
            alignItems: "end",
            bottom: 38,
            display: "flex",
            justifyContent: "space-between",
            left: 0,
            position: "absolute",
            right: 0,
          }}
        >
          <div>
            <div style={{color: blue, fontSize: 26, fontWeight: 800}}>生成结果</div>
            <div style={{fontSize: 56, fontWeight: 900}}>可以继续拍，不是一次性灵感</div>
          </div>
          <div style={{color: red, fontFamily: '"Arial Black", sans-serif', fontSize: 160, fontWeight: 900, lineHeight: 0.78}}>20</div>
        </div>
      </SafeFrame>

      <div style={{background: blue, bottom: 0, color: "white", height: 78, left: 0, overflow: "hidden", position: "absolute", right: 0}}>
        <div style={{fontFamily: "Menlo, monospace", fontSize: 22, fontWeight: 700, lineHeight: "78px", translate: `${tickerX}px 0`, whiteSpace: "nowrap", width: 1900}}>
          SOURCE 001 / 爆款结构&nbsp;&nbsp;&nbsp;&nbsp;METHOD / 跨行业迁移&nbsp;&nbsp;&nbsp;&nbsp;OUTPUT / 20 TOPICS&nbsp;&nbsp;&nbsp;&nbsp;STYLE D / BROADCAST
        </div>
      </div>
    </AbsoluteFill>
  );
};

