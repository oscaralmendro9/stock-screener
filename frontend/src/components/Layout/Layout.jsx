import { lazy, Suspense, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { matchPath, useLocation } from 'react-router-dom';
import { Bot, CandlestickChart, Check, Gauge, History, LoaderCircle, LogOut, Sparkles, UserRound } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Drawer } from '@mui/material';
import GlobalSearch from './GlobalSearch';
import MarketSelector from './MarketSelector';
import RuntimeActivityStatusButton from './RuntimeActivityStatusButton';
import {
  BrandMark,
  ColorModeButton,
  ColorModeListItem,
  DesktopNav,
  MobileBottomNav,
  SheetDivider,
  SheetItem,
} from './AppNav';
import { CORE_NAV_ITEMS, SAFE_GUTTER_CLASSES, useIsMobileShell } from './shellNav';
import { useRuntime } from '../../contexts/RuntimeContext';
import { useMarket, useMarketForCapability } from '../../contexts/MarketContext';
import { usePipeline } from '../../contexts/usePipeline';
import { useStrategyProfile, useStrategyProfileData } from '../../contexts/StrategyProfileContext';
import { isLiveOptionsAvailable } from '../../features/options/optionsAvailability';
import { loaderForPath } from '../../pageLoaders';
import {
  BREADTH_MARKET_FALLBACKS,
  GROUP_RANKING_MARKET_FALLBACKS,
  breadthBootstrapQuery,
  dailySnapshotQuery,
  groupsBootstrapQuery,
  scanBootstrapQuery,
} from '../../pageBootstrapQueries';

const AssistantDrawerContent = lazy(() => import('../AssistantChat/AssistantDrawerContent'));
const PipelineProgressCard = lazy(() => import('../PipelineProgressCard'));

function DrawerLoadingFallback() {
  return (
    <div role="status" aria-label="Loading assistant" className="grid h-full place-items-center">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none" />
    </div>
  );
}

function PipelineProgressOverlay() {
  const { isCardVisible } = usePipeline();

  if (!isCardVisible) return null;

  return (
    <Suspense fallback={null}>
      <PipelineProgressCard />
    </Suspense>
  );
}

function useProfileOptions() {
  const {
    activeProfile,
    activeProfileDetail,
    profiles,
    setActiveProfile,
  } = useStrategyProfileData();
  const profileOptions = profiles.length
    ? profiles
    : [{ profile: activeProfile, label: activeProfileDetail?.label || activeProfile }];
  return { activeProfile, profileOptions, setActiveProfile };
}

