import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCompact, formatIv, formatMoney } from './chainFormat';

// Strikes far from spot carry stale quotes and extreme IVs; chart the band
// traders read. The table still lists every strike.
const CHART_BAND = 0.25;

const inBand = (strike, spot) => Math.abs(strike / spot - 1) <= CHART_BAND;

const AXIS = { stroke: 'var(--border)', tick: { fill: 'var(--muted-foreground)', fontSize: 11 }, tickLine: false };

function Legend({ items }) {
  return (
    <ul className="tw flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ background: item.color, height: item.bar ? 8 : 2, width: item.bar ? 8 : 16 }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold tabular-nums">Strike {formatMoney(label)}</p>
      {payload.filter((item) => item.value != null).map((item) => (
        <p key={item.dataKey} className="flex items-center gap-2 tabular-nums text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: item.color }} />
          {item.name}: <span className="font-medium text-foreground">{format(item.value)}</span>
        </p>
      ))}
    </div>
  );
}

// Recharts only renders its own children, so this returns props, not a wrapper.
const spotLineProps = (spot) => ({
  x: spot,
  stroke: 'var(--muted-foreground)',
  strokeDasharray: '4 4',
  label: { value: 'Spot', position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 11 },
});

/** Implied volatility by strike for calls and puts: the smile and its skew. */
export function IvSmileChart({ rows, spot, height = 240 }) {
  const data = rows
    .filter((row) => inBand(row.strike, spot))
    .map((row) => ({ strike: row.strike, call: row.call?.implied_volatility ?? null, put: row.put?.implied_volatility ?? null }))
    .filter((row) => row.call != null || row.put != null);
  if (data.length < 2) {
    return <p className="py-8 text-sm text-muted-foreground">Not enough implied volatility quotes near spot to draw the smile.</p>;
  }
  const description = `Implied volatility by strike from ${formatMoney(data[0].strike)} to ${formatMoney(data.at(-1).strike)}, calls and puts, with spot at ${formatMoney(spot)}.`;
  return (
    <figure className="flex flex-col gap-2">
      <Legend items={[{ label: 'Calls', color: 'var(--series-1)' }, { label: 'Puts', color: 'var(--series-2)' }]} />
      <div role="img" aria-label={description} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="strike" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatMoney} {...AXIS} />
            <YAxis tickFormatter={formatIv} width={48} {...AXIS} />
            <Tooltip content={<ChartTooltip format={formatIv} />} cursor={{ stroke: 'var(--border)' }} />
            <ReferenceLine {...spotLineProps(spot)} />
            <Line dataKey="call" name="Calls" stroke="var(--series-1)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="put" name="Puts" stroke="var(--series-2)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Model-estimated gamma exposure by strike; calls positive, puts negative. */
export function GexByStrikeChart({ gexByStrike, spot, height = 240 }) {
  const data = gexByStrike
    .filter(([strike]) => inBand(strike, spot))
    .map(([strike, gex]) => ({ strike, gex }));
  if (data.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">Gamma exposure needs a risk-free rate and open interest; neither is available for this chain.</p>;
  }
  // Categorical axis: mark spot at the nearest charted strike.
  const atm = data.reduce((best, row) => (Math.abs(row.strike - spot) < Math.abs(best - spot) ? row.strike : best), data[0].strike);
  const description = `Estimated gamma exposure by strike near spot ${formatMoney(spot)}; positive bars are call-driven, negative bars put-driven.`;
  return (
    <figure className="flex flex-col gap-2">
      <Legend items={[{ label: 'Positive (calls)', color: 'var(--series-1)', bar: true }, { label: 'Negative (puts)', color: 'var(--series-2)', bar: true }]} />
      <div role="img" aria-label={description} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="strike" tickFormatter={formatMoney} minTickGap={16} {...AXIS} />
            <YAxis tickFormatter={formatCompact} width={48} {...AXIS} />
            <Tooltip content={<ChartTooltip format={formatCompact} />} cursor={{ fill: 'var(--surface-subtle)' }} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            <ReferenceLine {...spotLineProps(atm)} />
            <Bar dataKey="gex" name="Est. GEX" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {data.map((row) => <Cell key={row.strike} fill={row.gex >= 0 ? 'var(--series-1)' : 'var(--series-2)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
