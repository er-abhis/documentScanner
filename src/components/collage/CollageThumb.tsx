import { useMemo } from 'react';
import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { paintCollage } from '../../services/collage/paint';
import { RATIO_VALUE, DEFAULT_STYLE, type Template } from '../../services/collage/types';

/** Static, non-interactive preview of a template with empty frames. */
export function CollageThumb({ template, width }: { template: Template; width: number }) {
  const ratio = RATIO_VALUE[template.ratio] ?? 1;
  const W = width;
  const H = width / ratio;

  const picture = useMemo(
    () =>
      createPicture(canvas => {
        paintCollage(canvas, W, H, {
          template,
          project: { templateId: template.id, ratio: template.ratio, fills: {}, texts: [], style: DEFAULT_STYLE },
          images: {},
          selectedId: null,
        });
      }, Skia.XYWHRect(0, 0, W, H)),
    [template, W, H],
  );

  return (
    <Canvas style={{ width: W, height: H }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
