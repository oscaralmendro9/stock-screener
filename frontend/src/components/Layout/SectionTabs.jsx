import { Link as RouterLink, useLocation } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useRuntime } from '../../contexts/RuntimeContext';
import { SECTION_TABS, useIsMobileShell } from './shellNav';

/**
 * A section's sub-pages as tabs above its page (Screener | Backtest), so the
 * top bar lists sections only. Renders nothing when one sub-page is left
 * after feature flags.
 */
export function SectionTabs({ section }) {
  const { pathname } = useLocation();
  const { features } = useRuntime();
  const items = SECTION_TABS[section].filter((item) => !item.show || item.show(features));
  if (items.length < 2) return null;
  return (
    <nav aria-label="Section" className="tw -mt-1 mb-2 flex gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => {
        const active = pathname === item.path;
        return (
          <RouterLink
            key={item.path}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px flex h-11 shrink-0 items-center border-b-2 px-3 text-sm whitespace-nowrap outline-none transition-colors duration-150 ease-out focus-visible:bg-surface-subtle md:h-9 md:text-[13px]',
              active ? 'border-accent font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </RouterLink>
        );
      })}
    </nav>
  );
}

/** A page wrapped with its section's tabs. */
export function SectionPage({ section, children }) {
  return (
    <>
      <SectionTabs section={section} />
      {children}
    </>
  );
}

/**
 * Fixed-height pane for views that size to their parent (height: 100%), such
 * as the COT and watchlist views first built for a Daily tab. Matches the
 * Daily page's pane; phones also clear the bottom bar.
 */
export function FullHeightPane({ children, withTabs = false }) {
  const isMobile = useIsMobileShell();
  // Section tabs take ~44px (phones) / ~36px (desktop) above the pane.
  const offset = withTabs ? (isMobile ? 44 : 36) : 0;
  return (
    <div
      className="min-h-0 overflow-hidden"
      style={{
        height: isMobile
          ? `calc(100dvh - ${70 + 64 + offset}px - env(safe-area-inset-bottom))`
          : `calc(100dvh - ${70 + offset}px)`,
      }}
    >
      {children}
    </div>
  );
}
