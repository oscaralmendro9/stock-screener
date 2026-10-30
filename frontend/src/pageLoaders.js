// One loader per page, shared by the router's lazy() and the prefetchers, so
// a page whose code was fetched early is the module the router renders.
export const loadMarketScanPage = () => import('./pages/MarketScanPage');
export const loadScanPage = () => import('./pages/ScanPage');
export const loadStockDetails = () => import('./components/Stock/StockDetails');
export const loadBreadthPage = () => import('./pages/BreadthPage');
export const loadGroupRankingsPage = () => import('./pages/GroupRankingsPage');
export const loadValidationPage = () => import('./pages/ValidationPage');
export const loadThemesPage = () => import('./pages/ThemesPage');
export const loadChatbotPage = () => import('./pages/ChatbotPage');
export const loadOperationsPage = () => import('./pages/OperationsPage');
export const loadOptionsPage = () => import('./pages/OptionsPage');
export const loadOptionsSymbolPage = () => import('./pages/OptionsSymbolPage');
export const loadFuturesPage = () => import('./pages/FuturesPage');
export const loadFuturesDetailPage = () => import('./pages/FuturesDetailPage');
export const loadOptionsChainPage = () => import('./pages/OptionsChainPage');
export const loadWatchlistsPage = () => import('./pages/WatchlistsPage');
export const loadCotPage = () => import('./pages/CotPage');

const PATH_LOADERS = {
  '/': loadMarketScanPage,
  '/scan': loadScanPage,
  '/breadth': loadBreadthPage,
  '/groups': loadGroupRankingsPage,
  '/validation': loadValidationPage,
  '/themes': loadThemesPage,
  '/chatbot': loadChatbotPage,
  '/operations': loadOperationsPage,
  '/options': loadOptionsPage,
  '/futures': loadFuturesPage,
  '/watchlists': loadWatchlistsPage,
  '/cot': loadCotPage,
};

export function loaderForPath(pathname) {
  // Match as the router does: case-insensitive, trailing slash ignored.
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (path.startsWith('/stocks/')) return loadStockDetails;
  if (path.startsWith('/options/')) return loadOptionsSymbolPage;
  if (path.startsWith('/futures/')) return loadFuturesDetailPage;
  if (path.startsWith('/chain/')) return loadOptionsChainPage;
  return PATH_LOADERS[path] ?? null;
}
