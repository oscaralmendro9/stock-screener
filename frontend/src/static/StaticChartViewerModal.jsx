import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/ui/badge';
import { Dialog, FullscreenDialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';

import CandlestickChart from '../components/Charts/CandlestickChart';
import { ChartViewerHeader, ChartViewerKeyHints } from '../components/Scan/ChartViewerChrome';
import StockMetricsSidebar from '../components/Scan/StockMetricsSidebar';
import { useChartNavigation } from '../hooks/useChartNavigation';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { isCurrentChartIndex, staticChartPayloadQuery } from './chartClient';
import { useStaticGeneration } from './dataClient';

function StaticChartViewerModal({
  open,
  onClose,
  initialSymbol,
  chartIndex,
  navigationSymbols = null,
}) {
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 767.98px)');
  const [visibleRange, setVisibleRange] = useState(null);

  const entries = useMemo(() => chartIndex?.symbols || [], [chartIndex]);
  const entryBySymbol = useMemo(
    () => new Map(entries.map((entry) => [entry.symbol, entry])),
    [entries]
  );
  const symbols = useMemo(() => {
    if (Array.isArray(navigationSymbols) && navigationSymbols.length > 0) {
      return navigationSymbols.filter((symbol) => entryBySymbol.has(symbol));
    }
    return entries.map((entry) => entry.symbol);
  }, [entries, entryBySymbol, navigationSymbols]);

  const { currentIndex, currentSymbol, totalCount, goNext, goPrevious } = useChartNavigation(
    symbols,
    initialSymbol,
    open
  );

  const currentEntry = currentSymbol ? entryBySymbol.get(currentSymbol) : null;
  const generation = useStaticGeneration();
  // A previous-generation index (placeholder) keeps its payload on screen but
  // starts no fetch: its paths belong to the previous data root.
  const indexCurrent = isCurrentChartIndex(chartIndex, generation.generation);
  const currentQuery = staticChartPayloadQuery(currentSymbol, currentEntry?.path, generation);
  const {
    data: chartPayload,
    isLoading,
    isError,
  } = useQuery({
    ...currentQuery,
    enabled: open && indexCurrent && currentQuery.enabled,
  });

  useEffect(() => {
    if (!open || !symbols.length || !indexCurrent) {
      return undefined;
    }

    const prefetch = (entry) => {
      if (!entry?.path) {
        return;
      }
      queryClient.prefetchQuery(staticChartPayloadQuery(entry.symbol, entry.path, generation));
    };

    const timeouts = [];
    const nextEntries = symbols
      .slice(currentIndex + 1, currentIndex + 3)
      .map((symbol) => entryBySymbol.get(symbol))
      .filter(Boolean);
    const previousEntries = symbols
      .slice(Math.max(0, currentIndex - 2), currentIndex)
      .reverse()
      .map((symbol) => entryBySymbol.get(symbol))
      .filter(Boolean);

    if (nextEntries[0]) {
      prefetch(nextEntries[0]);
    }
    if (previousEntries[0]) {
      prefetch(previousEntries[0]);
    }

    nextEntries.slice(1).forEach((entry, index) => {
      timeouts.push(setTimeout(() => prefetch(entry), (index + 1) * 120));
    });
    previousEntries.slice(1).forEach((entry, index) => {
      timeouts.push(setTimeout(() => prefetch(entry), 320 + (index + 1) * 120));
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [currentIndex, entryBySymbol, generation, indexCurrent, open, queryClient, symbols]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        if (event.shiftKey) {
          goPrevious();
        } else {
          goNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goNext, goPrevious, onClose, open]);

  const stockData = chartPayload?.stock_data || null;
  const fundamentals = chartPayload?.fundamentals || null;
  const adrValue = stockData?.adr_percent ?? fundamentals?.adr_percent ?? null;
  const epsRating = stockData?.eps_rating ?? fundamentals?.eps_rating ?? null;
  const groupRank = stockData?.ibd_group_rank ?? null;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  // Header (~60px) and the key-hint strip (~44px) sit above and below the chart.
  const chartHeight = isMobile
    ? Math.round(viewportHeight * 0.6)
    : Math.max(viewportHeight - 104, 500);
  const dataUpdatedAtOverride = chartPayload?.generated_at ? Date.parse(chartPayload.generated_at) : null;
  const chartPlaceholder = (
    <div aria-busy="true" aria-label="Loading chart" className="p-4" style={{ height: chartHeight }}>
      <div className="h-full rounded-md bg-surface-subtle motion-safe:animate-pulse" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <FullscreenDialogContent title={`Chart viewer: ${currentSymbol || ''}`} keyboardOwned>
        <ChartViewerHeader
          symbol={currentSymbol}
          symbolsLoading={isLoading}
          groupRank={stockData?.ibd_industry_group ? { show: true, value: groupRank, loading: false } : null}
          adr={adrValue}
          epsRating={epsRating}
          stockData={stockData}
          index={currentIndex}
          total={totalCount}
          onClose={onClose}
          actions={<Badge>Static</Badge>}
        />

        {/* On mobile the chart sits above the metrics: it is the second
            child, so column-reverse puts it on top without reordering the DOM,
            and its wrapper does not flex so the canvas keeps its width. */}
        <div className="flex min-h-0 flex-1 flex-col-reverse overflow-x-hidden overflow-y-auto md:flex-row md:overflow-y-hidden">
          <StockMetricsSidebar
            stockData={stockData}
            fundamentals={fundamentals}
            width={{ xs: '100%', md: 450 }}
            height={{ xs: 'auto', md: '100%' }}
          />

          <div className="flex-none overflow-hidden bg-surface md:min-w-0 md:flex-1">
            {isError ? (
              <div className="flex items-center justify-center p-6" style={{ height: chartHeight }}>
                <Notice tone="error">Failed to load the static chart payload.</Notice>
              </div>
            ) : isLoading ? (
              chartPlaceholder
            ) : currentSymbol ? (
              <CandlestickChart
                symbol={currentSymbol}
                period="6mo"
                height={chartHeight}
                visibleRange={visibleRange}
                onVisibleRangeChange={setVisibleRange}
                priceData={chartPayload?.bars || []}
                rsLineData={chartPayload?.rs_line || null}
                blueDots={chartPayload?.blue_dots || null}
                dataUpdatedAtOverride={dataUpdatedAtOverride}
              />
            ) : (
              chartPlaceholder
            )}
          </div>
        </div>

        <ChartViewerKeyHints hints={['Space: Next Stock', 'Shift+Space: Previous', 'Esc: Close']} />
      </FullscreenDialogContent>
    </Dialog>
  );
}

export default StaticChartViewerModal;
