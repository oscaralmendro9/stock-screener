import { memo, useEffect, useId, useRef, useState } from 'react';
import { ChevronUp, Play, Plus, RefreshCw, Square, X } from 'lucide-react';
import ScanProgress from '../../../components/Scan/ScanProgress';
import { formatScanDropdownLabel } from '../../../utils/scanLabel';
import { SCREENER_OPTIONS, WATCHLIST_MARKET } from '../constants';
import { selectRuntimeUniverseOption } from '../runtimeUniverseSelections';
import { getSelectionCount } from '../universeSelection';
import { Button } from '@/ui/button';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';

const CUSTOM_FILTER_FIELDS = [
  { key: 'price_min', label: 'Min Price' },
  { key: 'price_max', label: 'Max Price' },
  { key: 'rs_rating_min', label: 'Min RS', min: 0, max: 100 },
  { key: 'volume_min', label: 'Min Vol' },
  { key: 'eps_growth_min', label: 'Min EPS %' },
  { key: 'sales_growth_min', label: 'Min Sales %' },
];

function Spinner() {
  return <span aria-hidden="true" className="inline-block size-3.5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />;
}

function stockCountLabel(universeMarket, universeScope, universeStats, statsLoading, selectedScopeOption) {
  if (!universeMarket) {
    return 'Pick a market to start';
  }
  if (universeMarket !== 'TEST' && !universeScope) {
    return '...';
  }
  if (statsLoading) {
    return '...';
  }
  const count = getSelectionCount(
    universeMarket,
    universeScope,
    universeStats,
    selectedScopeOption?.universe_def
  );
  if (count === null || count === undefined) {
    return '';
  }
  return `${count} stocks`;
}

function optionStatusLabel(option, count) {
  const countLabel = count !== null && count !== undefined ? ` (${count})` : '';
  const disabledLabel = option.disabledReason ? ` - ${option.disabledReason}` : '';
  return `${option.label}${countLabel}${disabledLabel}`;
}

function toOptionalNumber(rawValue) {
  return rawValue === '' ? undefined : Number(rawValue);
}

function staleRefreshMarket(createScanError, fallbackMarket) {
  const detail = createScanError?.detail;
  if (detail?.code !== 'market_data_stale') {
    return null;
  }
  const market = detail.stale_markets?.[0]?.market || detail.market || fallbackMarket;
  return market ? String(market).toUpperCase() : null;
}

