import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/ui/button';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';
import { useRuntimeActivity } from '../../hooks/useRuntimeActivity';

// Status reads as toned text in a neutral pill.
const STATUS_TEXT = {
  running: 'text-foreground',
  queued: 'text-warning',
  completed: 'text-gain',
  failed: 'text-loss',
};

const FALLBACK_BOOTSTRAP_STAGES = [
  { key: 'universe', label: 'Universe Refresh' },
  { key: 'prices', label: 'Price Refresh' },
  { key: 'fundamentals', label: 'Fundamentals Refresh' },
  { key: 'groups', label: 'Group Rankings' },
  { key: 'scan', label: 'Scan' },
  { key: 'breadth', label: 'Breadth Calculation' },
];

function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function normalizeProgressPercent(percent) {
  if (percent === null || percent === undefined) {
    return null;
  }
  const value = Number(percent);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, value));
}

function normalizeEnabled(primaryMarket, enabledMarkets) {
  const next = enabledMarkets.includes(primaryMarket)
    ? enabledMarkets
    : [primaryMarket, ...enabledMarkets];
  return Array.from(new Set(next));
}

// The saved choice can name markets this deployment does not run (stored
// before the deployment changed); start from the ones it does.
function initialSelection(primaryMarket, enabledMarkets, offeredCodes) {
  const primary = offeredCodes.includes(primaryMarket) ? primaryMarket : (offeredCodes[0] ?? primaryMarket);
  const enabled = (enabledMarkets ?? []).filter((market) => offeredCodes.includes(market));
  return { primary, enabled: normalizeEnabled(primary, enabled) };
}

function normalizeStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    return FALLBACK_BOOTSTRAP_STAGES;
  }
  const normalized = stages
    .map((stage) => ({
      key: stage?.key,
      label: stage?.label || stage?.key,
    }))
    .filter((stage) => stage.key && stage.label);
  return normalized.length > 0 ? normalized : FALLBACK_BOOTSTRAP_STAGES;
}

