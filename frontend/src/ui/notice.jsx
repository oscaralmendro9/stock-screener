import { Info, TriangleAlert, X } from 'lucide-react';

import { cn } from '@/lib/cn';

const TONES = {
  info: { box: 'border-border bg-surface-subtle', icon: 'text-muted-foreground', Icon: Info },
  warning: { box: 'border-warning/40 bg-warning/10', icon: 'text-warning', Icon: TriangleAlert },
  error: { box: 'border-loss/40 bg-loss/10', icon: 'text-loss', Icon: TriangleAlert },
};

// Inline message next to what it is about. Errors are alerts; the rest are
// polite status. `action` sits at the end (e.g. a Retry button).
export function Notice({ tone = 'info', action, onDismiss, className, children }) {
  const { box, icon, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm', box, className)}
    >
      <Icon aria-hidden="true" className={cn('size-4 shrink-0', icon)} />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-my-1 grid size-8 cursor-pointer place-items-center rounded-sm text-muted-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
