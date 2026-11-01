import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Notice } from '@/ui/notice';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';

import {
  getGroupMatrix,
  getCurrentRankings,
  getRankMovers,
  getRRGBundle,
  triggerCalculation,
  getCalculationStatus,
} from '../api/groups';
import RRGChart from '../components/Charts/RRGChart';
import GroupDetailModal from '../features/groups/GroupDetailModal';
import GroupViewTabs from '../features/groups/GroupViewTabs';
import RankChange from '../features/groups/RankChange';
import { DEFAULT_MATRIX_PREFERENCES } from '../features/groups/matrix/groupMatrixModel';
import { useRRGScopeSelection } from '../components/Charts/useRRGScopeSelection';
import { useRuntime } from '../contexts/RuntimeContext';
import { useMarketForCapability } from '../contexts/MarketContext';
import {
  GROUP_RANKING_MARKET_FALLBACKS,
  groupsBootstrapQuery as groupsBootstrapQueryOptions,
} from '../pageBootstrapQueries';
import { rrgScopesForMarket } from '../utils/rrgScopes';
import LiveGroupRankingsTable from '../features/groups/LiveGroupRankingsTable';
import { getLiveGroupRankingSortValue } from '../features/groups/groupRankingFields';
import { sortGroupRankings } from '../features/groups/groupRankingSort';
import { PageSkeleton, TableSkeleton } from '../components/common/LoadingSkeletons';
import { describeRequestError } from '../utils/requestErrors';

const GroupMatrixPanel = lazy(() => import('../features/groups/matrix/GroupMatrixPanel'));

