/**
 * Shared RRG quadrant colors — single source of truth for the live and static
 * charts (and any consumer that colors by quadrant, e.g. a detail modal). Each
 * quadrant maps to a design token, so the colours follow light/dark mode
 * through CSS variables (SVG presentation attributes resolve var()).
 */
export const QUADRANT_TONES = {
  Leading: 'gain',
  Weakening: 'warning',
  Lagging: 'loss',
  Improving: 'accent',
};

const COLORS = Object.fromEntries(
  Object.entries(QUADRANT_TONES).map(([quadrant, tone]) => [quadrant, `var(--${tone})`]),
);
const FILLS = Object.fromEntries(
  Object.entries(COLORS).map(([quadrant, color]) => [quadrant, `color-mix(in srgb, ${color} 8%, transparent)`]),
);
const colorOf = (quadrant) => COLORS[quadrant] || 'var(--disabled-foreground)';
const QUADRANT_COLORS = { colors: COLORS, fills: FILLS, colorOf };

// Kept as a hook so callers need no change; the values are theme-independent.
export function useQuadrantColors() {
  return QUADRANT_COLORS;
}

/**
 * Hover-highlight colors. A dark outline under a silver core reads on both
 * themes: the outline gives the silver an edge on the white paper, while the
 * silver core already contrasts on the near-black dark paper — so no theme lookup.
 */
export const HIGHLIGHT = '#C9CCD1'; // silver core
export const HIGHLIGHT_HALO = 'rgba(0,0,0,0.55)'; // outline beneath the silver

/**
 * Canonical quadrant order (clockwise rotation cycle) — single source of truth
 * for the quadrant filter buttons so they stay consistent with the colors above.
 */
export const QUADRANTS = ['Improving', 'Leading', 'Weakening', 'Lagging'];

/**
 * Per-quadrant plot geometry: which half of each axis the quadrant occupies
 * relative to the 100/100 cross ('lo' below, 'hi' above) and where its
 * backdrop label sits. Drives the RRG quadrant backdrops.
 */
export const QUADRANT_LAYOUT = [
  { name: 'Leading', x: 'hi', y: 'hi', labelPosition: 'insideTopRight' },
  { name: 'Weakening', x: 'hi', y: 'lo', labelPosition: 'insideBottomRight' },
  { name: 'Lagging', x: 'lo', y: 'lo', labelPosition: 'insideBottomLeft' },
  { name: 'Improving', x: 'lo', y: 'hi', labelPosition: 'insideTopLeft' },
];
