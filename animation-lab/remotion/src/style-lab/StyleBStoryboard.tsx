import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Presenter, SafeFrame, ScreenMock, enter, glide} from "./shared";

const bg = "#191918";
const fg = "#f1efe7";
const yellow = "#f0d34f";
const muted = "#6f706b";

export const StyleBStoryboard: React.FC = () => {
  const frame = useCurrentFrame();
  const headline = enter(frame, 4, 18);
  const switchBeat = glide(frame, 48, 86);
  const playhead = interpolate(frame, [0, 179], [0, 884], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shots = ["爆款", "结构", "行业", "20 选题"];

  return (
    <AbsoluteFill style={{backgroundColor: bg, color: fg, fontFamily: '"PingFang SC", sans-serif'}}>
      <div
        style={{
          backgroundImage: `linear-gradient(${fg}0f 1px, transparent 1px), linear-gradient(90deg, ${fg}0f 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          inset: 0,
          position: "absolute",
        }}
      />
      <SafeFrame>
        <div style={{alignItems: "center", display: "flex", justifyContent: "space-between"}}>
          <div style={{color: yellow, fontFamily: "Menlo, monospace", fontSize: 24, fontWeight: 700}}>DIRECTOR'S DESK</div>
          <div style={{fontFamily: "Menlo, monospace", fontSize: 20}}>SEQ 01 · TAKE 03 · 06:00</div>
        </div>

        <div
          style={{
            opacity: headline,
            position: "absolute",
            top: 122,
            translate: `${-24 * (1 - headline)}px 0`,
          }}
        >
          <div style={{fontSize: 32, fontWeight: 700}}>同一个爆款，换一套拍法</div>
          <div style={{fontFamily: '"DIN Condensed", "Arial Narrow", sans-serif', fontSize: 124, fontWeight: 900, lineHeight: 0.96, marginTop: 16}}>
            拆成 3 个动作
            <br />
            得到 <span style={{color: yellow}}>20 个选题</span>
          </div>
        </div>

        <Presenter
          accent={yellow}
          background="#353631"
          foreground={fg}
          frame={frame}
          label="A-CAM / 口播"
          variant="mono"
          style={{
            border: `2px solid ${muted}`,
            height: 660,
            left: 0,
            position: "absolute",
            top: 462,
            translate: `${-switchBeat * 46}px 0`,
            width: 390,
          }}
        />

        <div
          style={{
            border: `2px solid ${yellow}`,
            fontFamily: "Menlo, monospace",
            fontSize: 20,
            left: 416,
            padding: "10px 14px",
            position: "absolute",
            top: 462,
          }}
        >
          B-CAM / 工具实录
        </div>

        <ScreenMock
          accent={yellow}
          background="#272825"
          foreground={fg}
          frame={frame}
          style={{
            border: `2px solid ${muted}`,
            height: 660,
            opacity: switchBeat,
            position: "absolute",
            right: 0,
            top: 462,
            width: 506,
          }}
        />

        <div style={{bottom: 76, left: 0, position: "absolute", right: 0}}>
          <div style={{alignItems: "end", display: "grid", gap: 12, gridTemplateColumns: "repeat(4, 1fr)", height: 164}}>
            {shots.map((shot, index) => {
              const active = frame >= index * 38;
              return (
                <div
                  key={shot}
                  style={{
                    background: active ? (index === 3 ? yellow : "#343530") : "transparent",
                    border: `2px solid ${active ? (index === 3 ? yellow : fg) : muted}`,
                    color: index === 3 && active ? bg : fg,
                    display: "flex",
                    flexDirection: "column",
                    fontSize: 22,
                    fontWeight: 700,
                    height: 94 + index * 12,
                    justifyContent: "space-between",
                    padding: 12,
                  }}
                >
                  <span style={{fontFamily: "Menlo, monospace", fontSize: 16}}>0{index + 1}</span>
                  <span>{shot}</span>
                </div>
              );
            })}
          </div>
          <div style={{background: muted, height: 3, marginTop: 20, position: "relative"}}>
            <div style={{background: yellow, height: 24, left: playhead, position: "absolute", top: -10, width: 4}} />
          </div>
          <div style={{display: "flex", fontFamily: "Menlo, monospace", fontSize: 17, justifyContent: "space-between", marginTop: 12}}>
            <span>00:00</span><span>拆结构</span><span>换行业</span><span>00:06</span>
          </div>
        </div>
      </SafeFrame>
      <div style={{background: yellow, color: bg, fontSize: 22, fontWeight: 900, left: 0, padding: "14px 20px", position: "absolute", top: 0}}>
        STYLE B
      </div>
    </AbsoluteFill>
  );
};

