import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/ui/card';

const AXIS = { stroke: 'var(--border)', tick: { fill: 'var(--muted-foreground)', fontSize: 11 }, tickLine: false };
const SERIES = [
  { key: 'max_pain', name: 'Max Pain', axis: 'price', color: 'var(--series-2)' },
  { key: 'net_gex', name: 'Estimated Net GEX', axis: 'gex', color: 'var(--accent)' },
];

function HistoryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold tabular-nums">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="tabular-nums">
          <span className="text-muted-foreground">{entry.name}:</span> {entry.value ?? '—'}
        </p>
      ))}
    </div>
  );
}

export default function OptionsHistoryChart({ history }) {
  return (
    <Card className="tw p-3">
      <h2 className="text-sm font-semibold">Observed history</h2>
      <p className="text-xs text-muted-foreground">
        History preserves gaps; missing sessions are not filled or treated as zero.
      </p>
      <div className="mt-2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="as_of_date" {...AXIS} minTickGap={24} />
            <YAxis yAxisId="price" {...AXIS} width={48} />
            <YAxis yAxisId="gex" orientation="right" {...AXIS} width={56} />
            <Tooltip content={<HistoryTooltip />} cursor={{ stroke: 'var(--border)' }} />
            {SERIES.map((series) => (
              <Line
                key={series.key}
                yAxisId={series.axis}
                dataKey={series.key}
                name={series.name}
                stroke={series.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 text-[11px] text-muted-foreground">
        {SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: series.color }} />
            {series.name} ({series.axis === 'price' ? 'left' : 'right'} axis)
          </span>
        ))}
      </div>
    </Card>
  );
}
