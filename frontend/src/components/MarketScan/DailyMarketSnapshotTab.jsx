import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Card, CardHeader, CardTitle } from '@/ui/card';
import { getScanResults } from '../../api/scans';
import { dailySnapshotQuery } from '../../pageBootstrapQueries';
import KeyMarketCard from './KeyMarketCard';
import MarketHealthExposure from './MarketHealthExposure';
import ChartViewerModal from '../Scan/ChartViewerModalLazy';
import CorrectionSurvivorsPanel from '../shared/CorrectionSurvivorsPanel';
import DailyScanRowsTable from '../shared/DailyScanRowsTable';
import { MARKET_CAP_OPTIONS } from '../../features/scan/components/filterPanel/constants';
import { useMarket } from '../../contexts/MarketContext';
import { describeRequestError } from '../../utils/requestErrors';
import { formatSnapshotFreshnessLabel } from '../../utils/snapshotFreshness';
import DailySocialSignalsCard from '../../features/socialSignals/DailySocialSignalsCard';

const EMPTY_ROWS = [];
const DEFAULT_TOP_RESULTS = 20;
// Two sections side by side once each half still fits a 720px table; a lone
// section (e.g. no survivor data) spans both columns.
const WIDE_PAIR = 'grid items-start gap-3 min-[1760px]:grid-cols-2 min-[1760px]:[&>:only-child]:col-span-2';

function formatNumber(value, digits = 0) {
  if (value == null) return '-';
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

// Group rank change: a positive value means the group climbed the ranking.
function RankChange({ value }) {
  if (value == null) return <span className="text-muted-foreground">-</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : null;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-end gap-0.5 tabular-nums',
        value > 0 ? 'font-medium text-gain' : value < 0 ? 'font-medium text-loss' : 'text-muted-foreground',
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
      {value > 0 ? '+' : ''}{value}
    </span>
  );
}

