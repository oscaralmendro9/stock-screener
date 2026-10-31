import { useEffect, useMemo, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllFilteredSymbols,
  getSetupDetails,
  getSingleResult,
  queryScanSymbols,
} from '../../api/scans';
import { prefetchPriceHistoryBatch } from '../../api/priceHistory';
import { getStockFundamentals, prefetchFundamentalsBatch } from '../../api/stocks';
import { getGroupDetail } from '../../api/groups';
import { useChartNavigation } from '../../hooks/useChartNavigation';
import { buildFilterParams, getStableFilterKey } from '../../utils/filterUtils';
import CandlestickChart from '../Charts/CandlestickChart';
import StockMetricsSidebar from './StockMetricsSidebar';
import PeerComparisonModal from './PeerComparisonModal';
import SetupEngineDrawer from './SetupEngineDrawer';
import AddToWatchlistMenu from '../common/AddToWatchlistMenu';
import { Button } from '@/ui/button';
import { Dialog, FullscreenDialogContent } from '@/ui/dialog';
import { ChartViewerHeader, ChartViewerKeyHints } from './ChartViewerChrome';
import {
  buildScanQueryRequest,
  stableExpressionKey,
} from '../../features/scan/filterExpressionModel';

const inferMarketFromSymbol = (symbol) => {
  const normalized = String(symbol || '').toUpperCase();
  if (normalized.endsWith('.HK')) return 'HK';
  if (normalized.endsWith('.NS') || normalized.endsWith('.BO')) return 'IN';
  if (normalized.endsWith('.T')) return 'JP';
  if (normalized.endsWith('.KS') || normalized.endsWith('.KQ')) return 'KR';
  if (normalized.endsWith('.TW') || normalized.endsWith('.TWO')) return 'TW';
  if (normalized.endsWith('.SS') || normalized.endsWith('.SZ') || normalized.endsWith('.BJ')) return 'CN';
  if (normalized.endsWith('.DE') || normalized.endsWith('.F')) return 'DE';
  return 'US';
};

/**
 * Full-screen modal for viewing stock charts with keyboard navigation
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.initialSymbol - Symbol to start with
 * @param {string} props.scanId - Scan ID for fetching results
 * @param {Object} props.filters - Current filter state object (from ScanPage)
 * @param {Object|null} props.expression - Exact applied grouped expression
 * @param {string} props.sortBy - Current sort field
 * @param {string} props.sortOrder - Current sort order
 * @param {Array<string>} props.navigationSymbolsOverride - Explicit navigation set
 * @param {Array} props.currentPageResults - Results from current page (for quick lookup)
 */
