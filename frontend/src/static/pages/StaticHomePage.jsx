import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';
import {
  StaticGenerationExpiredError,
  fetchStaticJson,
  resolveStaticMarketEntry,
  staticQueryOptions,
  useStaticGeneration,
  useStaticManifest,
} from '../dataClient';
import { useStaticChartIndex } from '../chartClient';
import KeyMarketCard from '../../components/MarketScan/KeyMarketCard';
import StaticChartViewerModal from '../StaticChartViewerModal';
import RankChange from '../../features/groups/RankChange';
import TickerCell from '../../components/common/TickerCell';
import { useStaticMarket } from '../StaticMarketContext';
import { marketFlag } from '../../utils/marketFlags';
import { MARKET_CAP_OPTIONS } from '../../features/scan/components/filterPanel/constants';
import { applyScanFilterDefaults } from '../../features/scan/defaultFilters';
import { filterStaticScanRows, sortStaticScanRows } from '../scanClient';
import DailyScanRowsTable from '../../components/shared/DailyScanRowsTable';
import CorrectionSurvivorsPanel from '../../components/shared/CorrectionSurvivorsPanel';
import MarketHealthExposure from '../../components/MarketScan/MarketHealthExposure';
import { buildFiltersFromPreset } from '../hooks/usePresetScreens';
import { formatSnapshotFreshnessLabel } from '../../utils/snapshotFreshness';
import { buildCorrectionSurvivorSummary } from '../../features/opportunityState/correctionSurvivorSummary';
import StaticCotSection from '../components/StaticCotSection';

const TH = 'sticky top-0 border-b border-border bg-surface px-2 py-2 text-xs font-semibold text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5';

const EMPTY_RESULTS = [];
const DEFAULT_TOP_RESULTS = 20;
const LEADERS_SCREEN_ID = 'leaders_in_leading_groups';
const CORRECTION_SURVIVORS_SCREEN_ID = 'correction_survivors';

const formatNumber = (value, digits = 0) => {
  if (value == null) return '-';
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};

