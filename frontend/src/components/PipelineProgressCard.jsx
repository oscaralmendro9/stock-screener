import { Maximize2, Minus, X } from 'lucide-react';
import { usePipeline } from '../contexts/usePipeline';
import { MOBILE_NAV_HEIGHT } from './Layout/shellNav';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';

// Sit above the assistant button (same corner; 48px on phones, 56px on
// desktop), and above the bottom bar on phones.
const STACK_ABOVE_FAB_MOBILE = MOBILE_NAV_HEIGHT + 16 + 48 + 12;
const STACK_ABOVE_FAB_DESKTOP = 24 + 56 + 16;
const POSITION = 'tw fixed right-4 z-[1199] bottom-[var(--pipeline-bottom-sm)] md:right-6 md:bottom-[var(--pipeline-bottom-md)]';
const POSITION_VARS = {
  '--pipeline-bottom-sm': `calc(${STACK_ABOVE_FAB_MOBILE}px + env(safe-area-inset-bottom))`,
  '--pipeline-bottom-md': `${STACK_ABOVE_FAB_DESKTOP}px`,
};

const TONE_TEXT = { success: 'text-gain', error: 'text-loss', warning: 'text-warning', primary: 'text-foreground' };
const TONE_BAR = { success: 'bg-gain', error: 'bg-loss', warning: 'bg-warning', primary: 'bg-accent' };
const ICON_BUTTON = 'grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';
const Spinner = ({ className }) => (
  <span aria-hidden="true" className={cn('inline-block shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin', className)} />
);

const PipelineProgressCard = () => {
  const { pipelineStatus, isCardVisible, isMinimized, closePipelineCard, toggleMinimize } = usePipeline();

  const steps = ['Ingestion', 'Retry', 'Extraction', 'Metrics', 'Alerts'];

  const getActiveStep = () => {
    if (!pipelineStatus) return 0;
    const stepMap = { ingestion: 0, reprocessing: 1, extraction: 2, metrics: 3, alerts: 4, completed: 5 };
    return stepMap[pipelineStatus.current_step] ?? 0;
  };

  const isComplete = pipelineStatus?.status === 'completed';
  const isFailed = pipelineStatus?.status === 'failed';
  // Queued before cutover to economic authority, then skipped by the worker (#472).
  const isSkipped = pipelineStatus?.status === 'skipped';
  const isDone = isComplete || isFailed || isSkipped;
  const tone = isComplete ? 'success' : isFailed ? 'error' : isSkipped ? 'warning' : 'primary';
  const percent = pipelineStatus?.percent || 0;

  if (!isCardVisible) return null;

  // Minimized view - small pill
  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={toggleMinimize}
        aria-label="Expand pipeline progress"
        style={POSITION_VARS}
        className={cn(POSITION, 'flex w-[180px] cursor-pointer items-center justify-between gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring', TONE_TEXT[tone])}
      >
        <span className="flex items-center gap-2">
          {!isDone && <Spinner className="size-3.5" />}
          {isComplete ? 'Complete' : isFailed ? 'Failed' : isSkipped ? 'Skipped' : `Running ${pipelineStatus?.percent?.toFixed(0) || 0}%`}
        </span>
        <Maximize2 aria-hidden="true" className="size-3.5 text-muted-foreground" />
      </button>
    );
  }

  const active = getActiveStep();

  // Full view
  return (
    <section
      aria-label="Pipeline progress"
      style={POSITION_VARS}
      className={cn(POSITION, 'w-[calc(100%-32px)] overflow-hidden rounded-lg border border-border bg-surface text-foreground shadow-lg sm:w-[380px]')}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className={cn('flex items-center gap-2 text-sm font-semibold', TONE_TEXT[tone])}>
          {!isDone && <Spinner className="size-4" />}
          {isComplete ? 'Pipeline Complete' : isFailed ? 'Pipeline Failed' : isSkipped ? 'Pipeline Skipped' : 'Running Pipeline...'}
        </h2>
        <div className="flex items-center gap-0.5">
          <button type="button" aria-label="Minimize" onClick={toggleMinimize} className={ICON_BUTTON}>
            <Minus aria-hidden="true" className="size-4" />
          </button>
          {isDone && (
            <button type="button" aria-label="Close" onClick={closePipelineCard} className={ICON_BUTTON}>
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Mini stepper */}
        <ol className="mb-3 flex justify-between">
          {steps.map((label, index) => {
            const done = index < active;
            const current = index === active && !isDone;
            return (
              <li key={label} aria-current={current ? 'step' : undefined} className="flex flex-1 flex-col items-center">
                <span
                  className={cn(
                    'grid size-5 place-items-center rounded-full text-[11px] font-bold',
                    done ? 'bg-gain/15 text-gain' : current ? 'bg-accent text-accent-foreground' : 'bg-surface-subtle text-muted-foreground',
                  )}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">{label}</span>
              </li>
            );
          })}
        </ol>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-label="Pipeline progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-subtle"
        >
          <div className={cn('h-full rounded-full transition-[width] duration-150 ease-out motion-reduce:transition-none', TONE_BAR[tone])} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
        <p className="text-center text-[11px] text-muted-foreground tabular-nums">
          {pipelineStatus?.percent?.toFixed(0) || 0}% - {pipelineStatus?.message || 'Initializing...'}
        </p>

        {/* Error message */}
        {isFailed && (
          <Notice tone="error" className="mt-3 text-xs">{pipelineStatus?.error_message || 'Pipeline failed'}</Notice>
        )}
        {isSkipped && (
          <Notice tone="warning" className="mt-3 text-xs">{pipelineStatus?.error_message || 'Pipeline skipped'}</Notice>
        )}

        {/* Step results summary */}
        {(pipelineStatus?.ingestion_result || pipelineStatus?.reprocessing_result || pipelineStatus?.extraction_result || pipelineStatus?.metrics_result) && (
          <div className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
            {pipelineStatus?.ingestion_result && (
              <p>
                Ingested: {pipelineStatus.ingestion_result.new_items || 0} items from {pipelineStatus.ingestion_result.total_sources || 0} sources
              </p>
            )}
            {pipelineStatus?.reprocessing_result && (
              <p>
                Retried: {pipelineStatus.reprocessing_result.reprocessed_count || 0} failed,
                {' '}{pipelineStatus.reprocessing_result.processed || 0} recovered
              </p>
            )}
            {pipelineStatus?.extraction_result && (
              <p>
                Extracted: {pipelineStatus.extraction_result.processed || 0} processed, {pipelineStatus.extraction_result.new_themes?.length || 0} new themes
              </p>
            )}
            {pipelineStatus?.metrics_result && (
              <p>
                Metrics: {pipelineStatus.metrics_result.themes_updated || 0} themes updated
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PipelineProgressCard;
