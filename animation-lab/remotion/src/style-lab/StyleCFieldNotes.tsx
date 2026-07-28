import {AbsoluteFill, useCurrentFrame} from "remotion";
import {Presenter, SafeFrame, ScreenMock, countToTwenty, enter, glide} from "./shared";

const blue = "#164d80";
const paper = "#dceaf3";
const red = "#d94432";
const ink = "#17242e";

export const StyleCFieldNotes: React.FC = () => {
  const frame = useCurrentFrame();
  const title = enter(frame, 4, 20);
  const process = glide(frame, 38, 112);
  const result = enter(frame, 116, 18);

  return (
    <AbsoluteFill style={{backgroundColor: paper, color: ink, fontFamily: '"Kaiti SC", "STKaiti", serif'}}>
      <div
        style={{
          backgroundImage: `linear-gradient(${blue}20 1px, transparent 1px), linear-gradient(90deg, ${blue}20 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          inset: 0,
          position: "absolute",
        }}
      />
      <div style={{background: red, bottom: 0, left: 104, opacity: 0.12, position: "absolute", top: 0, width: 3}} />
      <SafeFrame>
        <div style={{display: "flex", justifyContent: "space-between"}}>
          <span style={{color: blue, fontFamily: "Menlo, monospace", fontSize: 22}}>EXPERIMENT 07 / 26</span>
          <span style={{fontSize: 26, fontWeight: 700}}>边做边记</span>
        </div>

        <div
          style={{
            opacity: title,
            position: "absolute",
            top: 128,
            translate: `0 ${34 * (1 - title)}px`,
          }}
        >
          <div style={{fontSize: 38, fontWeight: 700}}>今天只验证一件事：</div>
          <div style={{fontSize: 104, fontWeight: 900, lineHeight: 1.05, marginTop: 22}}>
            一个爆款
            <br />
            能不能长出
            <br />
            <span style={{color: red}}>20 个选题？</span>
          </div>
          <div
            style={{
              background: red,
              height: 10,
              marginTop: 20,
              scale: `${title} 1`,
              transformOrigin: "left center",
              width: 530,
            }}
          />
        </div>

        <Presenter
          accent={red}
          background="#f4f0df"
          foreground={blue}
          frame={frame}
          label="现场记录"
          variant="cutout"
          style={{
            border: `10px solid #f8f3e5`,
            boxShadow: "5px 8px 0 rgba(23,36,46,0.18)",
            height: 470,
            position: "absolute",
            right: 8,
            rotate: "3deg",
            top: 512,
            width: 330,
          }}
        />
        <div style={{background: "#e8d98f", height: 40, opacity: 0.82, position: "absolute", right: 102, rotate: "-3deg", top: 494, width: 146}} />

        <ScreenMock
          accent={red}
          background="#f8f5e9"
          foreground={ink}
          frame={frame}
          style={{
            border: `3px solid ${blue}`,
            bottom: 164,
            height: 590,
            left: 18,
            opacity: process,
            position: "absolute",
            rotate: "-1.5deg",
            width: 610,
          }}
        />

        <div style={{fontSize: 34, fontWeight: 900, left: 654, opacity: process, position: "absolute", top: 1060, width: 258}}>
          <div style={{color: blue}}>① 拆结构</div>
          <div style={{color: red, marginLeft: 24, marginTop: 24}}>② 换行业</div>
          <div style={{color: ink, marginLeft: 52, marginTop: 24}}>③ 批量生长</div>
        </div>
        <div style={{borderTop: `5px solid ${red}`, left: 636, opacity: process, position: "absolute", rotate: "12deg", top: 1186, width: 132}} />

        <div
          style={{
            bottom: 4,
            color: blue,
            display: "flex",
            fontFamily: "Menlo, monospace",
            fontWeight: 900,
            justifyContent: "space-between",
            left: 0,
            opacity: result,
            position: "absolute",
            right: 0,
          }}
        >
          <span style={{fontSize: 24}}>RESULT / 可继续拍</span>
          <span style={{fontSize: 76, lineHeight: 0.8}}>{countToTwenty(frame)} / 20</span>
        </div>
      </SafeFrame>
      <div style={{background: blue, bottom: 0, color: "#f8f5e9", fontFamily: "Menlo, monospace", fontSize: 18, padding: "18px 62px", position: "absolute", width: "100%"}}>
        STYLE C · FIELD NOTES · 不是成片，是一份可复用的实验记录
      </div>
    </AbsoluteFill>
  );
};

