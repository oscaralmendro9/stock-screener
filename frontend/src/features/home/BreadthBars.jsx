import { useQuery } from '@tanstack/react-query';

import { getCurrentBreadth } from '../../api/breadth';

const share = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/** One Finviz-style split bar: two counts, their shares, and a two-tone bar. */
export function SplitBar({ leftLabel, rightLabel, left, right, total }) {
  const sum = total ?? left + right;
  const leftPct = share(left, sum);
  const rightPct = share(right, sum);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-gain">{leftLabel}</span>
        <span className="font-medium text-loss">{rightLabel}</span>
      </div>
      <div
        role="img"
        aria-label={`${leftLabel} ${left.toLocaleString()} (${leftPct.toFixed(1)}%), ${rightLabel} ${right.toLocaleString()} (${rightPct.toFixed(1)}%)`}
        className="mt-1 flex h-2 overflow-hidden rounded-full bg-surface-subtle"
      >
        <div className="h-full bg-gain" style={{ width: `${leftPct}%` }} />
        <div className="flex-1" />
        <div className="h-full bg-loss" style={{ width: `${rightPct}%` }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{leftPct.toFixed(1)}% ({left.toLocaleString()})</span>
        <span>({right.toLocaleString()}) {rightPct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

/**
 * Market breadth at a glance: advancers/decliners, new highs/lows, stocks
 * above/below their 40-day average (T2108) and big movers (±4%).
 */
export default function BreadthBars({ market }) {
  const { data } = useQuery({
    queryKey: ['breadth', 'current', market],
    queryFn: () => getCurrentBreadth(market),
    staleTime: 5 * 60_000,
  });
  if (!data) return null;

  const t2108Eligible = data.t2108_eligible_count ?? data.total_stocks_scanned ?? 0;
  const bars = [
    { leftLabel: 'Advancing', rightLabel: 'Declining', left: data.advancing_count ?? 0, right: data.declining_count ?? 0 },
    { leftLabel: 'New high', rightLabel: 'New low', left: data.new_high_52week_count ?? 0, right: data.new_low_52week_count ?? 0 },
    {
      leftLabel: 'Above 40-day avg',
      rightLabel: 'Below',
      left: data.t2108_count ?? 0,
      right: Math.max(0, t2108Eligible - (data.t2108_count ?? 0)),
    },
    { leftLabel: 'Up 4%+', rightLabel: 'Down 4%+', left: data.stocks_up_4pct ?? 0, right: data.stocks_down_4pct ?? 0 },
  ];

  return (
    <section aria-label="Market breadth" className="grid gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-2 xl:grid-cols-4">
      {bars.map((bar) => <SplitBar key={bar.leftLabel} {...bar} />)}
    </section>
  );
}
