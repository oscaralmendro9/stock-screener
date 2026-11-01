/**
 * Header and keyboard-hint strip shared by the full-screen chart viewers
 * (scan results, watchlists and the static site).
 */
import { Keyboard, X } from 'lucide-react';

import { cn } from '@/lib/cn';

import MarketThemesList from '../Stock/MarketThemesList';

function Stat({ label, value, loading = false, accent = false, wide = false }) {
  return (
    <div className="flex shrink-0 flex-col items-center">
      <span
        className={cn(
          'flex h-7 items-center justify-center rounded-md border border-border px-2.5 text-[13px] font-semibold tabular-nums',
          wide ? 'max-w-44 min-w-20 truncate font-normal' : 'min-w-9',
          accent && 'border-accent/40 text-accent',
        )}
        title={wide && typeof value === 'string' ? value : undefined}
      >
        {loading
          ? <span aria-label="Loading" className="size-3.5 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
          : <span className="truncate">{value}</span>}
      </span>
      <span className="mt-0.5 text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function ChartViewerHeader({
  symbol,
  symbolsLoading = false,
  groupRank = null,
  adr = null,
  epsRating = null,
  stockData = null,
  themes = [],
  actions = null,
  index = 0,
  total = 0,
  onClose,
}) {
  return (
    <header className="flex min-h-15 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-1.5">
      <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
        <h2 className="shrink-0 text-xl font-semibold">{symbol || 'Loading...'}</h2>
        {symbolsLoading && (
          <span aria-label="Loading symbols" className="size-4 shrink-0 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
        )}
        {groupRank?.show && (
          <Stat
            label="Grp Rnk"
            value={groupRank.value ?? '-'}
            loading={groupRank.loading}
            accent={groupRank.value != null && groupRank.value <= 20}
          />
        )}
        {adr != null && <Stat label="ADR" value={`${Number(adr).toFixed(1)}%`} />}
        {epsRating != null && <Stat label="EPS Rtg" value={epsRating} accent={epsRating >= 80} />}
        {stockData && (
          <div className="ml-1 flex gap-2">
            <Stat wide label="Group" value={stockData.ibd_industry_group || '-'} />
            <Stat wide label="Sector" value={stockData.gics_sector || '-'} />
            <Stat wide label="Industry" value={stockData.gics_industry || '-'} />
          </div>
        )}
        {themes.length > 0 && (
          <div className="flex max-w-72 shrink-0 flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">Market Themes</span>
            <MarketThemesList themes={themes} variant="compact" maxInlineChips={2} />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {total > 0 && (
          <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
            Stock {index + 1} of {total}
          </span>
        )}
        <button
          type="button"
          aria-label="Close chart viewer"
          onClick={onClose}
          className="grid size-11 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:size-9"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
    </header>
  );
}

export function ChartViewerKeyHints({ hints }) {
  return (
    <footer className="hidden shrink-0 justify-center gap-3 border-t border-border bg-surface px-4 py-2 md:flex">
      {hints.map((hint) => (
        <span key={hint} className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
          <Keyboard aria-hidden="true" className="size-3.5" />
          {hint}
        </span>
      ))}
    </footer>
  );
}
