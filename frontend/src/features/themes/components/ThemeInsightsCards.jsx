import { Activity, Bell, ChartLine, Sparkles, Sparkle, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Pill, ScoreBar, Spinner } from '../themeUi';
import { linkClass } from '../themeClasses';

function normalizeVelocity(velocity) {
  const numericVelocity = Number(velocity);
  if (!Number.isFinite(numericVelocity) || numericVelocity <= 0) {
    return null;
  }
  return numericVelocity;
}

function formatVelocityLabel(velocity) {
  const numericVelocity = normalizeVelocity(velocity);
  return numericVelocity ? `${numericVelocity.toFixed(1)}x` : '-';
}

export function MomentumBar({ score }) {
  const numericScore = Number.isFinite(score) ? Math.max(0, Math.min(score, 100)) : 0;
  return <ScoreBar score={numericScore} label="Momentum" />;
}

export function VelocityIndicator({ velocity }) {
  const numericVelocity = normalizeVelocity(velocity);
  if (!numericVelocity) {
    return <span className="text-[11px] text-muted-foreground">-</span>;
  }

  const isAccelerating = numericVelocity > 1;
  const tone =
    numericVelocity >= 2
      ? 'text-gain'
      : numericVelocity >= 1.5
        ? 'text-warning'
        : 'text-muted-foreground';

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] tabular-nums', tone, numericVelocity >= 1.5 && 'font-semibold')}>
      {isAccelerating && <TrendingUp aria-hidden="true" className="size-3" />}
      {numericVelocity.toFixed(1)}x
    </span>
  );
}

const CARD = 'h-full rounded-lg border border-border bg-surface p-3';

function CardLoading({ label }) {
  return (
    <div className={CARD}>
      <div className="flex justify-center p-2"><Spinner label={label} className="size-5" /></div>
    </div>
  );
}

function CardTitle({ icon, children, extra }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      {icon}
      <h3 className="text-xs font-semibold">{children}</h3>
      {extra}
    </div>
  );
}