function MarketCapSelect({ value, onChange }) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
      Mkt Cap
      <select
        value={value}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
        // 16px on phones keeps iOS Safari from zooming in.
        className="h-11 cursor-pointer rounded-md border border-border bg-surface-subtle px-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8 md:text-sm"
      >
        <option value="">All</option>
        {MARKET_CAP_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function TopGroupsCard({ groups }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle>Top 10 Groups</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead className="border-y border-border bg-surface-subtle text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-14 px-3 py-2 text-right font-medium">Rank</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Group</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">1W</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">1M</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Top stock</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.industry_group} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{group.rank}</td>
                <td className="px-3 py-1.5">{group.industry_group}</td>
                <td className="px-3 py-1.5 text-right"><RankChange value={group.rank_change_1w} /></td>
                <td className="px-3 py-1.5 text-right"><RankChange value={group.rank_change_1m} /></td>
                <td className="px-3 py-1.5">
                  {group.top_symbol ? (
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="font-semibold">{group.top_symbol}</span>
                      {group.top_symbol_name ? (
                        <span title={group.top_symbol_name} className="truncate text-xs text-muted-foreground">{group.top_symbol_name}</span>
                      ) : null}
                    </span>
                  ) : <span className="text-muted-foreground">-</span>}
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No group rankings available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SnapshotSkeleton() {
  return (
    <div role="status" aria-label="Loading the daily snapshot" className="tw flex flex-col gap-3">
      <div className="h-7 w-64 rounded-md bg-surface-subtle motion-safe:animate-pulse" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="h-32 rounded-lg bg-surface-subtle motion-safe:animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-surface-subtle motion-safe:animate-pulse" />
    </div>
  );
}

function DailyMarketSnapshotTab({ showSocialSignals = false, onOpenSocialSignals }) {
  const { selectedMarket } = useMarket();
  const snapshotQuery = useQuery(dailySnapshotQuery(selectedMarket));
  const snapshot = snapshotQuery.data;
  const scanId = snapshot?.scan_id ?? null;
  const freshness = snapshot?.freshness ?? {};
  const minDollarVolume = snapshot?.top_candidates?.min_dollar_volume ?? null;

  const [marketCapMin, setMarketCapMin] = useState('');
  // The default view comes entirely from the aggregated snapshot payload;
  // a market-cap override re-queries the scan results for this scan only.
  const filteredResultsQuery = useQuery({
    queryKey: ['dailySnapshot', 'mcapFilter', scanId, marketCapMin, minDollarVolume],
    queryFn: () => getScanResults(scanId, {
      page: 1,
      per_page: DEFAULT_TOP_RESULTS,
      sort_by: 'composite_score',
      sort_order: 'desc',
      ...(minDollarVolume != null ? { min_volume: minDollarVolume } : {}),
      min_market_cap_usd: Number(marketCapMin),
    }),
    enabled: Boolean(scanId) && marketCapMin !== '',
    staleTime: 60_000,
    // Keep rows visible across market-cap bucket changes, but only within
    // the same scan — a market switch swaps the scan and must not show the
    // previous market's rows while loading.
    placeholderData: (previous, previousQuery) => (
      previousQuery?.queryKey?.[2] === scanId ? previous : undefined
    ),
  });

  const topResults = marketCapMin === ''
    ? (snapshot?.top_candidates?.rows ?? EMPTY_ROWS)
    : (filteredResultsQuery.data?.results ?? EMPTY_ROWS);
  const leaders = snapshot?.leaders?.rows ?? EMPTY_ROWS;
  const correctionSurvivorRows = snapshot?.correction_survivors?.rows ?? EMPTY_ROWS;
  const topGroups = (snapshot?.top_groups ?? EMPTY_ROWS).slice(0, 10);

  const keyMarkets = useMemo(() => (
    (snapshot?.key_markets ?? EMPTY_ROWS)
      .map((item) => ({
        ...item,
        closes: (item.history || []).map((h) => h.close).filter((c) => c != null),
      }))
      .filter((item) => item.latest_close != null && item.closes.length > 1)
  ), [snapshot]);

  const topResultSymbols = useMemo(() => {
    const seen = new Set();
    return topResults
      .map((row) => row?.symbol)
      .filter((symbol) => symbol && !seen.has(symbol) && seen.add(symbol));
  }, [topResults]);
  const leaderSymbols = useMemo(
    () => leaders.map((row) => row?.symbol).filter(Boolean),
    [leaders],
  );
  const correctionSurvivorSymbols = useMemo(
    () => correctionSurvivorRows.map((row) => row?.symbol).filter(Boolean),
    [correctionSurvivorRows],
  );

  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [modalNavigationSymbols, setModalNavigationSymbols] = useState([]);

  if (snapshotQuery.isLoading) {
    return <SnapshotSkeleton />;
  }

  if (snapshotQuery.isError) {
    return (
      <div role="alert" className="tw flex flex-wrap items-center gap-3 rounded-md border border-loss/40 bg-loss/10 px-4 py-3 text-sm">
        <TriangleAlert aria-hidden="true" className="size-4 text-loss" />
        <p className="min-w-0 flex-1">
          Failed to load the daily snapshot: {describeRequestError(snapshotQuery.error)}
        </p>
        <Button variant="secondary" size="sm" onClick={() => snapshotQuery.refetch()}>Retry</Button>
      </div>
    );
  }

  const handleRowClick = (symbol, navigationSymbols = topResultSymbols) => {
    if (!scanId) return;
    setSelectedSymbol(symbol);
    setModalNavigationSymbols(navigationSymbols);
    setChartModalOpen(true);
  };

  const marketDisplay = snapshot?.market_display_name || snapshot?.market || '';
  const freshnessLabel = formatSnapshotFreshnessLabel(freshness);

  return (
    // shrink-0: inside this scrolling column, overflow-hidden cards would
    // otherwise collapse to their headers.
    <div className="tw flex h-full flex-col gap-3 overflow-auto pr-1 pb-4 *:shrink-0">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <h1 className="text-xl font-semibold text-balance">{marketDisplay} Snapshot</h1>
        <p className="text-xs text-muted-foreground tabular-nums">{freshnessLabel}</p>
      </header>

      {/* Phones: two cards per row (one below ~300px, e.g. 200% zoom). Wider
          screens fit as many ~160px cards as the row holds, so a 1920px
          monitor shows all nine default key markets in one row. */}
      <div className="grid grid-cols-2 gap-3 max-[300px]:grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
        {keyMarkets.map((item) => (
          <KeyMarketCard key={item.symbol} item={item} currency={item.currency || 'USD'} />
        ))}
      </div>

      <div className={WIDE_PAIR}>
        <MarketHealthExposure exposure={snapshot?.market_health_exposure} />

        {snapshot?.correction_survivors?.available === true && (
          <CorrectionSurvivorsPanel
            summary={snapshot.correction_survivors}
            posture={snapshot?.market_health_exposure}
            navigationSymbols={correctionSurvivorSymbols}
            onOpenChart={scanId ? handleRowClick : null}
            opportunityTelemetrySurface="daily"
          />
        )}
      </div>

      {showSocialSignals ? (
        <DailySocialSignalsCard market={selectedMarket} onOpen={onOpenSocialSignals} />
      ) : null}

      <div className={WIDE_PAIR}>
        <DailyScanRowsTable
          title="Top Scan Candidates"
          subtitle={
            minDollarVolume == null
              ? 'No default liquidity floor. Click a row for chart details.'
              : `Dollar volume ≥ ${formatNumber(minDollarVolume)}. Click a row for chart details.`
          }
          rows={topResults}
          isLoading={marketCapMin !== '' && filteredResultsQuery.isLoading}
          isError={marketCapMin !== '' && filteredResultsQuery.isError}
          errorMessage="Failed to load scan candidates."
          emptyMessage="No scan candidates match the current filters."
          showRating
          navigationSymbols={topResultSymbols}
          onOpenChart={scanId ? handleRowClick : null}
          action={<MarketCapSelect value={marketCapMin} onChange={setMarketCapMin} />}
        />

        <DailyScanRowsTable
          title="Leaders in Leading Groups"
          subtitle={`Top 20 by report card: group rank ≤ ${snapshot?.leaders?.criteria?.max_group_rank ?? 40}, RS ≥ ${snapshot?.leaders?.criteria?.min_rs_rating ?? 80}${minDollarVolume != null ? `, dollar volume ≥ ${formatNumber(minDollarVolume)}` : ''}.`}
          rows={leaders}
          emptyMessage="No leaders in leading groups match the current snapshot."
          showRs
          navigationSymbols={leaderSymbols}
          onOpenChart={scanId ? handleRowClick : null}
        />
      </div>

      <TopGroupsCard groups={topGroups} />

      {scanId && (
        <ChartViewerModal
          open={chartModalOpen}
          onClose={() => setChartModalOpen(false)}
          initialSymbol={selectedSymbol}
          scanId={scanId}
          filters={{}}
          sortBy="composite_score"
          sortOrder="desc"
          navigationSymbolsOverride={modalNavigationSymbols}
          currentPageResults={modalNavigationSymbols.map((symbol) => (
            [...topResults, ...leaders, ...correctionSurvivorRows]
              .find((row) => row.symbol === symbol)
          )).filter(Boolean)}
        />
      )}
    </div>
  );
}

export default DailyMarketSnapshotTab;
