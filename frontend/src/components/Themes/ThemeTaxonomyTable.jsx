/**
 * ThemeTaxonomyTable — L1 grouped view of themes with expandable L2 children.
 *
 * Renders L1 parent themes as bold header rows with expand/collapse.
 * L2 children are loaded on-demand via React Query when expanded.
 * Supports sortable column headers (momentum, mentions, stocks, return, RS).
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getL1Rankings, getL1Children } from '../../api/themes';
import { Pager, Pill, ScoreBar, SignedPercent, SortHeader, Spinner } from '../../features/themes/themeUi';
import { tdClass, thClass } from '../../features/themes/themeClasses';

const SORTABLE_COLUMNS = [
  { id: 'display_name', label: 'Theme Group', align: 'left' },
  { id: 'momentum_score', label: 'Momentum', align: 'center' },
  { id: 'mentions_7d', label: 'Mentions 7d', align: 'right' },
  { id: 'num_constituents', label: 'Stocks', align: 'right' },
  { id: 'basket_return_1w', label: 'Return 1w', align: 'right' },
  { id: 'basket_rs_vs_spy', label: 'RS vs SPY', align: 'right' },
];

/** Expandable L2 children rows for a single L1 theme */
function L1ChildrenRows({ l1Id, open, onThemeClick, orderBy, order }) {
  const { data, isLoading } = useQuery({
    queryKey: ['l1Children', l1Id, orderBy, order],
    queryFn: () => getL1Children(l1Id, { sortBy: orderBy, sortOrder: order }),
    enabled: open,
    staleTime: 60000,
  });

  if (!open) return null;

  if (isLoading) {
    return (
      <tr>
        <td colSpan={8} className="py-2 pl-12">
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Spinner label="Loading children" className="size-4" />
            Loading children...
          </span>
        </td>
      </tr>
    );
  }

  if (!data?.children?.length) {
    return (
      <tr>
        <td colSpan={8} className="py-2 pl-12 text-[11px] text-muted-foreground">No L2 themes assigned</td>
      </tr>
    );
  }

  return data.children.map((child) => (
    <tr
      key={child.id}
      tabIndex={0}
      className="cursor-pointer bg-surface-subtle outline-none hover:bg-border/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      onClick={() => onThemeClick?.({ id: child.id, name: child.display_name })}
      onKeyDown={(event) => { if (event.key === 'Enter') onThemeClick?.({ id: child.id, name: child.display_name }); }}
    >
      <td className={cn(tdClass, 'w-10')} />
      <td className={tdClass}>
        <span className="flex items-center gap-2 pl-4">
          <span className="text-xs">{child.display_name}</span>
          {child.l1_assignment_method && <Pill tone="muted" className="h-4">{child.l1_assignment_method}</Pill>}
        </span>
      </td>
      <td className={cn(tdClass, 'text-center')}><ScoreBar score={child.momentum_score} label="Momentum" /></td>
      <td className={cn(tdClass, 'text-right text-[11px] tabular-nums')}>{child.mentions_7d}</td>
      <td className={cn(tdClass, 'text-right text-[11px] tabular-nums')}>{child.num_constituents}</td>
      <td className={tdClass} />
      <td className={tdClass} />
      <td className={tdClass}><Pill tone="muted">{child.lifecycle_state}</Pill></td>
    </tr>
  ));
}


export default function ThemeTaxonomyTable({
  pipeline = 'technical',
  categoryFilter = null,
  onThemeClick,
}) {
  const [expandedL1, setExpandedL1] = useState({});
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState('momentum_score');
  const [order, setOrder] = useState('desc');
  const pageSize = 50;

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['l1Rankings', pipeline, categoryFilter, page, orderBy, order],
    queryFn: () => getL1Rankings({
      pipeline, category: categoryFilter, limit: pageSize, offset: page * pageSize,
      sortBy: orderBy, sortOrder: order,
    }),
    staleTime: 60000,
  });

  const toggleExpand = (l1Id) => {
    setExpandedL1((prev) => ({ ...prev, [l1Id]: !prev[l1Id] }));
  };

  if (isLoading) {
    return (
      <div className="tw flex min-h-[300px] items-center justify-center">
        <Spinner label="Loading theme groups" />
      </div>
    );
  }

  const rankings = data?.rankings || [];
  const total = data?.total || 0;

  return (
    <section className="tw rounded-lg border border-border bg-surface text-foreground">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h2 className="text-sm font-semibold">L1 Theme Groups</h2>
        <Pill tone="muted" className="tabular-nums">{`${total} groups`}</Pill>
      </div>

      <div className="max-h-[calc(100vh-400px)] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="col" className={cn(thClass(), 'w-10')}><span className="sr-only">Expand</span></th>
              {SORTABLE_COLUMNS.map((col) => (
                <SortHeader
                  key={col.id}
                  label={col.label}
                  align={col.align}
                  active={orderBy === col.id}
                  order={order}
                  onSort={() => handleSort(col.id)}
                />
              ))}
              <th scope="col" className={thClass()}>Category</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((l1) => {
              const isExpanded = !!expandedL1[l1.id];
              const Chevron = isExpanded ? ChevronDown : ChevronRight;
              return (
                <React.Fragment key={l1.id}>
                  <tr className="cursor-pointer bg-surface-subtle font-semibold hover:bg-border/40" onClick={() => toggleExpand(l1.id)}>
                    <td className={cn(tdClass, 'w-10')}>
                      <button
                        type="button"
                        aria-label={isExpanded ? `Collapse ${l1.display_name}` : `Expand ${l1.display_name}`}
                        aria-expanded={isExpanded}
                        onClick={(event) => { event.stopPropagation(); toggleExpand(l1.id); }}
                        className="grid size-7 cursor-pointer place-items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Chevron aria-hidden="true" className="size-4" />
                      </button>
                    </td>
                    <td className={tdClass}>
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-bold">{l1.display_name}</span>
                        <Pill tone="muted" className="h-[18px] font-normal">{`${l1.num_l2_children} themes`}</Pill>
                      </span>
                    </td>
                    <td className={cn(tdClass, 'text-center')}><ScoreBar score={l1.momentum_score} label="Momentum" /></td>
                    <td className={cn(tdClass, 'text-right text-xs font-bold tabular-nums')}>{l1.mentions_7d}</td>
                    <td className={cn(tdClass, 'text-right text-xs font-bold tabular-nums')}>{l1.num_constituents}</td>
                    <td className={cn(tdClass, 'text-right')}><SignedPercent value={l1.basket_return_1w} /></td>
                    <td className={cn(tdClass, 'text-right text-[11px] tabular-nums')}>
                      {l1.basket_rs_vs_spy != null ? l1.basket_rs_vs_spy.toFixed(0) : '-'}
                    </td>
                    <td className={tdClass}>
                      {l1.category && <Pill className="capitalize font-normal">{l1.category}</Pill>}
                    </td>
                  </tr>
                  <L1ChildrenRows
                    l1Id={l1.id}
                    open={isExpanded}
                    onThemeClick={onThemeClick}
                    orderBy={orderBy}
                    order={order}
                  />
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="border-t border-border">
          <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />
        </div>
      )}
    </section>
  );
}