function ScanControlBar({
  currentScanId,
  scanHistory,
  onLoadScan,
  universeMarket,
  universeScope,
  onUniverseMarketChange,
  onUniverseScopeChange,
  universeStats,
  universeSelections = null,
  statsLoading,
  selectedScreeners,
  onScreenerToggle,
  includeVcp,
  onIncludeVcpChange,
  compositeMethod,
  onCompositeMethodChange,
  createScanPending,
  scanStatus,
  scanRequestReady,
  onStartScan,
  onCancelScan,
  cancelScanPending,
  statusData,
  customFilters,
  onCustomFiltersChange,
  createScanError,
  cancelScanError,
  refreshConflict = null,
  onRefreshStaleData,
  refreshStaleDataPending = false,
  refreshStaleDataError = null,
  scanWarnings = [],
  customSymbols = [],
  onClearCustomSymbols,
  lastPublishedAvailable = false,
  onUseLastPublished,
}) {
  const controlsDisabled = createScanPending || scanStatus === 'running';
  // The screener shows a finished scan; setting up a new one is occasional,
  // so its controls sit behind "New scan". They open on their own when
  // nothing is loaded yet (or "New Scan" is picked) and for a social
  // selection, which arrives here to be scanned.
  const newScanPanelId = useId();
  const mustSetUp = !currentScanId || customSymbols.length > 0;
  const [newScanOpen, setNewScanOpen] = useState(mustSetUp);
  // Until the user toggles it, the panel follows the page: the first render
  // has no scan yet (open), then the loaded scan closes it again.
  const userToggled = useRef(false);
  useEffect(() => {
    if (mustSetUp) setNewScanOpen(true);
    else if (!userToggled.current) setNewScanOpen(false);
  }, [mustSetUp]);
  const toggleNewScan = () => {
    userToggled.current = true;
    setNewScanOpen((open) => !open);
  };
  const universeMarkets = universeSelections?.markets ?? [];
  const {
    marketOption: selectedMarketOption,
    scopeOptions,
    scopeOption: selectedScopeOption,
  } = selectRuntimeUniverseOption(universeSelections, universeMarket, universeScope);
  const hasCustomSymbols = customSymbols.length > 0;
  const scopeLabel = universeMarket === WATCHLIST_MARKET ? 'Watchlist' : 'Universe';
  const needsScope = universeMarket && universeMarket !== 'TEST' && !hasCustomSymbols;
  // A stale error that names no market falls back to the picked market only
  // when the scan was that market's own universe.
  const refreshableMarket = hasCustomSymbols || universeMarket === 'TEST' || universeMarket === WATCHLIST_MARKET
    ? null
    : universeMarket;
  const startDisabled =
    createScanPending
    || !scanRequestReady
    || Boolean(selectedMarketOption?.disabled)
    || Boolean(selectedScopeOption?.disabled)
    || Boolean(refreshConflict);
  // A last-published read never computes, so the refresh conflict (and the
  // options it disables) does not block it; an unusable selection still does.
  const lastPublishedDisabled =
    createScanPending
    // Starting another scan now would stop tracking the user's own scan.
    || scanStatus === 'running'
    || scanStatus === 'queued'
    || !scanRequestReady
    || (!refreshConflict && (
      Boolean(selectedMarketOption?.disabled) || Boolean(selectedScopeOption?.disabled)
    ));
  const createScanErrorMessage = typeof createScanError === 'string'
    ? createScanError
    : createScanError?.message;
  const cancelScanErrorMessage = typeof cancelScanError === 'string'
    ? cancelScanError
    : cancelScanError?.message;
  const refreshStaleDataErrorDetail = refreshStaleDataError?.response?.data?.detail;
  const refreshStaleDataErrorMessage = typeof refreshStaleDataError === 'string'
    ? refreshStaleDataError
    : (typeof refreshStaleDataErrorDetail === 'string'
        ? refreshStaleDataErrorDetail
        : refreshStaleDataErrorDetail?.message)
      || refreshStaleDataError?.message;
  const staleMarket = staleRefreshMarket(createScanError, refreshableMarket);
  const displayedWarnings = scanWarnings.filter((warning) => warning?.message);


  return (
    <section aria-label="Scan controls" className="tw mb-4 rounded-lg border border-border bg-surface p-3 text-foreground">
      <div className="flex flex-wrap items-end gap-3">
        {hasCustomSymbols ? (
          <span className="inline-flex h-8 items-center gap-1 self-end rounded-full border border-accent/40 bg-accent/10 pr-1 pl-3 text-xs font-medium">
            {`Social selection: ${customSymbols.length} symbols`}
            {onClearCustomSymbols ? (
              <button
                type="button"
                aria-label="Clear social selection"
                onClick={onClearCustomSymbols}
                className="grid size-6 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            ) : null}
          </span>
        ) : null}
        <NativeSelect
          label="Previous Scans"
          value={currentScanId || ''}
          onChange={(value) => onLoadScan(value)}
          className="w-56 max-w-full"
        >
          <option value="">New Scan</option>
          {scanHistory?.scans?.map((scan) => (
            <option key={scan.scan_id} value={scan.scan_id}>
              {formatScanDropdownLabel(scan)}
            </option>
          ))}
        </NativeSelect>

        {currentScanId && statusData && (
          <span className="flex h-11 items-center md:h-8">
            <ScanProgress
              status={statusData.status}
              progress={statusData.progress}
              totalStocks={statusData.total_stocks}
              completedStocks={statusData.completed_stocks}
              passedStocks={statusData.passed_stocks}
              etaSeconds={statusData.eta_seconds}
            />
          </span>
        )}

        {scanStatus === 'running' && (
          <Button
            variant="secondary"
            size="sm"
            className="text-loss"
            onClick={onCancelScan}
            disabled={cancelScanPending}
          >
            {cancelScanPending ? <Spinner /> : <Square aria-hidden="true" />}
            Cancel
          </Button>
        )}

        <span className="grow" />

        {lastPublishedAvailable && onUseLastPublished && (
          <Button
            variant="secondary"
            size="sm"
            title="Load a completed scan from the last published snapshot instead of computing one now."
            onClick={onUseLastPublished}
            disabled={lastPublishedDisabled}
          >
            Use last published data
          </Button>
        )}

        <Button
          variant={newScanOpen ? 'ghost' : 'secondary'}
          size="sm"
          aria-expanded={newScanOpen}
          aria-controls={newScanPanelId}
          onClick={toggleNewScan}
        >
          {newScanOpen ? <ChevronUp aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {newScanOpen ? 'Hide scan setup' : 'New scan'}
        </Button>
      </div>

      {newScanOpen && (
        <div id={newScanPanelId} className="mt-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-end gap-3">
            <NativeSelect
              label="Market"
              value={universeMarket ?? ''}
              onChange={(value) => onUniverseMarketChange(value || null)}
              disabled={controlsDisabled}
              className="w-40"
            >
              {!universeMarket ? <option value="" disabled>Pick a market</option> : null}
              {universeMarkets.map((option) => {
                const count = option.value === 'TEST'
                  ? null
                  : getSelectionCount(option.value, 'market', universeStats);
                return (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {optionStatusLabel(option, count)}
                  </option>
                );
              })}
            </NativeSelect>

            {needsScope && (
              <NativeSelect
                label={scopeLabel}
                value={universeScope ?? ''}
                onChange={(value) => onUniverseScopeChange(value || null)}
                disabled={controlsDisabled}
                className="w-44"
              >
                {!universeScope ? <option value="" disabled>{`Pick a ${scopeLabel.toLowerCase()}`}</option> : null}
                {scopeOptions.map((option) => {
                  const count = getSelectionCount(
                    universeMarket,
                    option.value,
                    universeStats,
                    option.universe_def
                  );
                  return (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {optionStatusLabel(option, count)}
                    </option>
                  );
                })}
              </NativeSelect>
            )}

            <div role="group" aria-labelledby={`${newScanPanelId}-strategies`} className="flex flex-col gap-0.5">
              <span id={`${newScanPanelId}-strategies`} className="text-[11px] font-medium text-muted-foreground">Strategies</span>
              <div className="flex flex-wrap items-center gap-1">
                {SCREENER_OPTIONS.map((screener) => {
                  const selected = selectedScreeners.includes(screener.id);
                  return (
                    <button
                      key={screener.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onScreenerToggle(screener.id)}
                      disabled={controlsDisabled}
                      className={cn(
                        'h-11 cursor-pointer rounded-full border px-3 text-xs font-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none md:h-8',
                        selected
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-border bg-surface text-foreground hover:bg-surface-subtle',
                      )}
                    >
                      {screener.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex h-11 cursor-pointer items-center gap-1.5 text-xs md:h-8">
              <input
                type="checkbox"
                checked={includeVcp}
                onChange={(event) => onIncludeVcpChange(event.target.checked)}
                disabled={controlsDisabled}
                className="size-4 cursor-pointer accent-accent"
              />
              VCP
            </label>

            {selectedScreeners.length > 1 && (
              <NativeSelect
                label="Method"
                value={compositeMethod}
                onChange={(value) => onCompositeMethodChange(value)}
                disabled={controlsDisabled}
                className="w-24"
              >
                <option value="weighted_average">Avg</option>
                <option value="maximum">Max</option>
                <option value="minimum">Min</option>
              </NativeSelect>
            )}

            <span className="grow" />

            <span className="flex h-11 items-center text-[11px] text-muted-foreground tabular-nums md:h-8">
              {stockCountLabel(universeMarket, universeScope, universeStats, statsLoading, selectedScopeOption)}
            </span>

            {scanStatus !== 'running' && (
              refreshConflict ? (
                // A disabled button can't take focus, so its reason sits on a
                // focusable wrapper that names it.
                <span
                  tabIndex={0}
                  aria-label={refreshConflict.message}
                  title={refreshConflict.message}
                  className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Button size="sm" onClick={onStartScan} disabled={startDisabled}>
                    {createScanPending ? <Spinner /> : <Play aria-hidden="true" />}
                    Scan
                  </Button>
                </span>
              ) : (
                <Button size="sm" onClick={onStartScan} disabled={startDisabled}>
                  {createScanPending ? <Spinner /> : <Play aria-hidden="true" />}
                  Scan
                </Button>
              )
            )}
          </div>

          {selectedScreeners.includes('custom') && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-3 md:grid-cols-6">
              {CUSTOM_FILTER_FIELDS.map(({ key, label, min, max }) => (
                <label key={key} className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={min}
                    max={max}
                    value={customFilters[key] ?? ''}
                    onChange={(event) => onCustomFiltersChange({ ...customFilters, [key]: toOptionalNumber(event.target.value) })}
                    disabled={controlsDisabled}
                    className="h-11 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-foreground tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:h-8"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {createScanErrorMessage && (
        <Notice
          tone="error"
          className="mt-2"
          action={staleMarket && onRefreshStaleData ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={refreshStaleDataPending}
              onClick={() => onRefreshStaleData(staleMarket)}
            >
              {refreshStaleDataPending ? <Spinner /> : <RefreshCw aria-hidden="true" />}
              Refresh {staleMarket} data
            </Button>
          ) : null}
        >
          Error: {createScanErrorMessage}
        </Notice>
      )}
      {refreshStaleDataErrorMessage && (
        <Notice tone="error" className="mt-2">
          Error: {refreshStaleDataErrorMessage}
        </Notice>
      )}
      {displayedWarnings.map((warning, index) => (
        <Notice key={`${warning.code}-${index}`} tone="warning" role="alert" className="mt-2">
          {warning.message}
        </Notice>
      ))}
      {cancelScanErrorMessage && (
        <Notice tone="error" className="mt-2">
          Error: {cancelScanErrorMessage}
        </Notice>
      )}
      {scanStatus === 'cancelled' && (
        <Notice tone="warning" role="alert" className="mt-2">
          Scan cancelled. Showing partial results.
        </Notice>
      )}
    </section>
  );
}

export default memo(ScanControlBar);
