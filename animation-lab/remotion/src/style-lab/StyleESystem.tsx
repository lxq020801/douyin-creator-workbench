import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Presenter, SafeFrame, ScreenMock, countToTwenty, enter, glide} from "./shared";

const bg = "#0d1110";
const fg = "#e7eee8";
const green = "#78f06a";
const dim = "#79847c";

export const StyleESystem: React.FC = () => {
  const frame = useCurrentFrame();
  const title = enter(frame, 4, 14);
  const commands = [
    {at: 28, text: "> ingest viral_structure.json"},
    {at: 52, text: "> isolate hook / conflict / payoff"},
    {at: 76, text: "> replace industry_context"},
    {at: 100, text: "> generate --count 20"},
  ];
  const secondBeat = glide(frame, 46, 86);

  return (
    <AbsoluteFill style={{backgroundColor: bg, color: fg, fontFamily: "Menlo, Monaco, monospace"}}>
      <div
        style={{
          backgroundImage: `linear-gradient(${green}10 1px, transparent 1px), linear-gradient(90deg, ${green}10 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          inset: 0,
          position: "absolute",
        }}
      />
      <div style={{border: `1px solid ${green}55`, bottom: 38, left: 38, position: "absolute", right: 38, top: 38}} />
      <SafeFrame>
        <div style={{alignItems: "center", display: "flex", fontSize: 21, justifyContent: "space-between"}}>
          <span style={{color: green}}>AGENT://TOPIC-MIGRATOR</span>
          <span style={{color: dim}}>LOCAL · READY · 30FPS</span>
        </div>

        <div style={{opacity: title, position: "absolute", top: 112, translate: `0 ${30 * (1 - title)}px`}}>
          <div style={{color: dim, fontSize: 25}}>TASK_001</div>
          <div style={{fontFamily: '"PingFang SC", sans-serif', fontSize: 102, fontWeight: 900, lineHeight: 1.04, marginTop: 18}}>
            输入一个爆款
            <br />
            输出 <span style={{color: green}}>20 个选题</span>
          </div>
        </div>

        <div
          style={{
            borderLeft: `4px solid ${green}`,
            fontSize: 23,
            left: 0,
            paddingLeft: 22,
            position: "absolute",
            top: 388,
            width: 530,
          }}
        >
          {commands.map((command) => (
            <div
              key={command.text}
              style={{
                color: frame >= command.at ? fg : dim,
                marginBottom: 22,
                opacity: frame >= command.at ? 1 : 0.18,
              }}
            >
              {command.text}
            </div>
          ))}
        </div>

        <Presenter
          accent={green}
          background="#1b211e"
          foreground={fg}
          frame={frame}
          label="HUMAN INPUT"
          variant="mono"
          style={{
            border: `2px solid ${green}`,
            height: 462,
            position: "absolute",
            right: 0,
            top: 350,
            width: 318,
          }}
        />
        <div style={{borderLeft: `1px solid ${green}`, borderTop: `1px solid ${green}`, height: 36, position: "absolute", right: 294, top: 326, width: 36}} />
        <div style={{borderBottom: `1px solid ${green}`, borderRight: `1px solid ${green}`, height: 36, position: "absolute", right: -12, top: 788, width: 36}} />

        <ScreenMock
          accent={green}
          background="#151a17"
          foreground={fg}
          frame={frame}
          line="viral_pattern → niche_context → topic_batch"
          title="topic-migrator.local"
          style={{
            border: `2px solid ${dim}`,
            bottom: 156,
            height: 650,
            left: 0,
            opacity: secondBeat,
            position: "absolute",
            width: 900,
          }}
        />

        <div
          style={{
            alignItems: "baseline",
            bottom: 8,
            display: "flex",
            gap: 22,
            left: 0,
            position: "absolute",
          }}
        >
          <span style={{color: green, fontSize: 94, fontWeight: 700}}>{countToTwenty(frame).toString().padStart(2, "0")}</span>
          <span style={{color: dim, fontSize: 22}}>OUTPUTS VERIFIED / READY TO SHOOT</span>
        </div>
      </SafeFrame>
      <div style={{bottom: 24, color: dim, fontFamily: "Menlo, monospace", fontSize: 16, left: 62, position: "absolute"}}>
        STYLE E · SYSTEM NATIVE · HUMAN DIRECTS, AGENT EXECUTES
      </div>
    </AbsoluteFill>
  );
};

