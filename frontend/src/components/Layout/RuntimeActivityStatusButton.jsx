import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { useRuntimeActivity } from '../../hooks/useRuntimeActivity';

// Header status is best-effort chrome; let route-critical data requests start first.
const HEADER_ACTIVITY_DELAY_MS = 1500;
// Status, not price direction, so "ready" stays neutral rather than gain-green.
const BADGE_TONES = {
  default: 'neutral',
  info: 'accent',
  secondary: 'accent',
  success: 'neutral',
  warning: 'warning',
};
const WARNING_MARKET_STATUSES = new Set(['failed', 'stale', 'stuck']);

function buildSummary(activity, { isPending = false, isError = false } = {}) {
  if (isError && isPending) {
    return {
      badge: 'Warn',
      badgeColor: 'warning',
      title: 'Activity unavailable',
      detail: 'View operations',
    };
  }

  if (isPending) {
    return {
      badge: '...',
      badgeColor: 'default',
      title: 'Checking activity',
      detail: 'View operations',
    };
  }

  const bootstrap = activity?.bootstrap ?? {};
  const summary = activity?.summary ?? {};
  const markets = activity?.markets ?? [];
  const activeMarket = markets.find((market) => (
    market.status === 'running' || market.status === 'queued'
  ));
  const warningMarket = markets.find((market) => (
    WARNING_MARKET_STATUSES.has(market.status)
  ));

  if (bootstrap.state === 'running') {
    const determinateBootstrap = (
      bootstrap.progress_mode === 'determinate'
      && Number.isFinite(bootstrap.percent)
    );
    const percent = determinateBootstrap ? Math.round(bootstrap.percent) : null;
    return {
      badge: determinateBootstrap ? `${percent}%` : 'Sync',
      badgeColor: 'info',
      title: `Bootstrapping ${bootstrap.primary_market || 'market'}`,
      detail: determinateBootstrap && bootstrap.current_stage
        ? `${bootstrap.current_stage} · ${percent}%`
        : bootstrap.current_stage
          || bootstrap.message
          || 'Preparing market data',
    };
  }

  if (summary.status === 'warning' && warningMarket) {
    const warningFallback = warningMarket.status === 'failed' ? 'Task failed' : 'Task needs attention';
    return {
      badge: 'Warn',
      badgeColor: 'warning',
      title: 'Refresh warning',
      detail: `${warningMarket.market} · ${warningMarket.stage_label || warningMarket.message || warningFallback}`,
    };
  }

  if ((summary.active_market_count ?? 0) > 0) {
    const activeLabel = summary.active_market_count === 1 ? '1 market active' : `${summary.active_market_count} markets active`;
    return {
      badge: String(summary.active_market_count),
      badgeColor: 'secondary',
      title: activeLabel,
      detail: activeMarket
        ? `${activeMarket.market} · ${activeMarket.stage_label || activeMarket.message || activeMarket.status}`
        : 'Data refresh in progress',
    };
  }

  return {
    badge: 'OK',
    badgeColor: 'success',
    title: 'Markets ready',
    detail: 'View operations',
  };
}

export default function RuntimeActivityStatusButton({ compact = false }) {
  const [activityEnabled, setActivityEnabled] = useState(false);
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setActivityEnabled(true);
    }, HEADER_ACTIVITY_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, []);

  const activityQuery = useRuntimeActivity({ enabled: activityEnabled });
  const summary = buildSummary(activityQuery.data, {
    isError: activityQuery.isError,
    isPending: !activityQuery.dataUpdatedAt,
  });

  return (
    <RouterLink
      to="/operations"
      // Compact mode shows only the badge, so the title and detail move to the label.
      aria-label={compact ? `${summary.title}: ${summary.detail}` : undefined}
      title={compact ? `${summary.title} · ${summary.detail}` : undefined}
      className={cn(
        'tw flex h-11 max-w-72 shrink-0 items-center gap-2 rounded-md border border-border bg-surface-subtle text-foreground outline-none transition-colors duration-150 ease-out hover:bg-border/40 focus-visible:ring-2 focus-visible:ring-ring md:h-9',
        compact ? 'px-2' : 'px-2.5',
      )}
    >
      <Badge tone={BADGE_TONES[summary.badgeColor]} className="font-bold">{summary.badge}</Badge>
      {!compact && (
        <span className="flex min-w-0 flex-col text-xs leading-tight">
          <span className="truncate font-bold">{summary.title}</span>
          <span className="truncate text-muted-foreground">{summary.detail}</span>
        </span>
      )}
    </RouterLink>
  );
}
