import { useId } from 'react';
import { cn } from '@/lib/cn';

const OPTIONS = [
  { value: null, label: 'All', aria: 'all' },
  { value: true, label: 'Yes', aria: 'yes' },
  { value: false, label: 'No', aria: 'no' },
];

/**
 * Compact tri-state toggle for boolean filters
 * States: null (All), true (Yes), false (No). Clicking the selected Yes/No
 * again clears back to All.
 */
function CompactCheckbox({ label, value, onChange }) {
  const labelId = useId();
  const current = value ?? null;

  const handleClick = (next) => {
    onChange(next !== null && next === current ? null : next);
  };

  return (
    <div className="tw min-w-15">
      <span id={labelId} className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      <div role="group" aria-labelledby={labelId} className="flex h-11 overflow-hidden rounded-md border border-border md:h-7">
        {OPTIONS.map((option) => {
          const pressed = current === option.value;
          return (
            <button
              key={option.label}
              type="button"
              aria-label={option.aria}
              aria-pressed={pressed}
              onClick={() => handleClick(option.value)}
              className={cn(
                'min-w-7 cursor-pointer border-r border-border px-1.5 text-[11px] outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                pressed ? 'bg-surface-subtle font-semibold text-foreground' : 'bg-surface text-muted-foreground hover:text-foreground',
                pressed && option.value === true && 'text-gain',
                pressed && option.value === false && 'text-loss',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CompactCheckbox;
