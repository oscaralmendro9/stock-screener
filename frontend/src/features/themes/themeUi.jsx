import { useId } from 'react';
import { cn } from '@/lib/cn';

// Small Tailwind building blocks shared by the Themes screens, so each one
// does not restate the same field, pill and tab markup.

const INPUT = 'w-full rounded-md border border-border bg-surface px-2.5 font-[inherit] text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

export function Field({ label, multiline = false, rows = 3, className, inputClassName, helperText, error = false, ...props }) {
  const Control = multiline ? 'textarea' : 'input';
  return (
    <label className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      {label ? <span className="text-[11px] font-medium text-muted-foreground">{label}</span> : null}
      <Control
        rows={multiline ? rows : undefined}
        className={cn(INPUT, multiline ? 'resize-y py-2' : 'h-11 md:h-8', error && 'border-loss', inputClassName)}
        {...props}
      />
      {helperText ? <span className={cn('text-[11px]', error ? 'text-loss' : 'text-muted-foreground')}>{helperText}</span> : null}
    </label>
  );
}

export function Select({ label, value, onChange, className, children, ...props }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      {label ? <span className="text-[11px] font-medium text-muted-foreground">{label}</span> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full cursor-pointer rounded-md border border-border bg-surface px-2 font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:h-8"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Checkbox({ label, className, ...props }) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-center gap-2 text-sm md:min-h-8', className)}>
      <input type="checkbox" className="size-4 cursor-pointer accent-accent" {...props} />
      {label}
    </label>
  );
}

const PILL_TONE = {
  neutral: 'border-border text-foreground',
  muted: 'border-border text-muted-foreground',
  gain: 'border-gain/50 text-gain',
  loss: 'border-loss/50 text-loss',
  warning: 'border-warning/50 text-warning',
  accent: 'border-accent bg-accent text-accent-foreground',
};

export function Pill({ tone = 'neutral', className, children, ...props }) {
  return (
    <span
      className={cn('inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] whitespace-nowrap', PILL_TONE[tone] || PILL_TONE.neutral, className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function Spinner({ label = 'Loading', className }) {
  return (
    <span
      role="progressbar"
      aria-label={label}
      className={cn('inline-block size-6 shrink-0 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin', className)}
    />
  );
}

// Click-activated ARIA tabs (tests drive them with plain clicks).
export function TabBar({ tabs, value, onChange, label, className }) {
  const id = useId();
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-1 border-b border-border', className)}>
      {tabs.map((tab, index) => {
        const key = tab.value ?? index;
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${id}-${key}`}
            aria-selected={selected}
            disabled={tab.disabled}
            onClick={() => onChange(key)}
            className={cn(
              '-mb-px inline-flex min-h-11 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 md:min-h-9',
              selected ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count ? <span className="rounded-full bg-surface-subtle px-1.5 text-[11px] tabular-nums">{tab.count > 99 ? '99+' : tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export const linkClass = 'text-accent no-underline hover:underline';
