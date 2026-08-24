/**
 * Data-driven collage model. Frames are defined in normalized [0,1] canvas
 * space so one editor/renderer handles every template — adding a template is
 * pure data, no new rendering code (see templates.ts).
 */
export type Ratio = '1:1' | '4:5' | '3:4' | '4:3' | '16:9' | '9:16' | 'A4';

export type Frame = {
  id: string;
  /** normalized rect in canvas space (0..1) */
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number; // degrees
  radius?: number; // extra corner radius fraction of min(frame w,h)
  z?: number; // layering (higher = on top), for overlap templates
};

export type Template = {
  id: string;
  name: string;
  category: string;
  ratio: Ratio;
  frames: Frame[];
};

export type FrameStyle = 'none' | 'white' | 'polaroid' | 'shadow';

/** Per-frame image assignment + how the image sits inside its frame. */
export type FrameFill = {
  uri?: string;
  /** zoom multiplier over the cover-fit baseline (>=1) */
  scale: number;
  /** pan offset in frame-relative units (-1..1 roughly) */
  tx: number;
  ty: number;
};

export type CollageText = {
  id: string;
  text: string;
  /** normalized position */
  x: number;
  y: number;
  size: number; // fraction of canvas min side
  color: string;
  align: 'left' | 'center' | 'right';
  opacity: number;
};

export type CollageStyle = {
  background: string;
  /** spacing between frames + outer margin, fraction of canvas min side */
  spacing: number;
  /** global corner radius, fraction of min(frame w,h) */
  cornerRadius: number;
  frameStyle: FrameStyle;
};

export type CollageProject = {
  templateId: string;
  ratio: Ratio;
  fills: Record<string, FrameFill>; // by frame id
  texts: CollageText[];
  style: CollageStyle;
};

export const RATIO_VALUE: Record<Ratio, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  A4: 210 / 297,
};

export const DEFAULT_STYLE: CollageStyle = {
  background: '#FFFFFF',
  spacing: 0.02,
  cornerRadius: 0.04,
  frameStyle: 'none',
};

export function emptyFill(): FrameFill {
  return { scale: 1, tx: 0, ty: 0 };
}
