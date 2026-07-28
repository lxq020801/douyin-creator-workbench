import "./index.css";
import { MyComposition } from "./Composition";
import {StyleCompositions} from "./style-lab/StyleCompositions";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <StyleCompositions />
    </>
  );
};
