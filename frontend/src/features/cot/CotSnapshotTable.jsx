import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';

import { NativeSelect } from '@/ui/native-select';
import { formatCotNumber, formatCotPercent, priceStateLabel } from './cotPresentation';

const COLUMNS = [
  ['display_name', 'Market'],
  ['long', 'Long'],
  ['short', 'Short'],
  ['net', 'Net'],
  ['net_pct_open_interest', 'Net / OI'],
  ['percentile_3y', '3Y Percentile'],
  ['trend', '12W Net Trend'],
  ['price_change_pct', 'Price Change'],
];

const TH = 'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-1.5 text-left font-medium';
const TD = 'border-b border-border px-2 py-1.5 tabular-nums';

const compare = (left, right, direction) => {
  if (left === null || left === undefined) return right === null || right === undefined ? 0 : 1;
  if (right === null || right === undefined) return -1;
  const result = typeof left === 'string'
    ? left.localeCompare(right)
    : left - right;
  return direction === 'asc' ? result : -result;
};

// Week-over-week change in contracts: sign and colour.
const Delta = ({ value }) => (
  <span className={cn('ml-1 text-[11px]', value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-muted-foreground')}>
    {value === null ? '—' : `${value > 0 ? '+' : ''}${formatCotNumber(value)}`}
  </span>
);

const NetTrend = ({ values }) => {
  if (!values?.length) return <span>—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 76},${22 - ((value - min) / span) * 20}`).join(' ');
  return (
    <svg width="78" height="24" viewBox="0 0 78 24" role="img" aria-label={`12-week net trend ending at ${formatCotNumber(values.at(-1))}`} className="text-accent">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};

const CotSnapshotTable = ({ snapshot, onSelectInstrument, selectedSlug = null }) => {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState(null);
  const categories = useMemo(() => [...new Set((snapshot?.rows || []).map((row) => row.category))], [snapshot]);
  const rows = useMemo(() => {
    const filtered = (snapshot?.rows || []).filter((row) => category === 'all' || row.category === category);
    if (!sort) return filtered;
    const value = (row) => (sort.key === 'trend' ? row.net_trend.at(-1) : row[sort.key]);
    return filtered
      .map((row, index) => ({ row, index }))
      .sort((a, b) => compare(value(a.row), value(b.row), sort.direction) || a.index - b.index)
      .map((item) => item.row);
  }, [category, snapshot, sort]);

  const changeSort = (key) => setSort((current) => (
    current?.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'display_name' ? 'asc' : 'desc' }
  ));
  const select = (slug) => onSelectInstrument?.(slug);

  return (
    <Card className="tw overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border p-3">
        <h3 className="text-base font-semibold">All curated markets</h3>
        <div className="flex flex-wrap items-end gap-2">
          <NativeSelect
            label="Category"
            ariaLabel="COT table category"
            value={category}
            onChange={setCategory}
            className="w-44"
          >
            <option value="all">All categories</option>
            {categories.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
          </NativeSelect>
          <Button variant="secondary" size="sm" onClick={() => setSort(null)}>Restore curated order</Button>
        </div>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table aria-label="COT positioning snapshot" className="w-full min-w-[900px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              {COLUMNS.map(([key, label]) => {
                const active = sort?.key === key;
                const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(TH, active ? 'text-foreground' : 'text-muted-foreground')}
                  >
                    <button
                      type="button"
                      onClick={() => changeSort(key)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {label}
                      <Icon aria-hidden="true" className={cn('size-3', !active && 'opacity-40')} />
                    </button>
                  </th>
                );
              })}
              <th scope="col" className={cn(TH, 'text-muted-foreground')}>Price Context</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.slug}
                aria-current={row.slug === selectedSlug ? 'true' : undefined}
                tabIndex={0}
                onClick={() => select(row.slug)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    select(row.slug);
                  }
                }}
                className={cn(
                  'cursor-pointer outline-none hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  row.slug === selectedSlug && 'bg-accent/10',
                )}
              >
                <td className={TD}>
                  <p className="text-sm font-medium">{row.display_name}</p>
                  <p className="text-[11px] text-muted-foreground">{row.focal_label}</p>
                </td>
                <td className={TD}>{formatCotNumber(row.long)}<Delta value={row.delta_long} /></td>
                <td className={TD}>{formatCotNumber(row.short)}<Delta value={row.delta_short} /></td>
                <td className={TD}>{formatCotNumber(row.net)}<Delta value={row.delta_net} /></td>
                <td className={TD}>{formatCotPercent(row.net_pct_open_interest)}</td>
                <td className={TD}>{row.percentile_status === 'available' ? formatCotPercent(row.percentile_3y, 0) : 'Building'}</td>
                <td className={TD}><NetTrend values={row.net_trend} /></td>
                <td className={TD}>{formatCotPercent(row.price_change_pct)}</td>
                <td className={cn(TD, 'text-muted-foreground')}>{priceStateLabel(row.price_mapping_kind, row.price_coverage_state)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default CotSnapshotTable;
