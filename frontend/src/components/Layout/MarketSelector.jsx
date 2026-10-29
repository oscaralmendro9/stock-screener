import { ChevronDown } from 'lucide-react';

import { useMarket } from '../../contexts/MarketContext';
import { marketFlag } from '../../utils/marketFlags';

// A styled native <select>: phones open the system picker, and keyboard and
// screen-reader behavior come for free. The visible label shows flag + code.
function MarketSelector() {
  const { selectedMarket, setSelectedMarket, selectableMarkets, marketLabel } = useMarket();

  if (selectableMarkets.length < 2) {
    return null;
  }

  return (
    <div className="tw relative flex h-11 shrink-0 items-center gap-1 rounded-md border border-border bg-surface-subtle pr-2 pl-2.5 text-[13px] font-semibold text-foreground focus-within:ring-2 focus-within:ring-ring hover:bg-border/40 md:h-8">
      <span aria-hidden="true">{`${marketFlag(selectedMarket)} ${selectedMarket}`.trim()}</span>
      <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      <select
        value={selectedMarket}
        onChange={(event) => setSelectedMarket(event.target.value)}
        aria-label="Market selector"
        // 16px keeps iOS Safari from zooming in when the picker opens.
        className="absolute inset-0 cursor-pointer appearance-none text-base opacity-0"
      >
        {selectableMarkets.map((code) => (
          <option key={code} value={code}>
            {`${marketFlag(code)}  ${marketLabel(code)} (${code})`}
          </option>
        ))}
      </select>
    </div>
  );
}

export default MarketSelector;
