import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/cn';

import {
  buildCotChartRows,
  cotRangeLabel,
  formatCotNumber,
  formatCotPercent,
  priceStateLabel,
} from './cotPresentation';

// One colour per CFTC participant group; Long/Short and open interest reuse
// the first ones so a participant keeps the same hue across views.
const COLORS = ['#4f7cac', '#d96c75', '#d9a441', '#6da77f', '#8e7cc3'];
const AXIS = { stroke: 'var(--border)', tick: { fill: 'var(--muted-foreground)', fontSize: 11 }, tickLine: false };

const CotTooltip = ({ active, payload, history, mode, participant, visibleParticipants }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const positions = Object.values(row.positions).filter((position) => (
    mode === 'net'
      ? visibleParticipants.includes(position.participant)
      : position.participant === participant
  ));
  return (
    <div className="max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold tabular-nums">{row.reportDate}</p>
      {positions.map((position) => (
        <p key={position.participant} className="tabular-nums">
          <span className="font-medium">{position.label}:</span> Long {formatCotNumber(position.long)} · Short {formatCotNumber(position.short)} · Net {formatCotNumber(position.net)} · 3Y {position.percentile_status === 'available' ? formatCotPercent(position.percentile_3y, 0) : 'building'}
        </p>
      ))}
      <p className="tabular-nums">Open interest: {formatCotNumber(row.openInterest)}</p>
      <p className="tabular-nums text-muted-foreground">
        Price: {row.price === null ? '—' : `${formatCotNumber(row.price)} (${row.priceDate})`} · {priceStateLabel(history.price_mapping_kind, history.price_coverage_state)}
      </p>
    </div>
  );
};

const legendFormatter = (value) => <span className="text-xs text-muted-foreground">{value}</span>;

const CotPositioningChart = ({ history, mode, participant, visibleParticipants, onToggleParticipant }) => {
  const rows = buildCotChartRows(history, { mode, participant });
  const participants = history.weeks[0]?.positions || [];
  const visible = visibleParticipants || participants.map((item) => item.participant);
  const description = `${history.display_name} ${mode === 'net' ? 'net positioning' : 'long and short positioning'} for ${mode === 'net' ? `${participants.length} CFTC participant groups` : participants.find((item) => item.participant === participant)?.label || 'the selected CFTC participant'} over ${cotRangeLabel(history.range)} report weeks; dashed line is ${priceStateLabel(history.price_mapping_kind, history.price_coverage_state).toLowerCase()} price context.`;
  const descriptionId = `cot-chart-description-${history.slug}`;

  return (
    <div className="tw">
      {mode === 'net' && (
        <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="COT participant legend">
          {participants.map((item, index) => {
            const on = visible.includes(item.participant);
            const color = COLORS[index % COLORS.length];
            return (
              <button
                key={item.participant}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleParticipant?.(item.participant)}
                className={cn(
                  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7',
                  on ? 'border-border bg-surface-subtle text-foreground' : 'border-dashed border-border text-muted-foreground',
                )}
              >
                <span aria-hidden="true" className={cn('size-2.5 rounded-sm', !on && 'opacity-40')} style={{ backgroundColor: color }} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
      <div role="img" aria-label={description} aria-describedby={descriptionId} className="h-[370px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
            stackOffset="sign"
            barGap={0}
            barCategoryGap="12%"
          >
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="reportDate" {...AXIS} minTickGap={32} />
            <YAxis yAxisId="position" {...AXIS} width={72} tickFormatter={formatCotNumber} />
            <YAxis yAxisId="price" orientation="right" {...AXIS} width={72} tickFormatter={formatCotNumber} />
            <ReferenceLine yAxisId="position" y={0} stroke="var(--muted-foreground)" strokeOpacity={0.6} />
            <Tooltip
              cursor={{ fill: 'var(--surface-subtle)' }}
              content={(
                <CotTooltip
                  history={history}
                  mode={mode}
                  participant={participant}
                  visibleParticipants={visible}
                />
              )}
            />
            <Legend formatter={legendFormatter} iconSize={10} />
            {mode === 'net' ? participants.map((item, index) => (
              visible.includes(item.participant) && (
                <Bar
                  key={item.participant}
                  yAxisId="position"
                  dataKey={item.participant}
                  name={item.label}
                  fill={COLORS[index % COLORS.length]}
                  stackId="net"
                  isAnimationActive={false}
                />
              )
            )) : (
              <>
                <Bar yAxisId="position" dataKey="long" name="Long" fill={COLORS[0]} maxBarSize={24} isAnimationActive={false} />
                <Bar yAxisId="position" dataKey="short" name="Short" fill={COLORS[1]} maxBarSize={24} isAnimationActive={false} />
              </>
            )}
            <Line yAxisId="price" dataKey="price" name="Price" stroke="var(--muted-foreground)" strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p id={descriptionId} className="text-xs text-muted-foreground">{description}</p>
      <h3 className="mt-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Open Interest</h3>
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 64, left: 0, bottom: 4 }} barCategoryGap="12%">
            <XAxis dataKey="reportDate" hide />
            <YAxis {...AXIS} width={72} tickFormatter={formatCotNumber} />
            <Tooltip
              cursor={{ fill: 'var(--surface-subtle)' }}
              formatter={(value) => formatCotNumber(value)}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Bar dataKey="openInterest" name="Open interest" fill="#6da77f" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CotPositioningChart;
