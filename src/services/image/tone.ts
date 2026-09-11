import { Skia, type SkImageFilter } from '@shopify/react-native-skia';

/**
 * Non-linear highlights/shadows recovery. A ColorMatrix can't do this — it's a
 * linear map, but we need to lift only darks and pull down only brights. So we
 * use a tiny SkSL runtime effect: compute luma, build soft masks for the shadow
 * and highlight tonal ranges, and nudge each independently.
 *   shadows  > 0 brightens dark areas, < 0 deepens them
 *   highlights > 0 recovers (darkens) bright areas, < 0 boosts them
 * Same effect feeds the live preview (<RuntimeShader>) and the baked export.
 */
const SRC = `
uniform shader image;
uniform float shadows;
uniform float highlights;
half4 main(float2 xy) {
  half4 c = image.eval(xy);
  float l = dot(c.rgb, half3(0.299, 0.587, 0.114));
  float sMask = 1.0 - smoothstep(0.0, 0.5, l);
  float hMask = smoothstep(0.5, 1.0, l);
  float delta = shadows * 0.45 * sMask - highlights * 0.45 * hMask;
  c.rgb = clamp(c.rgb + delta, 0.0, 1.0);
  return c;
}`;

export const TONE_EFFECT = Skia.RuntimeEffect.Make(SRC);

/** Image filter for the export pass; null when both controls are neutral. */
export function toneImageFilter(shadows: number, highlights: number): SkImageFilter | null {
  if ((!shadows && !highlights) || !TONE_EFFECT) return null;
  const b = Skia.RuntimeShaderBuilder(TONE_EFFECT);
  b.setUniform('shadows', [shadows]);
  b.setUniform('highlights', [highlights]);
  return Skia.ImageFilter.MakeRuntimeShader(b, 'image', null);
}
