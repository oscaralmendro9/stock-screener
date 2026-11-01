import { CircleAlert, CircleCheck, Hourglass } from 'lucide-react';

const formatETA = (seconds) => {
  if (!seconds || seconds <= 0) return '';
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `~${hours}h${minutes}m`;
};

/**
 * Compact inline scan progress indicator. The summary rides on a native
 * title and on a screen-reader label, so it needs no tooltip layer.
 */
function ScanProgress({ status, progress, totalStocks, completedStocks, passedStocks, etaSeconds }) {
  // Don't show anything if no status
  if (!status) return null;

  if (status === 'completed' || status === 'failed' || status === 'queued') {
    const { Icon, tone, text } = {
      completed: { Icon: CircleCheck, tone: 'text-gain', text: `Completed: ${passedStocks} passed` },
      failed: { Icon: CircleAlert, tone: 'text-loss', text: 'Scan failed' },
      queued: { Icon: Hourglass, tone: 'text-warning', text: 'Scan queued...' },
    }[status];
    return (
      <span role="img" aria-label={text} title={text} className="tw inline-flex items-center">
        <Icon aria-hidden="true" className={`size-3.5 ${tone}`} />
      </span>
    );
  }

  // Running - show progress bar with stats
  const progressPercent = progress || 0;
  const eta = formatETA(etaSeconds);
  const summary = [
    `${completedStocks}/${totalStocks} stocks (${progressPercent.toFixed(0)}%)`,
    passedStocks != null ? `Passed: ${passedStocks}` : null,
    eta ? `ETA: ${eta}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <span title={summary} className="tw inline-flex min-w-20 items-center gap-1">
      <span
        role="progressbar"
        aria-label="Scan progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPercent)}
        aria-valuetext={summary}
        className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-surface-subtle"
      >
        <span
          className="block h-full rounded-full bg-accent transition-[width] duration-150 ease-out motion-reduce:transition-none"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </span>
      <span aria-hidden="true" className="min-w-7 text-[11px] text-muted-foreground tabular-nums">
        {progressPercent.toFixed(0)}%
      </span>
    </span>
  );
}

export default ScanProgress;
