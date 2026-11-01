import { CalendarDays, ChartNoAxesColumn, ChartSpline, ListFilter } from 'lucide-react';

import { useMediaQuery } from '../../hooks/useMediaQuery';

// Bottom bar height on phones; fixed overlays and page padding clear it.
export const MOBILE_NAV_HEIGHT = 56;

// Phones and portrait tablets get the bottom bar; the desktop top-bar nav needs ~900px.
// Page gutters that also clear a landscape notch (viewport-fit=cover).
export const SAFE_GUTTER_CLASSES = 'pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] sm:pl-[max(24px,env(safe-area-inset-left))] sm:pr-[max(24px,env(safe-area-inset-right))]';

// Below 900px the shell switches to the phone layout (bottom bar).
export const MOBILE_SHELL_QUERY = '(max-width: 899.95px)';
export const useIsMobileShell = () => useMediaQuery(MOBILE_SHELL_QUERY);

const icon = (Icon) => <Icon aria-hidden="true" />;

// Sections, Finviz-style: each owns its sub-pages (shown as SectionTabs), so
// the top bar stays short. Phones show the first four in the bottom bar.
export const CORE_NAV_ITEMS = [
  { path: '/', label: 'Home', icon: icon(CalendarDays) },
  { path: '/scan', label: 'Screener', match: ['/scan', '/validation'], icon: icon(ListFilter) },
  { path: '/groups', label: 'Groups', match: ['/groups', '/themes'], icon: icon(ChartNoAxesColumn) },
  { path: '/breadth', label: 'Market', icon: icon(ChartSpline) },
];

// Sub-pages of a section, as tabs under the top bar. Items may carry `show`,
// a features predicate, for sub-pages behind a runtime feature flag.
export const SECTION_TABS = {
  screener: [
    { path: '/scan', label: 'Screener' },
    { path: '/validation', label: 'Backtest' },
  ],
  groups: [
    { path: '/groups', label: 'Industry groups' },
    { path: '/themes', label: 'Themes', show: (features) => Boolean(features.themes) },
  ],
  futures: [
    { path: '/futures', label: 'Contracts' },
    { path: '/cot', label: 'COT positioning' },
  ],
};
