import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';

import BreadthContextStrip from '../../components/Breadth/BreadthContextStrip';
import BreadthContributorDialog from '../../components/Breadth/BreadthContributorDialog';
import BreadthHistoryTable from '../../components/Breadth/BreadthHistoryTable';
import { useBreadthContributors } from '../../components/Breadth/useBreadthContributors';
import BreadthChart from '../../components/Charts/BreadthChart';
import BreadthGroupAttribution from '../components/BreadthGroupAttribution';
import {
  fetchStaticBreadthContributorIndex,
  fetchStaticBreadthContributors,
  fetchStaticJson,
  resolveStaticMarketEntry,
  staticQueryOptions,
  useStaticGeneration,
  useStaticManifest,
  withGeneration,
} from '../dataClient';
import { useStaticMarket } from '../StaticMarketContext';

const RANGE_DAYS = { '1M': 31, '3M': 90 };
const TABS = ['Overview', 'By Group'];

function StaticBreadthPage() {
  const manifestQuery = useStaticManifest();
  const { selectedMarket } = useStaticMarket();
  const marketEntry = useMemo(
    () => resolveStaticMarketEntry(manifestQuery.data, selectedMarket),
    [manifestQuery.data, selectedMarket],
  );
  const { generation, dataRoot } = useStaticGeneration();
  const breadthQuery = useQuery(staticQueryOptions({
    key: ['staticBreadth', marketEntry.pages?.breadth?.path],
    generation,
    queryFn: () => fetchStaticJson(marketEntry.pages.breadth.path, dataRoot),
    enabled: Boolean(marketEntry.pages?.breadth?.path),
  }));
  const contributorIndexPath = marketEntry.assets?.breadth_contributors?.index_path;
  const contributorDrilldown = useBreadthContributors({
    market: marketEntry.market,
    indexQueryKey: contributorIndexPath
      ? withGeneration(['staticBreadthContributors', 'index', marketEntry.market, contributorIndexPath], generation)
      : null,
    loadIndex: contributorIndexPath
      ? () => fetchStaticBreadthContributorIndex(contributorIndexPath, dataRoot)
      : null,
    loadDate: contributorIndexPath
      ? (date) => fetchStaticBreadthContributors(contributorIndexPath, date, dataRoot)
      : null,
    indexStaleTime: Infinity,
    documentStaleTime: Infinity,
    documentKeySuffix: withGeneration([], generation),
  });
  const [timeRange, setTimeRange] = useState('1M');
  const [selectedTab, setSelectedTab] = useState(0);

  const payload = breadthQuery.data?.payload || {};
  const groupAttribution = payload.group_attribution || null;
  const attributionAvailable = Boolean(groupAttribution?.available);
  const displayName = marketEntry.display_name;
  const filteredChartData = useMemo(() => {
    const allData = payload.chart_data || payload.history_90d || [];
    return allData.slice(-(RANGE_DAYS[timeRange] || 31));
  }, [payload.chart_data, payload.history_90d, timeRange]);
  const filteredBenchmarkData = useMemo(() => {
    const allData = payload.benchmark_overlay ?? payload.spy_overlay ?? [];
    return allData.slice(-(RANGE_DAYS[timeRange] || 31));
  }, [payload.benchmark_overlay, payload.spy_overlay, timeRange]);
  const benchmarkLabel = payload.benchmark_symbol
    || (marketEntry.market === 'US' ? 'SPY' : 'Benchmark');
  if (manifestQuery.isLoading || breadthQuery.isLoading) {
    return (
      <div role="status" aria-label="Loading breadth" className="tw flex justify-center py-16">
        <span aria-hidden="true" className="inline-block size-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
      </div>
    );
  }
  if (manifestQuery.isError || breadthQuery.isError) {
    return <Notice tone="error" className="tw">Failed to load breadth data.</Notice>;
  }
  if (breadthQuery.data?.available === false) {
    return (
      <Notice className="tw">
        {breadthQuery.data?.message || 'No breadth snapshot is available.'}
      </Notice>
    );
  }

  const current = payload.current || {};
  const history = payload.history_90d || [];
  const byGroupDisabled = !attributionAvailable && groupAttribution == null;
  return (
    <div className="tw text-foreground">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{displayName} Breadth</h1>
      <p className="mb-4 text-xs text-muted-foreground">
        Breadth snapshot published {breadthQuery.data.published_at || breadthQuery.data.generated_at}.
      </p>

      <div role="tablist" aria-label="Breadth views" className="mb-4 flex border-b border-border">
        {TABS.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            id={`breadth-tab-${index}`}
            aria-selected={selectedTab === index}
            aria-controls={`breadth-panel-${index}`}
            disabled={index === 1 && byGroupDisabled}
            onClick={() => setSelectedTab(index)}
            className={cn(
              '-mb-px min-h-11 cursor-pointer border-b-2 px-4 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 md:min-h-9',
              selectedTab === index ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {selectedTab === 0 && (
        <div role="tabpanel" id="breadth-panel-0" aria-labelledby="breadth-tab-0">
          <div className="mb-4 rounded-lg border border-border bg-surface p-3">
            <BreadthContextStrip row={current} />
          </div>
          <div className="mb-4 h-[390px] md:h-[460px]">
            <BreadthChart
              breadthData={filteredChartData}
              spyData={filteredBenchmarkData}
              benchmarkLabel={benchmarkLabel}
              isLoading={false}
              error={null}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              availableRanges={['1M', '3M']}
              fillContainer
            />
          </div>
          {history.length > 0 && (
            <section className="rounded-lg border border-border bg-surface">
              <h2 className="border-b border-border p-3 text-[13px] font-bold">Recent Sessions</h2>
              <BreadthHistoryTable
                rows={history}
                maxRows={20}
                contributorDates={contributorDrilldown.availableDates}
                onContributorCellClick={contributorDrilldown.open}
              />
            </section>
          )}
        </div>
      )}

      {selectedTab === 1 && (
        <div role="tabpanel" id="breadth-panel-1" aria-labelledby="breadth-tab-1">
          <BreadthGroupAttribution attribution={groupAttribution} />
        </div>
      )}
      <BreadthContributorDialog
        open={Boolean(contributorDrilldown.selected)}
        metric={contributorDrilldown.selected?.metric}
        row={contributorDrilldown.selected?.row}
        view={contributorDrilldown.viewState.view}
        isLoading={contributorDrilldown.dialogQuery.isLoading}
        error={contributorDrilldown.dialogQuery.error}
        inconsistent={contributorDrilldown.viewState.inconsistent}
        onRetry={() => contributorDrilldown.dialogQuery.refetch()}
        onClose={contributorDrilldown.close}
      />
    </div>
  );
}

export default StaticBreadthPage;
