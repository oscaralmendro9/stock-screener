import { Fragment, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';

// Theme tokens: CSS classes for the table, CSS variables for the Recharts marks.
const NO_GROUP_LABEL = 'No Group';
const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' };

const formatPct = (value) => {
  if (value == null || Number.isNaN(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const totalActivity = (row) => (row?.up_count ?? 0) + (row?.down_count ?? 0);
const netTone = (net) => (net > 0 ? 'text-gain' : net < 0 ? 'text-loss' : 'text-foreground');

function StockList({ title, stocks, tone }) {
  if (!stocks || stocks.length === 0) {
    return null;
  }
  return (
    <div className="min-w-[220px] flex-1">
      <p className={cn('text-[11px] font-semibold tracking-wide uppercase', tone)}>
        {title} ({stocks.length})
      </p>
      <table className="mt-1 w-full text-xs">
        <tbody>
          {stocks.map((stock) => (
            <tr key={stock.symbol} className="border-b border-border">
              <td className="w-[70px] py-0.5 font-semibold">{stock.symbol}</td>
              <td className="py-0.5 text-[11px] text-muted-foreground">{stock.name || ''}</td>
              <td className={cn('w-20 py-0.5 text-right font-semibold tabular-nums', tone)}>{formatPct(stock.pct_change)}</td>
              <td className="w-[70px] py-0.5 text-right text-muted-foreground tabular-nums">
                {stock.close != null ? `$${stock.close.toFixed(2)}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SplitBar({ upCount, downCount }) {
  const total = upCount + downCount;
  const label = `${upCount} up, ${downCount} down`;
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={cn('flex h-2 w-20 overflow-hidden rounded-sm border border-border', total === 0 && 'bg-surface-subtle')}
    >
      {upCount > 0 && <div className="bg-gain" style={{ flex: upCount }} />}
      {downCount > 0 && <div className="bg-loss" style={{ flex: downCount }} />}
    </div>
  );
}

function NetTrendSparkline({ data }) {
  const latestNet = data?.length ? data[data.length - 1].net : 0;
  const stroke = latestNet > 0 ? 'var(--gain)' : latestNet < 0 ? 'var(--loss)' : 'var(--disabled-foreground)';

  if (!data || data.length === 0) {
    return <div className="flex h-6 w-20 items-center justify-center text-[11px] text-disabled-foreground">-</div>;
  }

  return (
    <div data-testid="net-trend-sparkline" className="h-6 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <ReferenceLine y={0} stroke="var(--disabled-foreground)" strokeWidth={0.5} />
          <Line type="monotone" dataKey="net" stroke={stroke} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HeroBarChartTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const entry = payload[0].payload;
  return (
    <div className="tw rounded-md border border-border bg-surface px-3 py-2 text-[11px] text-foreground shadow-md tabular-nums">
      <p className="mb-1 font-bold">{entry.group}</p>
      <p className="text-gain">Up 4%+: {entry.up_count}</p>
      <p className="text-loss">Down 4%+: {entry.down_count}</p>
      <p className={netTone(entry.net)}>Net: {entry.net > 0 ? `+${entry.net}` : entry.net}</p>
    </div>
  );
}

function GroupActivityBarChart({ topGroups, date }) {
  if (!topGroups.length) {
    return null;
  }

  // Tall enough for ~26px per bar plus padding.
  const chartHeight = Math.max(180, topGroups.length * 26 + 40);

  return (
    <section data-testid="group-activity-hero-chart" className="mb-3 rounded-lg border border-border p-3">
      <h3 className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        Top {topGroups.length} groups driving breadth · {date}
      </h3>
      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topGroups} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
            <YAxis type="category" dataKey="group" tick={AXIS_TICK} width={170} interval={0} />
            <RechartsTooltip content={<HeroBarChartTooltip />} cursor={{ fill: 'var(--surface-subtle)' }} />
            <Bar dataKey="up_count" stackId="activity" fill="var(--gain)" />
            <Bar dataKey="down_count" stackId="activity" fill="var(--loss)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

const TD = 'border-b border-border px-2 py-1';

function GroupRow({ row, maxAbsNet, trendData }) {
  const [open, setOpen] = useState(false);
  const total = totalActivity(row);
  const toggle = () => setOpen((prev) => !prev);
  const Chevron = open ? ChevronUp : ChevronDown;

  const netIntensity = maxAbsNet > 0 ? Math.min(Math.abs(row.net) / maxAbsNet, 1) : 0;
  const netMix = Math.round(netIntensity * 32);
  const netBgColor = row.net > 0
    ? `color-mix(in srgb, var(--gain) ${netMix}%, transparent)`
    : row.net < 0
      ? `color-mix(in srgb, var(--loss) ${netMix}%, transparent)`
      : 'transparent';

  return (
    <>
      <tr onClick={toggle} className="cursor-pointer hover:bg-surface-subtle">
        <td className={cn(TD, 'w-8')}>
          <button
            type="button"
            aria-label={open ? `Collapse ${row.group}` : `Expand ${row.group}`}
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              toggle();
            }}
            className="grid size-7 cursor-pointer place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Chevron aria-hidden="true" className="size-4" />
          </button>
        </td>
        <td className={cn(TD, 'font-semibold')}>{row.group}</td>
        <td className={cn(TD, 'w-24')}>
          <SplitBar upCount={row.up_count} downCount={row.down_count} />
        </td>
        <td className={cn(TD, 'text-right font-semibold text-gain tabular-nums')}>{row.up_count}</td>
        <td className={cn(TD, 'text-right font-semibold text-loss tabular-nums')}>{row.down_count}</td>
        <td className={cn(TD, 'text-right font-bold tabular-nums', netTone(row.net))} style={{ backgroundColor: netBgColor }}>
          {row.net > 0 ? `+${row.net}` : row.net}
        </td>
        <td className={cn(TD, 'text-right tabular-nums')}>{total}</td>
        <td className={cn(TD, 'w-24')}>
          <NetTrendSparkline data={trendData} />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="border-b border-border">
            <div className="flex flex-wrap gap-4 px-8 py-2">
              <StockList title="Up 4%+" stocks={row.up_stocks} tone="text-gain" />
              <StockList title="Down 4%+" stocks={row.down_stocks} tone="text-loss" />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const getSortValue = (row, column) => {
  if (column === 'group') return row.group ?? '';
  if (column === 'up') return row.up_count;
  if (column === 'down') return row.down_count;
  if (column === 'net') return row.net;
  if (column === 'total') return totalActivity(row);
  return null;
};

const sortGroups = (groups, orderBy, order) => {
  const dir = order === 'asc' ? 1 : -1;
  return [...groups].sort((a, b) => {
    // Pin "No Group" to the bottom regardless of direction — it's a synthetic bucket.
    if (a.group === NO_GROUP_LABEL && b.group !== NO_GROUP_LABEL) return 1;
    if (b.group === NO_GROUP_LABEL && a.group !== NO_GROUP_LABEL) return -1;

    let aVal = getSortValue(a, orderBy);
    let bVal = getSortValue(b, orderBy);

    if (orderBy === 'group') {
      return dir * String(aVal).localeCompare(String(bVal));
    }

    if (aVal == null) aVal = order === 'asc' ? Infinity : -Infinity;
    if (bVal == null) bVal = order === 'asc' ? Infinity : -Infinity;

    if (aVal < bVal) return -1 * dir;
    if (aVal > bVal) return 1 * dir;
    return 0;
  });
};

function BreadthGroupAttribution({ attribution }) {
  const history = useMemo(() => attribution?.history || [], [attribution]);
  const [selectedDate, setSelectedDate] = useState(history[0]?.date || null);
  const [orderBy, setOrderBy] = useState('total');
  const [order, setOrder] = useState('desc');

  const selectedDay = useMemo(
    () => history.find((day) => day.date === selectedDate) || history[0] || null,
    [history, selectedDate]
  );

  // Derive a per-group 10-day net trend from the existing history payload so
  // each row can render a sparkline without any backend changes.
  const groupTrendMap = useMemo(() => {
    const trends = new Map();
    if (!history.length) return trends;
    const allGroups = new Set();
    for (const day of history) {
      for (const g of day.groups || []) {
        allGroups.add(g.group);
      }
    }
    // history is newest-first; reverse so the line plots oldest→newest left-to-right.
    const ordered = [...history].reverse();
    for (const groupName of allGroups) {
      trends.set(
        groupName,
        ordered.map((day) => {
          const entry = (day.groups || []).find((g) => g.group === groupName);
          return { date: day.date, net: entry?.net ?? 0 };
        })
      );
    }
    return trends;
  }, [history]);

  const sortedGroups = useMemo(() => {
    if (!selectedDay?.groups?.length) return [];
    return sortGroups(selectedDay.groups, orderBy, order);
  }, [selectedDay, orderBy, order]);

  const maxAbsNet = useMemo(
    () => sortedGroups.reduce((acc, g) => Math.max(acc, Math.abs(g.net ?? 0)), 0),
    [sortedGroups]
  );

  const topGroups = useMemo(() => {
    if (!selectedDay?.groups?.length) return [];
    return [...selectedDay.groups]
      .map((g) => ({
        group: g.group,
        up_count: g.up_count,
        down_count: g.down_count,
        net: g.net,
        total: totalActivity(g),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [selectedDay]);

  const handleSort = (column) => {
    if (orderBy === column) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setOrderBy(column);
    setOrder(column === 'group' ? 'asc' : 'desc');
  };

  if (!attribution || attribution.available === false) {
    return (
      <Notice className="tw text-xs">
        {attribution?.reason || 'Group attribution is not available for this market yet.'}
      </Notice>
    );
  }

  if (!selectedDay) {
    return (
      <Notice className="tw text-xs">
        No 4%+ movers were attributed for the lookback window.
      </Notice>
    );
  }

  const hasGroups = sortedGroups.length > 0;

  const sortableHeader = (column, label, align = 'left') => {
    const active = orderBy === column;
    const Arrow = active && order === 'desc' ? ArrowDown : ArrowUp;
    return (
      <th
        scope="col"
        aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
        className={cn('sticky top-0 z-[1] border-b border-border bg-surface px-2 py-2 text-xs font-semibold text-muted-foreground', align === 'right' ? 'text-right' : 'text-left')}
      >
        <button
          type="button"
          onClick={() => handleSort(column)}
          className={cn('group inline-flex cursor-pointer items-center gap-0.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', active && 'text-foreground')}
        >
          {label}
          <Arrow aria-hidden="true" className={cn('size-3', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')} />
        </button>
      </th>
    );
  };
  const plainHeader = (label, width) => (
    <th scope="col" className={cn('sticky top-0 z-[1] border-b border-border bg-surface px-2 py-2 text-left text-xs font-semibold text-muted-foreground', width)}>
      {label}
    </th>
  );

  return (
    <div className="tw text-foreground">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <NativeSelect label="Session" value={selectedDay.date} onChange={setSelectedDate} className="w-40">
          {history.map((day) => (
            <option key={day.date} value={day.date}>{day.date}</option>
          ))}
        </NativeSelect>
        <div className="flex gap-2 text-xs font-semibold tabular-nums">
          <span className="inline-flex h-6 items-center rounded-full bg-gain/15 px-2 text-gain">{`Up 4%+: ${selectedDay.stocks_up_4pct}`}</span>
          <span className="inline-flex h-6 items-center rounded-full bg-loss/15 px-2 text-loss">{`Down 4%+: ${selectedDay.stocks_down_4pct}`}</span>
          <span className="inline-flex h-6 items-center rounded-full border border-border px-2 font-normal">{`Groups: ${(selectedDay.groups || []).length}`}</span>
        </div>
      </div>

      {hasGroups ? (
        <>
          <GroupActivityBarChart topGroups={topGroups} date={selectedDay.date} />

          <div className="max-h-[calc(100vh-320px)] overflow-auto rounded-lg border border-border">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  {plainHeader(<span className="sr-only">Expand</span>, 'w-8')}
                  {sortableHeader('group', 'IBD Industry Group')}
                  {plainHeader('Split', 'w-24')}
                  {sortableHeader('up', 'Up 4%+', 'right')}
                  {sortableHeader('down', 'Down 4%+', 'right')}
                  {sortableHeader('net', 'Net', 'right')}
                  {sortableHeader('total', 'Total', 'right')}
                  {plainHeader('10-day Net', 'w-24')}
                </tr>
              </thead>
              <tbody>
                {sortedGroups.map((row) => (
                  <Fragment key={row.group}>
                    <GroupRow row={row} maxAbsNet={maxAbsNet} trendData={groupTrendMap.get(row.group)} />
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Click a group to expand its 4%+ movers. Stocks without an IBD industry group are
            bucketed under &quot;No Group&quot;.
          </p>
        </>
      ) : (
        <Notice className="text-xs">
          No 4%+ movers were attributed for {selectedDay.date}. Pick another session above to see
          the groups that drove its breadth.
        </Notice>
      )}
    </div>
  );
}

export default BreadthGroupAttribution;