function EmergingThemesCard({ themes, isLoading }) {
  if (isLoading) return <CardLoading label="Loading emerging themes" />;

  return (
    <section className={CARD}>
      <CardTitle
        icon={<Sparkles aria-hidden="true" className="size-4 text-muted-foreground" />}
        extra={themes?.count > 0 ? <Pill tone="warning" className="h-5 tabular-nums">{themes.count}</Pill> : null}
      >
        Emerging Themes
      </CardTitle>

      {themes?.themes?.length > 0 ? (
        <ul>
          {themes.themes.slice(0, 5).map((theme) => (
            <li key={theme.theme} className="flex items-center border-b border-border py-1 last:border-b-0">
              <Sparkle aria-hidden="true" className="mr-1 size-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium">{theme.theme}</p>
                <div className="mt-0.5 flex gap-1">
                  <Pill tone="warning" className="h-4 tabular-nums">{formatVelocityLabel(theme.velocity)}</Pill>
                  <Pill tone="muted" className="h-4 tabular-nums">{`${theme.mentions_7d} ment.`}</Pill>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-center text-[11px] text-muted-foreground">No emerging themes detected</p>
      )}
    </section>
  );
}

function TopTrendingThemesCard({ topTrendingThemes = [], onSelectTheme }) {
  return (
    <section className={CARD}>
      <CardTitle icon={<ChartLine aria-hidden="true" className="size-4 text-muted-foreground" />}>Top Trending</CardTitle>
      <ul>
        {topTrendingThemes.map((theme) => (
          <li key={theme.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => onSelectTheme?.({ id: theme.id, name: theme.name })}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm py-1.5 text-left outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 items-center">
                <span className="mr-2 min-w-5 text-sm text-muted-foreground tabular-nums">#{theme.rank}</span>
                <span className="max-w-[200px] truncate text-sm font-medium">{theme.name}</span>
              </span>
              <MomentumBar score={theme.momentum_score} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AlertsCard({ alerts, isLoading, onDismiss, dismissingId }) {
  if (isLoading) return <CardLoading label="Loading alerts" />;

  return (
    <section className={CARD}>
      <CardTitle
        icon={(
          <span className="relative">
            <Bell aria-hidden="true" className="size-4 text-muted-foreground" />
            {alerts?.unread ? (
              <span className="absolute -top-1.5 -right-2 min-w-3.5 rounded-full bg-loss px-0.5 text-center text-[11px] leading-3.5 text-loss-foreground tabular-nums">
                {alerts.unread}
              </span>
            ) : null}
          </span>
        )}
        extra={alerts?.total > 0 ? <span className="text-[11px] text-muted-foreground tabular-nums">({alerts.total})</span> : null}
      >
        <span className="ml-1">Alerts</span>
      </CardTitle>

      {alerts?.alerts?.length > 0 ? (
        <ul className="max-h-[200px] overflow-y-auto">
          {alerts.alerts.map((alert) => (
            <li
              key={alert.id}
              className={cn(
                'group relative mb-1 flex items-start justify-between border-l-2 py-1 pl-2',
                alert.severity === 'warning' ? 'border-warning' : 'border-border',
                alert.is_read && 'opacity-60',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn('text-[11px]', !alert.is_read && 'font-semibold')}>{alert.title}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(alert.triggered_at).toLocaleDateString()}</p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDismiss?.(alert.id);
                }}
                disabled={dismissingId === alert.id}
                aria-label={`Dismiss alert ${alert.title}`}
                className="ml-1 grid size-6 cursor-pointer place-items-center rounded-sm text-muted-foreground opacity-40 outline-none group-focus-within:opacity-100 group-hover:opacity-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {dismissingId === alert.id ? <Spinner label="Dismissing" className="size-3" /> : <X aria-hidden="true" className="size-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-center text-[11px] text-muted-foreground">No alerts</p>
      )}
    </section>
  );
}

function PipelineObservabilityCard({ observability, isLoading }) {
  if (isLoading) return <CardLoading label="Loading pipeline health" />;

  const metrics = observability?.metrics || {};
  const alerts = observability?.alerts || [];
  const statChip = (label, value, warn = false) => (
    <Pill key={label} tone={warn ? 'warning' : 'muted'} className="h-[18px] tabular-nums">{`${label}: ${value}`}</Pill>
  );

  return (
    <section className={CARD}>
      <CardTitle
        icon={<Activity aria-hidden="true" className="size-4 text-muted-foreground" />}
        extra={alerts.length > 0 ? <Pill tone="warning" className="ml-1 h-[18px]">{`${alerts.length} alerts`}</Pill> : null}
      >
        <span className="ml-1">Pipeline Health</span>
      </CardTitle>

      <div className="mb-2 flex flex-wrap gap-1">
        {statChip('Parse', `${((metrics.parse_failure_rate || 0) * 100).toFixed(1)}%`, metrics.parse_failure_rate > 0.25)}
        {statChip('No-mention', `${((metrics.processed_without_mentions_ratio || 0) * 100).toFixed(1)}%`, metrics.processed_without_mentions_ratio > 0.2)}
        {statChip('New clusters', `${((metrics.new_cluster_rate || 0) * 100).toFixed(1)}%`, metrics.new_cluster_rate > 0.45)}
        {statChip('Merge proxy', `${((metrics.merge_precision_proxy || 0) * 100).toFixed(1)}%`, metrics.merge_precision_proxy < 0.55)}
      </div>

      {alerts.length > 0 ? (
        <ul className="max-h-[120px] overflow-y-auto">
          {alerts.slice(0, 3).map((item) => (
            <li key={item.key} className={cn('mb-1.5 border-l-2 px-2 py-1', item.severity === 'warning' ? 'border-warning' : 'border-border')}>
              <p className="text-[11px] font-semibold">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">{item.description}</p>
              <p className="mt-0.5 text-[11px]">
                <a href={item.runbook_url} target="_blank" rel="noreferrer" className={linkClass}>Runbook</a>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-center text-[11px] text-muted-foreground">No policy breaches</p>
      )}
    </section>
  );
}

export default function ThemeInsightsCards({
  emerging,
  isLoadingEmerging,
  topTrendingThemes,
  onSelectTheme,
  observability,
  isLoadingObservability,
  alerts,
  isLoadingAlerts,
  onDismissAlert,
  dismissingAlertId,
}) {
  return (
    <div className="tw mb-6 grid grid-cols-1 gap-4 text-foreground md:grid-cols-4">
      <EmergingThemesCard themes={emerging} isLoading={isLoadingEmerging} />
      <TopTrendingThemesCard topTrendingThemes={topTrendingThemes} onSelectTheme={onSelectTheme} />
      <PipelineObservabilityCard observability={observability} isLoading={isLoadingObservability} />
      <AlertsCard
        alerts={alerts}
        isLoading={isLoadingAlerts}
        onDismiss={onDismissAlert}
        dismissingId={dismissingAlertId}
      />
    </div>
  );
}
