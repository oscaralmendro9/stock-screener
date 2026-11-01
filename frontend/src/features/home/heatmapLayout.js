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
const INDUSTRY_HEADER = 12;
// An industry gets a label strip only when it holds a fair share of its
// sector, so slivers keep all their room for tiles.
const INDUSTRY_LABEL_MIN_SHARE = 0.08;

const box = (node) => ({
  name: node.data.name,
  x: node.x0,
  y: node.y0,
  width: node.x1 - node.x0,
  height: node.y1 - node.y0,
});

function groupBy(list, keyOf) {
  const groups = new Map();
  for (const item of list) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups];
}

/**
 * Sector > (industry >) stock treemap, sized by USD market cap. Pure, for
 * tests. With `byIndustry`, each sector splits into its industries, as a
 * full-screen market map does.
 */
export function layoutHeatmap(items, width, height, { byIndustry = false } = {}) {
  // No sector means a fund (SPY, QQQ…), not a company: a fund's "market cap"
  // would swamp the map, so maps of companies leave them out.
  const companies = items.filter((item) => item.market_cap_usd > 0 && item.gics_sector);
  const sectors = groupBy(companies, (item) => item.gics_sector).map(([name, members]) => ({
    name,
    children: byIndustry
      ? groupBy(members, (item) => item.gics_industry || 'Other').map(([industry, stocks]) => ({ name: industry, industry: true, children: stocks }))
      : members,
  }));
  const root = hierarchy({ children: sectors })
    .sum((node) => node.market_cap_usd ?? 0)
    .sort((a, b) => b.value - a.value);
  treemap()
    .tile(treemapSquarify)
    .size([width, height])
    .paddingOuter(1)
    .paddingTop((node) => {
      if (node.depth === 1) return SECTOR_HEADER;
      if (node.depth === 2 && node.data.industry) {
        // Decided before layout from the share of the parent's value: an
        // estimate of the box, enough to skip strips on slivers.
        const share = node.value / (node.parent?.value || 1);
        // Recorded so the labels drawn are exactly the strips reserved.
        node.data.labelled = share > INDUSTRY_LABEL_MIN_SHARE;
        return node.data.labelled ? INDUSTRY_HEADER : 0;
      }
      return 0;
    })
    .paddingInner(1)
    .round(true)(root);
  const industries = byIndustry
    ? root.descendants()
      .filter((node) => node.depth === 2 && node.data.labelled)
      .map(box)
    : [];
  return {
    sectors: (root.children ?? []).map(box),
    industries,
    tiles: root.leaves().map((leaf) => ({
      ...leaf.data,
      x: leaf.x0,
      y: leaf.y0,
      width: leaf.x1 - leaf.x0,
      height: leaf.y1 - leaf.y0,
    })),
  };
}
