import { Skia, type SkFont, type SkImage } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import { buildPdfBase64 } from '../pdf';
import { encodeImageToFile, type ImgFormat } from '../image/encode';
import { paintCollage } from './paint';
import { RATIO_VALUE, type CollageProject, type Template } from './types';

/** Canvas pixel size for a ratio, capped so the long side ~= maxSide. */
export function canvasSize(ratio: keyof typeof RATIO_VALUE, maxSide: number) {
  const r = RATIO_VALUE[ratio]; // w/h
  if (r >= 1) return { W: Math.round(maxSide), H: Math.round(maxSide / r) };
  return { W: Math.round(maxSide * r), H: Math.round(maxSide) };
}

async function loadImages(project: CollageProject): Promise<Record<string, SkImage | undefined>> {
  const map: Record<string, SkImage | undefined> = {};
  const uris = Array.from(
    new Set(Object.values(project.fills).map(f => f.uri).filter(Boolean) as string[]),
  );
  for (const uri of uris) {
    try {
      map[uri] = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri)) ?? undefined;
    } catch {
      map[uri] = undefined;
    }
  }
  return map;
}

async function renderImage(
  template: Template,
  project: CollageProject,
  maxSide: number,
  font?: SkFont | null,
): Promise<SkImage> {
  const { W, H } = canvasSize(project.ratio, maxSide);
  const images = await loadImages(project);
  const surface = Skia.Surface.MakeOffscreen(W, H);
  if (!surface) throw new Error('surface_failed');
  paintCollage(surface.getCanvas(), W, H, { template, project, images, font, selectedId: null });
  surface.flush();
  return surface.makeImageSnapshot();
}

export async function exportCollageImage(
  template: Template,
  project: CollageProject,
  format: ImgFormat,
  opts: { maxSide?: number; quality?: number; font?: SkFont | null } = {},
): Promise<string> {
  const img = await renderImage(template, project, opts.maxSide ?? 2000, opts.font);
  return encodeImageToFile(img, format, opts.quality ?? 95, 'collage');
}

export async function exportCollagePdf(
  template: Template,
  project: CollageProject,
  opts: { maxSide?: number; font?: SkFont | null } = {},
): Promise<string> {
  // render to a JPEG first, then wrap as a single-page PDF sized to the image
  const jpg = await exportCollageImage(template, project, 'jpg', {
    maxSide: opts.maxSide ?? 2000,
    quality: 95,
    font: opts.font,
  });
  const base64 = await buildPdfBase64([jpg]);
  const path = `${RNFS.CachesDirectoryPath}/collage_${Date.now()}.pdf`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}