function StaticHomePage() {
  const manifestQuery = useStaticManifest();
  const { selectedMarket } = useStaticMarket();
  const marketEntry = useMemo(
    () => resolveStaticMarketEntry(manifestQuery.data, selectedMarket),
    [manifestQuery.data, selectedMarket],
  );
  const { generation, dataRoot } = useStaticGeneration();
  const homeQuery = useQuery(staticQueryOptions({
    key: ['staticHome', marketEntry.pages?.home?.path],
    generation,
    queryFn: () => fetchStaticJson(marketEntry.pages.home.path, dataRoot),
    enabled: Boolean(marketEntry.pages?.home?.path),
  }));
  const scanBundleQuery = useQuery(staticQueryOptions({
    key: ['staticHomeScanRows', marketEntry.pages?.scan?.path],
    generation,
    queryFn: async () => {
      const scanManifest = await fetchStaticJson(marketEntry.pages.scan.path, dataRoot);
      const rowsBySymbol = new Map(
        (scanManifest.initial_rows || []).map((row) => [row.symbol, row])
      );
      const chunkResults = await Promise.allSettled(
        (scanManifest.chunks || []).map((chunk) => fetchStaticJson(chunk.path, dataRoot))
      );
      // A replaced generation is not a partial result: let the tab move on.
      const expired = chunkResults.find(
        (result) => result.status === 'rejected' && result.reason instanceof StaticGenerationExpiredError
      );
      if (expired) throw expired.reason;
      const successfulChunks = chunkResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      successfulChunks.forEach((payload) => {
        (payload.rows || []).forEach((row) => {
          rowsBySymbol.set(row.symbol, row);
        });
      });
      const failedChunks = chunkResults.filter((result) => result.status === 'rejected');
      const rowsTotal = Number(scanManifest.rows_total);
      return {
        rows: Array.from(rowsBySymbol.values()),
        defaultFilters: scanManifest.default_filters || {},
        presetScreens: scanManifest.preset_screens || [],
        complete: failedChunks.length === 0
          && Number.isFinite(rowsTotal)
          && rowsBySymbol.size >= rowsTotal,
      };
    },
    enabled: Boolean(marketEntry.pages?.scan?.path),
    gcTime: Infinity,
  }));
  const chartIndexQuery = useStaticChartIndex(marketEntry.assets?.charts?.path);

  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [selectedChartSymbol, setSelectedChartSymbol] = useState(null);
  const [modalNavigationSymbols, setModalNavigationSymbols] = useState([]);
  const [marketCapMin, setMarketCapMin] = useState('');
  const topGroups = homeQuery.data?.top_groups ?? EMPTY_RESULTS;
  const scanDefaultFilters = useMemo(
    () => scanBundleQuery.data?.defaultFilters ?? {},
    [scanBundleQuery.data?.defaultFilters]
  );
  const topCandidateFilters = useMemo(
    () => applyScanFilterDefaults({
      ...scanDefaultFilters,
      ...(marketCapMin !== '' ? { marketCapUsd: { min: Number(marketCapMin), max: null } } : {}),
    }),
    [marketCapMin, scanDefaultFilters]
  );
  const scanRows = scanBundleQuery.data?.rows ?? EMPTY_RESULTS;
  const scanBundleComplete = scanBundleQuery.data?.complete === true;
  const topResults = useMemo(() => {
    return sortStaticScanRows(
      filterStaticScanRows(scanRows, topCandidateFilters),
      'composite_score',
      'desc'
    ).slice(0, DEFAULT_TOP_RESULTS);
  }, [scanRows, topCandidateFilters]);
  const leadingGroupScreen = useMemo(
    () => scanBundleQuery.data?.presetScreens?.find((screen) => screen.id === LEADERS_SCREEN_ID) ?? null,
    [scanBundleQuery.data?.presetScreens]
  );
  const leadingGroupRows = useMemo(() => {
    if (!leadingGroupScreen) {
      return EMPTY_RESULTS;
    }
    return sortStaticScanRows(
      filterStaticScanRows(scanRows, buildFiltersFromPreset(leadingGroupScreen)),
      leadingGroupScreen.sort_by,
      leadingGroupScreen.sort_order
    ).slice(0, DEFAULT_TOP_RESULTS);
  }, [leadingGroupScreen, scanRows]);
  const opportunityStateEnabled = marketEntry.features?.opportunity_state === true;
  const correctionSurvivorsScreen = useMemo(() => {
    if (!opportunityStateEnabled) return null;
    return scanBundleQuery.data?.presetScreens?.find(
      (screen) => screen.id === CORRECTION_SURVIVORS_SCREEN_ID
    ) ?? null;
  }, [opportunityStateEnabled, scanBundleQuery.data?.presetScreens]);
  const correctionSurvivorRows = useMemo(() => {
    if (!opportunityStateEnabled || !correctionSurvivorsScreen) return EMPTY_RESULTS;
    return sortStaticScanRows(
      filterStaticScanRows(scanRows, buildFiltersFromPreset(correctionSurvivorsScreen)),
      correctionSurvivorsScreen.sort_by,
      correctionSurvivorsScreen.sort_order,
    );
  }, [correctionSurvivorsScreen, opportunityStateEnabled, scanRows]);
  const correctionSurvivorSummary = useMemo(() => {
    if (!opportunityStateEnabled) return null;
    return buildCorrectionSurvivorSummary(correctionSurvivorRows, {
      complete: Boolean(correctionSurvivorsScreen) && scanBundleQuery.data?.complete === true,
    });
  }, [
    correctionSurvivorRows,
    correctionSurvivorsScreen,
    opportunityStateEnabled,
    scanBundleQuery.data?.complete,
  ]);

  const chartEntries = useMemo(() => chartIndexQuery.data?.symbols || [], [chartIndexQuery.data]);
  const chartEnabledSymbols = useMemo(() => new Set(chartEntries.map((e) => e.symbol)), [chartEntries]);
  const topNavigationSymbols = useMemo(
    () => topResults.map((r) => r.symbol).filter((s) => chartEnabledSymbols.has(s)),
    [topResults, chartEnabledSymbols],
  );
  const leadingGroupNavigationSymbols = useMemo(
    () => leadingGroupRows.map((r) => r.symbol).filter((s) => chartEnabledSymbols.has(s)),
    [leadingGroupRows, chartEnabledSymbols],
  );
  const correctionSurvivorNavigationSymbols = useMemo(
    () => correctionSurvivorRows
      .slice(0, DEFAULT_TOP_RESULTS)
      .map((row) => row.symbol)
      .filter((symbol) => chartEnabledSymbols.has(symbol)),
    [chartEnabledSymbols, correctionSurvivorRows],
  );
  const leadingGroupMinVolume = leadingGroupScreen?.filters?.minVolume;
  const leadingGroupSubtitle = leadingGroupMinVolume == null
    ? 'Top 20 by report card: group rank <=40, RS >=80.'
    : `Top 20 by report card: group rank <=40, RS >=80, dollar volume >= ${formatNumber(leadingGroupMinVolume)}.`;

  if (manifestQuery.isLoading || homeQuery.isLoading || scanBundleQuery.isLoading) {
    return (
      <div role="status" aria-label="Loading snapshot" className="tw flex justify-center py-16">
        <span aria-hidden="true" className="inline-block size-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
      </div>
    );
  }

  if (manifestQuery.isError || homeQuery.isError || scanBundleQuery.isError) {
    return (
      <Notice tone="error" className="tw">
        Failed to load the daily snapshot.
      </Notice>
    );
  }

  const home = homeQuery.data;
  const freshness = home?.freshness || {};
  const marketDisplay = home?.market_display_name || marketEntry.display_name;
  const flag = marketFlag(marketEntry.market);

  const handleRowClick = (symbol, navigationSymbols) => {
    if (chartEnabledSymbols.has(symbol)) {
      setSelectedChartSymbol(symbol);
      setModalNavigationSymbols(navigationSymbols);
      setChartModalOpen(true);
    }
  };

  return (
    <div className="tw text-foreground">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {flag ? `${flag}  ` : ''}{marketDisplay} Snapshot
        </h1>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {formatSnapshotFreshnessLabel(freshness)}
        </p>
      </div>

      {/* Two key-market cards per row stop fitting below ~300px (e.g. a phone at 200% zoom). */}
      <div className="mb-4 grid grid-cols-1 gap-3 min-[300px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {(home.key_markets || [])
          .map((item) => ({
            ...item,
            _closes: (item.history || []).map((h) => h.close).filter((c) => c != null),
          }))
          .filter((item) => item.latest_close != null && item._closes.length > 1)
          .map((item) => (
            <KeyMarketCard key={item.symbol} item={item} currency={item.currency} />
          ))}
      </div>

      <MarketHealthExposure exposure={home?.market_health_exposure} />

      {marketEntry.market === 'US' ? <StaticCotSection manifest={manifestQuery.data} /> : null}

      {opportunityStateEnabled ? (
        <CorrectionSurvivorsPanel
          summary={correctionSurvivorSummary}
          posture={home?.market_health_exposure}
          chartEnabledSymbols={chartEnabledSymbols}
          navigationSymbols={correctionSurvivorNavigationSymbols}
          onOpenChart={handleRowClick}
        />
      ) : null}

      {!scanBundleComplete ? (
        <Notice tone="warning" className="mb-4">
          Scan rankings unavailable
        </Notice>
      ) : null}

      {scanBundleComplete ? (
        <DailyScanRowsTable
          testId="top-scan-candidates-section"
          title="Top Scan Candidates"
          subtitle={
            topCandidateFilters.minVolume == null
              ? 'No default liquidity floor. Click a row for chart details.'
              : `Dollar volume >= ${formatNumber(topCandidateFilters.minVolume)}. Click a row for chart details.`
          }
          rows={topResults}
          chartEnabledSymbols={chartEnabledSymbols}
          navigationSymbols={topNavigationSymbols}
          onOpenChart={handleRowClick}
          emptyMessage="No scan candidates match the current filters."
          showRating
          action={(
            <NativeSelect
              label="Mkt Cap"
              value={marketCapMin}
              onChange={(nextValue) => setMarketCapMin(nextValue === '' ? '' : Number(nextValue))}
              className="w-36"
            >
              <option value="">All</option>
              {MARKET_CAP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          )}
        />
      ) : null}

      {scanBundleComplete ? (
        <DailyScanRowsTable
          testId="leaders-in-leading-groups-section"
          title="Leaders in Leading Groups"
          subtitle={leadingGroupSubtitle}
          rows={leadingGroupRows}
          chartEnabledSymbols={chartEnabledSymbols}
          navigationSymbols={leadingGroupNavigationSymbols}
          onOpenChart={handleRowClick}
          emptyMessage="No leaders in leading groups match the current snapshot."
          showRs
          priceSparklineWidth={195}
          priceSparklineInnerWidth={150}
        />
      ) : null}

      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-1 text-[13px] font-semibold tracking-wide uppercase">Top 10 Groups</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th scope="col" className={`${TH} text-center`}>Rank</th>
                <th scope="col" className={`${TH} text-left`}>Group</th>
                <th scope="col" className={`${TH} text-right`}>1W</th>
                <th scope="col" className={`${TH} text-right`}>1M</th>
                <th scope="col" className={`${TH} text-left`}>Top Stock</th>
              </tr>
            </thead>
            <tbody>
              {topGroups.map((group) => (
                <tr key={group.industry_group}>
                  <td className={`${TD} text-center font-semibold tabular-nums`}>{group.rank}</td>
                  <td className={TD}>{group.industry_group}</td>
                  <td className={`${TD} text-right`}><RankChange value={group.rank_change_1w} /></td>
                  <td className={`${TD} text-right`}><RankChange value={group.rank_change_1m} /></td>
                  <td className={TD}>
                    <TickerCell symbol={group.top_symbol} companyName={group.top_symbol_name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <StaticChartViewerModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        initialSymbol={selectedChartSymbol}
        chartIndex={chartIndexQuery.data}
        navigationSymbols={modalNavigationSymbols}
      />
    </div>
  );
}

export default StaticHomePage;
