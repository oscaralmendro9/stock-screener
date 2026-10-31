/**
 * Operations / telemetry dashboard (bead asia.10.2).
 *
 * Polls runtime activity, live job inventory, and telemetry summaries so
 * operators can inspect queued/running/stuck jobs and cancel supported work.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';

import { fetchAlerts, acknowledgeAlert } from '../api/telemetry';
import { cancelOperationsJob, fetchOperationsJobs, releasePipelineChain } from '../api/operations';
import { getBootstrapStatus } from '../api/appRuntime';
import { useRuntimeActivity } from '../hooks/useRuntimeActivity';
import { useRuntime } from '../contexts/RuntimeContext';
import SocialSignalHealthPanel from '../features/socialSignals/SocialSignalHealthPanel';
import ExposureResearchWorkspace from '../features/companyExposure/ExposureResearchWorkspace';
import { getScheduledTasks } from '../api/tasks';
import SchedulesSection from '../components/Operations/SchedulesSection';
import MarketCoverage from '../components/Operations/MarketCoverage';
import InactiveMarkets from '../components/Operations/InactiveMarkets';
import ThemeSourceHealth from '../components/Operations/ThemeSourceHealth';
import { failingSources, useContentSources } from '../components/Operations/contentSources';
import {
  ACTIVE_JOB_STATES,
  findActiveMarkets,
  queueMarket,
  splitByMarket,
} from '../components/Operations/activeMarkets';

const POLL_MS = 30000;
const EMPTY_ARRAY = [];
const EMPTY_LEASES = { external_fetch_global: null, market_workload: {} };

// Badge tones per status. Red is kept for things that need a hand (stuck,
// failed, open critical); in-flight work reads as accent.
const SEVERITY_TONE = {
  warning: 'warning',
  critical: 'loss',
};

const STATE_TONE = {
  open: 'loss',
  acknowledged: 'warning',
  closed: 'neutral',
};

const ACTIVITY_STATUS_TONE = {
  running: 'accent',
  queued: 'warning',
  completed: 'gain',
  failed: 'loss',
  idle: 'neutral',
  stale: 'warning',
  stuck: 'loss',
};

const JOB_STATE_TONE = {
  queued: 'warning',
  waiting: 'warning',
  reserved: 'accent',
  running: 'accent',
  stale: 'warning',
  stuck: 'loss',
  cancelled: 'neutral',
  failed: 'loss',
};

const TH = 'border-b border-border px-2 py-1.5 text-left font-medium text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5 align-top';
const H2 = 'mt-6 mb-2 text-base font-semibold';

function formatLagSeconds(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function formatTimestamp(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

// What each cancel strategy actually does, in the words the confirm dialog uses.
const CANCEL_ACTIONS = {
  revoke_and_remove_from_queue: {
    label: 'Cancel',
    detail: 'Remove from queue — it never runs.',
  },
  revoke: {
    label: 'Revoke',
    detail: 'A worker has already picked this job up. Revoking makes the worker drop it instead of running it.',
  },
  scan_cancel: {
    label: 'Cancel scan',
    detail: 'Mark the scan cancelled — the worker stops at its next checkpoint.',
  },
  force_cancel_refresh: {
    label: 'Force cancel',
    detail: 'Force-release the refresh locks — the worker may still be running; use only if it is dead.',
    danger: true,
  },
  force_release_market_lease: {
    label: 'Force release',
    detail: 'Force-release the market lock — the worker may still be running; use only if it is dead.',
    danger: true,
  },
};

// Set by the server when no responding worker reads the job's queue. A
// solo-pool worker busy with a task does not answer, hence "responding".
const NO_WORKER_WAIT_REASON = 'no_worker_for_queue';

function Blocker({ job }) {
  if (job.wait_reason !== NO_WORKER_WAIT_REASON) return job.wait_reason || '—';
  return (
    <span className="text-xs text-loss">
      No responding worker reads {job.queue}. Start one, or cancel this job.
    </span>
  );
}

function formatCancelLabel(strategy) {
  return CANCEL_ACTIONS[strategy]?.label || 'Unavailable';
}

function resolveDeterminatePercent(percent, current, total) {
  if (Number.isFinite(percent)) {
    return Math.max(0, Math.min(100, Number(percent)));
  }
  if (current != null && total != null && total > 0) {
    return Math.max(0, Math.min(100, (Number(current) / Number(total)) * 100));
  }
  return null;
}

// Determinate bar, or an indeterminate one when value is null.
function ProgressBar({ value, label }) {
  const determinate = value != null;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={determinate ? Math.round(value) : undefined}
      className="relative h-1.5 overflow-hidden rounded-full bg-surface-subtle"
    >
      {determinate ? (
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      ) : (
        <div className="absolute inset-y-0 w-1/3 rounded-full bg-accent/60 motion-safe:animate-pulse" />
      )}
    </div>
  );
}

function Spinner({ label = 'Loading' }) {
  return (
    <span role="progressbar" aria-label={label} className="inline-block size-5 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
  );
}

function EmptyNote({ children }) {
  return <p className="p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

const missingKeys = (statuses) => Object.keys(statuses ?? {}).filter((key) => statuses[key] === 'missing');

// Derived stages and optional features never gate readiness, so surface the
// ones that have never published (queued and failed both read as missing).
function UnpublishedDataAlert({ status }) {
  const lines = Object.entries(status?.market_stages ?? {})
    .map(([market, stages]) => [market, missingKeys(stages)])
    .filter(([, missing]) => missing.length > 0)
    .map(([market, missing]) => `${market}: ${missing.join(', ')}`);
  const features = missingKeys(status?.features);
  if (features.length > 0) lines.push(`Features: ${features.join(', ')}`);
  if (lines.length === 0) return null;
  return (
    <Notice tone="warning" className="mb-3">
      <p className="font-semibold">Not yet published</p>
      {lines.map((line) => <p key={line}>{line}</p>)}
    </Notice>
  );
}

function FreshnessRow({ summary }) {
  const completeness = summary.completeness_distribution;
  const drift = summary.universe_drift;

  return (
    <tr>
      <td className={TD}>{summary.market}</td>
      <td className={cn(TD, 'tabular-nums')}>{formatLagSeconds(summary.freshness_lag?.lag_seconds)}</td>
      <td className={cn(TD, 'tabular-nums')}>{formatLagSeconds(summary.benchmark_age?.age_seconds)}</td>
      <td className={cn(TD, 'tabular-nums')}>
        <span className="inline-flex items-center gap-2">
          <span>{drift?.current_size ?? '—'}</span>
          {drift?.delta != null && drift.delta !== 0 && (
            <Badge tone={Math.abs(drift.delta) > (drift.prior_size || 1) * 0.05 ? 'warning' : 'neutral'}>
              {`${drift.delta > 0 ? '+' : ''}${drift.delta}`}
            </Badge>
          )}
        </span>
      </td>
      <td className={cn(TD, 'tabular-nums')}>
        {completeness?.bucket_counts && completeness?.symbols_total
          ? `${Math.round((completeness.bucket_counts['0-25'] / completeness.symbols_total) * 100)}%`
          : '—'}
      </td>
    </tr>
  );
}

function Table({ head, children, minWidth }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm" style={minWidth ? { minWidth } : undefined}>
        <thead>
          <tr>
            {head.map((label) => <th key={label} scope="col" className={TH}>{label}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function FreshnessTable({ summaries }) {
  return (
    <Table head={['Market', 'Freshness', 'Benchmark age', 'Universe', 'Low completeness 0-25']}>
      {summaries.map((summary) => (
        <FreshnessRow key={summary.market} summary={summary} />
      ))}
    </Table>
  );
}

// Declaration order is display order. `badge` returns a count, or '!' when its data failed to load; zero shows none.
const TABS = [
  { id: 'overview', label: 'Overview', show: () => true },
  { id: 'jobs', label: 'Jobs', show: () => true, badge: ({ stuckJobs, jobsFailed }) => (jobsFailed ? '!' : stuckJobs) },
  { id: 'schedules', label: 'Schedules', show: ({ features }) => Boolean(features.tasks) },
  { id: 'alerts', label: 'Alerts', show: () => true, badge: ({ openAlerts, alertsFailed }) => (alertsFailed ? '!' : openAlerts) },
  { id: 'sources', label: 'Sources', show: () => true, badge: ({ failingSourceCount, sourcesFailed }) => (sourcesFailed ? '!' : failingSourceCount) },
  { id: 'exposure', label: 'Exposure research', show: ({ features }) => Boolean(features.themes) },
];

const LEASE_ANCHOR = 'lease-status';

// The Schedules tab links to #lease-status, which lives on the Jobs tab.
// Visibility is checked at render, not here: features can load after the hash
// is read, and #schedules should still open once tasks turn on.
function parseHash(hash) {
  const value = hash.replace(/^#/, '');
  if (value === LEASE_ANCHOR) return { id: 'jobs', jumpToLease: true };
  return { id: value, jumpToLease: false };
}

// The router's location is the only tab state, so any navigation selects the
// tab: a tab click, a #lease-status anchor, or a nav link to bare /operations.
function useHashTab(visibleIds) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id, jumpToLease } = parseHash(location.hash);
  const activeId = visibleIds.includes(id) ? id : 'overview';

  useEffect(() => {
    if (jumpToLease && activeId === 'jobs') {
      document.getElementById(LEASE_ANCHOR)?.scrollIntoView?.();
    }
  }, [location.key, jumpToLease, activeId]);

  const select = (next) => navigate({ search: location.search, hash: next }, { replace: true, state: location.state });
  return [activeId, select];
}

// Tab list with the ARIA tabs keyboard pattern (arrows, Home, End move and
// select). Plain buttons because the tab is the URL hash, set on click.
function SectionTabs({ tabs, activeId, onSelect, context }) {
  const listRef = useRef(null);
  const focusTab = (id) => listRef.current?.querySelector(`#ops-tab-${id}`)?.focus();
  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === activeId);
    const next = {
      ArrowRight: tabs[(index + 1) % tabs.length],
      ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    onSelect(next.id);
    focusTab(next.id);
  };
  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Operations sections"
      onKeyDown={onKeyDown}
      className="flex gap-1 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        const count = tab.badge?.(context);
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`ops-tab-${tab.id}`}
            aria-controls={`ops-panel-${tab.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            className={cn(
              '-mb-px inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10',
              selected ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <span>{tab.label}</span>
            {count ? <Badge tone="loss" className="h-5">{count}</Badge> : null}
          </button>
        );
      })}
    </div>
  );
}

// Every visible panel stays mounted and is hidden with `hidden`: the social
// and exposure panels hold an admin key in state, and job filters and dialogs
// must survive a tab switch.
function TabPanel({ id, activeId, visibleIds, children }) {
  if (!visibleIds.includes(id)) return null;
  return (
    <div
      role="tabpanel"
      id={`ops-panel-${id}`}
      aria-labelledby={`ops-tab-${id}`}
      hidden={id !== activeId}
      tabIndex={0}
      className="pt-4 outline-none"
    >
      {children}
    </div>
  );
}

function MarketActivityCard({ activity }) {
  const showProgress = activity.status === 'running' || activity.status === 'queued';
  const progressValue = resolveDeterminatePercent(activity.percent, activity.current, activity.total);

  return (
    <Card className="min-w-[260px] flex-[1_1_280px] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{activity.market}</span>
        <span className="flex gap-1.5">
          <Badge>{activity.lifecycle || 'idle'}</Badge>
          <Badge tone={ACTIVITY_STATUS_TONE[activity.status] || 'neutral'}>{activity.status || 'idle'}</Badge>
        </span>
      </div>
      <p className="mb-1 text-sm font-semibold">{activity.stage_label || 'Idle'}</p>
      <p className="min-h-10 text-sm text-muted-foreground">{activity.message || 'No active work for this market.'}</p>
      {showProgress && (
        <div className="mt-3">
          <ProgressBar value={progressValue} label={`${activity.market} progress`} />
          <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
            {progressValue != null
              ? `${Math.round(progressValue)}%`
              : 'Progress pending'}{activity.current != null && activity.total != null
              ? ` · ${activity.current}/${activity.total}`
              : ''}
          </p>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Task: {activity.task_name || '—'}</p>
      <p className="text-xs text-muted-foreground tabular-nums">Updated: {formatTimestamp(activity.updated_at)}</p>
    </Card>
  );
}

function AlertsTable({ alerts, onAcknowledge }) {
  if (alerts.length === 0) {
    return <EmptyNote>No active alerts.</EmptyNote>;
  }
  return (
    <Table head={['Severity', 'State', 'Market', 'Metric', 'Owner', 'Opened', 'Description', 'Action']} minWidth={900}>
      {alerts.map((alert) => (
        <tr key={alert.id}>
          <td className={TD}><Badge tone={SEVERITY_TONE[alert.severity] || 'neutral'}>{alert.severity}</Badge></td>
          <td className={TD}><Badge tone={STATE_TONE[alert.state] || 'neutral'}>{alert.state}</Badge></td>
          <td className={TD}>{alert.market}</td>
          <td className={TD}>{alert.metric_key}</td>
          <td className={TD}>{alert.owner || '—'}</td>
          <td className={cn(TD, 'whitespace-nowrap tabular-nums')}>{alert.opened_at?.slice(0, 19).replace('T', ' ') || '—'}</td>
          <td className={TD}>{alert.description}</td>
          <td className={TD}>
            {alert.state === 'open' ? (
              <Button variant="secondary" size="sm" onClick={() => onAcknowledge(alert.id)}>Ack</Button>
            ) : (
              <span className="text-xs text-muted-foreground">{alert.acknowledged_by || ''}</span>
            )}
          </td>
        </tr>
      ))}
    </Table>
  );
}

function MarketLease({ market, holder }) {
  return (
    <div>
      <p className="text-sm"><strong>{market}:</strong> {holder?.task_name || 'idle'}</p>
      <p className="text-xs text-muted-foreground">
        {holder?.task_id ? `Task ID: ${holder.task_id}` : 'No active workload lease'}
      </p>
    </div>
  );
}

function LeaseCard({ title, className, children }) {
  return (
    <Card className={cn('min-w-[260px] p-4', className)}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </Card>
  );
}

function LeaseSummary({ leases, onReleaseChain, releasingToken, activeMarkets }) {
  const externalHolder = leases?.external_fetch_global;
  const marketLeases = splitByMarket(Object.entries(leases?.market_workload || {}), ([market]) => market, activeMarkets);
  const chainClaims = Object.entries(leases?.pipeline_chain || {});

  return (
    <div className="flex flex-wrap gap-4">
      <LeaseCard title="External Fetch Lease" className="flex-[1_1_280px]">
        {externalHolder ? (
          <>
            <p className="text-sm">{externalHolder.task_name || 'unknown task'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Task ID: {externalHolder.task_id || '—'}</p>
            <p className="text-xs text-muted-foreground tabular-nums">Started: {formatTimestamp(externalHolder.started_at)}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No task currently holds the external fetch lease.</p>
        )}
      </LeaseCard>
      <LeaseCard title="Market Workload Leases" className="flex-[1_1_320px]">
        <div className="flex flex-col gap-2">
          {marketLeases.shown.map(([market, holder]) => (
            <MarketLease key={market} market={market} holder={holder} />
          ))}
        </div>
        <InactiveMarkets markets={marketLeases.hiddenMarkets}>
          <div className="flex flex-col gap-2">
            {marketLeases.hidden.map(([market, holder]) => (
              <MarketLease key={market} market={market} holder={holder} />
            ))}
          </div>
        </InactiveMarkets>
      </LeaseCard>
      <LeaseCard title="Pipeline Chain Claims" className="flex-[1_1_320px]">
        {chainClaims.length ? (
          <div className="flex flex-col gap-2">
            {chainClaims.map(([market, claim]) => (
              <div key={market} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm"><strong>{market}:</strong> daily pipeline</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Since {formatTimestamp(claim.started_at)} · expires in {formatLagSeconds(claim.ttl_seconds)}
                  </p>
                  <p className="text-xs text-muted-foreground">Claim: {claim.task_id}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-loss"
                  onClick={() => onReleaseChain({ market, token: claim.task_id })}
                  disabled={!claim.task_id || releasingToken === claim.task_id}
                  aria-label={`Release ${market} pipeline chain claim`}
                >
                  {releasingToken === claim.task_id ? 'Working…' : 'Release'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pipeline chain claims are held.</p>
        )}
      </LeaseCard>
    </div>
  );
}

function QueueSummaryTable({ queues }) {
  if (!queues?.length) {
    return <p className="text-sm text-muted-foreground">No queue data available.</p>;
  }

  return (
    <Table head={['Queue', 'Depth', 'Oldest', 'Workers']}>
      {queues.map((queue) => (
        <tr key={queue.queue}>
          <td className={TD}>{queue.queue}</td>
          <td className={cn(TD, 'tabular-nums')}>{queue.depth}</td>
          <td className={cn(TD, 'tabular-nums')}>{formatLagSeconds(queue.oldest_age_seconds)}</td>
          <td className={cn(TD, 'tabular-nums')}>
            {/* null: no worker answered, so unknown rather than unserved. */}
            {queue.consumers === 0 && queue.depth > 0 ? (
              <Badge tone="loss">No worker</Badge>
            ) : (
              queue.consumers ?? '—'
            )}
          </td>
        </tr>
      ))}
    </Table>
  );
}

