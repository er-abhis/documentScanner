import type { Template } from './types';

/** frame shorthand */
const f = (id: string, x: number, y: number, w: number, h: number, extra: Partial<Template['frames'][0]> = {}) => ({
  id,
  x,
  y,
  w,
  h,
  ...extra,
});

/**
 * Curated layouts. Frames are normalized [0,1]; spacing/margin is applied by
 * the renderer, so these can tile edge-to-edge. Quality over quantity — ~15
 * strong templates across ratios and categories.
 */
export const TEMPLATES: Template[] = [
  // ---- Classic
  { id: 'c-2v', name: 'Split', category: 'Classic', ratio: '1:1', frames: [f('a', 0, 0, 1, 0.5), f('b', 0, 0.5, 1, 0.5)] },
  { id: 'c-2h', name: 'Duo', category: 'Classic', ratio: '1:1', frames: [f('a', 0, 0, 0.5, 1), f('b', 0.5, 0, 0.5, 1)] },
  { id: 'c-3l', name: 'Feature', category: 'Classic', ratio: '4:3', frames: [f('a', 0, 0, 0.62, 1), f('b', 0.62, 0, 0.38, 0.5), f('c', 0.62, 0.5, 0.38, 0.5)] },

  // ---- Grid
  { id: 'g-4', name: 'Grid 4', category: 'Grid', ratio: '1:1', frames: [f('a', 0, 0, 0.5, 0.5), f('b', 0.5, 0, 0.5, 0.5), f('c', 0, 0.5, 0.5, 0.5), f('d', 0.5, 0.5, 0.5, 0.5)] },
  { id: 'g-6', name: 'Grid 6', category: 'Grid', ratio: '1:1', frames: [f('a', 0, 0, 1 / 3, 0.5), f('b', 1 / 3, 0, 1 / 3, 0.5), f('c', 2 / 3, 0, 1 / 3, 0.5), f('d', 0, 0.5, 1 / 3, 0.5), f('e', 1 / 3, 0.5, 1 / 3, 0.5), f('f', 2 / 3, 0.5, 1 / 3, 0.5)] },
  { id: 'g-3r', name: 'Stack 3', category: 'Grid', ratio: '4:5', frames: [f('a', 0, 0, 1, 1 / 3), f('b', 0, 1 / 3, 1, 1 / 3), f('c', 0, 2 / 3, 1, 1 / 3)] },

  // ---- Social
  { id: 's-4', name: 'Post 4', category: 'Social', ratio: '4:5', frames: [f('a', 0, 0, 0.5, 0.5), f('b', 0.5, 0, 0.5, 0.5), f('c', 0, 0.5, 0.5, 0.5), f('d', 0.5, 0.5, 0.5, 0.5)] },
  { id: 's-hero', name: 'Hero', category: 'Social', ratio: '4:5', frames: [f('a', 0, 0, 1, 0.6), f('b', 0, 0.6, 0.5, 0.4), f('c', 0.5, 0.6, 0.5, 0.4)] },

  // ---- Portrait
  { id: 'p-2', name: 'Portrait Duo', category: 'Portrait', ratio: '3:4', frames: [f('a', 0, 0, 1, 0.5), f('b', 0, 0.5, 1, 0.5)] },
  { id: 'p-3', name: 'Portrait Trio', category: 'Portrait', ratio: '3:4', frames: [f('a', 0, 0, 1, 0.6), f('b', 0, 0.6, 0.5, 0.4), f('c', 0.5, 0.6, 0.5, 0.4)] },

  // ---- Story (9:16)
  { id: 'st-3', name: 'Story 3', category: 'Story', ratio: '9:16', frames: [f('a', 0, 0, 1, 1 / 3), f('b', 0, 1 / 3, 1, 1 / 3), f('c', 0, 2 / 3, 1, 1 / 3)] },
  { id: 'st-hero', name: 'Story Hero', category: 'Story', ratio: '9:16', frames: [f('a', 0, 0, 1, 0.55), f('b', 0, 0.55, 0.5, 0.45), f('c', 0.5, 0.55, 0.5, 0.45)] },

  // ---- Travel
  { id: 't-4', name: 'Journey', category: 'Travel', ratio: '4:3', frames: [f('a', 0, 0, 0.6, 1), f('b', 0.6, 0, 0.4, 1 / 3), f('c', 0.6, 1 / 3, 0.4, 1 / 3), f('d', 0.6, 2 / 3, 0.4, 1 / 3)] },
  { id: 't-pano', name: 'Panorama', category: 'Travel', ratio: '16:9', frames: [f('a', 0, 0, 1 / 3, 1), f('b', 1 / 3, 0, 1 / 3, 1), f('c', 2 / 3, 0, 1 / 3, 1)] },

  // ---- Gallery (varied sizes / wall feel)
  {
    id: 'gal-5',
    name: 'Gallery Wall',
    category: 'Gallery',
    ratio: '4:5',
    frames: [
      f('a', 0.28, 0, 0.44, 0.34),
      f('b', 0, 0.36, 0.34, 0.3),
      f('c', 0.36, 0.36, 0.28, 0.3),
      f('d', 0.66, 0.36, 0.34, 0.3),
      f('e', 0.2, 0.68, 0.6, 0.32),
    ],
  },

  // ---- more Grid
  { id: 'g-9', name: 'Grid 9', category: 'Grid', ratio: '1:1', frames: Array.from({ length: 9 }, (_, i) => f(`${i}`, (i % 3) / 3, Math.floor(i / 3) / 3, 1 / 3, 1 / 3)) },
  { id: 'g-2x3', name: 'Grid 6 Tall', category: 'Grid', ratio: '3:4', frames: Array.from({ length: 6 }, (_, i) => f(`${i}`, (i % 2) / 2, Math.floor(i / 2) / 3, 1 / 2, 1 / 3)) },
  { id: 'g-1-2', name: 'One + Two', category: 'Grid', ratio: '1:1', frames: [f('a', 0, 0, 1, 0.55), f('b', 0, 0.55, 0.5, 0.45), f('c', 0.5, 0.55, 0.5, 0.45)] },
  { id: 'g-2-1', name: 'Two + One', category: 'Grid', ratio: '1:1', frames: [f('a', 0, 0, 0.5, 0.45), f('b', 0.5, 0, 0.5, 0.45), f('c', 0, 0.45, 1, 0.55)] },

  // ---- more Social
  { id: 's-3v', name: 'Triptych', category: 'Social', ratio: '4:5', frames: [f('a', 0, 0, 1 / 3, 1), f('b', 1 / 3, 0, 1 / 3, 1), f('c', 2 / 3, 0, 1 / 3, 1)] },
  { id: 's-5', name: 'Five Up', category: 'Social', ratio: '4:5', frames: [f('a', 0, 0, 0.5, 0.5), f('b', 0.5, 0, 0.5, 0.5), f('c', 0, 0.5, 1 / 3, 0.5), f('d', 1 / 3, 0.5, 1 / 3, 0.5), f('e', 2 / 3, 0.5, 1 / 3, 0.5)] },

  // ---- more Story
  { id: 'st-2', name: 'Story Duo', category: 'Story', ratio: '9:16', frames: [f('a', 0, 0, 1, 0.5), f('b', 0, 0.5, 1, 0.5)] },
  { id: 'st-grid', name: 'Story Grid', category: 'Story', ratio: '9:16', frames: [f('a', 0, 0, 0.5, 0.5), f('b', 0.5, 0, 0.5, 0.5), f('c', 0, 0.5, 0.5, 0.5), f('d', 0.5, 0.5, 0.5, 0.5)] },

  // ---- more Travel
  { id: 't-filmstrip', name: 'Film Strip', category: 'Travel', ratio: '16:9', frames: Array.from({ length: 4 }, (_, i) => f(`${i}`, i / 4, 0, 1 / 4, 1)) },
  { id: 't-hero', name: 'Big Feature', category: 'Travel', ratio: '4:3', frames: [f('a', 0, 0, 1, 0.66), f('b', 0, 0.66, 1 / 3, 0.34), f('c', 1 / 3, 0.66, 1 / 3, 0.34), f('d', 2 / 3, 0.66, 1 / 3, 0.34)] },

  // ---- more Gallery (varied wall)
  {
    id: 'gal-6',
    name: 'Salon Wall',
    category: 'Gallery',
    ratio: '1:1',
    frames: [
      f('a', 0, 0, 0.4, 0.55),
      f('b', 0.42, 0, 0.58, 0.34),
      f('c', 0.42, 0.36, 0.28, 0.32),
      f('d', 0.72, 0.36, 0.28, 0.32),
      f('e', 0, 0.57, 0.5, 0.43),
      f('f', 0.52, 0.7, 0.48, 0.3),
    ],
  },
  {
    id: 'gal-mag',
    name: 'Magazine',
    category: 'Gallery',
    ratio: '4:5',
    frames: [f('a', 0, 0, 0.6, 0.6), f('b', 0.6, 0, 0.4, 0.3), f('c', 0.6, 0.3, 0.4, 0.3), f('d', 0, 0.6, 0.4, 0.4), f('e', 0.4, 0.6, 0.6, 0.4)],
  },
];

export const CATEGORIES = ['All', 'Classic', 'Grid', 'Social', 'Portrait', 'Story', 'Travel', 'Gallery'];

export function templateById(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}
