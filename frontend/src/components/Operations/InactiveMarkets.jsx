// Collapsed rows of markets that are not enabled and show no worker or live
// state in the data loaded (see activeMarkets.js). Still there to inspect or run.
import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function InactiveMarkets({ markets, children }) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  if (!markets.length) return null;
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <div className="tw mt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={regionId}
        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-sm text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon aria-hidden="true" className="size-4" />
        Inactive markets ({markets.length}): {markets.join(', ')}
      </button>
      {open && (
        <div id={regionId}>
          <p className="mb-2 text-xs text-muted-foreground">
            Not enabled, and no market worker or activity seen for them on this page.
          </p>
          {children}
        </div>
      )}
    </div>
  );
}
