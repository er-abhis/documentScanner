// Skia is only used at encode time; stub it so the pure crop/scale math imports.
jest.mock('@shopify/react-native-skia', () => ({ ImageFormat: { JPEG: 3, PNG: 4, WEBP: 6 } }));
jest.mock('react-native-fs', () => ({}));

import { computeOutputDims } from '../src/services/image/resize';

// landscape 1920x1080 — dimensions the UX spec calls out
test('aspect-ratio crops match the spec', () => {
  expect(computeOutputDims(1920, 1080, '1:1', 1)).toEqual({ w: 1080, h: 1080 });
  expect(computeOutputDims(1920, 1080, '4:3', 1)).toEqual({ w: 1440, h: 1080 });
  expect(computeOutputDims(1920, 1080, '3:4', 1)).toEqual({ w: 810, h: 1080 });
  expect(computeOutputDims(1920, 1080, '16:9', 1)).toEqual({ w: 1920, h: 1080 });
});

test('scale multiplies the (optionally cropped) size, never upscales', () => {
  expect(computeOutputDims(1920, 1080, 'original', 0.5)).toEqual({ w: 960, h: 540 });
  expect(computeOutputDims(1000, 1000, 'original', 2)).toEqual({ w: 1000, h: 1000 }); // clamped ≤1
  expect(computeOutputDims(1920, 1080, '1:1', 0.25)).toEqual({ w: 270, h: 270 });
});
