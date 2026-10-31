/**
 * Watchlist Chart Modal
 *
 * Full-screen modal for viewing stock charts from watchlists with keyboard navigation.
 * Simplified version of ChartViewerModal that takes a symbols array directly.
 *
 * Performance optimized: Uses consolidated /chart-data endpoint that prioritizes
 * data from recent scans (fast DB lookup) over computing data (slow API calls).
 */
import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPriceHistory, priceHistoryKeys } from '../../api/priceHistory';
import { getChartData, getStockFundamentals } from '../../api/stocks';
import { getGroupDetail } from '../../api/groups';
import { useChartNavigation } from '../../hooks/useChartNavigation';
import CandlestickChart from '../Charts/CandlestickChart';
import StockMetricsSidebar from '../Scan/StockMetricsSidebar';
import PeerComparisonModal from '../Scan/PeerComparisonModal';
import AddToWatchlistMenu from '../common/AddToWatchlistMenu';
import { Button } from '@/ui/button';
import { Dialog, FullscreenDialogContent } from '@/ui/dialog';
import { ChartViewerHeader, ChartViewerKeyHints } from '../Scan/ChartViewerChrome';

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
 * Full-screen modal for viewing watchlist stock charts with keyboard navigation
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.initialSymbol - Symbol to start with
 * @param {Array<string>} props.symbols - Array of symbols to navigate through
 */
function WatchlistChartModal({ open, onClose, initialSymbol, symbols = [] }) {
  const queryClient = useQueryClient();
  const [visibleRange, setVisibleRange] = useState(null); // Persist zoom across symbol navigation
  const [peerModalOpen, setPeerModalOpen] = useState(false);

  // Use navigation hook
  const { currentIndex, currentSymbol, totalCount, goNext, goPrevious } = useChartNavigation(
    symbols,
    initialSymbol,
    open
  );

  // Fetch consolidated chart data (RS, industry, VCP, growth metrics, etc.)
  // This endpoint prioritizes scan_results lookup (fast) over computation (slow)
  const { data: chartData, isLoading: isChartDataLoading } = useQuery({
    queryKey: ['chartData', currentSymbol],
    queryFn: () => getChartData(currentSymbol),
    enabled: open && !!currentSymbol,
    staleTime: 300000, // 5 minutes
    retry: 2,
  });

  // Fetch fundamentals for sidebar (description, additional metrics)
  const { data: fundamentals } = useQuery({
    queryKey: ['fundamentals', currentSymbol],
    queryFn: () => getStockFundamentals(currentSymbol),
    enabled: open && !!currentSymbol,
    staleTime: 300000,
  });

  // Get industry group from chart data (no waterfall dependency)
  const industryGroup = chartData?.ibd_industry_group;
  const groupMarket = chartData?.market || inferMarketFromSymbol(currentSymbol);
  const marketThemes = chartData?.market_themes || [];

  // Fetch group ranking - only if not already in chartData
  // When source is "scan_results", ibd_group_rank is included
  const needsGroupRankFetch = chartData && !chartData.ibd_group_rank && industryGroup;
  const {
    data: groupRankData,
    isLoading: isGroupRankLoading,
  } = useQuery({
    queryKey: ['groupRank', groupMarket, industryGroup],
    queryFn: () => getGroupDetail(industryGroup, 1, groupMarket),
    enabled: open && !!needsGroupRankFetch,
    staleTime: 300000,
    retry: false,
  });

  // Use chartData directly as stockData (already in correct format)
  const stockData = chartData;

  // Handle keyboard events
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      // Keys belong to the peer dialog while it is open on top.
      if (peerModalOpen) return;

      // Escape to close
      if (e.key === 'Escape') {
        onClose();
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
  }, [open, goNext, goPrevious, onClose, peerModalOpen]);

  // Prefetch adjacent stocks for smooth navigation with staggered timing
  useEffect(() => {
    if (!open || !currentSymbol || !symbols || symbols.length === 0) return;

    const prefetchSymbol = (symbol) => {
      // Prefetch price history
      queryClient.prefetchQuery({
        queryKey: priceHistoryKeys.symbol(symbol, '6mo'),
        queryFn: () => fetchPriceHistory(symbol, '6mo'),
      });
      // Prefetch chart data (consolidated endpoint)
      queryClient.prefetchQuery({
        queryKey: ['chartData', symbol],
        queryFn: () => getChartData(symbol),
        staleTime: 300000,
      });
      // Prefetch fundamentals
      queryClient.prefetchQuery({
        queryKey: ['fundamentals', symbol],
        queryFn: () => getStockFundamentals(symbol),
        staleTime: 300000,
      });
    };

    // Clear any pending timeouts from previous renders
    const timeouts = [];

    // Get next 5 and previous 5 stocks
    const nextSymbols = symbols.slice(currentIndex + 1, currentIndex + 6);
    const prevSymbols = symbols.slice(Math.max(0, currentIndex - 5), currentIndex).reverse();

    // High priority: Immediate next/prev (fetch now)
    if (nextSymbols[0]) prefetchSymbol(nextSymbols[0]);
    if (prevSymbols[0]) prefetchSymbol(prevSymbols[0]);

    // Medium priority: Next 2-5 stocks (staggered 100ms apart)
    nextSymbols.slice(1).forEach((symbol, idx) => {
      const timeout = setTimeout(() => prefetchSymbol(symbol), (idx + 1) * 100);
      timeouts.push(timeout);
    });

    // Low priority: Previous 2-5 stocks (staggered after next, starting at 500ms)
    prevSymbols.slice(1).forEach((symbol, idx) => {
      const timeout = setTimeout(() => prefetchSymbol(symbol), 500 + (idx + 1) * 100);
      timeouts.push(timeout);
    });

    // Cleanup timeouts on unmount or dependency change
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [open, currentSymbol, currentIndex, symbols, queryClient]);

  // Header (~60px) and the key-hint strip (~44px) sit above and below the chart.
  const chartHeight = window.innerHeight - 104;
  const groupRank = chartData?.ibd_group_rank ?? groupRankData?.current_rank;

  return (
  <>
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <FullscreenDialogContent title={`Watchlist chart: ${currentSymbol || ''}`} keyboardOwned>
        <ChartViewerHeader
          symbol={currentSymbol}
          groupRank={industryGroup ? {
            show: true,
            value: groupRank,
            loading: isChartDataLoading || Boolean(needsGroupRankFetch && isGroupRankLoading),
          } : null}
          adr={stockData?.adr_percent ?? null}
          epsRating={stockData?.eps_rating ?? null}
          stockData={stockData}
          themes={marketThemes}
          index={currentIndex}
          total={totalCount}
          onClose={onClose}
          actions={(
            <>
              {currentSymbol && <AddToWatchlistMenu symbols={currentSymbol} size="medium" />}
              {currentSymbol && stockData?.ibd_industry_group && (
                <Button variant="secondary" size="sm" onClick={() => setPeerModalOpen(true)}>
                  <Users aria-hidden="true" />
                  View Peers
                </Button>
              )}
            </>
          )}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <StockMetricsSidebar stockData={stockData} fundamentals={fundamentals} />
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

        <ChartViewerKeyHints hints={['Space: Next Stock', 'Shift+Space: Previous', 'Esc: Close']} />
      </FullscreenDialogContent>
    </Dialog>

    {/* Peer Comparison Modal */}
    <PeerComparisonModal
      open={peerModalOpen}
      onClose={() => setPeerModalOpen(false)}
      symbol={currentSymbol}
      onOpenChart={() => setPeerModalOpen(false)}
    />
  </>
  );
}

export default WatchlistChartModal;
