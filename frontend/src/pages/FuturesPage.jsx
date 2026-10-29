import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { ChevronRight, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Change } from '@/ui/change';
import { futuresKeys, getFuturesDashboard, queueFuturesRefresh } from '../api/futures';
import { useIsMobileShell } from '../components/Layout/shellNav';
import { CotCell, RangeBar, Sparkline, TrendBadge } from '../features/futures/FuturesMarks';
import { SORT_OPTIONS, formatFuturesPrice, sortContracts } from '../features/futures/format';

const ALL = 'all';
// While a queued refresh is filling the cache, look again every 15s.
const LOADING_REFETCH_MS = 15_000;

const contractPath = (contract) => `/futures/${encodeURIComponent(contract.root)}`;

function CategoryFilter({ categories, value, onChange }) {
  const options = [{ id: ALL, label: 'All' }, ...categories.map(({ id, label }) => ({ id, label }))];
  return (
    <div role="group" aria-label="Category" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'h-11 shrink-0 cursor-pointer rounded-md border px-3 text-sm whitespace-nowrap outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-8',
            value === option.id
              ? 'border-accent bg-accent/15 font-semibold text-foreground'
              : 'border-border text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SortSelect({ value, onChange }) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
      Sort
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        // 16px on phones keeps iOS Safari from zooming in.
        className="h-11 cursor-pointer rounded-md border border-border bg-surface-subtle px-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8 md:text-sm"
      >
        {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ContractName({ contract }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-medium text-foreground">{contract.name}</span>
      <span className="text-xs text-muted-foreground">
        <span className="font-semibold tabular-nums">{contract.root}</span> · {contract.exchange}
      </span>
    </span>
  );
}

const NUMERIC_HEAD = 'px-3 py-2 text-right font-medium';

function FuturesTable({ contracts }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <caption className="sr-only">Futures contracts with price changes, trend and CFTC positioning</caption>
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Contract</th>
            <th scope="col" className={NUMERIC_HEAD}>Last</th>
            <th scope="col" className={NUMERIC_HEAD}>1D</th>
            <th scope="col" className={NUMERIC_HEAD}>1W</th>
            <th scope="col" className={NUMERIC_HEAD}>1M</th>
            <th scope="col" className={NUMERIC_HEAD}>YTD</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">52W range</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Trend</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">3M</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">COT positioning</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => {
            const m = contract.metrics;
            return (
              <tr key={contract.symbol} className="border-b border-border/60 last:border-0 hover:bg-surface-subtle">
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <RouterLink to={contractPath(contract)} className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                    <ContractName contract={contract} />
                  </RouterLink>
                </th>
                {m ? (
                  <>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{formatFuturesPrice(m.last)}</td>
                    <td className="px-3 py-2 text-right"><Change value={m.change_1d} /></td>
                    <td className="px-3 py-2 text-right"><Change value={m.change_1w} /></td>
                    <td className="px-3 py-2 text-right"><Change value={m.change_1m} /></td>
                    <td className="px-3 py-2 text-right"><Change value={m.change_ytd} /></td>
                    <td className="px-3 py-2"><RangeBar metrics={m} /></td>
                    <td className="px-3 py-2"><TrendBadge trend={m.trend} /></td>
                    <td className="px-3 py-2"><Sparkline values={m.sparkline} /></td>
                  </>
                ) : (
                  <td colSpan={8} className="px-3 py-2 text-xs text-muted-foreground">Prices loading</td>
                )}
                <td className="px-3 py-2"><CotCell cot={contract.cot} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FuturesList({ contracts }) {
  return (
    <ul className="tw divide-y divide-border/60">
      {contracts.map((contract) => {
        const m = contract.metrics;
        return (
          <li key={contract.symbol}>
            <RouterLink
              to={contractPath(contract)}
              className="flex min-h-16 items-center gap-3 px-4 py-2 outline-none focus-visible:bg-surface-subtle active:bg-surface-subtle"
            >
              <span className="min-w-0 flex-1"><ContractName contract={contract} /></span>
              {m ? (
                <>
                  <Sparkline values={m.sparkline} width={64} height={24} />
                  <span className="flex w-24 shrink-0 flex-col items-end text-sm">
                    <span className="font-medium tabular-nums">{formatFuturesPrice(m.last)}</span>
                    <Change value={m.change_1d} className="text-xs" />
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Prices loading</span>
              )}
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </RouterLink>
          </li>
        );
      })}
    </ul>
  );
}

function LoadPricesButton({ queued, onQueue, isPending, error }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={onQueue} disabled={isPending || queued}>
        {isPending || queued
          ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          : <RefreshCw aria-hidden="true" />}
        {queued ? 'Loading prices…' : 'Load prices'}
      </Button>
      {error && <p role="alert" className="text-xs text-loss">Could not queue the refresh. Try again.</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading futures" className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="h-12 rounded-md bg-surface-subtle motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

export default function FuturesPage() {
  const isMobile = useIsMobileShell();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(ALL);
  const [sort, setSort] = useState('default');
  const [queued, setQueued] = useState(false);

  const dashboard = useQuery({
    queryKey: futuresKeys.dashboard,
    queryFn: getFuturesDashboard,
    staleTime: 60_000,
    refetchInterval: (query) => (queued && query.state.data?.missing_symbols?.length ? LOADING_REFETCH_MS : false),
  });
  const refresh = useMutation({
    mutationFn: queueFuturesRefresh,
    onSuccess: () => {
      setQueued(true);
      queryClient.invalidateQueries({ queryKey: futuresKeys.dashboard });
    },
  });

  const data = dashboard.data;
  const categories = data?.categories ?? [];
  const allContracts = categories.flatMap((group) => group.contracts);
  const visible = sortContracts(
    category === ALL ? allContracts : categories.find((group) => group.id === category)?.contracts ?? [],
    sort,
  );
  const missing = data?.missing_symbols?.length ?? 0;
  const nothingLoaded = data && missing === allContracts.length;
  const loadButton = (
    <LoadPricesButton
      queued={queued && missing > 0}
      onQueue={() => refresh.mutate()}
      isPending={refresh.isPending}
      error={refresh.isError}
    />
  );

  return (
    <div className="tw flex flex-col gap-3 pb-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-balance">Futures</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Front-month continuous contracts, delayed
            {data?.as_of && <> · prices as of <span className="tabular-nums">{data.as_of}</span></>}
            {data?.cot_report_date && <> · CFTC report <span className="tabular-nums">{data.cot_report_date}</span></>}
          </p>
        </div>
        {data && !nothingLoaded && <SortSelect value={sort} onChange={setSort} />}
      </header>

      {dashboard.isPending && <DashboardSkeleton />}

      {dashboard.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-loss/40 bg-loss/10 px-4 py-3 text-sm">
          <TriangleAlert aria-hidden="true" className="size-4 text-loss" />
          <p className="min-w-0 flex-1">Futures could not be loaded.</p>
          <Button variant="secondary" size="sm" onClick={() => dashboard.refetch()}>Retry</Button>
        </div>
      )}

      {nothingLoaded && (
        <Card className="flex flex-col items-start gap-3 p-6">
          <h2 className="text-base font-semibold text-balance">No futures prices yet</h2>
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">
            Prices refresh automatically after the US close. Load them now to fill the dashboard; it takes a few minutes.
          </p>
          {loadButton}
        </Card>
      )}

      {data && !nothingLoaded && (
        <>
          <CategoryFilter categories={categories} value={category} onChange={setCategory} />
          {missing > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm">
              <p className="min-w-0 flex-1 text-pretty">
                {missing === 1 ? '1 contract has' : `${missing} contracts have`} no prices yet.
              </p>
              {loadButton}
            </div>
          )}
          <Card className="overflow-hidden">
            {isMobile ? <FuturesList contracts={visible} /> : <FuturesTable contracts={visible} />}
          </Card>
        </>
      )}
    </div>
  );
}
