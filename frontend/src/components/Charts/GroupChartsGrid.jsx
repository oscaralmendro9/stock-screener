import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';
import { useQuery } from '@tanstack/react-query';

import CandlestickChart from './CandlestickChart';
import GroupChartsLayout, { GroupChartCell } from './GroupChartsLayout';
import {
  fetchPriceHistoryBatch,
  priceHistoryKeys,
  PRICE_HISTORY_STALE_TIME,
} from '../../api/priceHistory';

const MAX_SYMBOLS = 40;
// Card header (~33px) plus grid gap (8px), rounded up: one row is chart height + this.
const CARD_CHROME_PX = 48;

const SCROLLABLE = /(auto|scroll|overlay)/;

/** Nearest scrolling ancestor (the group dialog's content), else the viewport. */
function scrollParent(element) {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    if (SCROLLABLE.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

/**
 * Track which cells have come within `rootMargin` of the scroll area, using one
 * shared IntersectionObserver. Revealed cells stay revealed, so a mounted chart
 * is never rebuilt by scrolling away and back. Without IntersectionObserver
 * every cell counts as revealed (the old eager behaviour).
 */
function useRevealOnScroll(rootMargin) {
  const supported = typeof IntersectionObserver !== 'undefined';
  const [revealed, setRevealed] = useState(() => new Set());
  const observerRef = useRef(null);
  const keyByElement = useRef(new Map());
  const refCallbacks = useRef(new Map());

  useEffect(() => {
    if (!supported) return undefined;
    const elements = keyByElement.current;
    let active = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!active) return;
        // An entry queued before its element was released has no key: skip it.
        const shown = entries.filter(
          (entry) => entry.isIntersecting && elements.has(entry.target),
        );
        if (shown.length === 0) return;
        shown.forEach((entry) => observer.unobserve(entry.target));
        setRevealed((previous) => {
          const added = shown
            .map((entry) => elements.get(entry.target))
            .filter((key) => !previous.has(key));
          // Re-reports (e.g. a rebuilt observer) change nothing: skip the re-render.
          if (added.length === 0) return previous;
          const next = new Set(previous);
          added.forEach((key) => next.add(key));
          return next;
        });
      },
      { root: scrollParent(elements.keys().next().value), rootMargin },
    );
    observerRef.current = observer;
    elements.forEach((_, element) => observer.observe(element));
    return () => {
      active = false;
      observer.disconnect();
      observerRef.current = null;
    };
  }, [supported, rootMargin]);

  // One stable ref callback per key, so re-renders do not re-observe cells.
  const cellRef = useCallback((key) => {
    if (!refCallbacks.current.has(key)) {
      let current = null;
      refCallbacks.current.set(key, (element) => {
        if (current) {
          keyByElement.current.delete(current);
          observerRef.current?.unobserve(current);
        }
        current = element;
        if (element) {
          keyByElement.current.set(element, key);
          observerRef.current?.observe(element);
        }
      });
    }
    return refCallbacks.current.get(key);
  }, []);

  const isRevealed = useCallback((key) => !supported || revealed.has(key), [supported, revealed]);
  return { cellRef, isRevealed };
}

/**
 * Grid of mini candlestick charts for a group of constituent symbols.
 *
 * One batch network call fetches all OHLCV payloads, and each cell hands its
 * slice to a `compact` CandlestickChart so no per-symbol request fires.
 * Charts are built only once their cell nears the visible area (about one row
 * beyond it); until then the cell keeps its label and reserved height.
 *
 * @param {Object} props
 * @param {string[]} props.symbols - Constituent ticker symbols
 * @param {string} props.period - Time period (default '6mo')
 * @param {number} props.height - Height per chart cell (default 200)
 */
function GroupChartsGrid({ symbols = [], period = '6mo', height = 200 }) {

  const normalizedSymbols = useMemo(
    () =>
      Array.from(
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

  const {
    data: batch,
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: priceHistoryKeys.batch(truncatedSymbols, period),
    queryFn: () => fetchPriceHistoryBatch(truncatedSymbols, period),
    enabled: truncatedSymbols.length > 0,
    staleTime: PRICE_HISTORY_STALE_TIME,
  });

  if (normalizedSymbols.length === 0) {
    return <Notice className="tw mt-2">No constituent stocks to chart.</Notice>;
  }

  if (isLoading) {
    return (
      <div className="tw flex items-center justify-center gap-4 py-12 text-sm text-muted-foreground">
        <span role="progressbar" aria-label="Loading charts" className="inline-block size-6 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
        Loading {truncatedSymbols.length} charts…
      </div>
    );
  }

  if (isError) {
    return (
      <Notice
        tone="error"
        className="tw mt-2"
        action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>}
      >
        <p className="font-semibold">Failed to load group charts</p>
        {error?.message || 'Unknown error fetching price history'}
      </Notice>
    );
  }

  const truncated = normalizedSymbols.length > truncatedSymbols.length;

  return (
    <div className="tw">
      {truncated && (
        <p className="mb-2 text-[11px] text-muted-foreground">
          Showing first {truncatedSymbols.length} of {normalizedSymbols.length} stocks.
        </p>
      )}
      {/* Keyed by identity: a new group or period gets fresh observations. */}
      <GroupChartCells
        key={`${period}|${truncatedSymbols.join(',')}`}
        symbols={truncatedSymbols}
        batch={batch}
        period={period}
        height={height}
        dataUpdatedAt={dataUpdatedAt}
      />
    </div>
  );
}

function GroupChartCells({ symbols, batch, period, height, dataUpdatedAt }) {
  const { cellRef, isRevealed } = useRevealOnScroll(`${height + CARD_CHROME_PX}px 0px`);
  const dataMap = batch?.data || {};
  const missingSet = new Set(batch?.missing || []);

  return (
      <GroupChartsLayout data-testid="group-charts-grid" gap={1}>
        {symbols.map((sym) => {
          const priceData = dataMap[sym];
          const isMissing = missingSet.has(sym) || !priceData || priceData.length === 0;
          const lastClose = priceData && priceData.length > 0 ? priceData[priceData.length - 1].close : null;

          return (
            <GroupChartCell key={sym} ref={cellRef(sym)} data-testid="group-chart-cell">
              <div className="overflow-hidden rounded-md border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-2 py-1">
                  <span className="text-sm font-bold">{sym}</span>
                  {lastClose !== null && (
                    <span className="text-xs text-muted-foreground tabular-nums">{lastClose.toFixed(2)}</span>
                  )}
                </div>
                {isMissing ? (
                  <div className="flex items-center justify-center text-[11px] text-muted-foreground" style={{ height }}>
                    No price data
                  </div>
                ) : isRevealed(sym) ? (
                  <CandlestickChart
                    symbol={sym}
                    period={period}
                    height={height}
                    priceData={priceData}
                    dataUpdatedAtOverride={dataUpdatedAt || null}
                    compact
                  />
                ) : (
                  <div className="flex items-center justify-center text-[11px] text-muted-foreground" style={{ height }}>
                    Chart loads when scrolled into view
                  </div>
                )}
              </div>
            </GroupChartCell>
          );
        })}
      </GroupChartsLayout>
  );
}

export default GroupChartsGrid;