const EMPTY_AS_OF_ARGS = [];
const REASON_HINTS = {
  missing_ibd_mappings: 'Load IBD industry group mappings into the database first.',
  no_groups_ranked: 'Run a price-data backfill so stocks have at least 252 days of history.',
  invalid_date: 'Provide a valid YYYY-MM-DD date.',
};
const PERIODS = [
  { value: '1w', label: '1 Week' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
];

// Top five groups that climbed or fell the most over the selected period.
const MoversCard = ({ title, groups, isGainers, period }) => {
  const Icon = isGainers ? TrendingUp : TrendingDown;

  return (
    <section className="rounded-md border border-border p-3">
      <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
        <Icon aria-hidden="true" className={cn('size-4', isGainers ? 'text-gain' : 'text-loss')} />
        {title}
      </h3>
      {groups && groups.length > 0 ? (
        <ul>
          {groups.slice(0, 5).map((group) => (
            <li
              key={group.industry_group}
              className="flex items-center justify-between gap-2 border-b border-border py-1 text-xs last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate">{`#${group.rank} ${group.industry_group}`}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  RS: {group.avg_rs_rating?.toFixed(1)}
                </p>
              </div>
              <RankChange value={period ? group[`rank_change_${period}`] : null} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No data available</p>
      )}
    </section>
  );
};

function GroupRankingsPage() {
  const {
    features,
    runtimeReady,
    marketCatalog,
  } = useRuntime();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('1w');
  const { market: selectedMarket } = useMarketForCapability(
    'group_rankings',
    GROUP_RANKING_MARKET_FALLBACKS,
  );
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [view, setView] = useState('table');
  const [matrixPreferences, setMatrixPreferences] = useState(DEFAULT_MATRIX_PREFERENCES);
  const matrixQuery = useQuery({
    queryKey: ['groupMatrix', selectedMarket],
    queryFn: () => getGroupMatrix(selectedMarket),
    enabled: runtimeReady && view === 'matrix',
    staleTime: 60_000,
    refetchInterval: view === 'matrix' ? 60_000 : false,
  });
  const [rrgScope, setRrgScope] = useState('groups'); // 'groups' | 'sectors'
  const [orderBy, setOrderBy] = useState('rank');
  const [order, setOrder] = useState('asc');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationTaskId, setCalculationTaskId] = useState(null);
  const [calculationError, setCalculationError] = useState(null);
  const [liveRankingMarket, setLiveRankingMarket] = useState(null);
  const [showHistoricalRanks, setShowHistoricalRanks] = useState(false); // Toggle between change vs actual rank

  useEffect(() => {
    setSelectedGroup(null);
  }, [selectedMarket]);

  const groupsBootstrapQuery = useQuery({
    ...groupsBootstrapQueryOptions(queryClient, selectedMarket),
    refetchInterval: 60_000,
  });
  const groupsBootstrapPayload = (
    groupsBootstrapQuery.data && !groupsBootstrapQuery.data.is_stale
      ? (groupsBootstrapQuery.data.payload ?? {})
      : null
  );
  const groupsAsOfDate = liveRankingMarket === selectedMarket
    ? null
    : (groupsBootstrapPayload?.rankings?.date ?? null);
  const groupAsOfArgs = groupsAsOfDate ? [groupsAsOfDate] : EMPTY_AS_OF_ARGS;
  // Live queries wait for the bootstrap to resolve either way: on success
  // their caches are freshly seeded (no fetch); on error or a stale
  // snapshot they fetch live data.
  const liveQueriesEnabled = groupsBootstrapQuery.isSuccess || groupsBootstrapQuery.isError;

  // The RRG view has its own query (and the static-friendly RRGChart); the
  // table-only rankings/movers fetches are skipped while it's active so a
  // rankings-endpoint failure can't block a healthy RRG view.
  const isRrgView = view === 'rrg';
  const rrgCatalogScopes = useMemo(
    () => rrgScopesForMarket(marketCatalog, selectedMarket),
    [marketCatalog, selectedMarket],
  );
  const rrgAvailable = rrgCatalogScopes.length > 0;

  // Fetch current rankings
  const {
    data: rankings,
    isLoading: isLoadingRankings,
    error: errorRankings,
    refetch: refetchRankings,
  } = useQuery({
    queryKey: ['groupRankings', selectedMarket, groupsAsOfDate],
    queryFn: () => getCurrentRankings(197, selectedMarket, ...groupAsOfArgs),
    enabled: liveQueriesEnabled && view === 'table',
    refetchInterval: 60000,
    staleTime: 60_000,
  });

  // Fetch movers for selected period
  const {
    data: movers,
    isLoading: isLoadingMovers,
  } = useQuery({
    queryKey: ['groupMovers', selectedPeriod, selectedMarket, groupsAsOfDate],
    queryFn: () => getRankMovers(selectedPeriod, 10, selectedMarket, ...groupAsOfArgs),
    enabled: liveQueriesEnabled && view === 'table',
    staleTime: 60_000,
  });

  // Fetch RRG coordinates for all available scopes (only when the RRG view is active).
  const {
    data: rrgBundle,
    isLoading: isLoadingRRG,
    error: errorRRG,
  } = useQuery({
    queryKey: ['groupRRGBundle', selectedMarket, groupsAsOfDate],
    queryFn: () => getRRGBundle(8, 197, selectedMarket, ...groupAsOfArgs),
    enabled: liveQueriesEnabled && isRrgView && rrgAvailable,
    staleTime: 60_000,
  });
  const { availableScopes: availableRrgScopes } = useRRGScopeSelection({
    view,
    scope: rrgScope,
    setView,
    setScope: setRrgScope,
    rrgAvailable,
    availableScopes: rrgCatalogScopes,
    bundle: rrgBundle,
  });
  const rrgData = rrgBundle?.payload?.[rrgScope] ?? null;

  // Poll calculation status while task is running
  const { data: calcStatus } = useQuery({
    queryKey: ['calculationStatus', calculationTaskId],
    queryFn: () => getCalculationStatus(calculationTaskId),
    enabled: features.tasks && !!calculationTaskId,
    refetchInterval: 2000,
  });

  const refreshPublishedGroups = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['groupsBootstrap', selectedMarket],
      refetchType: 'none',
    });
    await queryClient.refetchQueries({
      queryKey: ['groupsBootstrap', selectedMarket],
      type: 'active',
      exact: true,
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['groupRankings', selectedMarket] }),
      queryClient.invalidateQueries({ queryKey: ['groupMovers'] }),
      queryClient.invalidateQueries({ queryKey: ['groupRRGBundle', selectedMarket] }),
      queryClient.invalidateQueries({ queryKey: ['groupMatrix', selectedMarket] }),
    ]);
    const refreshedBootstrap = queryClient.getQueryData(['groupsBootstrap', selectedMarket]);
    if (!refreshedBootstrap || refreshedBootstrap.is_stale) {
      return null;
    }
    return refreshedBootstrap.payload?.rankings?.date ?? null;
  }, [queryClient, selectedMarket]);

  // Handle calculation completion/failure
  useEffect(() => {
    if (calcStatus?.status === 'completed' || calcStatus?.status === 'failed') {
      setCalculationTaskId(null);
      setIsCalculating(false);
      if (calcStatus.status === 'completed') {
        setCalculationError(null);
        const previouslyPublishedDate = queryClient.getQueryData(
          ['groupsBootstrap', selectedMarket],
        )?.payload?.rankings?.date ?? null;
        void refreshPublishedGroups()
          .then((refreshedPublishedDate) => {
            if (
              !refreshedPublishedDate
              || refreshedPublishedDate === previouslyPublishedDate
            ) {
              setLiveRankingMarket(selectedMarket);
            } else {
              setLiveRankingMarket(null);
            }
          })
          .catch((error) => {
            console.error('Failed to refresh published Group snapshot:', error);
            setCalculationError(error?.message || 'Failed to refresh published Group snapshot.');
          });
      } else {
        const baseMessage = calcStatus.error || 'Calculation failed. See server logs for details.';
        const hint = REASON_HINTS[calcStatus.reason_code];
        const message = hint ? `${baseMessage} — ${hint}` : baseMessage;
        console.error('Calculation failed:', message);
        setCalculationError(message);
      }
    }
  }, [calcStatus, queryClient, refreshPublishedGroups, selectedMarket]);

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleCalculate = async () => {
    if (!features.tasks) {
      return;
    }
    setIsCalculating(true);
    setCalculationError(null);
    try {
      const response = await triggerCalculation(null);
      setCalculationTaskId(response.task_id);
    } catch (error) {
      console.error('Calculation error:', error);
      setCalculationError(error?.response?.data?.detail || error?.message || 'Failed to queue calculation task.');
      setIsCalculating(false);
    }
  };

  // Sort rankings
  const sortedRankings = rankings?.rankings
    ? sortGroupRankings(
        rankings.rankings,
        orderBy,
        order,
        (row, column) => getLiveGroupRankingSortValue(
          row,
          column,
          { showHistoricalRanks },
        ),
      )
    : [];

  if (!runtimeReady) {
    return (
      <div className="py-2">
        <PageSkeleton label="Loading group rankings" />
      </div>
    );
  }

  return (
    <div className="tw flex flex-col gap-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <GroupViewTabs
          view={view}
          onView={setView}
          scope={rrgScope}
          onScope={setRrgScope}
          rrgAvailable={rrgAvailable}
          availableScopes={availableRrgScopes}
        />
        {features.tasks && selectedMarket === 'US' && (
          <Button variant="secondary" size="sm" onClick={handleCalculate} disabled={isCalculating}>
            <RefreshCw aria-hidden="true" className={cn(isCalculating && 'motion-safe:animate-spin')} />
            {isCalculating ? 'Calculating...' : 'Refresh'}
          </Button>
        )}
      </div>

      {calculationError && (
        <Notice tone="error" onDismiss={() => setCalculationError(null)}>
          Calculation failed: {calculationError}
        </Notice>
      )}

      <div role="tabpanel" id={`group-panel-${view}`} aria-labelledby={`group-tab-${view}`}>
        {view === 'matrix' ? (
          <Suspense fallback={<TableSkeleton label="Loading group matrix" />}>
            <GroupMatrixPanel key={selectedMarket} data={matrixQuery.data} isLoading={matrixQuery.isLoading}
              error={matrixQuery.error} onRetry={() => matrixQuery.refetch()}
              preferences={matrixPreferences} onPreferencesChange={setMatrixPreferences} />
          </Suspense>
        ) : view === 'rrg' ? (
          <RRGChart
            data={rrgData}
            isLoading={isLoadingRRG}
            error={errorRRG}
            onSelectGroup={(name) => rrgScope === 'groups' && setSelectedGroup(name)}
          />
        ) : errorRankings ? (
          <Notice
            tone="error"
            action={<Button variant="secondary" size="sm" onClick={() => refetchRankings()}>Retry</Button>}
          >
            {`Error loading rankings: ${describeRequestError(errorRankings)}`}
          </Notice>
        ) : isLoadingRankings ? (
          <TableSkeleton label="Loading group rankings" rows={12} columns={8} />
        ) : (
          <>
            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Card className="overflow-hidden">
                <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <div className="border-b border-border p-2">
                    <TabsList aria-label="Movers period" className="flex w-full">
                      {PERIODS.map(({ value, label }) => (
                        <TabsTrigger key={value} value={value} className="flex-1 justify-center px-1.5 whitespace-nowrap">
                          {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  <TabsContent value={selectedPeriod} className="p-3 outline-none">
                    {isLoadingMovers ? (
                      <TableSkeleton label="Loading rank movers" rows={5} columns={3} bare />
                    ) : (
                      <div className="flex flex-col gap-2">
                        <MoversCard
                          title="Top Rank Gainers"
                          groups={movers?.gainers}
                          isGainers
                          period={selectedPeriod}
                        />
                        <MoversCard
                          title="Top Rank Losers"
                          groups={movers?.losers}
                          isGainers={false}
                          period={selectedPeriod}
                        />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>

              <Card className="flex min-w-0 flex-col overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
                  <h2 className="text-sm font-semibold">All Industry Groups</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      role="group"
                      aria-label="Rank columns show"
                      title={showHistoricalRanks ? 'Showing actual historical ranks' : 'Showing rank changes'}
                      className="inline-flex rounded-md border border-border p-0.5"
                    >
                      {[
                        { value: false, label: 'Change' },
                        { value: true, label: 'Prior Rank' },
                      ].map(({ value, label }) => (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={showHistoricalRanks === value}
                          onClick={() => setShowHistoricalRanks(value)}
                          className={cn(
                            'h-9 cursor-pointer rounded-sm px-2.5 text-xs font-semibold outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-6',
                            showHistoricalRanks === value
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {rankings && (
                      <Badge>{`${selectedMarket} | ${rankings.total_groups} groups | ${rankings.date}`}</Badge>
                    )}
                  </div>
                </div>
                <LiveGroupRankingsTable
                  rankings={sortedRankings}
                  order={order}
                  orderBy={orderBy}
                  onSort={handleSort}
                  onSelectGroup={setSelectedGroup}
                  showHistoricalRanks={showHistoricalRanks}
                />
              </Card>
            </div>

            {rankings && (
              <p className="mt-3 text-center text-xs text-muted-foreground tabular-nums">
                {selectedMarket} data as of {rankings.date} | {rankings.total_groups} groups ranked
              </p>
            )}
          </>
        )}
      </div>

      <GroupDetailModal
        group={selectedGroup}
        market={selectedMarket}
        open={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </div>
  );
}

export default GroupRankingsPage;
