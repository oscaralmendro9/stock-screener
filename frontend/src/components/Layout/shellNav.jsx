import { CalendarDays, ChartNoAxesColumn, ChartSpline, ListFilter } from 'lucide-react';

import { useMediaQuery } from '../../hooks/useMediaQuery';

// Bottom bar height on phones; fixed overlays and page padding clear it.
export const MOBILE_NAV_HEIGHT = 56;
export const mobileNavOffset = (gap = 0) => `calc(${MOBILE_NAV_HEIGHT + gap}px + env(safe-area-inset-bottom))`;

// Phones and portrait tablets get the bottom bar; the desktop top-bar nav needs ~900px.
// Toolbar/Container gutters that also clear a landscape notch (viewport-fit=cover).
// MUI sx form, for shells and pages not yet migrated to Tailwind.
export const safeGutters = {
  pl: { xs: 'max(16px, env(safe-area-inset-left))', sm: 'max(24px, env(safe-area-inset-left))' },
  pr: { xs: 'max(16px, env(safe-area-inset-right))', sm: 'max(24px, env(safe-area-inset-right))' },
};
// The same gutters as Tailwind classes.
export const SAFE_GUTTER_CLASSES = 'pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] sm:pl-[max(24px,env(safe-area-inset-left))] sm:pr-[max(24px,env(safe-area-inset-right))]';

// Same cut-off as MUI's breakpoints.down('md'), so MUI pages and the shell agree.
export const MOBILE_SHELL_QUERY = '(max-width: 899.95px)';
export const useIsMobileShell = () => useMediaQuery(MOBILE_SHELL_QUERY);

const icon = (Icon) => <Icon aria-hidden="true" />;

export const CORE_NAV_ITEMS = [
  { path: '/', label: 'Daily', icon: icon(CalendarDays) },
  { path: '/scan', label: 'Scan', icon: icon(ListFilter) },
  { path: '/breadth', label: 'Breadth', icon: icon(ChartSpline) },
  { path: '/groups', label: 'Groups', icon: icon(ChartNoAxesColumn) },
];
