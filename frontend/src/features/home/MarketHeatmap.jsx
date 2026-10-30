import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';

import { getScanHeatmap } from '../../api/scans';

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

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const signed = (value) => (value == null ? '–' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`);

/**
 * Market map: the largest names by sector, sized by market cap, colored by
 * the day's change. A tile opens its stock page.
 */
export default function MarketHeatmap({ scanId, height = 420, limit = 500, title = 'Market map' }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const width = useWidth(containerRef);
  const query = useQuery({
    queryKey: ['scanHeatmap', scanId, limit],
    queryFn: () => getScanHeatmap(scanId, { limit, min_market_cap_usd: 1_000_000_000 }),
    enabled: Boolean(scanId),
    staleTime: 5 * 60_000,
  });
  const items = query.data?.items;
  const layout = useMemo(
    () => (items && width > 0 ? layoutHeatmap(items, width, height) : null),
    [items, width, height],
  );

  return (
    <section aria-label={title} className="min-w-0 rounded-lg border border-border bg-surface p-2">
      <header className="mb-1.5 flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-[11px] text-muted-foreground">
          {layout ? `${layout.tiles.length} largest companies by market cap · 1-day change` : null}
        </p>
      </header>
      <div ref={containerRef} className="relative overflow-hidden rounded-md bg-[#2b2f38]" style={{ height }}>
        {query.isLoading && <div role="status" aria-label="Loading market map" className="absolute inset-0 bg-surface-subtle motion-safe:animate-pulse" />}
        {query.isError && <p role="alert" className="p-4 text-sm text-white/80">The market map could not be loaded.</p>}
        {layout?.sectors.map((sector) => (
          <div
            key={sector.name}
            aria-hidden="true"
            className="pointer-events-none absolute truncate px-1 text-[10px] leading-4 font-semibold tracking-wide text-white/80 uppercase"
            style={{ left: sector.x, top: sector.y, width: sector.width }}
          >
            {sector.name}
          </div>
        ))}
        {layout?.tiles.map((tile) => {
          const showSymbol = tile.width >= 26 && tile.height >= 14;
          const showChange = tile.width >= 40 && tile.height >= 30;
          const big = tile.width >= 90 && tile.height >= 50;
          return (
            <button
              key={tile.symbol}
              type="button"
              title={`${tile.symbol}${tile.company_name ? ` · ${tile.company_name}` : ''} · ${signed(tile.price_change_1d)}`}
              aria-label={`${tile.symbol} ${signed(tile.price_change_1d)}`}
              onClick={() => navigate(`/stocks/${encodeURIComponent(tile.symbol)}`)}
              className="absolute flex cursor-pointer flex-col items-center justify-center overflow-hidden text-white outline-none hover:brightness-125 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white"
              style={{ left: tile.x, top: tile.y, width: tile.width, height: tile.height, backgroundColor: changeColor(tile.price_change_1d) }}
            >
              {showSymbol && <span className={big ? 'text-base font-bold' : 'text-[10px] leading-3 font-semibold'}>{tile.symbol}</span>}
              {showChange && <span className={big ? 'text-xs' : 'text-[9px] leading-3'}>{signed(tile.price_change_1d)}</span>}
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex justify-center gap-px text-[10px] text-white">
        {LEGEND.map((value) => (
          <span key={value} className="w-10 py-0.5 text-center tabular-nums" style={{ backgroundColor: changeColor(value === 0 ? 0 : value) }}>
            {value > 0 ? `+${value}%` : `${value}%`}
          </span>
        ))}
      </div>
    </section>
  );
}
