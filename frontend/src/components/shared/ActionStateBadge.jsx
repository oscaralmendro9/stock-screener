import { cn } from '@/lib/cn';

import { actionStateMeta } from '../../features/opportunityState/actionState';

// actionStateMeta speaks MUI colour names; map them onto theme tokens.
const TONE = {
  error: 'border-loss/50 text-loss',
  warning: 'border-warning/50 text-warning',
  info: 'border-accent/50 text-accent',
  success: 'border-gain/50 text-gain',
  default: 'border-border text-muted-foreground',
};

function ActionStateBadge({ state, onClick }) {
  const { label, color } = actionStateMeta(state);
  const className = cn(
    'tw inline-flex h-[22px] items-center rounded-full border px-2 text-[11px] font-semibold whitespace-nowrap',
    TONE[color] ?? TONE.default,
  );

  // A button only when it opens the evidence drawer.
  if (typeof onClick === 'function') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(className, 'cursor-pointer outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring')}
      >
        {label}
      </button>
    );
  }
  return <span className={className}>{label}</span>;
}

export { ActionStateBadge };
export default ActionStateBadge;
