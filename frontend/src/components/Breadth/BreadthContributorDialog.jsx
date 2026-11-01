import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronDown, ChevronRight, Info, TriangleAlert, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';

import { breadthMetricDefinitions } from './breadthMetricDefinitions';

const formatValue = (value, valueKind) => {
  if (value == null) return '—';
  if (valueKind === 'multiple') return `${Number(value).toFixed(2)}x`;
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
};

const TH = 'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-1.5 font-medium text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5';

const StockTable = ({ stocks, definition }) => (
  <div className="max-h-[calc(100dvh-190px)] overflow-auto sm:max-h-[520px]">
    <table aria-label="Breadth contributing stocks" className="w-full border-separate border-spacing-0 text-xs">
      <thead>
        <tr>
          <th scope="col" className={cn(TH, 'text-left')}>Ticker</th>
          <th scope="col" className={cn(TH, 'text-left')}>Company</th>
          <th scope="col" className={cn(TH, 'text-left')}>IBD Group</th>
          <th
            scope="col"
            className={cn(TH, 'text-right')}
            aria-label={`Qualifying value: ${definition.contributor.qualifierLabel}`}
            title={definition.contributor.qualifierLabel}
          >
            Qualifying value
          </th>
          <th scope="col" className={cn(TH, 'text-right')}>1-day change</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.symbol}>
            <td className={cn(TD, 'font-semibold text-accent')}>{stock.symbol}</td>
            <td className={cn(TD, 'max-w-[190px] truncate')} title={stock.companyName || ''}>
              {stock.companyName || '—'}
            </td>
            <td className={cn(TD, 'max-w-[180px] truncate')} title={stock.groupName}>
              {stock.groupName}
            </td>
            <td className={cn(TD, 'text-right font-semibold tabular-nums')}>
              {formatValue(stock.qualifyingValue, definition.contributor.valueKind)}
            </td>
            <td className={cn(TD, 'text-right tabular-nums')}>
              {formatValue(stock.dailyChangePct, 'percent')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const GroupList = ({ groups, definition }) => {
  const [expanded, setExpanded] = useState(null);
  return (
    <ul className="flex flex-col gap-1.5 py-2">
      {groups.map((group) => {
        const isExpanded = expanded === group.name;
        const Chevron = isExpanded ? ChevronDown : ChevronRight;
        return (
          <li key={group.name} className="rounded-md border border-border">
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-label={`${group.name}, ${group.count} stocks, ${group.sharePct.toFixed(1)} percent`}
              onClick={() => setExpanded(isExpanded ? null : group.name)}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-2 text-left outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
            >
              <Chevron aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm font-semibold">{group.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {group.count} · {group.sharePct.toFixed(1)}%
              </span>
            </button>
            {isExpanded && <StockTable stocks={group.stocks} definition={definition} />}
          </li>
        );
      })}
    </ul>
  );
};

const NOTICE_TONES = {
  info: 'border-border bg-surface-subtle',
  warning: 'border-warning/40 bg-warning/10',
  error: 'border-loss/40 bg-loss/10',
};

function Notice({ tone, children, action, className }) {
  const Icon = tone === 'info' ? Info : TriangleAlert;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm', NOTICE_TONES[tone], className)}
    >
      <Icon aria-hidden="true" className={cn('size-4 shrink-0', tone === 'error' ? 'text-loss' : tone === 'warning' ? 'text-warning' : 'text-muted-foreground')} />
      <p className="min-w-0 flex-1">{children}</p>
      {action}
    </div>
  );
}

const BreadthContributorDialog = ({
  open,
  metric,
  row,
  view,
  isLoading = false,
  error = null,
  unavailable = false,
  inconsistent = null,
  onRetry,
  onClose,
}) => {
  const [tab, setTab] = useState('stocks');
  const definition = breadthMetricDefinitions[metric] || { label: 'Breadth contributors' };
  const count = Number(row?.[metric] || view?.count || 0);
  useEffect(() => {
    if (!open) setTab('stocks');
  }, [open]);
  const ready = !isLoading && !inconsistent && !unavailable;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="tw fixed inset-0 z-modal flex flex-col bg-surface text-foreground outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[90dvh] sm:w-[min(900px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:border-border"
        >
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start gap-2 border-b border-border px-4 pt-3">
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-base">
                  <span className="font-semibold">{definition.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {` · ${row?.date || ''} · ${count} stocks`}
                  </span>
                </DialogPrimitive.Title>
                <TabsList className="my-2">
                  <TabsTrigger value="stocks">Stocks</TabsTrigger>
                  <TabsTrigger value="groups">IBD Groups</TabsTrigger>
                </TabsList>
              </div>
              <DialogPrimitive.Close
                aria-label="Close"
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring md:size-9"
              >
                <X aria-hidden="true" className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-[260px] flex-1 overflow-y-auto p-3 sm:p-5">
              {isLoading && (
                <div role="status" className="flex min-h-[220px] flex-col items-center justify-center gap-3">
                  <span aria-hidden="true" className="size-7 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading contributors…</p>
                </div>
              )}
              {!isLoading && inconsistent && <Notice tone="warning">{inconsistent}</Notice>}
              {!isLoading && !inconsistent && unavailable && (
                <Notice tone="info">Contributor details are not available for this session.</Notice>
              )}
              {ready && error && (
                <Notice
                  tone={view ? 'warning' : 'error'}
                  className={view ? 'mb-3' : undefined}
                  action={<Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
                >
                  {view ? 'Showing cached contributors because the latest refresh failed.' : 'Could not load contributors.'}
                </Notice>
              )}
              {ready && view && (
                <>
                  <TabsContent value="stocks" className="outline-none">
                    <StockTable stocks={view.stocks} definition={view.definition} />
                  </TabsContent>
                  <TabsContent value="groups" className="outline-none">
                    <GroupList groups={view.groups} definition={view.definition} />
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default BreadthContributorDialog;
