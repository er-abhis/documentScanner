/**
 * Shared annotation model. Coordinates are normalized to [0,1] relative to the
 * displayed content rect, so strokes are resolution-independent and can be
 * flattened onto the full-resolution image (or a PDF page) at any scale.
 *
 * This model is consumed by every editor (Image Studio, PDF edit, Collage) so
 * drawing/erasing/undo behave identically everywhere.
 */
export type Pt = { x: number; y: number };

export type StrokeTool = 'pen' | 'highlight';

export type Stroke = {
  id: string;
  tool: StrokeTool;
  color: string;
  /** stroke width as a fraction of the content's smaller side (resolution-independent) */
  width: number;
  opacity: number;
  points: Pt[];
};

/** A text overlay placed on a page/image. Position is the text's top-left in
 * normalized [0,1] coords; size is a fraction of the content's smaller side. */
export type TextItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
};

export type Annotation = Stroke | TextItem;

/** default palette + sizes shared by the drawing toolbar */
export const PEN_COLORS = ['#111111', '#E5484D', '#2B6BE4', '#2F9E44', '#F08C00', '#FFFFFF'];
export const HIGHLIGHT_COLORS = ['#FFE066', '#8CE99A', '#74C0FC', '#FFA8A8', '#D0BFFF'];
