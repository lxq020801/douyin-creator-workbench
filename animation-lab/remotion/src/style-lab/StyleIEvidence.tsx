import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Presenter, SafeFrame, ScreenMock, countToTwenty, enter, glide} from "./shared";

const bg = "#24181a";
const paper = "#eee4d2";
const ink = "#21191a";
const orange = "#f05a36";
const green = "#87a96b";

export const StyleIEvidence: React.FC = () => {
  const frame = useCurrentFrame();
  const fileIn = enter(frame, 2, 18);
  const evidence = glide(frame, 44, 82);
  const scanY = interpolate(frame, [0, 179], [250, 1510], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{backgroundColor: bg, color: paper, fontFamily: '"PingFang SC", sans-serif'}}>
      <div style={{border: `1px solid ${paper}33`, bottom: 42, left: 42, position: "absolute", right: 42, top: 42}} />
      <div style={{background: orange, height: 3, left: 44, opacity: 0.64, position: "absolute", right: 44, top: scanY}} />
      <SafeFrame>
        <div style={{display: "flex", fontFamily: "Menlo, monospace", fontSize: 20, justifyContent: "space-between"}}>
          <span>CASE FILE / 001</span><span>STATUS: VERIFYING</span>
        </div>

        <div
          style={{
            background: paper,
            color: ink,
            height: 710,
            opacity: fileIn,
            padding: 44,
            position: "absolute",
            rotate: "-1deg",
            top: 104,
            translate: `${-28 * (1 - fileIn)}px ${26 * (1 - fileIn)}px`,
            width: 900,
          }}
        >
          <div style={{borderBottom: `4px solid ${ink}`, display: "flex", fontFamily: "Menlo, monospace", fontSize: 18, justifyContent: "space-between", paddingBottom: 14}}>
            <span>EVIDENCE A</span><span>VIRAL STRUCTURE</span>
          </div>
          <div style={{fontFamily: '"Songti SC", serif', fontSize: 92, fontWeight: 900, lineHeight: 1.06, marginTop: 34}}>
            所谓“爆款”，
            <br />
            到底哪部分
            <br />
            可以被迁移？
          </div>
          <div style={{background: orange, color: paper, display: "inline-block", fontSize: 28, fontWeight: 900, marginTop: 34, padding: "10px 16px", rotate: "-2deg"}}>
            先查结构，不抄答案
          </div>
          <div style={{border: `3px solid ${orange}`, bottom: 46, color: orange, fontFamily: "Menlo, monospace", fontSize: 28, fontWeight: 900, padding: "12px 18px", position: "absolute", right: 46, rotate: "-8deg"}}>
            VERIFIED
          </div>
        </div>

        <Presenter
          accent={orange}
          background="#cfc4b3"
          foreground={ink}
          frame={frame}
          label="证人 / 编导"
          variant="mono"
          style={{
            border: `12px solid ${paper}`,
            height: 450,
            position: "absolute",
            right: 34,
            rotate: "4deg",
            top: 676,
            width: 300,
          }}
        />
        <div style={{background: green, color: ink, fontFamily: "Menlo, monospace", fontSize: 17, fontWeight: 800, padding: "8px 12px", position: "absolute", right: 10, top: 1110}}>EVIDENCE B / HUMAN JUDGMENT</div>

        <ScreenMock
          accent={orange}
          background="#f6eddd"
          foreground={ink}
          frame={frame}
          title="证据 C · 生成结果"
          style={{
            border: `5px solid ${paper}`,
            bottom: 130,
            height: 610,
            left: 0,
            opacity: evidence,
            position: "absolute",
            width: 652,
          }}
        />

        <div style={{bottom: 208, opacity: enter(frame, 116, 18), position: "absolute", right: 0, textAlign: "right"}}>
          <div style={{color: orange, fontFamily: '"Arial Black", sans-serif', fontSize: 138, fontWeight: 900, lineHeight: 0.82}}>{countToTwenty(frame)}</div>
          <div style={{fontSize: 27, fontWeight: 800, marginTop: 16}}>条可追溯的新选题</div>
          <div style={{fontFamily: "Menlo, monospace", fontSize: 17, marginTop: 14, opacity: 0.64}}>SOURCE → METHOD → OUTPUT</div>
        </div>
      </SafeFrame>
      <div style={{background: orange, bottom: 0, color: paper, display: "flex", fontFamily: "Menlo, monospace", fontSize: 18, justifyContent: "space-between", padding: "18px 62px", position: "absolute", width: "100%"}}>
        <span>STYLE I / EVIDENCE FILE</span><span>每个结论都要留下来源</span>
      </div>
    </AbsoluteFill>
  );
};

