/**
 * Market Breadth Chart with optional benchmark overlay
 *
 * Displays daily breadth movers (stocks up/down 4%+)
 * with benchmark price overlay on secondary axis when available
 */
import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Info, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Card } from '@/ui/card';

const SERIES = {
  up: { name: 'Up 4%+', color: 'var(--gain)', note: 'stocks up 4%+ (daily count)' },
  down: { name: 'Down 4%+', color: 'var(--loss)', note: 'stocks down 4%+ (daily count)' },
  benchmark: { color: 'var(--accent)' },
};
// Ranges short enough that month-year ticks would all read the same.
const SHORT_RANGES = new Set(['1M', '3M']);
const AXIS = { stroke: 'var(--border)', tick: { fill: 'var(--muted-foreground)', fontSize: 11 }, tickLine: false };

/**
 * Custom tooltip component for breadth chart
 */
const CustomTooltip = ({ active, payload, label, benchmarkLabel = 'SPY' }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold tabular-nums">{format(parseISO(label), 'MMM dd, yyyy')}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-1.5 tabular-nums">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {entry.name === benchmarkLabel ? `$${entry.value?.toFixed(2)}` : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
};

function Swatch({ color, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

function Notice({ tone, children }) {
  const Icon = tone === 'error' ? TriangleAlert : Info;
  return (
    <Card className="tw mb-2 p-4">
      <div
        role={tone === 'error' ? 'alert' : 'status'}
        className={cn(
          'flex items-center gap-3 rounded-md border px-3 py-2 text-sm',
          tone === 'error' ? 'border-loss/40 bg-loss/10' : 'border-border bg-surface-subtle',
        )}
      >
        <Icon aria-hidden="true" className={cn('size-4 shrink-0', tone === 'error' ? 'text-loss' : 'text-muted-foreground')} />
        <p>{children}</p>
      </div>
    </Card>
  );
}

/**
 * BreadthChart Component
 *
 * @param {Object} props
 * @param {Array} props.breadthData - Historical breadth data array
 * @param {Array} props.spyData - Benchmark historical price data array
 * @param {boolean} props.isLoading - Loading state
 * @param {Error} props.error - Error object if any
 * @param {string} props.timeRange - Selected time range (6M, 1Y, 2Y)
 * @param {Function} props.onTimeRangeChange - Callback when time range changes
 * @param {number} props.height - Chart height in pixels
 */
function BreadthChart({
  breadthData,
  spyData,
  benchmarkLabel = 'SPY',
  isLoading,
  error,
  timeRange = '1Y',
  onTimeRangeChange,
  availableRanges = ['1M', '3M', '6M', '1Y'],
  height = 400,
  fillContainer = false,
}) {
  // Merge breadth and benchmark data by date
  const chartData = useMemo(() => {
    if (!breadthData || breadthData.length === 0) return [];

    // Create map of benchmark prices by date
    const benchmarkByDate = {};
    if (spyData && spyData.length > 0) {
      spyData.forEach((d) => {
        benchmarkByDate[d.date] = d.close;
      });
    }

    // Merge data (breadth data is primary, add benchmark where available)
    return breadthData
      .map((b) => ({
        date: b.date,
        stocksUp: b.stocks_up_4pct,
        stocksDown: b.stocks_down_4pct,
        benchmark: benchmarkByDate[b.date] || null,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [breadthData, spyData]);
  const hasBenchmarkOverlay = chartData.some((row) => row.benchmark != null);

  if (isLoading) {
    return (
      <Card
        aria-busy="true"
        aria-label="Loading breadth chart"
        className={cn('tw mb-2 p-4', fillContainer && 'h-full')}
      >
        <div className="mb-3 h-4 w-64 max-w-full rounded bg-surface-subtle motion-safe:animate-pulse" />
        <div className={cn('rounded bg-surface-subtle motion-safe:animate-pulse', fillContainer ? 'h-[calc(100%-2rem)]' : 'h-72')} />
      </Card>
    );
  }

  if (error) {
    return <Notice tone="error">Error loading breadth chart: {error.message}</Notice>;
  }

  if (!chartData || chartData.length === 0) {
    return <Notice tone="info">No breadth data available. Consider running a backfill.</Notice>;
  }

  return (
    <Card className={cn('tw flex flex-col', fillContainer ? 'h-full p-3' : 'mb-2 p-4')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className={cn('font-semibold', fillContainer ? 'text-sm' : 'text-base')}>
          Market Breadth (4%+ Movers){hasBenchmarkOverlay ? ` with ${benchmarkLabel} Overlay` : ''}
        </h2>
        <div role="group" aria-label="Time range" className="inline-flex rounded-md border border-border p-0.5">
          {availableRanges.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={range === timeRange}
              onClick={() => { if (range !== timeRange) onTimeRangeChange?.(range); }}
              className={cn(
                'h-9 min-w-11 cursor-pointer rounded-sm px-2.5 text-xs font-semibold tabular-nums outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7 md:min-w-0',
                range === timeRange ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height={fillContainer ? '100%' : height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: hasBenchmarkOverlay ? 8 : 4, left: 0, bottom: 4 }}
          >
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />

            <XAxis
              dataKey="date"
              {...AXIS}
              tickFormatter={(date) => format(parseISO(date), SHORT_RANGES.has(timeRange) ? 'MMM d' : 'MMM yy')}
              interval="preserveStartEnd"
              minTickGap={24}
            />

            {/* Left Y-axis: Breadth counts */}
            <YAxis
              yAxisId="left"
              {...AXIS}
              width={40}
              domain={[0, 'auto']}
            />

            {hasBenchmarkOverlay && (
              <YAxis
                yAxisId="right"
                orientation="right"
                {...AXIS}
                width={52}
                tickFormatter={(value) => `$${value}`}
                domain={['auto', 'auto']}
              />
            )}

            <Tooltip
              content={<CustomTooltip benchmarkLabel={benchmarkLabel} />}
              cursor={{ stroke: 'var(--border)' }}
            />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="stocksUp"
              name={SERIES.up.name}
              fill={SERIES.up.color}
              fillOpacity={0.2}
              stroke={SERIES.up.color}
              strokeWidth={1.5}
              isAnimationActive={false}
            />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="stocksDown"
              name={SERIES.down.name}
              fill={SERIES.down.color}
              fillOpacity={0.2}
              stroke={SERIES.down.color}
              strokeWidth={1.5}
              isAnimationActive={false}
            />

            {hasBenchmarkOverlay && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="benchmark"
                name={benchmarkLabel}
                stroke={SERIES.benchmark.color}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <Swatch color={SERIES.up.color}>Left axis: {SERIES.up.note}</Swatch>
        <Swatch color={SERIES.down.color}>Left axis: {SERIES.down.note}</Swatch>
        {hasBenchmarkOverlay && (
          <Swatch color={SERIES.benchmark.color}>Right axis: {benchmarkLabel} price</Swatch>
        )}
      </div>
    </Card>
  );
}

export default BreadthChart;
