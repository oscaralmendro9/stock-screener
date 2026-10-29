import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CandlestickChart, Lock } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { GithubMark } from '@/ui/icons';
import {
  BrandMark,
  ColorModeButton,
  ColorModeListItem,
  DesktopNav,
  MobileBottomNav,
  SheetItem,
} from '../components/Layout/AppNav';
import { MarketSelectField } from '../components/Layout/MarketSelector';
import { CORE_NAV_ITEMS, SAFE_GUTTER_CLASSES, useIsMobileShell } from '../components/Layout/shellNav';
import { useStaticMarket } from './StaticMarketContext';
import {
  getStaticSupportedMarkets,
  getStaticUnavailableMarkets,
  resolveStaticMarketEntry,
  useStaticManifest,
} from './dataClient';
import { useStaticGenerationLifecycle } from './useStaticGenerationLifecycle';
import { REPO_URL, SITE_NAME, SITE_TITLE } from './siteMeta';
import { marketFlag } from '../utils/marketFlags';
import { isStaticOptionsAvailable } from '../features/options/optionsAvailability';

// Late once the publish says so, or once its deadline passes with nothing new
// published: a stalled pipeline must not leave a market "current" (#503).
const publicationStatus = (publication, now) => {
  if (!publication) return null;
  const session = publication.session_date;
  if (publication.state === 'unknown' || !session) return { label: 'Status unknown', tone: 'neutral' };
  const deadline = publication.late_after ? Date.parse(publication.late_after) : NaN;
  if (publication.state === 'stale') return { label: `Late · ${session}`, tone: 'warning' };
  // No deadline means nothing could turn this late: unknown, never Current forever.
  if (!Number.isFinite(deadline)) return { label: 'Status unknown', tone: 'neutral' };
  if (now > deadline) return { label: `Late · ${session}`, tone: 'warning' };
  return { label: `Current · ${session}`, tone: 'neutral' };
};

const useMinuteClock = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
};

function StaticLayout({ children }) {
  const isMobile = useIsMobileShell();
  const manifestQuery = useStaticManifest();
  const { expired } = useStaticGenerationLifecycle();
  const supportedMarkets = getStaticSupportedMarkets(manifestQuery.data);
  const { selectedMarket, setSelectedMarket } = useStaticMarket();
  const marketEntry = resolveStaticMarketEntry(manifestQuery.data, selectedMarket);
  const selectedUnavailable = getStaticUnavailableMarkets(manifestQuery.data).includes(selectedMarket);
  const now = useMinuteClock();
  const status = selectedUnavailable ? null : publicationStatus(marketEntry.publication, now);
  const allNavItems = [...CORE_NAV_ITEMS, { path: '/options', label: 'Options', matchPrefix: true, icon: <CandlestickChart aria-hidden="true" /> }];
  const navItems = isStaticOptionsAvailable(marketEntry) ? allNavItems : CORE_NAV_ITEMS;
  const { pathname } = useLocation();
  // Title from every route: /options still renders (an unavailable notice) when its nav item is hidden.
  const pageLabel = allNavItems.find((item) => (
    item.matchPrefix ? pathname.startsWith(item.path) : pathname === item.path
  ))?.label;
  const titleMarket = selectedUnavailable ? selectedMarket : marketEntry.market;
  useEffect(() => {
    // The landing page is the only URL search engines see (hash routes), so it keeps the descriptive title.
    document.title = pathname === '/'
      ? SITE_TITLE
      : [pageLabel, titleMarket, SITE_NAME].filter(Boolean).join(' · ');
  }, [pathname, pageLabel, titleMarket]);

  const selectValue = selectedUnavailable ? selectedMarket : marketEntry.market;
  const marketName = (market) => manifestQuery.data?.markets?.[market]?.display_name || market;
  const withFlag = (market, text) => {
    const flag = marketFlag(market);
    return flag ? `${flag}  ${text}` : text;
  };
  const marketOptions = [
    ...supportedMarkets.map((market) => ({ value: market, label: withFlag(market, marketName(market)) })),
    ...getStaticUnavailableMarkets(manifestQuery.data).map((market) => ({
      value: market,
      label: withFlag(market, `${market} — unavailable`),
      disabled: true,
    })),
  ];
  // Phones show flag + code ("🇭🇰 HK") so the status badge still fits at 360px.
  const selectDisplay = isMobile || selectedUnavailable
    ? `${marketFlag(selectValue)} ${selectedUnavailable ? `${selectValue} — unavailable` : selectValue}`.trim()
    : withFlag(selectValue, marketName(selectValue)).replace('  ', ' ');

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="tw border-b border-border bg-surface">
        <div className={cn('flex min-h-13 items-center gap-2 overflow-x-auto md:gap-3 [&>*]:shrink-0', SAFE_GUTTER_CLASSES)}>
          <BrandMark label={isMobile ? null : SITE_NAME} />
          {isMobile ? (
            <Lock role="img" aria-label="Read-only" className="size-[18px] text-muted-foreground" />
          ) : (
            <Badge className="border border-border bg-transparent">Read-only</Badge>
          )}
          <MarketSelectField
            label="Static market selector"
            value={selectValue}
            onChange={setSelectedMarket}
            options={marketOptions}
            display={selectDisplay}
            className="md:min-w-36"
          />
          {status && (
            <Badge
              tone={status.tone}
              role="status"
              aria-label={`${marketEntry.market} data status: ${status.label}`}
              className="border border-border"
            >
              {status.label}
            </Badge>
          )}
          {!isMobile && (
            <>
              <div className="flex-1" />
              <DesktopNav items={navItems} />
              <Button asChild variant="secondary" size="sm">
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Star on GitHub (opens in a new tab)"
                >
                  <GithubMark aria-hidden="true" />
                  {/* Icon-only until lg: the bar already scrolls sideways around 900-1200px. */}
                  <span className="hidden lg:inline">Star on GitHub</span>
                </a>
              </Button>
              <ColorModeButton />
            </>
          )}
        </div>
      </header>

      <main
        className={cn(
          'mx-auto my-3 w-full max-w-[1536px] flex-1',
          SAFE_GUTTER_CLASSES,
          isMobile && 'pb-[calc(64px+env(safe-area-inset-bottom))]',
        )}
      >
        {expired && (
          <div role="alert" className="tw mb-3 flex flex-wrap items-center gap-3 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-pretty">
            <p className="min-w-0 flex-1">
              Some data could not be loaded, most likely because newer data has been published. Reload to get the latest.
            </p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Reload</Button>
          </div>
        )}
        {selectedUnavailable ? (
          <div role="alert" className="tw flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-pretty">
            <p className="min-w-0 flex-1">
              {selectedMarket} data is not available in this publish. Retry, or choose another market above.
            </p>
            <Button variant="secondary" size="sm" onClick={() => manifestQuery.refetch()}>Retry</Button>
          </div>
        ) : children}
      </main>

      {isMobile && (
        <MobileBottomNav
          items={navItems}
          extras={(close) => (
            <>
              <SheetItem
                icon={<Lock aria-hidden="true" />}
                label="Read-only"
                description="A published daily snapshot; nothing here can be changed."
              />
              <SheetItem
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Star on GitHub (opens in a new tab)"
                onClick={close}
                icon={<GithubMark aria-hidden="true" />}
                label="Star on GitHub"
                description="Open source. Self-host it for live scans."
              />
              <ColorModeListItem onDone={close} />
            </>
          )}
        />
      )}
    </div>
  );
}

export default StaticLayout;
