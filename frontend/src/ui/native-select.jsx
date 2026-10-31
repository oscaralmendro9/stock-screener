import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

// Labelled native <select>: the platform picker on phones, and tests can drive
// it with change events. `ariaLabel` overrides the visible label when a page
// needs a more specific accessible name.
export function NativeSelect({ label, ariaLabel, value, onChange, className, children }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="relative">
        <select
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full cursor-pointer appearance-none rounded-md border border-border bg-surface pr-8 pl-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8"
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}
