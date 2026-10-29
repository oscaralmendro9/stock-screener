/**
 * Market Scan page: sub-views as a vertical tab rail on desktop and a
 * scrollable tab row on phones, so content keeps the full phone width.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import DailyMarketSnapshotTab from '../components/MarketScan/DailyMarketSnapshotTab';
import { useRuntime } from '../contexts/RuntimeContext';
import { useIsMobileShell } from '../components/Layout/shellNav';

const KeyMarketsTab = lazy(() => import('../components/MarketScan/KeyMarketsTab'));
const CotPositioningTab = lazy(() => import('../features/cot/CotPositioningTab'));
const ThemesTab = lazy(() => import('../components/MarketScan/ThemesTab'));
const WatchlistsTab = lazy(() => import('../components/MarketScan/WatchlistsTab'));
const StockbeeMmTab = lazy(() => import('../components/MarketScan/StockbeeMmTab'));
const SocialSignalsTab = lazy(() => import('../features/socialSignals/SocialSignalsTab'));

function LazyTabFallback() {
  return (
    <div role="status" aria-label="Loading" className="grid h-full place-items-center">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none" />
    </div>
  );
}

function renderLazyTab(TabComponent) {
  return (
    <Suspense fallback={<LazyTabFallback />}>
      <TabComponent />
    </Suspense>
  );
}

function MarketScanPage() {
  const { features } = useRuntime();
  const isMobile = useIsMobileShell();
  const [selectedTab, setSelectedTab] = useState(0);
  // Daily Snapshot first: it renders from one cached payload, while Key
  // Markets mounts the TradingView widget (~180 external requests) — only
  // pay that cost when the user opens that tab.
  const subTabs = useMemo(() => ([
    { id: 'daily_snapshot', label: 'Daily Snapshot', render: () => (
      <DailyMarketSnapshotTab showSocialSignals={features.social_signals}
        onOpenSocialSignals={() => setSelectedTab(1)} />
    ) },
    ...(features.social_signals
      ? [{ id: 'social_signals', label: 'Social Signals', render: () => renderLazyTab(SocialSignalsTab) }]
      : []),
    { id: 'key_markets', label: 'Key Markets', render: () => renderLazyTab(KeyMarketsTab) },
    { id: 'cot_positioning', label: 'COT Positioning', render: () => renderLazyTab(CotPositioningTab) },
    ...(features.themes
      ? [{ id: 'themes', label: 'Themes', render: () => renderLazyTab(ThemesTab) }]
      : []),
    { id: 'watchlists', label: 'Watchlists', render: () => renderLazyTab(WatchlistsTab) },
    { id: 'stockbee_mm', label: 'Stockbee MM', render: () => renderLazyTab(StockbeeMmTab) },
  ]), [features.social_signals, features.themes]);

  useEffect(() => {
    if (selectedTab >= subTabs.length) {
      setSelectedTab(0);
    }
  }, [selectedTab, subTabs.length]);

  const active = subTabs[selectedTab] ?? subTabs[0];

  return (
    <Tabs
      value={active.id}
      onValueChange={(id) => setSelectedTab(subTabs.findIndex((tab) => tab.id === id))}
      orientation={isMobile ? 'horizontal' : 'vertical'}
      className={cn(
        'tw flex gap-2',
        // Tab content fills a fixed-height pane (charts and the Stockbee frame
        // size to it). Phones also lose the bottom bar the layout pads for.
        isMobile
          ? 'h-[calc(100dvh-70px-64px-env(safe-area-inset-bottom))] flex-col'
          : 'h-[calc(100dvh-70px)]',
      )}
    >
      <TabsList
        aria-label="Market views"
        className={cn(
          'shrink-0 rounded-lg border border-border',
          isMobile
            ? '-mx-1 w-auto justify-start overflow-x-auto'
            : 'w-40 flex-col items-stretch justify-start self-start',
        )}
      >
        {subTabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn('shrink-0 whitespace-nowrap', !isMobile && 'justify-start')}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={active.id} className="min-h-0 min-w-0 flex-1 overflow-hidden outline-none">
        {active.render()}
      </TabsContent>
    </Tabs>
  );
}

export default MarketScanPage;
