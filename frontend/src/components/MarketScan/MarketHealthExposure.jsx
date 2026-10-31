import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';

// Stance band -> semantic tone. Mirrors the backend rubric ordering (high score = gain).
const STANCE_TONES = {
  'Power Trend': 'gain',
  'Confirmed Uptrend': 'gain',
  'Uptrend Under Pressure': 'warning',
  'Downtrend/Caution': 'warning',
  'Correction — In Cash': 'loss',
};

const TONE_TEXT = { gain: 'text-gain', warning: 'text-warning', loss: 'text-loss', neutral: 'text-foreground' };
const TONE_FILL = { gain: 'bg-gain', warning: 'bg-warning', loss: 'bg-loss', neutral: 'bg-muted-foreground' };

const AXIS = { stroke: 'var(--border)', tick: { fill: 'var(--muted-foreground)', fontSize: 11 }, tickLine: false };

function stanceTone(stance) {
  return STANCE_TONES[stance] || 'neutral';
}

function humanize(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmt(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function TimelineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold tabular-nums">{point.date}</p>
      <p className="tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">{fmt(point.exposure_score, 0)}</span> · {point.stance}
      </p>
      {point.follow_through && <p className="font-medium text-accent">● follow-through day</p>}
    </div>
  );
}

function SectionTitle({ meta }) {
  return (
    <CardHeader className="items-baseline">
      <CardTitle>Market Health &amp; Exposure</CardTitle>
      {meta ? <span className="text-xs text-muted-foreground tabular-nums">{meta}</span> : null}
    </CardHeader>
  );
}

function MarketHealthExposure({ exposure }) {
  const tone = stanceTone(exposure?.stance);

  const history = useMemo(
    () =>
      (exposure?.history || []).map((point) => ({
        ...point,
        label: (() => {
          try {
            return format(parseISO(point.date), 'MMM d');
          } catch {
            return point.date;
          }
        })(),
      })),
    [exposure?.history],
  );

  // The "why": every score contribution except the starting base.
  const contributions = useMemo(
    () => Object.entries(exposure?.components || {}).filter(([key]) => key !== 'base'),
    [exposure?.components],
  );

  const ftdPoints = useMemo(() => history.filter((p) => p.follow_through), [history]);

  if (!exposure) {
    return (
      <Card>
        <SectionTitle />
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No exposure data yet. It is computed daily after the breadth step (or run the backfill).
          </p>
        </CardContent>
      </Card>
    );
  }

  const score = exposure.exposure_score;
  const readout = [
    ['Distribution days', exposure.distribution_day_count],
    ['Trend', exposure.trend || '-'],
    ['Follow-through day', exposure.follow_through_day ? 'Yes' : 'No'],
    ['VIX', exposure.vix != null ? fmt(exposure.vix, 1) : '-'],
  ];

  return (
    <Card>
      <SectionTitle meta={`${exposure.date} · ${exposure.benchmark_symbol || ''}`} />
      <CardContent className="grid gap-6 md:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,3fr)]">
        {/* Score, stance and readout */}
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <span className={cn('text-4xl leading-none font-semibold tabular-nums', TONE_TEXT[tone])}>
              {fmt(score, 0)}
            </span>
            <span className="pb-0.5 text-xs text-muted-foreground">/ 100 exposure</span>
          </div>
          <div
            role="meter"
            aria-label="Exposure"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score ?? 0}
            className="h-1.5 overflow-hidden rounded-full bg-surface-subtle"
          >
            <div className={cn('h-full rounded-full', TONE_FILL[tone])} style={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }} />
          </div>
          <div>
            <Badge tone={tone}>{exposure.stance}</Badge>
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
            {readout.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Score over time */}
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Exposure over time</span>
            {ftdPoints.length > 0 && <span className="font-medium text-accent">● follow-through day</span>}
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" minTickGap={24} {...AXIS} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={30} {...AXIS} />
                <Tooltip content={<TimelineTooltip />} cursor={{ stroke: 'var(--border)' }} />
                <Area
                  type="monotone"
                  dataKey="exposure_score"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  fill="var(--accent)"
                  fillOpacity={0.1}
                  isAnimationActive={false}
                />
                {ftdPoints.map((p) => (
                  <ReferenceDot
                    key={p.date}
                    x={p.label}
                    y={p.exposure_score}
                    r={3.5}
                    fill="var(--accent)"
                    stroke="var(--surface)"
                    strokeWidth={1.5}
                    ifOverflow="extendDomain"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transparent "why" breakdown */}
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Why this score</p>
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Base</dt>
            <dd className="text-right tabular-nums">{fmt(exposure?.components?.base ?? 0, 0)}</dd>
            {contributions.map(([key, value]) => {
              const isCap = key.endsWith('_cap');
              return (
                <div key={key} className="contents">
                  <dt className="truncate text-muted-foreground">{humanize(key.replace(/_cap$/, ''))}</dt>
                  <dd
                    className={cn(
                      'text-right font-medium tabular-nums',
                      isCap ? 'text-warning' : value < 0 ? 'text-loss' : 'text-gain',
                    )}
                  >
                    {isCap ? `cap ${fmt(value, 0)}` : `${value > 0 ? '+' : ''}${fmt(value, 0)}`}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketHealthExposure;
