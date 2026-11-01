import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import CandlestickChart from '../components/Charts/CandlestickChart';
import GroupChartsLayout, { GroupChartCell } from '../components/Charts/GroupChartsLayout';
import { getGroupRankColor } from '../utils/colorUtils';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';
import { isCurrentChartIndex, staticChartPayloadQuery } from './chartClient';
import { useStaticGeneration } from './dataClient';

const MAX_SYMBOLS = 50;
const CHART_HEIGHT = 360;

// colorUtils speaks MUI palette paths; stats read as toned text, not filled boxes.
const TONE = { 'success.main': 'text-gain', 'warning.main': 'text-warning', 'error.main': 'text-loss' };

function StatBadge({ value, label, tone }) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn('min-w-9 text-center text-[13px] font-bold whitespace-nowrap tabular-nums', TONE[tone] || 'text-foreground')}>
        {value}
      </span>
      <span className="mt-0.5 text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function StaticGroupChartCard({ symbol, entry, indexCurrent, isSelected, onSelect }) {
  const generation = useStaticGeneration();
  const payloadQuery = staticChartPayloadQuery(symbol, entry?.path, generation);
  // A previous-generation index (placeholder) keeps the card's payload on
  // screen but fetches nothing: its paths belong to the previous data root.
  const { data: payload, isLoading, isError } = useQuery({
    ...payloadQuery,
    enabled: indexCurrent && payloadQuery.enabled,
  });

  const stockData = payload?.stock_data || null;
  const fundamentals = payload?.fundamentals || null;
  const bars = payload?.bars || null;
  const hasBarsPayload = Array.isArray(bars);
  const generatedAt = payload?.generated_at ? Date.parse(payload.generated_at) : null;
  const lastClose = bars && bars.length > 0 ? bars[bars.length - 1].close : null;
  const groupRank = stockData?.ibd_group_rank ?? null;
  const adrValue = stockData?.adr_percent ?? fundamentals?.adr_percent ?? null;
  const epsRating = stockData?.eps_rating ?? fundamentals?.eps_rating ?? null;
  const companyName = stockData?.company_name || fundamentals?.company_name || null;

  const adrBg = adrValue == null
    ? null
    : Number(adrValue) >= 4
      ? 'success.main'
      : Number(adrValue) >= 2
        ? 'warning.main'
        : 'error.main';

  const epsBg = epsRating == null
    ? null
    : epsRating >= 80
      ? 'success.main'
      : epsRating >= 50
        ? 'warning.main'
        : 'error.main';

  const handleSelect = (e) => {
    e.stopPropagation();
    onSelect?.(symbol);
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.(symbol);
    }
  };

  const placeholder = 'flex items-center justify-center p-4';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${symbol} chart — ${isSelected ? 'selected, zoom enabled' : 'click to enable zoom'}`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'cursor-pointer overflow-hidden rounded-lg border-2 bg-surface outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none',
        isSelected ? 'border-accent' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-4 py-2">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-lg leading-tight font-bold">{symbol}</p>
            {companyName ? <p className="text-[11px] text-muted-foreground">{companyName}</p> : null}
          </div>
          {groupRank != null ? (
            <StatBadge value={groupRank} label="Grp Rnk" tone={getGroupRankColor(groupRank)} />
          ) : null}
          {adrValue != null ? (
            <StatBadge value={`${Number(adrValue).toFixed(1)}%`} label="ADR" tone={adrBg} />
          ) : null}
          {epsRating != null ? (
            <StatBadge value={epsRating} label="EPS Rtg" tone={epsBg} />
          ) : null}
        </div>
        {lastClose != null ? (
          <span className="text-sm font-semibold tabular-nums">{lastClose.toFixed(2)}</span>
        ) : null}
      </div>

      {isError ? (
        <div className={placeholder} style={{ height: CHART_HEIGHT }}>
          <Notice tone="error" className="w-full">Failed to load chart payload for {symbol}.</Notice>
        </div>
      ) : isLoading ? (
        <div role="status" aria-label="Loading chart" className={placeholder} style={{ height: CHART_HEIGHT }}>
          <span aria-hidden="true" className="inline-block size-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
        </div>
      ) : !hasBarsPayload ? (
        <div className={placeholder} style={{ height: CHART_HEIGHT }}>
          <Notice tone="warning" className="w-full">No price data available for {symbol}.</Notice>
        </div>
      ) : (
        <CandlestickChart
          symbol={symbol}
          period="6mo"
          height={CHART_HEIGHT}
          priceData={bars}
          dataUpdatedAtOverride={generatedAt}
          hideTimeframeToggle
          interactive={isSelected}
        />
      )}
    </div>
  );
}

/**
 * Vertical list of full-featured candlestick charts for a group's constituent
 * stocks, rendered from pre-generated static chart payloads (no live API).
 *
 * Charts render daily-only (no Daily/Weekly toggle) with EMAs and the OHLC
 * legend. Time-axis pan/zoom is locked unless the card is clicked, at which
 * point its border turns green and interactions are enabled. Clicking another
 * card or the surrounding area deselects.
 *
 * @param {Object} props
 * @param {string[]} props.symbols - Constituent ticker symbols
 * @param {Object|null} props.chartIndex - Static chart index `{ symbols: [{ symbol, path }, ...] }`
 */
function StaticGroupChartsGrid({ symbols = [], chartIndex = null }) {
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const indexCurrent = isCurrentChartIndex(chartIndex, useStaticGeneration().generation);

  const entryBySymbol = useMemo(() => {
    const entries = chartIndex?.symbols || [];
    return new Map(entries.map((entry) => [entry.symbol, entry]));
  }, [chartIndex]);

  const normalizedSymbols = useMemo(
    () => Array.from(
      new Set(
        (symbols || [])
          .filter((s) => typeof s === 'string' && s.trim().length > 0)
          .map((s) => s.trim().toUpperCase()),
      ),
    ),
    [symbols],
  );

  const truncatedSymbols = useMemo(
    () => normalizedSymbols.slice(0, MAX_SYMBOLS),
    [normalizedSymbols],
  );

  if (normalizedSymbols.length === 0) {
    return (
      <Notice className="tw mt-2">No constituent stocks to chart.</Notice>
    );
  }

  if (!chartIndex) {
    return (
      <Notice tone="warning" className="tw mt-2">Static chart payloads are unavailable for this market.</Notice>
    );
  }

  const truncated = normalizedSymbols.length > truncatedSymbols.length;

  return (
    <div data-testid="static-group-charts-root" className="tw" onClick={() => setSelectedSymbol(null)}>
      {truncated && (
        <p className="mb-2 text-[11px] text-muted-foreground">
          Showing first {truncatedSymbols.length} of {normalizedSymbols.length} stocks.
        </p>
      )}
      <GroupChartsLayout data-testid="static-group-charts-grid" gap={2}>
        {truncatedSymbols.map((sym) => {
          const entry = entryBySymbol.get(sym);
          if (!entry) {
            return (
              <GroupChartCell key={sym}>
                <div className="overflow-hidden rounded-lg border border-border bg-surface">
                  <p className="border-b border-border bg-background px-4 py-2 text-lg font-bold">{sym}</p>
                  <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">No price data</div>
                </div>
              </GroupChartCell>
            );
          }
          return (
            <GroupChartCell key={sym}>
              <StaticGroupChartCard
                symbol={sym}
                entry={entry}
                indexCurrent={indexCurrent}
                isSelected={selectedSymbol === sym}
                onSelect={setSelectedSymbol}
              />
            </GroupChartCell>
          );
        })}
      </GroupChartsLayout>
    </div>
  );
}

export default StaticGroupChartsGrid;
