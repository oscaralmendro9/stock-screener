import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';

import {
  LIVE_GROUP_RANKING_COLUMNS,
  deriveHistoricalRank,
  derivePctRsAbove80,
  formatGroupRs,
} from './groupRankingFields';
import { GROUP_RS_TINT_CLASS, groupRsTone } from './groupRsVisualEncoding';
import RankChange from './RankChange';

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };
const CELL = 'border-b border-border px-2 py-1.5 whitespace-nowrap';

const SortableHeaderCell = ({ column, order, orderBy, onSort }) => {
  const active = orderBy === column.field;
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(
        'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-1.5 font-medium',
        ALIGN[column.align],
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column.field)}
        title={column.description}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
          column.align === 'right' && 'flex-row-reverse',
        )}
      >
        {column.label}
        <Icon aria-hidden="true" className={cn('size-3', !active && 'opacity-40')} />
      </button>
    </th>
  );
};

// Top-20 groups are the leaders the page is about; the rest read as plain numbers.
const RankBadge = ({ rank }) => (
  rank <= 20
    ? <Badge tone="accent" className="font-semibold">{rank}</Badge>
    : <span className="px-1.5 font-medium tabular-nums">{rank}</span>
);

const LiveRankingCell = ({ row, column, showHistoricalRanks }) => {
  const align = ALIGN[column.align];

  if (column.kind === 'rank') {
    return <td className={CELL}><RankBadge rank={row.rank} /></td>;
  }

  if (column.kind === 'group') {
    return (
      <td className={cn(CELL, 'max-w-[180px] truncate font-medium')} title={row.industry_group}>
        {row.industry_group}
      </td>
    );
  }

  if (column.kind === 'rankChange') {
    const historicalRank = showHistoricalRanks ? deriveHistoricalRank(row, row[column.field]) : null;
    return (
      <td className={cn(CELL, align)}>
        {!showHistoricalRanks ? (
          <RankChange value={row[column.field]} />
        ) : historicalRank == null ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <span className="tabular-nums">{historicalRank}</span>
        )}
      </td>
    );
  }

  if (column.kind === 'pctAbove80') {
    const pctRsAbove80 = derivePctRsAbove80(row);
    return (
      <td className={cn(CELL, align, 'tabular-nums')}>
        {pctRsAbove80 != null ? `${pctRsAbove80.toFixed(1)}%` : '-'}
      </td>
    );
  }

  if (column.kind === 'topStock') {
    return (
      <td className={cn(CELL, align, 'font-medium text-muted-foreground')}>
        {row.top_symbol || '-'}
      </td>
    );
  }

  if (column.kind === 'integer') {
    return <td className={cn(CELL, align, 'tabular-nums')}>{row[column.field]}</td>;
  }

  const value = row[column.field];
  const isRsRating = column.kind === 'rs';
  const tone = isRsRating ? groupRsTone(value) : undefined;
  return (
    <td
      data-rs-tone={tone}
      className={cn(CELL, align, 'tabular-nums', isRsRating && GROUP_RS_TINT_CLASS[tone])}
    >
      {formatGroupRs(value)}
    </td>
  );
};

export default function LiveGroupRankingsTable({
  rankings,
  order,
  orderBy,
  onSort,
  onSelectGroup,
  showHistoricalRanks,
}) {
  return (
    <div className="max-h-[calc(100dvh-200px)] flex-1 overflow-auto">
      <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            {LIVE_GROUP_RANKING_COLUMNS.map((column) => (
              <SortableHeaderCell
                key={column.field}
                column={column}
                order={order}
                orderBy={orderBy}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rankings.map((row) => (
            <tr
              key={row.industry_group}
              onClick={() => onSelectGroup(row.industry_group)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectGroup(row.industry_group);
                }
              }}
              className="cursor-pointer outline-none hover:bg-surface-subtle focus-visible:bg-accent/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              {LIVE_GROUP_RANKING_COLUMNS.map((column) => (
                <LiveRankingCell
                  key={column.field}
                  row={row}
                  column={column}
                  showHistoricalRanks={showHistoricalRanks}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
