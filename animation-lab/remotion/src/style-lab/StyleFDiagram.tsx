import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {Presenter, SafeFrame, ScreenMock, countToTwenty, enter, glide} from "./shared";

const bg = "#eef2e9";
const ink = "#16231d";
const orange = "#f06a3b";
const mint = "#a8d8bd";

const nodes = [
  {x: 80, y: 788, text: "钩子"},
  {x: 310, y: 848, text: "冲突"},
  {x: 540, y: 788, text: "证明"},
  {x: 770, y: 848, text: "行动"},
];

export const StyleFDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const title = enter(frame, 3, 18);
  const split = glide(frame, 38, 96);
  const screenIn = enter(frame, 92, 20);
  const branchWidth = interpolate(split, [0, 1], [0, 790]);

  return (
    <AbsoluteFill style={{backgroundColor: bg, color: ink, fontFamily: '"PingFang SC", sans-serif'}}>
      <SafeFrame>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{fontFamily: "Menlo, monospace", fontSize: 20}}>ONE IDEA / MANY DIRECTIONS</span>
          <span style={{borderBottom: `3px solid ${orange}`, fontSize: 22, fontWeight: 700, paddingBottom: 8}}>连续图解 001</span>
        </div>

        <div style={{opacity: title, position: "absolute", top: 110, width: 900}}>
          <div style={{fontSize: 34, fontWeight: 700}}>不要把爆款当成一条视频</div>
          <div style={{fontFamily: '"Songti SC", serif', fontSize: 108, fontWeight: 900, lineHeight: 1.06, marginTop: 20}}>
            把它看成一个
            <br />
            <span style={{color: orange}}>可以分叉的结构</span>
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            left: 0,
            position: "absolute",
            top: 482,
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: ink,
              color: bg,
              display: "flex",
              fontSize: 28,
              fontWeight: 800,
              height: 94,
              justifyContent: "center",
              width: 180,
            }}
          >
            一个爆款
          </div>
          <div style={{background: orange, height: 8, width: branchWidth}} />
          <div
            style={{
              background: orange,
              borderRadius: "50%",
              height: 34,
              marginLeft: -2,
              scale: 0.6 + split * 0.4,
              width: 34,
            }}
          />
        </div>

        {nodes.map((node, index) => {
          const nodeIn = enter(frame, 58 + index * 8, 14);
          return (
            <div key={node.text} style={{left: node.x, opacity: nodeIn, position: "absolute", top: node.y, translate: `0 ${28 * (1 - nodeIn)}px`}}>
              <div style={{background: mint, border: `3px solid ${ink}`, display: "grid", fontSize: 25, fontWeight: 800, height: 92, placeItems: "center", width: 150}}>
                {node.text}
              </div>
              <div style={{background: ink, height: 72, marginLeft: 74, width: 3}} />
            </div>
          );
        })}

        <Presenter
          accent={orange}
          background="#dce3d9"
          foreground={ink}
          frame={frame}
          label="讲解者"
          variant="cutout"
          style={{
            height: 380,
            opacity: 1 - screenIn * 0.5,
            position: "absolute",
            right: 0,
            top: 612,
            width: 270,
          }}
        />

        <ScreenMock
          accent={orange}
          background="#fbfcf7"
          foreground={ink}
          frame={frame}
          style={{
            border: `3px solid ${ink}`,
            bottom: 110,
            height: 590,
            left: 104,
            opacity: screenIn,
            position: "absolute",
            width: 710,
          }}
        />

        <div
          style={{
            alignItems: "baseline",
            bottom: -4,
            display: "flex",
            gap: 14,
            justifyContent: "center",
            left: 0,
            position: "absolute",
            right: 0,
          }}
        >
          <span style={{color: orange, fontFamily: '"Songti SC", serif', fontSize: 96, fontWeight: 900}}>{countToTwenty(frame)}</span>
          <span style={{fontSize: 27, fontWeight: 800}}>个分支，共用同一套结构</span>
        </div>
      </SafeFrame>
      <div style={{background: ink, bottom: 0, color: bg, fontFamily: "Menlo, monospace", fontSize: 18, padding: "18px 62px", position: "absolute", width: "100%"}}>
        STYLE F / CONTINUOUS DIAGRAM / MOTION EXPLAINS THE IDEA
      </div>
    </AbsoluteFill>
  );
};

