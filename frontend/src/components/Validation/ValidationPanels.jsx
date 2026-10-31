import { Link as RouterLink } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Notice } from '@/ui/notice';

function formatPercentValue(value) {
  if (value == null) return '-';
  return `${Number(value).toFixed(1)}%`;
}

function formatRate(value) {
  if (value == null) return '-';
  return `${(Number(value) * 100).toFixed(0)}%`;
}

function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

const TH = 'border-b border-border px-2 py-1.5 font-medium text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5 tabular-nums';

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function MetricCard({ title, horizon }) {
  return (
    <div className="rounded-md border border-border p-3">
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <MetricRow label="Sample" value={horizon?.sample_size ?? 0} />
        <MetricRow label="Positive" value={formatRate(horizon?.positive_rate)} />
        <MetricRow label="Avg Return" value={formatPercentValue(horizon?.avg_return_pct)} />
        <MetricRow label="Median" value={formatPercentValue(horizon?.median_return_pct)} />
        <MetricRow label="Avg MFE" value={formatPercentValue(horizon?.avg_mfe_pct)} />
        <MetricRow label="Avg MAE" value={formatPercentValue(horizon?.avg_mae_pct)} />
        <MetricRow label="Skipped" value={horizon?.skipped_missing_history ?? 0} />
      </div>
    </div>
  );
}

export function ValidationSummaryCards({ horizons }) {
  const oneSession = horizons?.find((item) => item.horizon_sessions === 1);
  const fiveSessions = horizons?.find((item) => item.horizon_sessions === 5);

  return (
    <div className="tw grid gap-3 md:grid-cols-2">
      <MetricCard title="1 Session" horizon={oneSession} />
      <MetricCard title="5 Sessions" horizon={fiveSessions} />
    </div>
  );
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-2 py-4 text-center text-sm text-muted-foreground">{children}</td>
    </tr>
  );
}

export function ValidationRecentEventsTable({ events, showSourceKind = true }) {
  return (
    <div className="tw overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th scope="col" className={cn(TH, 'text-left')}>Symbol</th>
            {showSourceKind && <th scope="col" className={cn(TH, 'text-left')}>Source</th>}
            <th scope="col" className={cn(TH, 'text-left')}>Event</th>
            <th scope="col" className={cn(TH, 'text-left')}>Entry</th>
            {['1S', '5S', 'MFE', 'MAE'].map((label) => (
              <th key={label} scope="col" className={cn(TH, 'text-right')}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(events || []).map((event, index) => (
            <tr key={`${event.source_ref}:${event.event_at}:${event.attributes?.symbol || 'symbol'}:${index}`}>
              <td className={cn(TD, 'font-semibold')}>
                {event.attributes?.symbol ? (
                  <RouterLink
                    to={`/stocks/${encodeURIComponent(event.attributes.symbol)}`}
                    className="text-accent hover:underline"
                  >
                    {event.attributes.symbol}
                  </RouterLink>
                ) : '-'}
              </td>
              {showSourceKind && (
                <td className={TD}><Badge>{event.source_kind.replace('_', ' ')}</Badge></td>
              )}
              <td className={TD}>{formatDate(event.event_at)}</td>
              <td className={TD}>{formatDate(event.entry_at)}</td>
              <td className={cn(TD, 'text-right')}>{formatPercentValue(event.return_1s_pct)}</td>
              <td className={cn(TD, 'text-right')}>{formatPercentValue(event.return_5s_pct)}</td>
              <td className={cn(TD, 'text-right')}>{formatPercentValue(event.mfe_5s_pct)}</td>
              <td className={cn(TD, 'text-right')}>{formatPercentValue(event.mae_5s_pct)}</td>
            </tr>
          ))}
          {(!events || events.length === 0) && (
            <EmptyRow colSpan={showSourceKind ? 8 : 7}>
              No validation events are available for this selection.
            </EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ValidationFailureClustersTable({ clusters }) {
  return (
    <div className="tw overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th scope="col" className={cn(TH, 'text-left')}>Cluster</th>
            {['Sample', 'Avg 5S', 'Median 5S'].map((label) => (
              <th key={label} scope="col" className={cn(TH, 'text-right')}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(clusters || []).map((cluster) => (
            <tr key={cluster.cluster_key}>
              <td className={cn(TD, 'font-medium')}>{cluster.label}</td>
              <td className={cn(TD, 'text-right')}>{cluster.sample_size}</td>
              <td className={cn(TD, 'text-right')}>{formatPercentValue(cluster.avg_return_pct)}</td>
              <td className={cn(TD, 'text-right')}>{formatPercentValue(cluster.median_return_pct)}</td>
            </tr>
          ))}
          {(!clusters || clusters.length === 0) && (
            <EmptyRow colSpan={4}>No losing clusters are available for this selection.</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ValidationDegradedAlert({ degradedReasons }) {
  if (!degradedReasons?.length) {
    return null;
  }

  return (
    <Notice tone="info" className="tw">
      Validation is partially degraded: {degradedReasons.join(', ')}.
    </Notice>
  );
}

export function ValidationSection({ title, degradedReasons, horizons, recentEvents, failureClusters, showSourceKind = true }) {
  return (
    <div className="tw flex flex-col gap-3">
      {title && <h3 className="text-sm font-semibold">{title}</h3>}
      <ValidationDegradedAlert degradedReasons={degradedReasons} />
      <ValidationSummaryCards horizons={horizons} />
      <section>
        <h3 className="mb-1 text-sm font-semibold">Recent Events</h3>
        <ValidationRecentEventsTable events={recentEvents} showSourceKind={showSourceKind} />
      </section>
      <section>
        <h3 className="mb-1 text-sm font-semibold">Failure Clusters</h3>
        <ValidationFailureClustersTable clusters={failureClusters} />
      </section>
    </div>
  );
}
