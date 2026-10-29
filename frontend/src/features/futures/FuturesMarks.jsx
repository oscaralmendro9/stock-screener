import { ArrowDownRight, ArrowUpRight, MoveRight } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { TREND_LABELS, formatAxisPrice, formatFuturesPrice, formatNetOfOpenInterest, formatOrdinal, formatPercent } from './format';

/**
 * Word-sized line of recent closes. One series in neutral ink: direction is
 * already in the change columns, so the line does not repeat it in color.
 */
export function Sparkline({ values, width = 96, height = 28, className }) {
  if (!values || values.length < 2) {
    return <span className={cn('inline-block text-muted-foreground', className)} style={{ width }}>—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const x = (index) => pad + (index / (values.length - 1)) * (width - pad * 2);
  const y = (value) => pad + (1 - (value - min) / span) * (height - pad * 2);
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const first = values[0];
  const last = values[values.length - 1];
  const label = `${values.length} sessions: from ${formatFuturesPrice(first)} to ${formatFuturesPrice(last)}, low ${formatFuturesPrice(min)}, high ${formatFuturesPrice(max)}`;

  return (
    <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('shrink-0 overflow-visible', className)}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" className="text-muted-foreground" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="2.5" className="fill-foreground" />
    </svg>
  );
}

/** Where the last price sits inside its 52-week low–high range. */
export function RangeBar({ metrics, className }) {
  const { low_52w: low, high_52w: high, last } = metrics ?? {};
  if (low == null || high == null || high <= low) {
    return <span className={cn('text-muted-foreground', className)}>—</span>;
  }
  const position = Math.min(1, Math.max(0, (last - low) / (high - low)));
  const label = `52-week range ${formatFuturesPrice(low)} to ${formatFuturesPrice(high)}; ${formatPercent(Math.abs(metrics.from_high_52w ?? 0))} below the high`;
  return (
    <div role="img" aria-label={label} title={label} className={cn('flex w-36 flex-col gap-1', className)}>
      <div className="relative h-1.5 rounded-full bg-surface-subtle">
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-foreground"
          style={{ left: `${position * 100}%` }}
        />
      </div>
      <div className="flex justify-between gap-2 text-[11px] text-muted-foreground tabular-nums">
        <span>{formatAxisPrice(low)}</span>
        <span>{formatAxisPrice(high)}</span>
      </div>
    </div>
  );
}

const TREND_ICONS = { up: ArrowUpRight, down: ArrowDownRight, mixed: MoveRight };
const TREND_TONES = { up: 'gain', down: 'loss', mixed: 'neutral' };

/** Close vs 50/200-session averages, with icon and word, not color alone. */
export function TrendBadge({ trend }) {
  if (!trend) return <span className="text-muted-foreground">—</span>;
  const Icon = TREND_ICONS[trend];
  return (
    <Badge tone={TREND_TONES[trend]}>
      <Icon aria-hidden="true" className="size-3" />
      {TREND_LABELS[trend]}
    </Badge>
  );
}

/** COT focal participant positioning: net share of open interest and 3-year percentile. */
export function CotCell({ cot }) {
  if (!cot) return <span className="text-muted-foreground">—</span>;
  const extreme = cot.percentile_3y != null && (cot.percentile_3y >= 90 || cot.percentile_3y <= 10);
  return (
    <div className="flex flex-col text-xs leading-tight tabular-nums" title={`${cot.participant_label}, CFTC report ${cot.report_date}`}>
      <span className="font-medium">{formatNetOfOpenInterest(cot.net_pct_open_interest)}</span>
      <span className="text-muted-foreground">
        {cot.percentile_3y == null ? 'Building history' : `${formatOrdinal(cot.percentile_3y)} pct 3Y`}
        {extreme && <span className="ml-1 font-semibold text-warning">· extreme</span>}
      </span>
    </div>
  );
}
