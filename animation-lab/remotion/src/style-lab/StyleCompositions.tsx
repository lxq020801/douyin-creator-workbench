import {Composition, Folder} from "remotion";
import {StyleAEditorial} from "./StyleAEditorial";
import {StyleBStoryboard} from "./StyleBStoryboard";
import {StyleCFieldNotes} from "./StyleCFieldNotes";
import {StyleDBroadcast} from "./StyleDBroadcast";
import {StyleESystem} from "./StyleESystem";
import {StyleFDiagram} from "./StyleFDiagram";
import {StyleGPoster} from "./StyleGPoster";
import {StyleHProduct} from "./StyleHProduct";
import {StyleIEvidence} from "./StyleIEvidence";
import {StyleJCollage} from "./StyleJCollage";
import {DURATION, FPS} from "./shared";

const dimensions = {
  durationInFrames: DURATION,
  fps: FPS,
  height: 1920,
  width: 1080,
} as const;

export const StyleCompositions: React.FC = () => (
  <Folder name="AccountStyleLab">
    <Composition id="StyleAEditorial" component={StyleAEditorial} {...dimensions} />
    <Composition id="StyleBStoryboard" component={StyleBStoryboard} {...dimensions} />
    <Composition id="StyleCFieldNotes" component={StyleCFieldNotes} {...dimensions} />
    <Composition id="StyleDBroadcast" component={StyleDBroadcast} {...dimensions} />
    <Composition id="StyleESystem" component={StyleESystem} {...dimensions} />
    <Composition id="StyleFDiagram" component={StyleFDiagram} {...dimensions} />
    <Composition id="StyleGPoster" component={StyleGPoster} {...dimensions} />
    <Composition id="StyleHProduct" component={StyleHProduct} {...dimensions} />
    <Composition id="StyleIEvidence" component={StyleIEvidence} {...dimensions} />
    <Composition id="StyleJCollage" component={StyleJCollage} {...dimensions} />
  </Folder>
);