function WorkerStatusTable({ workers }) {
  if (!workers?.length) {
    return <p className="text-sm text-muted-foreground">No worker inspect data available.</p>;
  }

  return (
    <Table head={['Worker', 'Status', 'Queues', 'Active', 'Reserved', 'Scheduled']} minWidth={620}>
      {workers.map((worker) => (
        <tr key={worker.worker}>
          <td className={cn(TD, 'whitespace-nowrap')}>{worker.worker}</td>
          <td className={TD}>
            <Badge tone={worker.status === 'online' ? 'gain' : 'warning'}>{worker.status}</Badge>
          </td>
          <td className={TD}>{worker.queues?.join(', ') || '—'}</td>
          <td className={cn(TD, 'tabular-nums')}>{worker.active}</td>
          <td className={cn(TD, 'tabular-nums')}>{worker.reserved}</td>
          <td className={cn(TD, 'tabular-nums')}>{worker.scheduled}</td>
        </tr>
      ))}
    </Table>
  );
}

// One rule for every section built from the jobs request. With no data, a
// failed request says so: empty fallbacks would read as "nothing holds the
// lease". After a success, a failed refetch keeps the last data (a blip should
// not hide lease state) and says it may be stale.
function JobsData({ query, children }) {
  if (!query.data) {
    return query.isError ? (
      <p className="text-sm text-loss">Failed to load Operations job inventory.</p>
    ) : (
      <Spinner label="Loading jobs" />
    );
  }
  return (
    <>
      {query.isError && (
        <p className="mb-2 text-xs text-warning">
          Couldn&apos;t refresh. Showing the last known status from{' '}
          {/* Date and time: the last data can be from yesterday (an open tab). */}
          {formatTimestamp(new Date(query.dataUpdatedAt).toISOString())}.
        </p>
      )}
      {children}
    </>
  );
}

