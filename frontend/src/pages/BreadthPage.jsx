import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { TriangleAlert } from 'lucide-react';

import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';

import {
  getBreadthContributorIndex,
  getBreadthContributors,
  getBreadthSummary,
  getCurrentBreadth,
  getHistoricalBreadth,
} from '../api/breadth';
import { getPriceHistory } from '../api/stocks';
import BreadthContextStrip from '../components/Breadth/BreadthContextStrip';
import BreadthContributorDialog from '../components/Breadth/BreadthContributorDialog';
import BreadthHistoryTable from '../components/Breadth/BreadthHistoryTable';
import { useBreadthContributors } from '../components/Breadth/useBreadthContributors';
import BreadthChart from '../components/Charts/BreadthChart';
import { useMarketForCapability } from '../contexts/MarketContext';
import { useRuntime } from '../contexts/RuntimeContext';
import {
  BREADTH_MARKET_FALLBACKS,
  MARKET_LIVE_BENCHMARK_SYMBOLS,
  breadthBootstrapQuery,
  breadthHistoryWindow,
  getBreadthDateRange,
} from '../pageBootstrapQueries';
import { describeRequestError } from '../utils/requestErrors';

// Structural placeholder in the page's own shape: summary, bars, chart.
function BreadthSkeleton() {
  const block = 'rounded-md bg-surface-subtle motion-safe:animate-pulse';
  return (
    <div className="tw flex flex-col gap-4 py-2" aria-busy="true" aria-label="Loading breadth data">
      <Card className="flex flex-col gap-3 p-3">
        <div className={`${block} h-5 w-48`} />
        <div className="grid gap-2 md:grid-cols-2">
          <div className={`${block} h-20`} />
          <div className={`${block} h-20`} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className={`${block} h-14`} />
          <div className={`${block} h-14`} />
          <div className={`${block} h-14`} />
        </div>
      </Card>
      <div className={`${block} h-[390px] md:h-[460px]`} />
    </div>
  );
}

