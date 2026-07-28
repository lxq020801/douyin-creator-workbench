import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Presenter, SafeFrame, ScreenMock, StepRail, enter, glide} from "./shared";

const ink = "#181814";
const paper = "#f2efe5";
const red = "#e4482f";
const lime = "#c9dd63";

export const StyleAEditorial: React.FC = () => {
  const frame = useCurrentFrame();
  const titleIn = enter(frame, 4, 22);
  const secondBeat = glide(frame, 44, 82);
  const result = enter(frame, 112, 20);

  return (
    <AbsoluteFill style={{backgroundColor: paper, color: ink, fontFamily: '"PingFang SC", sans-serif'}}>
      <div style={{background: red, height: 24, left: 0, position: "absolute", top: 0, width: "100%"}} />
      <div
        style={{
          borderLeft: `2px solid ${ink}`,
          bottom: 0,
          left: 216,
          opacity: 0.14,
          position: "absolute",
          top: 0,
        }}
      />
      <SafeFrame>
        <div style={{alignItems: "center", display: "flex", justifyContent: "space-between"}}>
          <div style={{fontFamily: "Menlo, monospace", fontSize: 22, fontWeight: 700}}>FIELD NOTE / 001</div>
          <div style={{borderBottom: `2px solid ${ink}`, fontSize: 22, paddingBottom: 8}}>AI × 编导</div>
        </div>

        <div
          style={{
            left: 0,
            opacity: titleIn,
            position: "absolute",
            top: 176 - secondBeat * 76,
            translate: `0 ${46 * (1 - titleIn)}px`,
            width: 650,
          }}
        >
          <div style={{color: red, fontFamily: '"Songti SC", serif', fontSize: 34, fontWeight: 700}}>把爆款当作素材，不当作答案</div>
          <div style={{fontFamily: '"Songti SC", serif', fontSize: 112, fontWeight: 900, lineHeight: 1.08, marginTop: 24}}>
            一个爆款
            <br />
            怎么变成
            <br />
            <span style={{background: lime, padding: "0 12px"}}>20 个选题</span>
          </div>
        </div>

        <Presenter
          accent={red}
          background="#d8d2c5"
          foreground={ink}
          frame={frame}
          label="编导视角"
          variant="cutout"
          style={{
            height: 610,
            opacity: 1 - secondBeat * 0.28,
            position: "absolute",
            right: 0,
            top: 338,
            width: 330,
          }}
        />

        <div
          style={{
            color: red,
            fontFamily: '"Songti SC", serif',
            fontSize: 52,
            fontWeight: 900,
            opacity: enter(frame, 36, 16),
            position: "absolute",
            right: 246,
            rotate: "-9deg",
            top: 315,
          }}
        >
          拆！
        </div>

        <ScreenMock
          accent={red}
          background="#fffdf7"
          foreground={ink}
          frame={frame}
          style={{
            border: `3px solid ${ink}`,
            bottom: 154,
            boxShadow: `14px 14px 0 ${lime}`,
            height: 600,
            left: 0,
            opacity: secondBeat,
            position: "absolute",
            scale: 0.94 + secondBeat * 0.06,
            width: 700,
          }}
        />

        <div
          style={{
            alignItems: "baseline",
            bottom: 308,
            display: "flex",
            gap: 12,
            opacity: result,
            position: "absolute",
            right: 0,
          }}
        >
          <span style={{color: red, fontFamily: '"Songti SC", serif', fontSize: 154, fontWeight: 900, lineHeight: 0.8}}>20</span>
          <span style={{fontSize: 28, fontWeight: 700}}>个可继续拍的方向</span>
        </div>

        <StepRail accent={red} foreground={ink} frame={frame} style={{bottom: 12, left: 0, position: "absolute"}} />
      </SafeFrame>
      <div
        style={{
          background: ink,
          bottom: 0,
          color: paper,
          display: "flex",
          fontFamily: "Menlo, monospace",
          fontSize: 20,
          justifyContent: "space-between",
          left: 0,
          padding: "18px 62px 20px",
          position: "absolute",
          right: 0,
        }}
      >
        <span>不是抄内容，是迁移结构</span>
        <span>STYLE A / EDITORIAL</span>
      </div>
    </AbsoluteFill>
  );
};
