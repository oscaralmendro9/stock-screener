import { ArrowLeftRight, Bot, FileText, Flame, Landmark, MoveRight, Play, RefreshCw, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/ui/button';
import { cn } from '@/lib/cn';
import { Spinner } from '../themeUi';

const SEGMENT = 'inline-flex h-11 cursor-pointer items-center gap-1 px-3 text-xs font-medium outline-none first:rounded-l-md last:rounded-r-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:h-8';
const ICON = 'relative grid size-11 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 md:size-8';

function CountBadge({ count, tone = 'neutral' }) {
  if (!count) return null;
  return (
    <span className={cn(
      'absolute -top-1.5 -right-1.5 min-w-4 rounded-full px-1 text-center text-[11px] leading-4 font-semibold tabular-nums',
      tone === 'loss' ? 'bg-loss text-loss-foreground' : 'bg-warning text-surface',
    )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

// onPipelineChange keeps the (event, value) signature the container uses.
export default function ThemesPageHeader({
  selectedPipeline,
  onPipelineChange,
  pendingReviewCount,
  onOpenReview,
  onOpenArticles,
  onOpenSettings,
  onOpenModelSettings,
  failedCount,
  isPipelineRunning,
  onRunPipeline,
  onRefresh,
}) {
  const runLabel = isPipelineRunning
    ? 'Pipeline running...'
    : failedCount > 0
      ? `Run Pipeline (${failedCount} pending retry)`
      : 'Run Pipeline';
  return (
    <div className="tw mb-8 flex flex-wrap items-start justify-between gap-4 text-foreground">
      <div>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="flex items-center gap-2 text-3xl font-semibold">
            <Flame aria-hidden="true" className="size-7 text-muted-foreground" />
            Theme Discovery
          </h1>
          <div role="group" aria-label="Pipeline" className="flex rounded-md border border-border">
            {[['technical', 'Technical', MoveRight], ['fundamental', 'Fundamental', Landmark]].map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={selectedPipeline === value}
                onClick={() => onPipelineChange(null, value)}
                className={cn(SEGMENT, selectedPipeline === value ? 'bg-surface-subtle text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {selectedPipeline === 'technical'
            ? 'Price action, momentum, RS, chart patterns, breakouts'
            : 'Earnings, valuation, macro themes, analyst coverage'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="relative">
          <Button variant="secondary" size="sm" onClick={onOpenReview}>
            <ArrowLeftRight aria-hidden="true" />
            Review
          </Button>
          <CountBadge count={pendingReviewCount} />
        </span>
        <Button variant="secondary" size="sm" onClick={onOpenArticles}>
          <FileText aria-hidden="true" />
          Articles
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenSettings}>
          <Settings aria-hidden="true" />
          Settings
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenModelSettings}>
          <Bot aria-hidden="true" />
          LLM
        </Button>
        <span aria-hidden="true" className="mx-1 h-6 border-l border-border" />
        <button type="button" aria-label={runLabel} title={runLabel} onClick={() => onRunPipeline()} disabled={isPipelineRunning} className={cn(ICON, 'text-accent')}>
          {isPipelineRunning ? <Spinner label="Pipeline running" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
          <CountBadge count={failedCount} tone="loss" />
        </button>
        <button type="button" aria-label="Backfill 30d" title="Backfill 30d" onClick={() => onRunPipeline(30)} disabled={isPipelineRunning} className={ICON}>
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
        <button type="button" aria-label="Refresh" title="Refresh" onClick={onRefresh} className={ICON}>
          <RefreshCw aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
