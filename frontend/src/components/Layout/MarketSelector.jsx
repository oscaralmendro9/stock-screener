import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useMarket } from '../../contexts/MarketContext';
import { marketFlag } from '../../utils/marketFlags';

/**
 * A styled native <select>: phones open the system picker, and keyboard and
 * screen-reader behavior come for free. `display` is the visible text; the
 * transparent select on top owns every interaction.
 * options: [{ value, label, disabled? }]
 */
export function MarketSelectField({ value, onChange, options, display, label, className }) {
  return (
    <div
      className={cn(
        'tw relative flex h-11 shrink-0 items-center gap-1 rounded-md border border-border bg-surface-subtle pr-2 pl-2.5 text-[13px] font-semibold whitespace-nowrap text-foreground focus-within:ring-2 focus-within:ring-ring hover:bg-border/40 md:h-8',
        className,
      )}
    >
      <span aria-hidden="true">{display}</span>
      <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        // 16px keeps iOS Safari from zooming in when the picker opens.
        className="absolute inset-0 cursor-pointer appearance-none text-base opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MarketSelector() {
  const { selectedMarket, setSelectedMarket, selectableMarkets, marketLabel } = useMarket();

  if (selectableMarkets.length < 2) {
    return null;
  }

  return (
    <MarketSelectField
      label="Market selector"
      value={selectedMarket}
      onChange={setSelectedMarket}
      display={`${marketFlag(selectedMarket)} ${selectedMarket}`.trim()}
      options={selectableMarkets.map((code) => ({
        value: code,
        label: `${marketFlag(code)}  ${marketLabel(code)} (${code})`,
      }))}
    />
  );
}

export default MarketSelector;