function ChartViewerModal({
  open,
  onClose,
  initialSymbol,
  scanId,
  filters = {},
  expression = null,
  sortBy = 'composite_score',
  sortOrder = 'desc',
  navigationSymbolsOverride = null,
  currentPageResults = [],
}) {
  const queryClient = useQueryClient();
  const [peerModalOpen, setPeerModalOpen] = useState(false);
  const [setupDrawerOpen, setSetupDrawerOpen] = useState(false);
  const [visibleRange, setVisibleRange] = useState(null); // Persist zoom across symbol navigation

  // Build API params from filter state
  const filterParams = useMemo(
    () => buildFilterParams(filters, { sortBy, sortOrder }),
    [filters, sortBy, sortOrder]
  );

  // Generate stable cache key for filters
  const filterCacheKey = useMemo(() => getStableFilterKey(filters), [filters]);
  const expressionCacheKey = useMemo(
    () => (expression ? stableExpressionKey(expression) : null),
    [expression],
  );
  const symbolQueryRequest = useMemo(
    () => (expression ? buildScanQueryRequest(expression, { sortBy, sortOrder }) : null),
    [expression, sortBy, sortOrder],
  );

  // Invalidate cached symbol list when sort changes so navigation always
  // reflects the current table order — even if the modal is currently closed.
  const prevSortRef = useRef({ sortBy, sortOrder });
  useEffect(() => {
    const prev = prevSortRef.current;
    if (prev.sortBy !== sortBy || prev.sortOrder !== sortOrder) {
      queryClient.removeQueries({ queryKey: ['allFilteredSymbols'] });
      prevSortRef.current = { sortBy, sortOrder };
    }
  }, [sortBy, sortOrder, queryClient]);

  // Fetch all filtered symbols for navigation (sort-aware)
  const { data: allSymbols, isLoading: symbolsLoading } = useQuery({
    queryKey: [
      'allFilteredSymbols',
      scanId,
      expressionCacheKey ?? filterCacheKey,
      sortBy,
      sortOrder,
    ],
    queryFn: async ({ signal }) => {
      if (symbolQueryRequest) {
        const response = await queryScanSymbols(scanId, symbolQueryRequest, { signal });
        return response.symbols;
      }
      return getAllFilteredSymbols(scanId, filterParams);
    },
    enabled: open && !!scanId && !Array.isArray(navigationSymbolsOverride),
    staleTime: 5000, // 5 seconds — short enough to catch mid-session sort changes
    refetchOnMount: 'always', // Always refetch when modal opens to pick up sort changes
  });

  const currentPageSymbols = useMemo(() => {
    if (!Array.isArray(currentPageResults) || currentPageResults.length === 0) return [];
    const seen = new Set();
    const symbols = [];
    currentPageResults.forEach((row) => {
      if (row?.symbol && !seen.has(row.symbol)) {
        seen.add(row.symbol);
        symbols.push(row.symbol);
      }
    });
    return symbols;
  }, [currentPageResults]);

  // Make navigation immediately usable from the current page, then
  // upgrade to the full filtered symbol list when hydration finishes.
  const navigationSymbols = useMemo(() => {
    if (Array.isArray(navigationSymbolsOverride)) {
      return navigationSymbolsOverride;
    }
    if (Array.isArray(allSymbols) && allSymbols.length > 0) {
      return allSymbols;
    }
    return currentPageSymbols;
  }, [allSymbols, currentPageSymbols, navigationSymbolsOverride]);

  // Use navigation hook
  const { currentIndex, currentSymbol, totalCount, goNext, goPrevious, goToIndex } = useChartNavigation(
    navigationSymbols,
    initialSymbol,
    open
  );

  // Navigate to a specific symbol
  const handleNavigateToSymbol = (symbol) => {
    if (!navigationSymbols) return;
    const index = navigationSymbols.indexOf(symbol);
    if (index >= 0) {
      goToIndex(index);
    }
  };

  // Get stock data for current symbol
  const stockData = useMemo(() => {
    if (!currentSymbol || !currentPageResults) return null;
    return currentPageResults.find((r) => r.symbol === currentSymbol);
  }, [currentSymbol, currentPageResults]);

  // Fetch stock result if not in current page (using optimized single-stock endpoint)
  const { data: fetchedStockData } = useQuery({
    queryKey: ['stockResult', scanId, currentSymbol],
    queryFn: () => getSingleResult(scanId, currentSymbol),
    enabled: open && !!scanId && !!currentSymbol && !stockData,
    staleTime: 300000, // 5 minutes
  });

  const finalStockData = stockData || fetchedStockData;
  const hasInlineSetupPayload =
    finalStockData?.se_explain != null ||
    finalStockData?.se_candidates != null;

  // Lazy-load heavy setup explain payload only when the drawer opens.
  const { data: setupDetails, isLoading: setupDetailsLoading } = useQuery({
    queryKey: ['setupDetails', scanId, currentSymbol],
    queryFn: async () => {
      try {
        return await getSetupDetails(scanId, currentSymbol);
      } catch (error) {
        // Non-setup scans may legitimately return 404 from setup endpoint.
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: open && setupDrawerOpen && !!scanId && !!currentSymbol && !hasInlineSetupPayload,
    staleTime: 300000,
    retry: false,
  });

  const drawerStockData = useMemo(() => {
    if (!finalStockData) return finalStockData;
    if (!setupDetails) return finalStockData;
    return {
      ...finalStockData,
      se_explain: setupDetails.se_explain ?? null,
      se_candidates: setupDetails.se_candidates ?? null,
    };
  }, [finalStockData, setupDetails]);

  // Fetch fundamentals for current symbol
  const { data: fundamentals } = useQuery({
    queryKey: ['fundamentals', currentSymbol],
    queryFn: () => getStockFundamentals(currentSymbol),
    enabled: open && !!currentSymbol,
    staleTime: 300000, // 5 minutes (data is cached 7 days server-side)
  });

  // Fetch group ranking for current stock's industry group
  const industryGroup = finalStockData?.ibd_industry_group;
  const groupMarket = finalStockData?.market || inferMarketFromSymbol(currentSymbol);
  const marketThemes = finalStockData?.market_themes || [];
  const adrValue = finalStockData?.adr_percent ?? fundamentals?.adr_percent ?? null;
  const {
    data: groupRankData,
    isLoading: isGroupRankLoading,
  } = useQuery({
    queryKey: ['groupRank', groupMarket, industryGroup],
    queryFn: () => getGroupDetail(industryGroup, 1, groupMarket),
    enabled: open && !!industryGroup,
    staleTime: 300000, // 5 minutes
    retry: false,
  });

  // Handle keyboard events
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (peerModalOpen) return;

      // Escape: close drawer first, then modal (always active, even in inputs)
      if (e.key === 'Escape') {
        if (setupDrawerOpen) {
          setSetupDrawerOpen(false);
          return;
        }
        onClose();
        return;
      }

      // Skip navigation shortcuts when user is typing in an input/textarea
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // D to toggle setup drawer
      if (e.key === 'd' || e.key === 'D') {
        setSetupDrawerOpen((prev) => !prev);
        return;
      }

      // Space to navigate
      if (e.key === ' ') {
        e.preventDefault();
        if (e.shiftKey) {
          goPrevious();
        } else {
          goNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goNext, goPrevious, onClose, setupDrawerOpen, peerModalOpen]);

  // Reset setup drawer when symbol changes
  useEffect(() => {
    setSetupDrawerOpen(false);
  }, [currentSymbol]);

  // Prefetch adjacent stocks (next 5 / prev 5) for smooth navigation.
  // Price history and fundamentals each fetch in a single batch; the
  // remaining per-symbol calls are the lean single-row scan result and the
  // group rank (derivable up front from current-page rows, and shared across
  // symbols in the same group).
  useEffect(() => {
    if (!open || !currentSymbol || !navigationSymbols) return;

    const nextSymbols = navigationSymbols.slice(currentIndex + 1, currentIndex + 6);
    const prevSymbols = navigationSymbols.slice(Math.max(0, currentIndex - 5), currentIndex);
    const adjacent = [...nextSymbols, ...prevSymbols].filter(Boolean);
    if (adjacent.length === 0) return;

    prefetchPriceHistoryBatch(queryClient, adjacent, '6mo');
    prefetchFundamentalsBatch(queryClient, adjacent);

    if (scanId) {
      adjacent.forEach((symbol) => {
        queryClient.prefetchQuery({
          queryKey: ['stockResult', scanId, symbol],
          queryFn: () => getSingleResult(scanId, symbol),
          staleTime: 300000,
        });
      });
    }

    // Adjacent symbols on the current page expose their industry group, so
    // their group-rank lookups (the chart header's slowest dependent fetch)
    // can warm before the user lands on them.
    const adjacentGroups = new Map();
    (currentPageResults || []).forEach((row) => {
      if (row?.symbol && row?.ibd_industry_group && adjacent.includes(row.symbol)) {
        const market = row.market || inferMarketFromSymbol(row.symbol);
        adjacentGroups.set(`${market}:${row.ibd_industry_group}`, {
          market,
          group: row.ibd_industry_group,
        });
      }
    });
    adjacentGroups.forEach(({ market, group }) => {
      queryClient.prefetchQuery({
        queryKey: ['groupRank', market, group],
        queryFn: () => getGroupDetail(group, 1, market),
        staleTime: 300000,
        retry: false,
      });
    });
  }, [open, currentSymbol, currentIndex, navigationSymbols, queryClient, scanId, currentPageResults]);

  // Header (~60px) and the key-hint strip (~44px) sit above and below the chart.
  const chartHeight = window.innerHeight - 104;
  const epsRating = finalStockData?.eps_rating ?? fundamentals?.eps_rating ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
        <FullscreenDialogContent title={`Chart viewer: ${currentSymbol || ''}`} keyboardOwned>
          <ChartViewerHeader
            symbol={currentSymbol}
            symbolsLoading={symbolsLoading}
            groupRank={industryGroup ? { show: true, value: groupRankData?.current_rank, loading: isGroupRankLoading } : null}
            adr={adrValue}
            epsRating={epsRating}
            stockData={finalStockData}
            themes={marketThemes}
            index={currentIndex}
            total={totalCount}
            onClose={onClose}
            actions={(
              <>
                {currentSymbol && <AddToWatchlistMenu symbols={currentSymbol} size="medium" />}
                {currentSymbol && finalStockData?.ibd_industry_group && (
                  <Button variant="secondary" size="sm" onClick={() => setPeerModalOpen(true)}>
                    <Users aria-hidden="true" />
                    View Peers
                  </Button>
                )}
              </>
            )}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <StockMetricsSidebar
              stockData={finalStockData}
              fundamentals={fundamentals}
              onViewPeers={() => setPeerModalOpen(true)}
              onViewSetupDetails={() => setSetupDrawerOpen(true)}
            />
            <div className="min-w-0 flex-1 overflow-hidden bg-surface">
              {currentSymbol ? (
                <CandlestickChart
                  symbol={currentSymbol}
                  period="6mo"
                  height={chartHeight}
                  visibleRange={visibleRange}
                  onVisibleRangeChange={setVisibleRange}
                />
              ) : (
                <div aria-busy="true" aria-label="Loading chart" className="h-full p-4">
                  <div className="h-full rounded-md bg-surface-subtle motion-safe:animate-pulse" />
                </div>
              )}
            </div>
          </div>

          <ChartViewerKeyHints
            hints={[
              'Space: Next Stock',
              'Shift+Space: Previous',
              ...(currentSymbol ? ['D: Setup Details'] : []),
              'Esc: Close',
            ]}
          />
        </FullscreenDialogContent>
      </Dialog>

      {/* Peer Comparison Modal */}
      <PeerComparisonModal
        open={peerModalOpen}
        onClose={() => setPeerModalOpen(false)}
        scanId={scanId}
        symbol={currentSymbol}
        onOpenChart={(sym) => {
          setPeerModalOpen(false);
          handleNavigateToSymbol(sym);
        }}
      />

      {/* Setup Engine Drawer */}
      <SetupEngineDrawer
        open={setupDrawerOpen}
        onClose={() => setSetupDrawerOpen(false)}
        stockData={drawerStockData}
        isLoading={setupDetailsLoading}
      />
    </>
  );
}

export default ChartViewerModal;