function BreadthPage() {
  const { runtimeReady } = useRuntime();
  const queryClient = useQueryClient();
  const { market: selectedMarket } = useMarketForCapability(
    'breadth',
    BREADTH_MARKET_FALLBACKS,
  );
  const [chartTimeRange, setChartTimeRange] = useState('1M');
  const chartDateRange = getBreadthDateRange(chartTimeRange);
  const { startDate, endDate } = breadthHistoryWindow();
  const periodMap = { '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y' };
  const benchmarkPeriod = periodMap[chartTimeRange] || '1y';
  const benchmarkSymbol = MARKET_LIVE_BENCHMARK_SYMBOLS[selectedMarket] || null;

  const breadthBootstrap = useQuery({
    ...breadthBootstrapQuery(queryClient, selectedMarket),
  });
  const liveQueriesEnabled = breadthBootstrap.isSuccess || breadthBootstrap.isError;
  const contributorDrilldown = useBreadthContributors({
    market: selectedMarket,
    indexQueryKey: liveQueriesEnabled
      ? ['breadthContributors', 'index', selectedMarket]
      : null,
    loadIndex: liveQueriesEnabled
      ? () => getBreadthContributorIndex(selectedMarket)
      : null,
    loadDate: (date) => getBreadthContributors(selectedMarket, date),
  });

  const {
    data: currentBreadth,
    isLoading: isLoadingCurrent,
    error: errorCurrent,
    refetch: refetchCurrent,
  } = useQuery({
    queryKey: ['breadth', 'current', selectedMarket],
    queryFn: () => getCurrentBreadth(selectedMarket),
    enabled: liveQueriesEnabled,
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
  const { data: historicalBreadth } = useQuery({
    queryKey: ['breadth', 'historical', selectedMarket, startDate, endDate],
    queryFn: () => getHistoricalBreadth(startDate, endDate, 365, selectedMarket),
    enabled: liveQueriesEnabled,
    staleTime: 60_000,
  });
  useQuery({
    queryKey: ['breadth', 'summary', selectedMarket],
    queryFn: () => getBreadthSummary(selectedMarket),
    enabled: liveQueriesEnabled,
    staleTime: 60_000,
  });
  const {
    data: chartBreadthData,
    isLoading: isLoadingChartBreadth,
    error: errorChartBreadth,
  } = useQuery({
    queryKey: [
      'breadth',
      'chart',
      selectedMarket,
      chartDateRange.startDate,
      chartDateRange.endDate,
    ],
    queryFn: () => getHistoricalBreadth(
      chartDateRange.startDate,
      chartDateRange.endDate,
      730,
      selectedMarket,
    ),
    enabled: liveQueriesEnabled,
    staleTime: 60_000,
  });
  const { data: benchmarkData } = useQuery({
    queryKey: [
      'benchmark',
      'history',
      selectedMarket,
      benchmarkSymbol,
      benchmarkPeriod,
    ],
    queryFn: () => getPriceHistory(benchmarkSymbol, benchmarkPeriod),
    enabled: liveQueriesEnabled && Boolean(benchmarkSymbol),
    staleTime: 60_000,
  });
  const contributorError = contributorDrilldown.dialogQuery.error;
  const contributorErrorStatus = contributorError?.response?.status;
  const contributorErrorDetail = contributorError?.response?.data?.detail;
  const contributorInconsistent = contributorErrorStatus === 409
    ? (typeof contributorErrorDetail === 'string'
      ? contributorErrorDetail
      : 'The contributor snapshot is inconsistent with breadth history.')
    : contributorDrilldown.viewState.inconsistent;
  if (!runtimeReady || isLoadingCurrent) {
    return <BreadthSkeleton />;
  }
  if (errorCurrent) {
    return (
      <div role="alert" className="tw my-2 flex flex-wrap items-center gap-3 rounded-md border border-loss/40 bg-loss/10 px-4 py-3 text-sm">
        <TriangleAlert aria-hidden="true" className="size-4 text-loss" />
        <p className="min-w-0 flex-1">
          {`Error loading ${selectedMarket} breadth data: ${describeRequestError(errorCurrent)}`}
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetchCurrent()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="tw flex flex-col gap-4 py-2">
      <Card className="p-3">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-balance">Latest Breadth Data</h1>
            <p className="text-xs text-muted-foreground tabular-nums">
              One shared calculation layer · revision {currentBreadth?.calculation_revision ?? '—'}
            </p>
          </div>
          {currentBreadth?.date && (
            <Badge className="tabular-nums">{format(parseISO(currentBreadth.date), 'MMM dd, yyyy')}</Badge>
          )}
        </div>
        <BreadthContextStrip row={currentBreadth} />
      </Card>

      <div className="h-[390px] md:h-[460px]">
        <BreadthChart
          breadthData={chartBreadthData}
          spyData={benchmarkData || []}
          benchmarkLabel={benchmarkSymbol || 'Benchmark'}
          isLoading={isLoadingChartBreadth}
          error={errorChartBreadth}
          timeRange={chartTimeRange}
          onTimeRangeChange={setChartTimeRange}
          fillContainer
        />
      </div>

      {historicalBreadth?.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-border p-3">
            <h2 className="text-sm font-semibold">Recent History</h2>
            <p className="text-xs text-muted-foreground">
              Primary tracks daily movers and ratios; secondary tracks trend windows; context adds T2108, ATR extension, and universe size.
            </p>
          </div>
          <BreadthHistoryTable
            rows={historicalBreadth}
            contributorDates={contributorDrilldown.availableDates}
            onContributorCellClick={contributorDrilldown.open}
          />
        </Card>
      )}

      <BreadthContributorDialog
        open={Boolean(contributorDrilldown.selected)}
        metric={contributorDrilldown.selected?.metric}
        row={contributorDrilldown.selected?.row}
        view={contributorDrilldown.viewState.view}
        isLoading={contributorDrilldown.dialogQuery.isLoading}
        error={[404, 409].includes(contributorErrorStatus)
          ? null
          : contributorError}
        unavailable={contributorErrorStatus === 404}
        inconsistent={contributorInconsistent}
        onRetry={() => contributorDrilldown.dialogQuery.refetch()}
        onClose={contributorDrilldown.close}
      />

      {currentBreadth && (
        <p className="text-center text-xs text-muted-foreground tabular-nums">
          Broad universe: {currentBreadth.broad_universe_count
            ?? currentBreadth.total_stocks_scanned
            ?? '—'}
          {' · '}
          Calculation time: {currentBreadth.calculation_duration_seconds?.toFixed?.(2) ?? '—'}s
        </p>
      )}
    </div>
  );
}

export default BreadthPage;
