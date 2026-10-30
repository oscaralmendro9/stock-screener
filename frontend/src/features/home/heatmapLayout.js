import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';

// Diverging scale around a neutral slate, the convention of market maps.
// Fixed colors (not theme tokens) so tiles read the same in light and dark,
// always with light text.
const STEPS = [
  { max: -3, color: '#e5383b' },
  { max: -2, color: '#b5383d' },
  { max: -1, color: '#86404a' },
  { max: -0.1, color: '#5a4652' },
  { max: 0.1, color: '#454a57' },
  { max: 1, color: '#3d6551' },
  { max: 2, color: '#2f7f4f' },
  { max: 3, color: '#2b9a52' },
  { max: Infinity, color: '#2fbf5b' },
];
export const LEGEND = [-3, -2, -1, 0, 1, 2, 3];

export function changeColor(change) {
  if (change == null || !Number.isFinite(change)) return '#454a57';
  return STEPS.find((step) => change <= step.max).color;
}

const SECTOR_HEADER = 16;

/** Sector > stock treemap, sized by USD market cap. Pure, for tests. */
export function layoutHeatmap(items, width, height) {
  const bySector = new Map();
  for (const item of items) {
    // No sector means a fund (SPY, QQQ…), not a company: a fund's "market cap"
    // would swamp the map, so maps of companies leave them out.
    if (!(item.market_cap_usd > 0) || !item.gics_sector) continue;
    const sector = item.gics_sector;
    if (!bySector.has(sector)) bySector.set(sector, []);
    bySector.get(sector).push(item);
  }
  const root = hierarchy({
    children: [...bySector].map(([name, children]) => ({ name, children })),
  })
    .sum((node) => node.market_cap_usd ?? 0)
    .sort((a, b) => b.value - a.value);
  treemap()
    .tile(treemapSquarify)
    .size([width, height])
    .paddingOuter(1)
    .paddingTop((node) => (node.depth === 1 ? SECTOR_HEADER : 0))
    .paddingInner(1)
    .round(true)(root);
  return {
    sectors: (root.children ?? []).map((node) => ({
      name: node.data.name,
      x: node.x0,
      y: node.y0,
      width: node.x1 - node.x0,
      height: node.y1 - node.y0,
    })),
    tiles: root.leaves().map((leaf) => ({
      ...leaf.data,
      x: leaf.x0,
      y: leaf.y0,
      width: leaf.x1 - leaf.x0,
      height: leaf.y1 - leaf.y0,
    })),
  };
}
