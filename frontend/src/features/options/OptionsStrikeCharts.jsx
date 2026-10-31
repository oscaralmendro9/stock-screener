import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/ui/card';

// Calls in the gain token, puts in the loss token, across all three charts.
const CALL = 'var(--gain)';
const PUT = 'var(--loss)';
const GUIDE = 'var(--muted-foreground)';
const AXIS = { stroke: 'var(--border)', tick: { fill: 'var(--muted-foreground)', fontSize: 11 }, tickLine: false };
const GRID = <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />;

function StrikeTooltip({ active, payload, label, format = (value) => value }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold tabular-nums">Strike {label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-1.5 tabular-nums">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: entry.color, opacity: entry.fillOpacity ?? 1 }} />
          <span className="text-muted-foreground">{entry.name}:</span> {entry.value == null ? '—' : format(entry.value)}
        </p>
      ))}
    </div>
  );
}

function ChartFrame({ title, children }) {
  return (
    <Card className="flex h-72 flex-col p-3">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="min-h-0 flex-1">{children}</div>
    </Card>
  );
}

const percentTick = (value) => `${Math.round(value * 100)}%`;
const percentValue = (value) => `${(value * 100).toFixed(1)}%`;

export default function OptionsStrikeCharts({ points, spotPrice }) {
  return (
    <div className="tw grid gap-4 lg:grid-cols-3">
      <ChartFrame title="Open interest and volume">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            {GRID}
            <XAxis dataKey="strike" {...AXIS} minTickGap={16} />
            <YAxis {...AXIS} width={44} />
            <Tooltip content={<StrikeTooltip />} cursor={{ fill: 'var(--surface-subtle)' }} />
            <ReferenceLine x={spotPrice} stroke={GUIDE} strokeDasharray="3 3" />
            <Bar dataKey="call_open_interest" name="Call OI" fill={CALL} isAnimationActive={false} />
            <Bar dataKey="put_open_interest" name="Put OI" fill={PUT} isAnimationActive={false} />
            <Bar dataKey="call_volume" name="Call volume" fill={CALL} fillOpacity={0.45} isAnimationActive={false} />
            <Bar dataKey="put_volume" name="Put volume" fill={PUT} fillOpacity={0.45} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame title="Estimated GEX by strike">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            {GRID}
            <XAxis dataKey="strike" {...AXIS} minTickGap={16} />
            <YAxis {...AXIS} width={52} />
            <Tooltip content={<StrikeTooltip />} cursor={{ fill: 'var(--surface-subtle)' }} />
            <ReferenceLine y={0} stroke={GUIDE} />
            <Bar dataKey="estimated_call_gex" name="Estimated call GEX" fill={CALL} isAnimationActive={false} />
            <Bar dataKey="estimated_put_gex" name="Estimated put GEX" fill={PUT} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <ChartFrame title="Implied volatility smile">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            {GRID}
            <XAxis dataKey="strike" {...AXIS} minTickGap={16} />
            <YAxis {...AXIS} width={40} tickFormatter={percentTick} />
            <Tooltip content={<StrikeTooltip format={percentValue} />} cursor={{ stroke: 'var(--border)' }} />
            <ReferenceLine x={spotPrice} stroke={GUIDE} strokeDasharray="3 3" />
            <Line dataKey="call_iv" name="Call IV" stroke={CALL} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
            <Line dataKey="put_iv" name="Put IV" stroke={PUT} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
