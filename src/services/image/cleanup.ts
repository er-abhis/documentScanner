import { Skia, ImageFormat, TileMode, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';

/**
 * Document cleanup: remove uneven lighting / shadows from a document photo by
 * dividing each pixel by a heavily-blurred estimate of its local background.
 * Where the paper is shadowed, the background is dark too, so the ratio pulls it
 * back to white — leaving crisp dark text on clean paper. A gentle contrast
 * boost finishes it. `amount` (0..1) blends the effect with the original.
 */
const SRC = `
uniform shader image;
uniform shader bg;
uniform float amount;
half4 main(float2 xy) {
  half4 c = image.eval(xy);
  half4 b = bg.eval(xy);
  half3 norm = clamp(c.rgb / max(b.rgb, half3(0.004)), 0.0, 1.0);
  norm = clamp((norm - 0.5) * 1.15 + 0.5, 0.0, 1.0);
  half3 outc = mix(c.rgb, norm, amount);
  return half4(outc, c.a);
}`;

const EFFECT = Skia.RuntimeEffect.Make(SRC);

export async function documentCleanup(uri: string, amount = 1, quality = 95): Promise<string> {
  if (!EFFECT) throw new Error('shader_unsupported');
  const img = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri));
  if (!img) throw new Error('decode_failed');
  const w = img.width();
  const h = img.height();

  // Background estimate = heavily blurred copy (captures the lighting gradient).
  const sigma = Math.max(8, Math.round(Math.max(w, h) * 0.015));
  const bgSurface = Skia.Surface.MakeOffscreen(w, h);
  if (!bgSurface) throw new Error('surface_failed');
  const blurPaint = Skia.Paint();
  blurPaint.setImageFilter(Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp, null));
  bgSurface.getCanvas().drawImage(img, 0, 0, blurPaint);
  bgSurface.flush();
  const bg = bgSurface.makeImageSnapshot();

  const imgShader = img.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
  const bgShader = bg.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
  const shader = EFFECT.makeShaderWithChildren([Math.max(0, Math.min(1, amount))], [imgShader, bgShader]);

  const out = Skia.Surface.MakeOffscreen(w, h);
  if (!out) throw new Error('surface_failed');
  const paint = Skia.Paint();
  paint.setShader(shader);
  out.getCanvas().drawRect(Skia.XYWHRect(0, 0, w, h), paint);
  out.flush();

  const base64 = out.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, quality);
  const path = `${RNFS.CachesDirectoryPath}/cleaned_${Date.now()}.jpg`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}
