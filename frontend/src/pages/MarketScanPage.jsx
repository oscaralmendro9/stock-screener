/**
 * Home: the daily market snapshot. Key Markets (an external chart widget
 * repeating the snapshot's cards) and the Stockbee frame are retired here;
 * COT moved under Futures, Watchlists to their own section, Themes under
 * Groups. Social Signals, when enabled, still sits beside the snapshot as a
 * vertical tab rail on desktop and a scrollable tab row on phones.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import DailyMarketSnapshotTab from '../components/MarketScan/DailyMarketSnapshotTab';
import { useRuntime } from '../contexts/RuntimeContext';
import { useIsMobileShell } from '../components/Layout/shellNav';

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
  const subTabs = useMemo(() => ([
    { id: 'daily_snapshot', label: 'Daily Snapshot', render: () => (
      <DailyMarketSnapshotTab showSocialSignals={features.social_signals}
        onOpenSocialSignals={() => setSelectedTab(1)} />
    ) },
    ...(features.social_signals
      ? [{ id: 'social_signals', label: 'Social Signals', render: () => renderLazyTab(SocialSignalsTab) }]
      : []),
  ]), [features.social_signals]);

  useEffect(() => {
    if (selectedTab >= subTabs.length) {
      setSelectedTab(0);
    }
  }, [selectedTab, subTabs.length]);

  // Tab content fills a fixed-height pane (the snapshot scrolls inside it).
  // Phones also lose the bottom bar the layout pads for.
  const paneHeight = isMobile
    ? 'h-[calc(100dvh-70px-64px-env(safe-area-inset-bottom))]'
    : 'h-[calc(100dvh-70px)]';

  if (subTabs.length === 1) {
    return <div className={cn('tw', paneHeight)}>{subTabs[0].render()}</div>;
  }

  const active = subTabs[selectedTab] ?? subTabs[0];

  return (
    <Tabs
      value={active.id}
      onValueChange={(id) => setSelectedTab(subTabs.findIndex((tab) => tab.id === id))}
      orientation={isMobile ? 'horizontal' : 'vertical'}
      className={cn('tw flex gap-2', paneHeight, isMobile && 'flex-col')}
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