// Mounted only while the menu is open, so profiles load on demand.
function StrategyProfileMenuItems() {
  const { activeProfile, profileOptions, setActiveProfile } = useProfileOptions();

  return (
    <>
      <DropdownMenuLabel>Strategy profile</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={activeProfile} onValueChange={setActiveProfile}>
        {profileOptions.map((profile) => (
          <DropdownMenuRadioItem key={profile.profile} value={profile.profile}>
            {profile.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}

// Mounted only while the "More" sheet is open, so profiles load on demand like the desktop menu.
function MobileProfileItems({ onDone }) {
  const { activeProfile, profileOptions, setActiveProfile } = useProfileOptions();

  return (
    <>
      <li className="px-4 pt-2 pb-1 text-xs font-medium text-muted-foreground">Strategy profile</li>
      {profileOptions.map((profile) => {
        const selected = profile.profile === activeProfile;
        return (
          <SheetItem
            key={profile.profile}
            icon={selected ? <Check aria-hidden="true" /> : <UserRound aria-hidden="true" />}
            label={profile.label}
            selected={selected}
            aria-pressed={selected}
            onClick={() => {
              setActiveProfile(profile.profile);
              onDone();
            }}
          />
        );
      })}
    </>
  );
}

function StrategyProfileControl() {
  const { activeProfile } = useStrategyProfile();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={`Profile: ${activeProfile}`} aria-label="Select strategy profile" className="text-muted-foreground">
          <UserRound aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {open && <StrategyProfileMenuItems />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// The early fetch is the page's one attempt, as the route's own import would
// be: browsers keep a failed dynamic import for the session, so the route
// shows the same error it would have shown on main. Nothing to handle here.
const loadQuietly = (loader) => loader?.().catch(() => {});

/**
 * Start a page's code and first-paint data on hover, focus or touch, so a tab
 * switch does not wait for code, then data, after the click. The data only
 * goes where the page itself would look: same key, market and snapshot flag.
 * The nav renders once the capabilities request has settled, and with auth
 * required only after sign-in; the server checks every request regardless.
 */
function useNavPrefetch() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { selectedMarket } = useMarket();
  const { market: groupsMarket } = useMarketForCapability(
    'group_rankings',
    GROUP_RANKING_MARKET_FALLBACKS,
  );
  const { market: breadthMarket } = useMarketForCapability('breadth', BREADTH_MARKET_FALLBACKS);

  return useCallback((path) => {
    loadQuietly(loaderForPath(path));
    // The open page owns its queries: the Scan page re-applies any new
    // latest-scan bootstrap, which would replace the scan the user picked.
    // matchPath follows the router (trailing slash, any casing).
    if (matchPath(path, location.pathname)) return;
    let query = null;
    if (path === '/') query = dailySnapshotQuery(selectedMarket);
    else if (path === '/scan') query = scanBootstrapQuery(selectedMarket);
    else if (path === '/groups') {
      query = groupsBootstrapQuery(queryClient, groupsMarket);
    } else if (path === '/breadth') {
      query = breadthBootstrapQuery(queryClient, breadthMarket);
    }
    if (!query) return;
    // A query without data is always stale, so a failed one would be asked
    // again on every hover; wait out its staleTime instead.
    const state = queryClient.getQueryState(query.queryKey);
    if (state?.status === 'error' && Date.now() - state.errorUpdatedAt < query.staleTime) return;
    queryClient.prefetchQuery(query);
  }, [breadthMarket, groupsMarket, location.pathname, queryClient, selectedMarket]);
}

function Layout({ children }) {
  const location = useLocation();
  const isMobile = useIsMobileShell();
  const { auth, features, isLoggingOut, logout, marketCatalog, primaryMarket } = useRuntime();
  const { selectedMarket } = useMarket();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const prefetchPage = useNavPrefetch();

  const assistantAvailable = features.chatbot && (!auth?.required || auth?.authenticated);
  const canSignOut = auth?.required && auth?.authenticated;
  const optionsAvailable = isLiveOptionsAvailable({
    features,
    marketCatalog,
    selectedMarket,
    primaryMarket,
  });

  const navItems = [
    ...CORE_NAV_ITEMS,
    { path: '/futures', label: 'Futures', matchPrefix: true, icon: <Gauge aria-hidden="true" /> },
    { path: '/validation', label: 'Backtest', icon: <History aria-hidden="true" /> },
    ...(optionsAvailable ? [{ path: '/options', label: 'Options', matchPrefix: true, icon: <CandlestickChart aria-hidden="true" /> }] : []),
    ...(features.themes ? [{ path: '/themes', label: 'Themes', icon: <Sparkles aria-hidden="true" /> }] : []),
    ...(features.chatbot ? [{ path: '/chatbot', label: 'Assistant', icon: <Bot aria-hidden="true" /> }] : []),
  ];

  const mobileExtras = (close) => (
    <>
      <MobileProfileItems onDone={close} />
      <SheetDivider />
      <ColorModeListItem onDone={close} />
      {canSignOut && (
        <SheetItem
          icon={<LogOut aria-hidden="true" />}
          label="Sign out"
          disabled={isLoggingOut}
          onClick={() => { close(); logout(); }}
        />
      )}
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="tw border-b border-border bg-surface">
        <div className={cn('flex min-h-13 items-center gap-2 overflow-x-auto md:gap-3 [&>*]:shrink-0', SAFE_GUTTER_CLASSES)}>
          <BrandMark label={isMobile ? null : 'Stock Scanner'} />
          <RuntimeActivityStatusButton compact={isMobile} />
          <MarketSelector />
          <div className="flex-1" />
          <GlobalSearch pages={navItems} compact={isMobile} onPageIntent={prefetchPage} />
          {!isMobile && (
            <>
              <div className="flex-1" />
              <DesktopNav items={navItems} onIntent={prefetchPage} />
              <StrategyProfileControl />
              {canSignOut && (
                <Button variant="ghost" size="sm" onClick={() => logout()} disabled={isLoggingOut} className="text-xs text-muted-foreground">
                  Sign out
                </Button>
              )}
              <ColorModeButton />
            </>
          )}
        </div>
      </header>

      <main
        className={cn(
          'mx-auto my-2 w-full max-w-[1536px] flex-1',
          SAFE_GUTTER_CLASSES,
          isMobile && 'pb-[calc(64px+env(safe-area-inset-bottom))]',
        )}
      >
        {children}
      </main>

      {isMobile && <MobileBottomNav items={navItems} extras={mobileExtras} onIntent={prefetchPage} />}

      {features.themes && <PipelineProgressOverlay />}

      {assistantAvailable && location.pathname !== '/chatbot' && (
        <>
          <button
            type="button"
            aria-label="Open assistant"
            onClick={() => setAssistantOpen(true)}
            className={cn(
              'tw fixed z-nav grid cursor-pointer place-items-center rounded-full bg-accent text-accent-foreground shadow-lg outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 motion-reduce:transition-none',
              isMobile
                ? 'right-[max(16px,env(safe-area-inset-right))] bottom-[calc(72px+env(safe-area-inset-bottom))] size-12'
                : 'right-6 bottom-6 size-14',
            )}
          >
            <Bot aria-hidden="true" className="size-6" />
          </button>

          {/* Stays an MUI Drawer until AssistantChat migrates: its content opens
              MUI dialogs, and a Radix modal around them would block their clicks. */}
          <Drawer
            anchor="right"
            open={assistantOpen}
            onClose={() => setAssistantOpen(false)}
            PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}
          >
            {assistantOpen && (
              <Suspense fallback={<DrawerLoadingFallback />}>
                <AssistantDrawerContent onClose={() => setAssistantOpen(false)} />
              </Suspense>
            )}
          </Drawer>
        </>
      )}
    </div>
  );
}

export default Layout;