export default function BootstrapSetupScreen({
  primaryMarket,
  enabledMarkets,
  deploymentMarkets,
  marketCatalog,
  bootstrapState,
  isStartingBootstrap,
  bootstrapError,
  onStartBootstrap,
}) {
  const marketOptions = useMemo(() => {
    const deployable = deploymentMarkets ?? [];
    const catalogMarkets = marketCatalog?.markets;
    if (Array.isArray(catalogMarkets) && catalogMarkets.length > 0) {
      return catalogMarkets
        .filter((market) => deployable.includes(market.code))
        .map((market) => ({
          code: market.code,
          label: market.label || market.code,
        }));
    }
    return deployable.map((market) => ({
      code: market,
      label: market,
    }));
  }, [deploymentMarkets, marketCatalog?.markets]);
  const offeredCodes = useMemo(() => marketOptions.map((market) => market.code), [marketOptions]);

  const [selectedPrimary, setSelectedPrimary] = useState(
    () => initialSelection(primaryMarket || 'US', enabledMarkets, offeredCodes).primary
  );
  const [selectedMarkets, setSelectedMarkets] = useState(
    () => initialSelection(primaryMarket || 'US', enabledMarkets, offeredCodes).enabled
  );

  useEffect(() => {
    const next = initialSelection(primaryMarket || 'US', enabledMarkets, offeredCodes);
    setSelectedPrimary(next.primary);
    setSelectedMarkets(next.enabled);
  }, [enabledMarkets, offeredCodes, primaryMarket]);

  const normalizedSelection = useMemo(
    () => normalizeEnabled(selectedPrimary, selectedMarkets),
    [selectedMarkets, selectedPrimary]
  );
  const running = bootstrapState === 'running';
  const activityQuery = useRuntimeActivity({ enabled: running || isStartingBootstrap });
  const bootstrap = activityQuery.data?.bootstrap ?? null;
  const marketActivity = useMemo(
    () => activityQuery.data?.markets ?? [],
    [activityQuery.data?.markets]
  );
  const bootstrapResolvedPercent = normalizeProgressPercent(bootstrap?.percent);
  const requestedBootstrapProgressMode = (
    bootstrap?.progress_mode
    || 'indeterminate'
  );
  const bootstrapProgressMode = (
    requestedBootstrapProgressMode === 'determinate' && bootstrapResolvedPercent === null
      ? 'indeterminate'
      : requestedBootstrapProgressMode
  );
  const bootstrapPercent = (
    bootstrapProgressMode === 'determinate'
      ? bootstrapResolvedPercent
      : null
  );
  const bootstrapProgressDetail = (
    bootstrap?.current !== null
    && bootstrap?.current !== undefined
    && bootstrap?.total !== null
    && bootstrap?.total !== undefined
  )
    ? `${formatCount(bootstrap.current)} / ${formatCount(bootstrap.total)} stocks`
    : null;
  const bootstrapMessage = bootstrap?.message || 'Preparing market data.';
  const bootstrapStages = useMemo(
    () => normalizeStages(bootstrap?.stages),
    [bootstrap?.stages]
  );

  const toggleMarket = (market) => {
    if (market === selectedPrimary) {
      return;
    }
    setSelectedMarkets((previous) => (
      previous.includes(market)
        ? previous.filter((value) => value !== market)
        : [...previous, market]
    ));
  };

  const handlePrimaryChange = (nextPrimary) => {
    setSelectedPrimary(nextPrimary);
    setSelectedMarkets((previous) => normalizeEnabled(nextPrimary, previous));
  };

  const handleStart = async () => {
    try {
      await onStartBootstrap({
        primaryMarket: selectedPrimary,
        enabledMarkets: normalizedSelection,
      });
    } catch {
      // Mutation state already drives the visible error UI.
    }
  };

  return (
    <main className="tw flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-[720px] rounded-lg border border-border bg-surface p-8">
        <div className="flex flex-col gap-6">
          <div>
            <span className="mb-2 inline-flex h-6 items-center rounded-full border border-border px-2 text-[11px] font-medium text-muted-foreground">Local Setup</span>
            <h1 className="mb-2 text-3xl font-bold">First-run market bootstrap</h1>
            <p className="text-muted-foreground">
              Pick the primary market for startup defaults. The workspace opens after the
              primary market finishes its first scan-backed snapshot.
            </p>
          </div>

          {bootstrapError && (
            <Notice tone="error">
              {typeof bootstrapError === 'string' ? bootstrapError : 'Failed to start bootstrap.'}
            </Notice>
          )}

          {running && (
            <div className="flex flex-col gap-4">
              <Notice>
                Initial sync is running. The workspace will open after the primary market has
                current data and a published scan. Additional markets continue loading in the background.
              </Notice>
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-subtle p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{bootstrap?.current_stage || 'Preparing bootstrap'}</h2>
                  {bootstrapProgressMode === 'determinate' && bootstrapPercent !== null && (
                    <span className="text-sm text-muted-foreground tabular-nums">{Math.round(bootstrapPercent)}%</span>
                  )}
                </div>
                <div
                  role="progressbar"
                  aria-label="Bootstrap progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={bootstrapProgressMode === 'determinate' && bootstrapPercent !== null ? Math.round(bootstrapPercent) : undefined}
                  className="h-1.5 overflow-hidden rounded-full bg-border"
                >
                  {bootstrapProgressMode === 'determinate' && bootstrapPercent !== null ? (
                    <div className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out motion-reduce:transition-none" style={{ width: `${bootstrapPercent}%` }} />
                  ) : (
                    <div className="h-full w-1/3 rounded-full bg-accent motion-safe:animate-pulse" />
                  )}
                </div>
                {bootstrapProgressDetail && (
                  <p className="text-[11px] text-muted-foreground tabular-nums">{bootstrapProgressDetail}</p>
                )}
                <p className="text-sm text-muted-foreground">{bootstrapMessage}</p>
              </div>
              {bootstrap?.background_warning && (
                <Notice tone="warning">{bootstrap.background_warning}</Notice>
              )}
              {marketActivity.length > 0 && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold">Enabled market queue</h2>
                  <ul className="flex flex-col gap-2">
                    {marketActivity.map((market) => (
                      <li
                        key={market.activity_id ?? market.market}
                        className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-bold">
                            {market.market}
                            {market.market === (bootstrap?.primary_market || primaryMarket) ? ' (primary)' : ''}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {market.stage_label || 'Queued'}{market.message ? ` · ${market.message}` : ''}
                          </p>
                        </div>
                        <span className={cn('inline-flex h-6 items-center rounded-full border border-border px-2 text-[11px] font-medium', STATUS_TEXT[market.status] || 'text-muted-foreground')}>
                          {market.status || 'idle'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <hr className="border-border" />

          <NativeSelect
            label="Primary market"
            value={selectedPrimary}
            onChange={handlePrimaryChange}
            disabled={running || isStartingBootstrap}
          >
            {marketOptions.map((market) => (
              <option key={market.code} value={market.code}>{market.label}</option>
            ))}
          </NativeSelect>

          <fieldset>
            <legend className="text-sm font-semibold">Enabled markets</legend>
            <p className="mb-2 text-sm text-muted-foreground">
              This deployment&apos;s ENABLED_MARKETS decides which markets are listed.
            </p>
            <div className="flex flex-col">
              {marketOptions.map((market) => {
                const disabled = running || isStartingBootstrap || market.code === selectedPrimary;
                return (
                  <label key={market.code} className={cn('flex min-h-11 items-center gap-2 text-sm md:min-h-9', disabled ? 'cursor-default' : 'cursor-pointer')}>
                    <input
                      type="checkbox"
                      checked={normalizedSelection.includes(market.code)}
                      disabled={disabled}
                      onChange={() => toggleMarket(market.code)}
                      className="size-4 cursor-pointer accent-accent disabled:cursor-default"
                    />
                    {market.code === selectedPrimary ? `${market.label} (primary)` : market.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <hr className="border-border" />

          <div>
            <h2 className="mb-2 text-sm font-semibold">Bootstrap order</h2>
            {bootstrapStages.map((stage, index) => (
              <p key={stage.key} className="text-muted-foreground">
                {index + 1}. {stage.label}
              </p>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleStart} disabled={running || isStartingBootstrap}>
              {isStartingBootstrap ? 'Starting...' : 'Start bootstrap'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
