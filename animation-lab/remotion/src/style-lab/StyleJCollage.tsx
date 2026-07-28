import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Presenter, ScreenMock, countToTwenty, enter, glide, snap} from "./shared";

const cobalt = "#2255b6";
const coral = "#ee604b";
const cream = "#f5ead4";
const ink = "#171716";
const mint = "#9ed6bd";

export const StyleJCollage: React.FC = () => {
  const frame = useCurrentFrame();
  const hook = snap(frame, 0, 13);
  const shuffle = glide(frame, 40, 84);
  const result = enter(frame, 112, 18);
  const drift = interpolate(frame, [0, 179], [-18, 26], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{backgroundColor: cream, color: ink, fontFamily: '"PingFang SC", sans-serif'}}>
      <div style={{background: cobalt, height: 510, left: -70, position: "absolute", rotate: "-7deg", top: 90, width: 820}} />
      <div style={{background: coral, height: 420, position: "absolute", right: -110, rotate: "8deg", top: 340, width: 520}} />
      <div style={{background: mint, bottom: 120, height: 470, left: -90, position: "absolute", rotate: "5deg", width: 600}} />

      <div style={{color: cream, fontFamily: "Menlo, monospace", fontSize: 20, fontWeight: 700, left: 58, position: "absolute", top: 56}}>CUT / REFRAME / REBUILD</div>
      <div style={{fontFamily: "Menlo, monospace", fontSize: 18, position: "absolute", right: 58, top: 58}}>STYLE J · 001</div>

      <div
        style={{
          color: cream,
          fontFamily: '"Songti SC", serif',
          fontSize: 112,
          fontWeight: 900,
          left: 64,
          lineHeight: 1.02,
          opacity: hook,
          position: "absolute",
          top: 160,
          translate: `${-48 * (1 - hook)}px 0`,
          width: 720,
        }}
      >
        一个爆款
        <br />
        剪开以后
        <br />
        还有什么？
      </div>

      <div style={{background: cream, color: ink, fontFamily: "Menlo, monospace", fontSize: 22, fontWeight: 700, left: 486, padding: "12px 18px", position: "absolute", rotate: "-5deg", top: 514, translate: `${drift}px 0`}}>
        不是复制，是重新编排
      </div>

      <Presenter
        accent={coral}
        background="#dcd0ba"
        foreground={ink}
        frame={frame}
        label="我来拆"
        variant="cutout"
        style={{
          border: `10px solid ${cream}`,
          height: 560,
          position: "absolute",
          right: 60,
          rotate: "-4deg",
          top: 660,
          width: 350,
        }}
      />

      <div style={{background: ink, color: cream, fontFamily: '"Arial Black", sans-serif', fontSize: 64, fontWeight: 900, left: 58, padding: "18px 24px", position: "absolute", rotate: "3deg", top: 706}}>
        01 / 拆结构
      </div>
      <div style={{background: coral, color: cream, fontFamily: '"Arial Black", sans-serif', fontSize: 58, fontWeight: 900, left: 118, padding: "18px 24px", position: "absolute", rotate: "-2deg", top: 836}}>
        02 / 换行业
      </div>
      <div style={{background: cobalt, color: cream, fontFamily: '"Arial Black", sans-serif', fontSize: 54, fontWeight: 900, left: 72, padding: "18px 24px", position: "absolute", rotate: "4deg", top: 958}}>
        03 / 批量生长
      </div>

      <ScreenMock
        accent={coral}
        background="#fff7e8"
        foreground={ink}
        frame={frame}
        style={{
          border: `8px solid ${ink}`,
          bottom: 108,
          height: 610,
          opacity: shuffle,
          position: "absolute",
          right: 58,
          rotate: "2deg",
          width: 676,
        }}
      />

      <div
        style={{
          bottom: 122,
          left: 54,
          opacity: result,
          position: "absolute",
          rotate: "-4deg",
        }}
      >
        <div style={{color: cobalt, fontFamily: '"Arial Black", sans-serif', fontSize: 158, fontWeight: 900, lineHeight: 0.78}}>{countToTwenty(frame)}</div>
        <div style={{fontSize: 30, fontWeight: 900, marginTop: 18}}>个能继续拍的新方向</div>
      </div>

      <div style={{background: ink, bottom: 0, color: cream, fontFamily: "Menlo, monospace", fontSize: 18, padding: "18px 58px", position: "absolute", width: "100%"}}>
        动态拼贴不是随机热闹：每一块都对应一个思考动作
      </div>
    </AbsoluteFill>
  );
};

