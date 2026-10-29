import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { ArrowRight, LoaderCircle, Search } from 'lucide-react';

import { cn } from '@/lib/cn';
import { searchStocks } from '../../api/stocks';
import { loadStockDetails } from '../../pageLoaders';

const SEARCH_DEBOUNCE_MS = 150;
// Tickers across the supported markets: letters, digits and . - ^ = (e.g. 0700.HK, BRK-B, ^GSPC).
const TICKER_PATTERN = /^[A-Z0-9.\-^=]{1,15}$/;

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const loadQuietly = (loader) => loader?.().catch(() => {});

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const isTypingTarget = (target) => (
  target instanceof HTMLElement
  && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
);

const itemClass = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm outline-none select-none data-[selected=true]:bg-surface-subtle md:min-h-9';
const groupClass = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground';

/**
 * Header search: a trigger plus a command palette (Ctrl/⌘+K or "/") that finds
 * symbols by ticker or company name and jumps to pages. Enter on a typed
 * ticker still opens it directly, as the old ticker box did.
 */
export default function GlobalSearch({ pages = [], compact = false, onPageIntent }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Highlighted item, tagged with the result set it was picked from.
  const [highlight, setHighlight] = useState({ value: '', results: null });
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const onKeyDown = (event) => {
      const paletteShortcut = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
      const slash = event.key === '/' && !isTypingTarget(event.target);
      if (!paletteShortcut && !slash) return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const results = useQuery({
    queryKey: ['stockSearch', debounced],
    queryFn: () => searchStocks(debounced, 8),
    enabled: open && debounced.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const changeOpen = (next) => {
    setOpen(next);
    if (next) loadQuietly(loadStockDetails);
    else {
      setQuery('');
      setHighlight({ value: '', results: null });
    }
  };

  const go = (path) => {
    changeOpen(false);
    navigate(path);
  };

  const symbols = debounced === trimmed ? (results.data ?? []) : [];
  const upper = trimmed.toUpperCase();
  const typedTicker = TICKER_PATTERN.test(upper) && !symbols.some((row) => row.symbol === upper) ? upper : null;
  const matchingPages = trimmed
    ? pages.filter((page) => page.label.toLowerCase().includes(trimmed.toLowerCase()))
    : pages;
  const searching = trimmed.length > 0 && (debounced !== trimmed || results.isFetching);

  // When a new result set arrives, the best match moves to the top and gets
  // the highlight, so Enter never opens a stale "Open <TICKER>" row.
  const itemValues = [
    ...symbols.map((row) => `symbol:${row.symbol}`),
    ...(typedTicker ? [`ticker:${typedTicker}`] : []),
    ...matchingPages.map((page) => `page:${page.path}`),
  ];
  const resultsKey = `${trimmed}|${symbols.map((row) => row.symbol).join(',')}`;
  const highlighted = highlight.results === resultsKey && itemValues.includes(highlight.value)
    ? highlight.value
    : itemValues[0] ?? '';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={changeOpen}>
      <DialogPrimitive.Trigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label="Search symbols"
            className="tw grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search aria-hidden="true" className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Search symbols"
            className="tw flex h-8 w-56 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-subtle px-2.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search aria-hidden="true" className="size-4" />
            <span className="flex-1 text-left">Search symbols</span>
            <kbd className="rounded-sm border border-border px-1 font-sans text-[11px]">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
        )}
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="tw fixed inset-x-0 top-0 z-modal mx-auto flex max-h-dvh w-full flex-col overflow-hidden border-border bg-surface pt-[env(safe-area-inset-top)] text-foreground shadow-xl outline-none sm:top-[12dvh] sm:max-h-[70dvh] sm:max-w-xl sm:rounded-lg sm:border sm:pt-0"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <Command
            shouldFilter={false}
            loop
            label="Search symbols and pages"
            value={highlighted}
            onValueChange={(value) => setHighlight({ value, results: resultsKey })}
            className="flex min-h-0 flex-col"
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Ticker or company name"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                // 16px on phones: iOS Safari zooms into inputs below that.
                className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
              />
              {searching && <LoaderCircle aria-label="Searching" className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />}
              <DialogPrimitive.Close className="h-11 shrink-0 cursor-pointer rounded-md px-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:hidden">
                Cancel
              </DialogPrimitive.Close>
            </div>

            <Command.List className="min-h-0 overflow-y-auto p-1 pb-[max(4px,env(safe-area-inset-bottom))]">
              {symbols.length > 0 && (
                <Command.Group heading="Symbols" className={groupClass}>
                  {symbols.map((row) => (
                    <Command.Item
                      key={row.symbol}
                      value={`symbol:${row.symbol}`}
                      onSelect={() => go(`/stocks/${encodeURIComponent(row.symbol)}`)}
                      className={itemClass}
                    >
                      <span className="w-20 shrink-0 font-semibold tabular-nums">{row.symbol}</span>
                      <span className="min-w-0 flex-1 truncate">{row.name || '—'}</span>
                      {row.sector && <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:block">{row.sector}</span>}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {typedTicker && (
                <Command.Group heading="Ticker" className={groupClass}>
                  <Command.Item
                    value={`ticker:${typedTicker}`}
                    onSelect={() => go(`/stocks/${encodeURIComponent(typedTicker)}`)}
                    className={itemClass}
                  >
                    <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
                    <span>Open <span className="font-semibold">{typedTicker}</span></span>
                  </Command.Item>
                </Command.Group>
              )}

              {results.isError && debounced === trimmed && (
                <p role="status" className="px-3 py-2 text-xs text-pretty text-muted-foreground">
                  Symbol search is unavailable right now. You can still open a ticker directly.
                </p>
              )}

              {matchingPages.length > 0 && (
                <Command.Group heading="Pages" className={groupClass}>
                  {matchingPages.map((page) => (
                    <Command.Item
                      key={page.path}
                      value={`page:${page.path}`}
                      onSelect={() => go(page.path)}
                      onMouseEnter={() => onPageIntent?.(page.path)}
                      className={cn(itemClass, '[&_svg]:size-4 [&_svg]:text-muted-foreground')}
                    >
                      {page.icon}
                      <span>{page.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {trimmed && !searching && symbols.length === 0 && !typedTicker && matchingPages.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No symbols or pages match “{trimmed}”.</p>
              )}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
