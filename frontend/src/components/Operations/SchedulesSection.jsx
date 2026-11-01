/**
 * Scheduled jobs on the Operations page (replaces the header gear modal).
 *
 * Run status comes from the server's task history, which the worker writes
 * (#588), so a run started here or by Beat shows up here whether or not this
 * page was open; there is no client-side tracking of triggered runs.
 */
import { useEffect, useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Play } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';

import { getScheduledTasks, triggerTask } from '../../api/tasks';
import { useIsMobileShell } from '../Layout/shellNav';
import InactiveMarkets from './InactiveMarkets';
import { splitByMarket } from './activeMarkets';

const ACTIVE_STATUSES = new Set(['queued', 'running']);
// Last runs that need a look: never tucked away with an inactive market.
const ATTENTION_STATUSES = new Set(['queued', 'running', 'failed', 'lost']);
// A run still queued after this has likely lost its message or has no worker
// on its queue. Run stays blocked (its message may still be in the broker, so
// queueing another would run the job twice); the note points to the cancel.
const STALE_QUEUED_MS = 10 * 60 * 1000;

const STATUS_DISPLAY = {
  completed: { tone: 'gain', label: 'Completed' },
  // The task ran but did nothing (not a trading day, already running, …).
  skipped: { tone: 'neutral', outlined: true, label: 'Skipped' },
  // The task only queued other tasks (the daily pipeline's stage chain).
  dispatched: { tone: 'accent', outlined: true, label: 'Handed off' },
  running: { tone: 'accent', label: 'Running' },
  queued: { tone: 'warning', label: 'Queued' },
  failed: { tone: 'loss', label: 'Failed' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
  // No outcome recorded within Celery's hard time limit: never picked up, or
  // the worker died without a stored result. Not known to have failed, so it
  // is neutral and outlined rather than sharing Queued's amber.
  lost: { tone: 'neutral', outlined: true, label: 'Unknown' },
};

const TONE_CLASS = {
  gain: { filled: 'bg-gain/15 text-gain', outlined: 'border-gain/50 text-gain' },
  accent: { filled: 'bg-accent/15 text-accent', outlined: 'border-accent/50 text-accent' },
  warning: { filled: 'bg-warning/15 text-warning', outlined: 'border-warning/50 text-warning' },
  loss: { filled: 'bg-loss/15 text-loss', outlined: 'border-loss/50 text-loss' },
  neutral: { filled: 'bg-surface-subtle text-muted-foreground', outlined: 'border-border text-muted-foreground' },
};

const NOTE_CLASS = { error: 'text-loss', warning: 'text-warning', muted: 'text-muted-foreground' };

const TH = 'border-b border-border px-2 py-1.5 text-left font-medium text-muted-foreground';
const TD = 'border-b border-border px-2 py-2 align-top';

function ageMs(dateString) {
  return Date.now() - new Date(dateString).getTime();
}

function ageLabel(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h`;
  return `${minutes}m`;
}

function formatRelativeTime(dateString) {
  const ms = ageMs(dateString);
  if (Number.isNaN(ms)) return '—';
  if (ms < 60000) return 'Just now';
  return `${ageLabel(ms)} ago`;
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function isStaleQueued(run) {
  return run?.status === 'queued' && ageMs(run.started_at) >= STALE_QUEUED_MS;
}

// Jobs whose queue the job console does not read (OperationsJobService
// .broker_queue_names), so a queued run cannot be cancelled from there.
const NOT_IN_JOB_CONSOLE = new Set(['social-signal-refresh']);

// How to clear a run stuck in the queue so Run works again.
function stuckRecovery(taskName) {
  return NOT_IN_JOB_CONSOLE.has(taskName)
    ? 'Start the social worker to let it run.'
    : 'Cancel it in the job console to run it again.';
}

// A lost run that never started whose message may still be in the broker:
// queueing another would run the job twice once a worker picks both up.
// still_queued is null when the broker could not be read.
function lostButMaybeQueued(run) {
  return run?.status === 'lost' && run.lost_from === 'queued' && run.still_queued !== false;
}

// The message may sit in a queue (the console can cancel it) or be held by a
// stopped worker (it runs once a worker restores it), so name both ways out.
function lostQueuedReason(task) {
  if (task.last_run.still_queued !== true) {
    return 'Not picked up. Could not check whether it is still queued; try again shortly.';
  }
  return NOT_IN_JOB_CONSOLE.has(task.name)
    ? 'Not picked up, and its message is still waiting. Start the social worker to let it run.'
    : 'Not picked up, and its message is still waiting. It runs once a worker takes it, or cancel it in the job console to run it again.';
}

const PIPELINE_ACTIVE = 'market_pipeline_already_active';

// The server's pre-flight answer (run_blocker): why a Run would only read
// Skipped right now, e.g. not a trading day or the market's pipeline is mid-chain.
function preflightReason(task) {
  const blocker = task.run_blocker;
  if (!blocker) return null;
  if (blocker.reason === PIPELINE_ACTIVE) {
    return blocker.active_since
      ? `Pipeline in progress since ${new Date(blocker.active_since).toLocaleString()}`
      : 'Pipeline in progress';
  }
  return blocker.message || humanizeReason(blocker.reason);
}

// Why Run is unavailable for this job, or null when it may run again.
function runBlockedReason(task) {
  const run = task.last_run;
  if (run?.status === 'running') return 'Already running';
  if (isStaleQueued(run)) return `Still queued. ${stuckRecovery(task.name)}`;
  if (run?.status === 'queued') return 'Already queued';
  if (lostButMaybeQueued(run)) return lostQueuedReason(task);
  return preflightReason(task);
}

function MiniSpinner() {
  return <span aria-hidden="true" className="size-3 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />;
}

// Shown whatever the last run was (or with none): the pre-flight reason,
// and for a running pipeline where to see or release its claim.
function PreflightNote({ task }) {
  const reason = preflightReason(task);
  if (!reason) return null;
  return (
    <p className="mt-1 max-w-80 text-xs text-muted-foreground">
      {reason}.
      {task.run_blocker.reason === PIPELINE_ACTIVE && (
        <>
          {' '}
          <a href="#lease-status" className="text-accent hover:underline">See its claim in Lease status</a>.
        </>
      )}
    </p>
  );
}

function LastRun({ run }) {
  if (!run) return <span className="text-sm text-muted-foreground">Never</span>;
  const when = run.started_at ? formatRelativeTime(run.started_at) : '—';
  const label = run.duration_seconds != null ? `${when} · ${formatDuration(run.duration_seconds)}` : when;
  return (
    <span className="text-sm tabular-nums" title={run.triggered_by ? `Triggered: ${run.triggered_by}` : undefined}>
      {label}
    </span>
  );
}

function statusChipClass(display) {
  const tone = TONE_CLASS[display?.tone ?? 'neutral'];
  return display && !display.outlined
    ? cn('border-transparent', tone.filled)
    : cn('bg-transparent', tone.outlined);
}

function StatusChip({ run }) {
  const display = STATUS_DISPLAY[run.status] || { tone: 'neutral', label: run.status };
  return (
    <span
      data-tone={display.tone}
      data-variant={display.outlined ? 'outlined' : 'filled'}
      className={cn('inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap', statusChipClass(display))}
    >
      {ACTIVE_STATUSES.has(run.status) && <MiniSpinner />}
      {display.label}
    </span>
  );
}

// The failure message, or what to do about a run stuck in the queue.
// 'not_trading_day' -> 'Not trading day'; free-text reasons pass through.
function humanizeReason(reason) {
  const text = String(reason).replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function statusNote(task) {
  const run = task.last_run;
  if (run?.status === 'failed') return [run.error_message, 'error'];
  if (isStaleQueued(run)) {
    return [`Not picked up for ${ageLabel(ageMs(run.started_at))}. ${stuckRecovery(task.name)}`, 'warning'];
  }
  if (lostButMaybeQueued(run)) return [lostQueuedReason(task), 'warning'];
  if (run?.status === 'lost' && run.lost_from === 'queued') {
    // Usually never started; a worker whose start write failed also lands here.
    return ['No outcome recorded, and no message is waiting. Run it again.', 'muted'];
  }
  if (run?.status === 'lost' && run.lost_from === 'running') {
    return ['Started, but no result was recorded (the worker may have stopped). Run it again.', 'muted'];
  }
  if (run?.status === 'skipped' && run.detail) return [humanizeReason(run.detail), 'muted'];
  if (run?.status === 'dispatched') {
    // While the chain holds its claim, the pre-flight disables Run and says so
    // (PreflightNote), so no duplicate warning is needed here.
    return ['Stages queued. Follow them in Market activity and the job console.', 'muted'];
  }
  return [null, null];
}

// The failure message, why a run skipped, where handed-off work went, or
// what to do about a run stuck in the queue.
function StatusNote({ task }) {
  const [note, tone] = statusNote(task);
  if (!note) return null;
  return <p className={cn('mt-1 max-w-80 text-xs [overflow-wrap:anywhere]', NOTE_CLASS[tone])}>{note}</p>;
}

function Status({ task }) {
  return (
    <div>
      {task.last_run ? (
        <>
          <StatusChip run={task.last_run} />
          <StatusNote task={task} />
        </>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )}
      <PreflightNote task={task} />
    </div>
  );
}

function RunButton({ task, pending, onRun }) {
  const blockedReason = runBlockedReason(task);
  return (
    <span title={blockedReason || 'Run this job now'} className="inline-flex">
      <button
        type="button"
        aria-label={`Run ${task.display_name} now`}
        data-tone={task.advanced ? 'danger' : 'default'}
        onClick={() => onRun(task.name)}
        disabled={Boolean(blockedReason) || pending}
        className={cn(
          'grid size-11 cursor-pointer place-items-center rounded-md outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 md:size-8',
          task.advanced ? 'text-loss' : 'text-accent',
        )}
      >
        {pending
          ? <span aria-hidden="true" className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
          : <Play aria-hidden="true" className="size-4" />}
      </button>
    </span>
  );
}

// Per-market registry entries share a job_type; the rest (and rows from an
// older server without job_type) stand alone.
function groupJobs(tasks) {
  const groups = new Map();
  tasks.forEach((task) => {
    const key = task.job_type ?? task.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  });
  return [...groups.values()];
}

const isPerMarket = (group) => group[0].job_type != null && group[0].job_type !== group[0].name;

const jobDescription = (task) => task.job_description ?? task.description;

const withoutMarket = (task) => task.schedule_description.replace(` (${task.market})`, '');

function groupSchedule(group) {
  const schedules = new Set(group.map(withoutMarket));
  return schedules.size === 1 ? [...schedules][0] : 'Varies by market';
}

// Paired with the chip colour so a finished outcome reads without colour too;
// queued and running show a spinner instead.
const STATUS_GLYPH = {
  completed: '✓',
  failed: '✗',
  skipped: '–',
  dispatched: '→',
  cancelled: '⊘',
  lost: '?',
};

function MarketDetail({ task, groupDescription, pending, onRun }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-semibold">{task.display_name}</p>
        <RunButton task={task} pending={pending} onRun={onRun} />
      </div>
      {task.description !== groupDescription && (
        <p className="text-xs text-muted-foreground">{task.description}</p>
      )}
      <p className="text-xs text-muted-foreground">{task.schedule_description}</p>
      {typicalDuration(task) && <p className="text-xs text-muted-foreground">{typicalDuration(task)}</p>}
      <div className="mt-2 flex items-center gap-3">
        {task.last_run && <StatusChip run={task.last_run} />}
        <LastRun run={task.last_run} />
      </div>
      <StatusNote task={task} />
      <PreflightNote task={task} />
    </>
  );
}

// One chip per market; it opens that market's detail and Run in a popover.
function MarketChip({ task, group, open, onOpenChange, pending, onRun }) {
  const run = task.last_run;
  const display = run ? STATUS_DISPLAY[run.status] || { tone: 'neutral', label: run.status } : null;
  // new Date(null) is the epoch, not NaN, so a missing start needs its own check.
  const age = run?.started_at ? ageMs(run.started_at) : NaN;
  const label = run
    ? [task.market, STATUS_GLYPH[run.status], Number.isNaN(age) ? null : ageLabel(age)].filter(Boolean).join(' ')
    : `${task.market} — never`;
  const busy = pending || ACTIVE_STATUSES.has(run?.status);
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger
        aria-label={`${task.display_name}: ${!display ? 'never run'
          : run.started_at ? `${display.label}, ${formatRelativeTime(run.started_at)}` : display.label}`}
        className={cn(
          'inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap tabular-nums outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring',
          statusChipClass(display),
        )}
      >
        {busy && <MiniSpinner />}
        {label}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          aria-label={task.display_name}
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="tw z-toast w-[min(360px,calc(100vw-16px))] rounded-md border border-border bg-surface p-3 text-foreground shadow-lg outline-none"
        >
          <MarketDetail task={task} groupDescription={jobDescription(group[0])} pending={pending} onRun={onRun} />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function MarketChips({ group, pendingNames, onRun }) {
  const [openName, setOpenName] = useState(null);
  // A refetch can move the market to another list (a run puts an inactive
  // market up front); forget it, or its return would reopen the popover.
  const openTask = openName && group.find((item) => item.name === openName);
  useEffect(() => {
    if (openName && !openTask) setOpenName(null);
  }, [openName, openTask]);
  return (
    <div className="flex flex-wrap gap-1">
      {group.map((item) => (
        <MarketChip
          key={item.name}
          task={item}
          group={group}
          open={openName === item.name}
          onOpenChange={(next) => setOpenName(next ? item.name : null)}
          pending={pendingNames.has(item.name)}
          onRun={onRun}
        />
      ))}
    </div>
  );
}

function typicalDuration(task) {
  return task.typical_duration_seconds != null
    ? `Usually takes about ${formatDuration(task.typical_duration_seconds)}.`
    : null;
}

// When to run the job by hand and what a run costs. Per-market rows leave the
// duration to each chip's detail: it differs by market.
function JobFacts({ task, withDuration = true }) {
  const facts = [
    ['When to run it', task.when_to_run],
    ['What it affects', task.impact],
  ].filter(([, text]) => text);
  const duration = withDuration && typicalDuration(task);
  if (!facts.length && !duration) return null;
  return (
    <div className="mt-1 text-xs">
      {facts.map(([label, text]) => (
        <p key={label}><strong>{label}:</strong> {text}</p>
      ))}
      {duration && <p>{duration}</p>}
    </div>
  );
}

// name tells the rows' buttons apart for screen readers; it follows the
// visible text so voice control still matches it.
function JobHelp({ task, name, withDuration }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  if (!task.when_to_run && !task.impact) return null;
  const label = open ? 'Hide details' : 'About this job';
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={detailsId}
        aria-label={`${label}: ${name}`}
        className="cursor-pointer rounded-sm text-xs font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
      </button>
      {open && <div id={detailsId}><JobFacts task={task} withDuration={withDuration} /></div>}
    </div>
  );
}

// The price cache's rule: a fetch before the close plus 30 minutes on a
// trading day may hold a partial bar, which it refetches after the close.
function unsettledWarning(markets) {
  return `Today's session has not settled in ${markets.join(', ')}. `
    + 'Prices a run fetches now count as partial until 30 minutes after the close, and are refetched then.';
}

// Run asks first: what the job does and costs, and whether it would fetch
// prices for a market whose day has not settled.
function RunDialog({ task, open, pending, onCancel, onConfirm }) {
  const blockedReason = task ? runBlockedReason(task) : null;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent
        title={`Run ${task?.display_name ?? ''}?`}
        size="sm"
        footer={(
          <>
            <DialogClose asChild><Button variant="ghost" size="sm">Back</Button></DialogClose>
            <Button
              variant={task?.advanced ? 'destructive' : 'primary'}
              data-tone={task?.advanced ? 'danger' : 'default'}
              size="sm"
              disabled={!task || pending || Boolean(blockedReason)}
              onClick={onConfirm}
            >
              Run
            </Button>
          </>
        )}
      >
        {task && (
          <>
            <p className="text-sm">{task.description}</p>
            <JobFacts task={task} />
            {task.unsettled_markets?.length > 0 && (
              <Notice tone="warning" role="alert" className="mt-3">{unsettledWarning(task.unsettled_markets)}</Notice>
            )}
            {blockedReason && <Notice tone="info" className="mt-3">{blockedReason}</Notice>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function JobsTable({ tasks, pendingNames, onRun }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {['Job', 'Schedule', 'Last run', 'Status'].map((label) => (
              <th key={label} scope="col" className={TH}>{label}</th>
            ))}
            <th scope="col" className={cn(TH, 'text-center')}>Run</th>
          </tr>
        </thead>
        <tbody>
          {groupJobs(tasks).map((group) => {
            const [task] = group;
            const perMarket = isPerMarket(group);
            return (
              <tr key={task.job_type ?? task.name} className="hover:bg-surface-subtle/60">
                <td className={cn(TD, 'max-w-[360px]')}>
                  <p className="font-medium">{perMarket ? task.job_name : task.display_name}</p>
                  <p className="text-xs text-muted-foreground">{perMarket ? jobDescription(task) : task.description}</p>
                  <JobHelp task={task} name={perMarket ? task.job_name : task.display_name} withDuration={!perMarket} />
                </td>
                <td className={TD}>{perMarket ? groupSchedule(group) : task.schedule_description}</td>
                {perMarket ? (
                  <td colSpan={3} className={TD}>
                    <MarketChips group={group} pendingNames={pendingNames} onRun={onRun} />
                  </td>
                ) : (
                  <>
                    <td className={TD}><LastRun run={task.last_run} /></td>
                    <td className={TD}><Status task={task} /></td>
                    <td className={cn(TD, 'text-center')}>
                      <RunButton task={task} pending={pendingNames.has(task.name)} onRun={onRun} />
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Phones: one card per job instead of a five-column table (matches #577).
function JobCards({ tasks, pendingNames, onRun }) {
  return (
    // role="list": WebKit drops list semantics from a ul styled list-style: none.
    <ul role="list" aria-label="Scheduled jobs" className="m-0 list-none p-0">
      {groupJobs(tasks).map((group) => {
        const [task] = group;
        return (
          <li key={task.job_type ?? task.name} className="border-b border-border py-2.5">
            {isPerMarket(group) ? (
              <>
                <p className="mb-1 text-sm font-medium">{task.job_name}</p>
                <MarketChips group={group} pendingNames={pendingNames} onRun={onRun} />
                <p className="mt-1 text-xs text-muted-foreground">{groupSchedule(group)}</p>
                <JobHelp task={task} name={task.job_name} withDuration={false} />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-sm font-medium">{task.display_name}</p>
                  <RunButton task={task} pending={pendingNames.has(task.name)} onRun={onRun} />
                </div>
                <div className="mt-1 flex items-center gap-3">
                  {task.last_run && <StatusChip run={task.last_run} />}
                  <LastRun run={task.last_run} />
                </div>
                <StatusNote task={task} />
                <PreflightNote task={task} />
                <p className="mt-1 text-xs text-muted-foreground">{task.schedule_description}</p>
                <JobHelp task={task} name={task.display_name} />
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function markQueued(data, taskName, taskId) {
  if (!data?.tasks) return data;
  return {
    ...data,
    tasks: data.tasks.map((task) => (task.name !== taskName ? task : {
      ...task,
      last_run: {
        ...task.last_run,
        task_id: taskId,
        status: 'queued',
        started_at: new Date().toISOString(),
        completed_at: null,
        duration_seconds: null,
        triggered_by: 'manual',
        error_message: null,
      },
    })),
  };
}

// activeMarkets: markets shown up front (activeMarkets.js); undefined shows all.
export default function SchedulesSection({ activeMarkets }) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobileShell();
  const [error, setError] = useState(null);
  const [pendingNames, setPendingNames] = useState(() => new Set());
  const [confirmName, setConfirmName] = useState(null);

  const tasksQuery = useQuery({
    queryKey: ['scheduledTasks'],
    queryFn: getScheduledTasks,
    refetchInterval: (query) => (
      query.state.data?.tasks?.some((task) => ACTIVE_STATUSES.has(task.last_run?.status)) ? 5000 : 30000
    ),
  });

  const setPending = (taskName, isPending) => setPendingNames((current) => {
    const next = new Set(current);
    if (isPending) next.add(taskName);
    else next.delete(taskName);
    return next;
  });

  const runMutation = useMutation({
    mutationFn: (taskName) => triggerTask(taskName),
    onMutate: (taskName) => {
      setError(null);
      setPending(taskName, true);
    },
    onSuccess: (response, taskName) => {
      // The server has committed a queued row; show it now so Run stays
      // blocked until the refetch confirms it.
      queryClient.setQueryData(['scheduledTasks'], (data) => markQueued(data, taskName, response?.task_id));
      // Not awaited: the job inventory queries Celery workers and can take
      // seconds; the row's busy state should only wait for its own list.
      queryClient.invalidateQueries({ queryKey: ['operations', 'jobs'] });
      return queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
    },
    onError: (err) => setError(err?.response?.data?.detail || err?.message || 'Failed to trigger task'),
    onSettled: (_data, _error, taskName) => setPending(taskName, false),
  });
  const tasks = tasksQuery.data?.tasks ?? [];
  const Jobs = isMobile ? JobCards : JobsTable;
  const { shown, hidden, hiddenMarkets } = splitByMarket(
    tasks,
    (task) => task.market,
    activeMarkets,
    // A mid-chain pipeline reads Handed off; its claim is live state. Other
    // blockers (not a trading day) would keep every idle market up front.
    (task) => ATTENTION_STATUSES.has(task.last_run?.status) || task.run_blocker?.reason === PIPELINE_ACTIVE,
  );
  // Run asks first (RunDialog).
  const onRun = (taskName) => setConfirmName(taskName);
  const closeConfirm = () => setConfirmName(null);
  const confirmTask = tasks.find((task) => task.name === confirmName);
  const routine = shown.filter((task) => !task.advanced);
  const advanced = shown.filter((task) => task.advanced);

  return (
    <section className="tw mt-6">
      <h2 className="mb-2 text-base font-semibold">Scheduled jobs</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Beat schedules and their last run. Run shows what the job affects, then queues it; once a worker starts it, it shows in the job console above.
      </p>
      {error && (
        <Notice tone="error" className="mb-3" onDismiss={() => setError(null)}>{error}</Notice>
      )}
      {tasksQuery.isError && tasks.length > 0 && (
        <Notice tone="warning" className="mb-3">
          Couldn&apos;t refresh scheduled jobs. Showing the last known state.
        </Notice>
      )}
      {tasksQuery.isLoading ? (
        <span role="progressbar" aria-label="Loading scheduled jobs" className="inline-block size-5 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
      ) : tasksQuery.isError && tasks.length === 0 ? (
        <p className="text-sm text-loss">Failed to load scheduled tasks.</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No scheduled tasks configured.</p>
      ) : (
        <>
          <Jobs tasks={routine} pendingNames={pendingNames} onRun={onRun} />
          <InactiveMarkets markets={hiddenMarkets}>
            <Jobs tasks={hidden} pendingNames={pendingNames} onRun={onRun} />
          </InactiveMarkets>
          {advanced.length > 0 && (
            <section aria-labelledby="advanced-jobs-heading" className="mt-4">
              <div className="mb-1 flex items-center gap-2">
                <h3 id="advanced-jobs-heading" className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Advanced
                </h3>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>
              <p className="mb-2 text-xs text-muted-foreground">Run on demand only, or delete data.</p>
              <Jobs tasks={advanced} pendingNames={pendingNames} onRun={onRun} />
            </section>
          )}
          <RunDialog
            task={confirmTask}
            open={Boolean(confirmTask)}
            pending={pendingNames.has(confirmName)}
            onCancel={closeConfirm}
            onConfirm={() => {
              runMutation.mutate(confirmName);
              closeConfirm();
            }}
          />
        </>
      )}
    </section>
  );
}
