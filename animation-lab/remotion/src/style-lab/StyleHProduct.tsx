import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Presenter, SafeFrame, ScreenMock, countToTwenty, enter, glide} from "./shared";

const bg = "#edf3f0";
const ink = "#15231e";
const green = "#2fa36b";
const blue = "#2c568a";

export const StyleHProduct: React.FC = () => {
  const frame = useCurrentFrame();
  const title = enter(frame, 5, 20);
  const screen = glide(frame, 34, 72);
  const result = enter(frame, 116, 18);

  return (
    <AbsoluteFill style={{backgroundColor: bg, color: ink, fontFamily: '"PingFang SC", sans-serif'}}>
      <div style={{background: green, bottom: 0, left: 0, opacity: 0.12, position: "absolute", top: 0, width: 214}} />
      <SafeFrame>
        <div style={{alignItems: "center", display: "flex", justifyContent: "space-between"}}>
          <div style={{fontSize: 25, fontWeight: 800}}>做工具的人</div>
          <div style={{color: blue, fontFamily: "Menlo, monospace", fontSize: 18}}>REAL WORKFLOW · 001</div>
        </div>

        <div style={{opacity: title, position: "absolute", top: 116, translate: `0 ${26 * (1 - title)}px`, width: 860}}>
          <div style={{color: green, fontSize: 28, fontWeight: 800}}>今天不讲提示词</div>
          <div style={{fontFamily: '"Songti SC", serif', fontSize: 94, fontWeight: 900, lineHeight: 1.08, marginTop: 18}}>
            直接看一个爆款
            <br />
            怎么变成 20 个选题
          </div>
        </div>

        <div style={{display: "flex", gap: 24, left: 0, position: "absolute", right: 0, top: 390}}>
          <Presenter
            accent={green}
            background="#d5e0db"
            foreground={ink}
            frame={frame}
            label="我来判断"
            variant="portrait"
            style={{
              height: 660,
              width: 268,
            }}
          />
          <ScreenMock
            accent={green}
            background="#ffffff"
            foreground={ink}
            frame={frame}
            line="拆出结构，再替换行业变量"
            title="20 选题 · 工作台"
            style={{
              border: `2px solid ${ink}33`,
              height: 660,
              opacity: screen,
              scale: 0.96 + screen * 0.04,
              width: 620,
            }}
          />
        </div>

        <div style={{left: 292, position: "absolute", top: 1082, width: 620}}>
          <div style={{background: `${ink}1a`, height: 8, overflow: "hidden"}}>
            <div
              style={{
                background: green,
                height: "100%",
                scale: `${glide(frame, 72, 148)} 1`,
                transformOrigin: "left center",
                width: "100%",
              }}
            />
          </div>
          <div style={{display: "flex", fontSize: 20, justifyContent: "space-between", marginTop: 12}}>
            <span>读懂结构</span><span>替换语境</span><span>生成结果</span>
          </div>
        </div>

        <div
          style={{
            alignItems: "end",
            bottom: 34,
            display: "flex",
            justifyContent: "space-between",
            left: 0,
            opacity: result,
            position: "absolute",
            right: 0,
          }}
        >
          <div style={{fontFamily: '"Songti SC", serif', fontSize: 48, fontWeight: 900, lineHeight: 1.15}}>
            工具负责生成，
            <br />
            人负责判断值不值得拍。
          </div>
          <div style={{alignItems: "baseline", display: "flex", gap: 10}}>
            <span style={{color: green, fontSize: 126, fontWeight: 900, lineHeight: 0.8}}>{countToTwenty(frame)}</span>
            <span style={{fontSize: 24, fontWeight: 800}}>条</span>
          </div>
        </div>
      </SafeFrame>
      <div style={{background: ink, bottom: 0, color: bg, display: "flex", fontSize: 18, justifyContent: "space-between", padding: "18px 62px", position: "absolute", width: "100%"}}>
        <span>STYLE H · PRODUCT DOCUMENTARY</span><span>安静，但证据一直在场</span>
      </div>
    </AbsoluteFill>
  );
};

