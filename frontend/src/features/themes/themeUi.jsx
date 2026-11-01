import { useId } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { thClass } from './themeClasses';

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

// Column header that sorts on click and reports it through aria-sort.
export function SortHeader({ label, active, order, onSort, align = 'left', title }) {
  const Arrow = active && order === 'desc' ? ArrowDown : ArrowUp;
  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined} className={thClass(align)}>
      <button
        type="button"
        onClick={onSort}
        title={title}
        className={cn('group inline-flex cursor-pointer items-center gap-0.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', active && 'text-foreground')}
      >
        {label}
        <Arrow aria-hidden="true" className={cn('size-3', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')} />
      </button>
    </th>
  );
}

// Previous/next pager over a 0-based page index.
export function Pager({ page, pageSize, total, onPage }) {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const nav = 'grid size-11 cursor-pointer place-items-center rounded-md outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 md:size-8';
  return (
    <div className="flex items-center justify-end gap-3 px-3 py-1.5 text-xs text-muted-foreground">
      <span className="tabular-nums">{`${from}–${to} of ${total}`}</span>
      <button type="button" aria-label="Go to previous page" disabled={page <= 0} onClick={() => onPage(page - 1)} className={nav}>
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>
      <button type="button" aria-label="Go to next page" disabled={to >= total} onClick={() => onPage(page + 1)} className={nav}>
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

// 0–100 score as a short bar plus the number; tone by strength.
export function ScoreBar({ score, label = 'Score' }) {
  if (score == null) return <span className="text-[11px] text-muted-foreground">-</span>;
  const tone = score >= 70 ? 'bg-gain' : score >= 50 ? 'bg-warning' : 'bg-loss';
  return (
    <span className="flex min-w-20 items-center gap-1">
      <span
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(score)}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-subtle"
      >
        <span className={cn('block h-full rounded-full', tone)} style={{ width: `${Math.min(score, 100)}%` }} />
      </span>
      <span className="min-w-7 text-[11px] font-semibold tabular-nums">{score.toFixed(0)}</span>
    </span>
  );
}

export function SignedPercent({ value, digits = 1 }) {
  if (value == null) return <span className="text-muted-foreground">-</span>;
  return (
    <span className={cn('text-[11px] tabular-nums', value >= 0 ? 'text-gain' : 'text-loss')}>
      {value > 0 ? '+' : ''}{value.toFixed(digits)}%
    </span>
  );
}