function JobsTable({ jobs, onCancel, cancellingTaskId, cancelInFlight }) {
  if (!jobs.length) {
    return <EmptyNote>No queued or running jobs match the current filters.</EmptyNote>;
  }

  return (
    <Table head={['Task', 'State', 'Queue', 'Market', 'Worker', 'Progress', 'Age', 'Blocker', 'Heartbeat', 'Action']} minWidth={1100}>
      {jobs.map((job) => {
        const canCancel = Boolean(CANCEL_ACTIONS[job.cancel_strategy]);
        // Stays until the job leaves the inventory, unless a different action now applies.
        const cancelRequested = job.cancel_requested_at
          && job.cancel_requested_strategy === job.cancel_strategy;
        const isCancelling = cancelInFlight && cancellingTaskId === job.task_id;
        const progressValue = resolveDeterminatePercent(job.percent, job.current, job.total);
        const hasDeterminateProgress = job.progress_mode === 'determinate' && progressValue != null;
        return (
          <tr key={job.task_id}>
            <td className={TD}>
              <p>{job.display_name || job.task_name}</p>
              {job.display_name && <p className="text-xs text-muted-foreground">{job.task_name}</p>}
              <p className="text-xs break-all text-muted-foreground">{job.task_id}</p>
            </td>
            <td className={TD}><Badge tone={JOB_STATE_TONE[job.state] || 'neutral'}>{job.state}</Badge></td>
            <td className={TD}>{job.queue || '—'}</td>
            <td className={TD}>{job.market || '—'}</td>
            <td className={cn(TD, 'whitespace-nowrap')}>{job.worker || '—'}</td>
            <td className={cn(TD, 'min-w-[220px]')}>
              {hasDeterminateProgress ? (
                <div className="min-w-[180px]">
                  <ProgressBar value={progressValue} label={`${job.task_name} progress`} />
                  <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                    {`${Math.round(progressValue)}%`}{job.current != null && job.total != null
                      ? ` · ${job.current}/${job.total}`
                      : ''}
                  </p>
                  {job.message && <p className="text-xs text-muted-foreground">{job.message}</p>}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{job.message || 'Progress pending'}</span>
              )}
            </td>
            <td className={cn(TD, 'tabular-nums')}>{formatLagSeconds(job.age_seconds)}</td>
            <td className={TD}><Blocker job={job} /></td>
            <td className={cn(TD, 'tabular-nums')}>{formatLagSeconds(job.heartbeat_lag_seconds)}</td>
            <td className={TD}>
              {cancelRequested ? (
                <span className="text-xs text-warning" title={formatTimestamp(job.cancel_requested_at)}>
                  Cancel requested
                </span>
              ) : canCancel ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className={CANCEL_ACTIONS[job.cancel_strategy].danger ? 'text-loss' : undefined}
                  onClick={() => onCancel(job)}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Working…' : formatCancelLabel(job.cancel_strategy)}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">{formatCancelLabel(job.cancel_strategy)}</span>
              )}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

// Confirm dialog for a job action or a claim release: Back, then the action.
function ConfirmDialog({ open, onClose, title, danger, confirmLabel, onConfirm, children }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        title={title}
        size="sm"
        footer={(
          <>
            <DialogClose asChild><Button variant="ghost" size="sm">Back</Button></DialogClose>
            <Button variant={danger ? 'destructive' : 'primary'} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
          </>
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default function OperationsPage() {
  const queryClient = useQueryClient();
  const [ackError, setAckError] = useState(null);
  const [jobActionError, setJobActionError] = useState(null);
  const [stateFilter, setStateFilter] = useState('all');
  const [queueFilter, setQueueFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');
  const activityQuery = useRuntimeActivity();
  // Exposure routes are registered only with the themes feature.
  const { features, enabledMarkets, supportedMarkets, deploymentMarkets } = useRuntime();

  const alertsQuery = useQuery({
    queryKey: ['telemetry', 'alerts'],
    queryFn: () => fetchAlerts({ evaluate: true }),
    refetchInterval: POLL_MS,
  });

  const bootstrapStatusQuery = useQuery({
    queryKey: ['runtime', 'bootstrapStatus'],
    queryFn: getBootstrapStatus,
    refetchInterval: POLL_MS,
  });

  const jobsQuery = useQuery({
    queryKey: ['operations', 'jobs'],
    queryFn: fetchOperationsJobs,
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs || [];
      return jobs.some((job) => ACTIVE_JOB_STATES.has(job.state)) ? 5000 : POLL_MS;
    },
    retry: 1,
  });

  // The same cached list SchedulesSection polls; coverage reads each market's
  // daily pipeline run from it.
  const tasksQuery = useQuery({
    queryKey: ['scheduledTasks'],
    queryFn: getScheduledTasks,
    enabled: Boolean(features.tasks),
  });

  const contentSourcesQuery = useContentSources({ enabled: Boolean(features.themes) });
  const failingSourceCount = failingSources(contentSourcesQuery.data).length;

  const ackMutation = useMutation({
    mutationFn: (alertId) => acknowledgeAlert(alertId, 'operator'),
    onSuccess: () => {
      setAckError(null);
      queryClient.invalidateQueries({ queryKey: ['telemetry', 'alerts'] });
    },
    onError: (err) => setAckError(err?.response?.data?.detail || err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ taskId, expectedStrategy }) => cancelOperationsJob(taskId, expectedStrategy),
    onSuccess: (payload) => {
      setJobActionError(null);
      if (payload.status !== 'accepted') {
        setJobActionError(payload.message);
      }
    },
    // A 409 means the job moved since it was shown: say so and refresh.
    onError: (err) => setJobActionError(err?.response?.data?.detail || err.message),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['runtimeActivity'] });
    },
  });
  const releaseChainMutation = useMutation({
    mutationFn: ({ market, token }) => releasePipelineChain(market, token),
    onSuccess: (payload) => setJobActionError(payload.status === 'accepted' ? null : payload.message),
    onError: (err) => setJobActionError(err?.response?.data?.detail || err.message),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'jobs'] });
      // A released claim re-enables that pipeline's Run (its run_blocker).
      queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
    },
  });
  const [confirmChain, setConfirmChain] = useState(null);
  const [confirmJob, setConfirmJob] = useState(null);
  const confirmAction = confirmJob ? CANCEL_ACTIONS[confirmJob.cancel_strategy] : null;

  const summaries = alertsQuery.data?.summaries || [];
  const alerts = alertsQuery.data?.alerts || [];
  const marketActivity = activityQuery.data?.markets || [];
  const bootstrap = activityQuery.data?.bootstrap;
  const hasMarketActivity = marketActivity.length > 0;
  const jobsPayload = jobsQuery.data;
  const jobs = jobsPayload?.jobs ?? EMPTY_ARRAY;
  const queues = jobsPayload?.queues ?? EMPTY_ARRAY;
  const workers = jobsPayload?.workers ?? EMPTY_ARRAY;
  const leases = jobsPayload?.leases ?? EMPTY_LEASES;
  // Until the jobs data loads (or while it fails) this is the enabled markets
  // and open alerts alone, so a worker-served market such as CN waits behind
  // the disclosure until it does.
  const activeMarkets = findActiveMarkets({ enabledMarkets, supportedMarkets, jobsPayload, alerts });
  const queueSplit = splitByMarket(queues, (queue) => queueMarket(queue.queue, supportedMarkets), activeMarkets);
  const summarySplit = splitByMarket(summaries, (summary) => summary.market, activeMarkets);

  const queueOptions = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.queue).filter(Boolean))).sort(),
    [jobs]
  );
  const marketOptions = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.market).filter(Boolean))).sort(),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const normalizedSearch = taskSearch.trim().toLowerCase();
    return jobs.filter((job) => {
      if (stateFilter !== 'all' && job.state !== stateFilter) return false;
      if (queueFilter !== 'all' && job.queue !== queueFilter) return false;
      if (marketFilter !== 'all' && job.market !== marketFilter) return false;
      if (!normalizedSearch) return true;
      return [
        job.display_name,
        job.task_name,
        job.task_id,
        job.queue,
        job.market,
        job.worker,
        job.wait_reason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [jobs, stateFilter, queueFilter, marketFilter, taskSearch]);

  const stuckJobs = jobs.filter((job) => job.state === 'stuck').length;
  const openAlerts = alerts.filter((alert) => alert.state === 'open').length;
  const tabContext = {
    features,
    stuckJobs,
    openAlerts,
    failingSourceCount,
    jobsFailed: jobsQuery.isError,
    alertsFailed: alertsQuery.isError,
    sourcesFailed: contentSourcesQuery.isError,
  };
  const visibleTabs = TABS.filter((tab) => tab.show(tabContext));
  const visibleIds = visibleTabs.map((tab) => tab.id);
  const [activeId, selectTab] = useHashTab(visibleIds);

  return (
    <div className="tw py-2">
      <h1 className="text-xl font-semibold">Operations</h1>
      <p className="mb-3 text-sm text-muted-foreground">
        Per-market telemetry, live queue inventory, and safe background-job controls.
      </p>

      <SectionTabs tabs={visibleTabs} activeId={activeId} onSelect={selectTab} context={tabContext} />

      <TabPanel id="overview" activeId={activeId} visibleIds={visibleIds}>
        <MarketCoverage
          markets={(supportedMarkets ?? []).filter((market) => activeMarkets.has(market))}
          enabledMarkets={enabledMarkets}
          deploymentMarkets={deploymentMarkets}
          queues={queues}
          tasks={features.tasks ? tasksQuery.data?.tasks : null}
        />

        <h2 className={H2}>Market activity</h2>
        {bootstrap?.background_warning && (
          <p className="mb-3 text-sm text-muted-foreground">{bootstrap.background_warning}</p>
        )}
        {bootstrapStatusQuery.isError && (
          <p className="mb-3 text-sm text-loss">
            {bootstrapStatusQuery.data
              ? 'Failed to refresh publication status. Showing last known status.'
              : 'Failed to load publication status.'}
          </p>
        )}
        <UnpublishedDataAlert status={bootstrapStatusQuery.data} />
        {activityQuery.isLoading && !hasMarketActivity ? (
          <Spinner label="Loading runtime activity" />
        ) : (
          <>
            {activityQuery.isError && (
              <p className="mb-3 text-sm text-loss">Failed to refresh runtime activity. Showing last known status.</p>
            )}
            {hasMarketActivity ? (
              <div className="mb-6 flex flex-wrap gap-4">
                {marketActivity.map((activity) => (
                  <MarketActivityCard key={activity.activity_id ?? activity.market} activity={activity} />
                ))}
              </div>
            ) : (
              !activityQuery.isLoading && (
                <p className={cn('text-sm', activityQuery.isError ? 'text-loss' : 'text-muted-foreground')}>
                  {activityQuery.isError
                    ? 'Failed to load runtime activity.'
                    : 'No runtime activity available.'}
                </p>
              )
            )}
          </>
        )}

        <h2 className={H2}>Data freshness</h2>
        {alertsQuery.isLoading ? (
          <Spinner label="Loading telemetry" />
        ) : alertsQuery.isError ? (
          <p className="text-sm text-loss">Failed to load telemetry summaries. Check backend connectivity.</p>
        ) : (
          <>
            <FreshnessTable summaries={summarySplit.shown} />
            <InactiveMarkets markets={summarySplit.hiddenMarkets}>
              <FreshnessTable summaries={summarySplit.hidden} />
            </InactiveMarkets>
          </>
        )}
      </TabPanel>

      <TabPanel id="jobs" activeId={activeId} visibleIds={visibleIds}>
        <h2 className="mb-1 text-base font-semibold">Job console</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Shows queued, waiting, reserved, running, stale, and stuck jobs across all Celery queues.
        </p>
        {jobActionError && <Notice tone="warning" className="mb-3">{jobActionError}</Notice>}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <NativeSelect label="State" value={stateFilter} onChange={setStateFilter} className="w-40">
            <option value="all">All states</option>
            {['queued', 'waiting', 'reserved', 'running', 'stale', 'stuck', 'failed', 'cancelled'].map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </NativeSelect>
          <NativeSelect label="Queue" value={queueFilter} onChange={setQueueFilter} className="w-48">
            <option value="all">All queues</option>
            {queueOptions.map((queue) => <option key={queue} value={queue}>{queue}</option>)}
          </NativeSelect>
          <NativeSelect label="Market" value={marketFilter} onChange={setMarketFilter} className="w-40">
            <option value="all">All markets</option>
            {marketOptions.map((market) => <option key={market} value={market}>{market}</option>)}
          </NativeSelect>
          <label className="flex min-w-60 flex-col gap-0.5">
            <span className="text-[11px] font-medium text-muted-foreground">Task search</span>
            <input
              type="search"
              value={taskSearch}
              onChange={(event) => setTaskSearch(event.target.value)}
              className="h-11 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8"
            />
          </label>
        </div>
        <JobsData query={jobsQuery}>
          <JobsTable
            jobs={filteredJobs}
            onCancel={setConfirmJob}
            cancellingTaskId={cancelMutation.variables?.taskId}
            cancelInFlight={cancelMutation.isPending}
          />
        </JobsData>
        <ConfirmDialog
          open={Boolean(confirmAction)}
          onClose={() => setConfirmJob(null)}
          title={confirmAction?.label}
          danger={confirmAction?.danger}
          confirmLabel={confirmAction?.label}
          onConfirm={() => {
            cancelMutation.mutate({
              taskId: confirmJob.task_id,
              expectedStrategy: confirmJob.cancel_strategy,
            });
            setConfirmJob(null);
          }}
        >
          <p className="text-sm">{confirmAction?.detail}</p>
          <p className="mt-2 text-xs break-all text-muted-foreground">
            {confirmJob?.task_name} · {confirmJob?.task_id} · {confirmJob?.state}
          </p>
        </ConfirmDialog>

        {/* Anchor for "See its claim in Lease status" (Scheduled jobs); the
            heading renders even while the jobs data loads or fails. */}
        <h2 id="lease-status" className={H2}>Lease status</h2>
        <JobsData query={jobsQuery}>
          <LeaseSummary
            leases={leases}
            onReleaseChain={setConfirmChain}
            releasingToken={releaseChainMutation.isPending ? releaseChainMutation.variables?.token : null}
            activeMarkets={activeMarkets}
          />
        </JobsData>
        <ConfirmDialog
          open={Boolean(confirmChain)}
          onClose={() => setConfirmChain(null)}
          title={`Release ${confirmChain?.market ?? ''} pipeline chain claim`}
          danger
          confirmLabel="Release"
          onConfirm={() => {
            releaseChainMutation.mutate(confirmChain);
            setConfirmChain(null);
          }}
        >
          <p className="text-sm">
            The claim stops a second daily pipeline from starting while one is in progress. Release it only
            if that market&apos;s pipeline stages are gone from the job console (for example, a stage was
            revoked); otherwise the next Run starts a second pipeline alongside the first.
          </p>
        </ConfirmDialog>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row">
          <section className="min-w-0 flex-1">
            <h2 className="mb-2 text-base font-semibold">Queues</h2>
            <JobsData query={jobsQuery}>
              <QueueSummaryTable queues={queueSplit.shown} />
              <InactiveMarkets markets={queueSplit.hiddenMarkets}>
                <QueueSummaryTable queues={queueSplit.hidden} />
              </InactiveMarkets>
            </JobsData>
          </section>
          <section className="min-w-0 flex-1">
            <h2 className="mb-2 text-base font-semibold">Workers</h2>
            <JobsData query={jobsQuery}>
              <WorkerStatusTable workers={workers} />
            </JobsData>
          </section>
        </div>
      </TabPanel>

      <TabPanel id="schedules" activeId={activeId} visibleIds={visibleIds}>
        <SchedulesSection activeMarkets={activeMarkets} />
      </TabPanel>

      <TabPanel id="alerts" activeId={activeId} visibleIds={visibleIds}>
        {ackError && <p className="mb-2 text-xs text-loss">Acknowledge failed: {ackError}</p>}
        {alertsQuery.isLoading ? (
          <Spinner label="Loading alerts" />
        ) : alertsQuery.isError ? (
          <p className="text-sm text-loss">Failed to load alerts.</p>
        ) : (
          <AlertsTable alerts={alerts} onAcknowledge={(id) => ackMutation.mutate(id)} />
        )}
      </TabPanel>

      <TabPanel id="sources" activeId={activeId} visibleIds={visibleIds}>
        {features.themes && <ThemeSourceHealth />}
        <SocialSignalHealthPanel />
      </TabPanel>

      <TabPanel id="exposure" activeId={activeId} visibleIds={visibleIds}>
        <ExposureResearchWorkspace />
      </TabPanel>
    </div>
  );
}
