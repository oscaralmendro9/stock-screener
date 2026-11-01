import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * IPO Date filter with chip-based preset selector
 * Presets: 6M, 1Y, 2Y, 3Y, 5Y (meaning IPO'd within that time period)
 * Toggle behavior: click again to clear
 */
const IPO_PRESETS = [
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' },
];

function IpoDateFilter({ value, onChange }) {
  const labelId = useId();
  const handleChipClick = (presetValue) => {
    // Toggle behavior: click again to clear
    if (value === presetValue) {
      onChange(null);
    } else {
      onChange(presetValue);
    }
  };

  return (
    <div className="tw min-w-30">
      <span id={labelId} className="mb-1 block text-[11px] text-muted-foreground">IPO Age</span>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1">
        {IPO_PRESETS.map((preset) => {
          const on = value === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={on}
              onClick={() => handleChipClick(preset.value)}
              className={cn(
                'h-11 cursor-pointer rounded-full border px-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-[22px]',
                on ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface text-foreground hover:bg-surface-subtle',
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default IpoDateFilter;
