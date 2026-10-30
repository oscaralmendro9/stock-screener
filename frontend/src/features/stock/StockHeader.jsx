import { Users } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Change } from '@/ui/change';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'options', label: 'Options' },
];

/** Overview | Options under the stock header. */
export function StockTabs({ active, onChange }) {
  return (
    <nav aria-label="Stock views" className="-mt-1 flex gap-1 border-b border-border">
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={active === item.id ? 'page' : undefined}
          onClick={() => onChange(item.id)}
          className={cn(
            '-mb-px h-11 cursor-pointer border-b-2 px-3 text-sm outline-none transition-colors duration-150 ease-out focus-visible:bg-surface-subtle md:h-9 md:text-[13px]',
            active === item.id ? 'border-accent font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

/**
 * Finviz-style quote header: ticker and name, the classification line
 * (sector · industry · group), and price with the day's change.
 */
export default function StockHeader({
  symbol,
  name,
  exchange,
  market,
  sector,
  industry,
  group,
  groupRank,
  price,
  change,
  asOf,
  rating,
  onViewPeers,
  watchlistMenu,
}) {
  const classification = [sector, industry, market].filter(Boolean);
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{symbol}</h1>
          <p className="min-w-0 truncate text-base font-medium">{name || 'Unknown company'}</p>
          {exchange ? <span className="text-xs text-muted-foreground">{exchange}</span> : null}
          {rating ? <Badge tone={rating === 'Buy' || rating === 'Strong Buy' ? 'gain' : 'neutral'}>{rating}</Badge> : null}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {classification.map((item, index) => (
            <span key={item} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">·</span>}
              {item}
            </span>
          ))}
          {group ? (
            <span className="flex items-center gap-2">
              {classification.length > 0 && <span aria-hidden="true">·</span>}
              {group}{groupRank != null ? <span className="font-medium text-foreground tabular-nums">(rank {groupRank})</span> : null}
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">
            {price != null ? `$${Number(price).toFixed(2)}` : '-'}
          </p>
          <p className="flex items-center justify-end gap-2 text-xs">
            <Change value={change != null ? change / 100 : null} />
            {asOf ? <span className="text-muted-foreground tabular-nums">{String(asOf).slice(0, 10)}</span> : null}
          </p>
        </div>
        <div className="flex gap-2">
          {watchlistMenu}
          <Button variant="secondary" size="sm" onClick={onViewPeers}>
            <Users aria-hidden="true" />
            Peers
          </Button>
        </div>
      </div>
    </header>
  );
}
