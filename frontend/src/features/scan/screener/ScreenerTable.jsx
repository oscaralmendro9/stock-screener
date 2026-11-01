import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/cn';
import { PER_PAGE_OPTIONS, pageItems } from './pagination';

const PAGE_BUTTON = 'grid h-11 min-w-11 cursor-pointer place-items-center rounded-md px-2 text-sm tabular-nums outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40 md:h-7 md:min-w-7 md:text-xs';

export function ScreenerPagination({ page, perPage, total, onPageChange, onPerPageChange, compact = false }) {
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const first = total === 0 ? 0 : (page - 1) * perPage + 1;
  const last = Math.min(total, page * perPage);
  const perPageOptions = PER_PAGE_OPTIONS.includes(perPage) ? PER_PAGE_OPTIONS : [...PER_PAGE_OPTIONS, perPage].sort((a, b) => a - b);

  const prevNext = (
    <>
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={cn(PAGE_BUTTON, 'hover:bg-surface-subtle')}>
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>
      <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className={cn(PAGE_BUTTON, 'hover:bg-surface-subtle')}>
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </>
  );

  if (compact) {
    return (
      <nav aria-label="Pages (top)" className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="tabular-nums">{page.toLocaleString()} / {pageCount.toLocaleString()}</span>
        {prevNext}
      </nav>
    );
  }

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
      <p className="tabular-nums">
        {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={cn(PAGE_BUTTON, 'hover:bg-surface-subtle')}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        {pageItems(page, pageCount).map((item, index) => (item === 'gap'
          ? <span key={`gap-${index}`} aria-hidden="true" className="px-1">…</span>
          : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn(PAGE_BUTTON, item === page ? 'bg-accent font-semibold text-accent-foreground' : 'hover:bg-surface-subtle')}
            >
              {item.toLocaleString()}
            </button>
          )))}
        <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className={cn(PAGE_BUTTON, 'hover:bg-surface-subtle')}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
      <label className="flex items-center gap-2">
        Rows
        <select
          value={perPage}
          onChange={(event) => {
            onPerPageChange?.(Number(event.target.value));
            onPageChange(1);
          }}
          className="h-11 cursor-pointer rounded-md border border-border bg-surface-subtle px-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-7 md:text-xs"
        >
          {perPageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    </nav>
  );
}

function SortHeader({ column, sortBy, sortOrder, onSortChange }) {
  const active = sortBy === column.id || (column.id === 'current_price' && sortBy === 'price');
  const alignRight = column.align === 'right';
  if (!column.sortable) {
    return <span title={column.title}>{column.label}</span>;
  }
  return (
    <button
      type="button"
      title={column.title}
      // First click on a new column sorts high-to-low, as for scores.
      onClick={() => onSortChange(column.id, active && sortOrder === 'desc' ? 'asc' : 'desc')}
      className={cn(
        'inline-flex cursor-pointer items-center gap-0.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        alignRight && 'flex-row-reverse',
        active && 'font-semibold text-foreground',
      )}
    >
      {column.label}
      <ChevronDown
        aria-hidden="true"
        className={cn('size-3 shrink-0', active ? 'opacity-100' : 'opacity-0', active && sortOrder === 'asc' && 'rotate-180')}
      />
    </button>
  );
}

/** Dense results table for one view: row numbers, ticker first, ~10 columns. */
export default function ScreenerTable({
  rows,
  columns,
  page,
  perPage,
  total,
  sortBy,
  sortOrder,
  onSortChange,
  onPageChange,
  onPerPageChange,
  onOpenChart,
  onRowHover,
  caption,
}) {
  const offset = (page - 1) * perPage;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="border-b border-border bg-surface text-muted-foreground">
            <tr>
              <th scope="col" className="w-10 px-2 py-1.5 text-right font-medium">No.</th>
              {columns.map((column) => {
                const active = sortBy === column.id || (column.id === 'current_price' && sortBy === 'price');
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('px-2 py-1.5 font-medium whitespace-nowrap', column.align === 'right' ? 'text-right' : 'text-left')}
                  >
                    <SortHeader column={column} sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.symbol}
                tabIndex={onOpenChart ? 0 : -1}
                onClick={() => onOpenChart?.(row.symbol)}
                onMouseEnter={onRowHover ? () => onRowHover(row.symbol) : undefined}
                onKeyDown={(event) => {
                  if (!onOpenChart || event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenChart(row.symbol);
                  }
                }}
                className={cn(
                  'border-b border-border/60 outline-none last:border-0 focus-visible:bg-accent/10',
                  onOpenChart && 'cursor-pointer transition-colors duration-150 ease-out hover:bg-accent/10',
                )}
              >
                <td className="px-2 py-1 text-right text-muted-foreground tabular-nums">{offset + index + 1}</td>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn('px-2 py-1 whitespace-nowrap tabular-nums', column.align === 'right' ? 'text-right' : 'text-left', column.className)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ScreenerPagination
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
      />
    </>
  );
}
