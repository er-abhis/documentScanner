import { Skia, ImageFormat, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';

export type JoinDirection = 'vertical' | 'horizontal';

export type JoinOptions = {
  uris: string[];
  direction: JoinDirection;
  /** gap between images, px (in output space) */
  spacing?: number;
  /** outer padding + gap fill colour, e.g. '#FFFFFF' */
  background?: string;
  /** frame drawn around each image, px (0 = none) */
  borderWidth?: number;
  borderColor?: string;
  /** JPEG quality 1-100 */
  quality?: number;
};

// ponytail: cap the shared dimension so a stack of big photos can't allocate a
// giant surface / OOM. Bump if users need print-res joins.
const MAX_SPAN = 2000;

function decode(data: Parameters<typeof Skia.Image.MakeImageFromEncoded>[0]) {
  return Skia.Image.MakeImageFromEncoded(data);
}

/**
 * Compose N images into a single JPEG, stacked vertically or side by side.
 * Images are scaled to a common width (vertical) or height (horizontal) so the
 * result lines up, with optional spacing, background fill and per-image border.
 * Returns a file:// uri in the cache dir.
 */
export async function joinImages({
  uris,
  direction,
  spacing = 16,
  background = '#FFFFFF',
  borderWidth = 0,
  borderColor = '#E2E2E2',
  quality = 92,
}: JoinOptions): Promise<string> {
  if (uris.length === 0) throw new Error('no_images');

  const imgs = [];
  for (const uri of uris) {
    const img = decode(await Skia.Data.fromURI(uri));
    if (!img) throw new Error('decode_failed');
    imgs.push(img);
  }

  const vertical = direction === 'vertical';
  const pad = spacing; // outer padding matches gap

  // common span = the shared dimension every image is scaled to
  const rawSpan = vertical
    ? Math.max(...imgs.map(i => i.width()))
    : Math.max(...imgs.map(i => i.height()));
  const span = Math.min(rawSpan, MAX_SPAN);

  // scaled box of each image once its cross dimension is `span`
  const boxes = imgs.map(img => {
    const scale = vertical ? span / img.width() : span / img.height();
    return { img, w: img.width() * scale, h: img.height() * scale };
  });

  const flow = boxes.reduce((s, b) => s + (vertical ? b.h : b.w), 0);
  const gaps = spacing * (imgs.length - 1);
  const canvasW = Math.round(vertical ? span + pad * 2 : flow + gaps + pad * 2);
  const canvasH = Math.round(vertical ? flow + gaps + pad * 2 : span + pad * 2);

  const surface = Skia.Surface.MakeOffscreen(canvasW, canvasH);
  if (!surface) throw new Error('surface_failed');
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color(background));

  const imgPaint = Skia.Paint();
  imgPaint.setAntiAlias(true);
  const border = Skia.Paint();
  border.setStyle(1); // stroke
  border.setStrokeWidth(borderWidth);
  border.setColor(Skia.Color(borderColor));
  border.setAntiAlias(true);

  let cursor = pad;
  for (const b of boxes) {
    const x = vertical ? pad : cursor;
    const y = vertical ? cursor : pad;
    const rect = Skia.XYWHRect(x, y, b.w, b.h);
    canvas.drawImageRectOptions(
      b.img,
      Skia.XYWHRect(0, 0, b.img.width(), b.img.height()),
      rect,
      FilterMode.Linear,
      MipmapMode.None,
      imgPaint,
    );
    if (borderWidth > 0) canvas.drawRect(rect, border);
    cursor += (vertical ? b.h : b.w) + spacing;
  }

  surface.flush();
  const base64 = surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, quality);
  const path = `${RNFS.CachesDirectoryPath}/joined_${Date.now()}.jpg`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}
