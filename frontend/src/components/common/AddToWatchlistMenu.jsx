/**
 * Add to Watchlist Menu Component
 *
 * A reusable dropdown menu for adding stock(s) to a watchlist.
 * Shows existing watchlists and allows creating a new one.
 *
 * Props:
 * - symbols: string | string[] - Symbol(s) to add
 * - trigger: ReactNode - Optional custom trigger element (default: icon button)
 * - onSuccess: () => void - Callback after successful add
 * - size: 'small' | 'medium' - Button size
 */
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ListPlus, Plus } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Notice } from '@/ui/notice';

import {
  getWatchlists,
  getWatchlistMemberships,
  createWatchlist,
  addItem,
  bulkAddItems,
} from '../../api/userWatchlists';
import { invalidateWatchlistItems } from '../../api/userWatchlistQueries';
import { getErrorMessage } from '../../utils/errorMessage';

const ITEM = 'flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm outline-none hover:bg-surface-subtle focus-visible:bg-surface-subtle aria-disabled:cursor-default aria-disabled:opacity-60 aria-disabled:hover:bg-transparent';

// Arrow keys move between menu items, as in a native menu.
const moveFocus = (event) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]')];
  if (items.length === 0) return;
  event.preventDefault();
  const index = items.indexOf(document.activeElement);
  const step = event.key === 'ArrowDown' ? 1 : -1;
  items[(index + step + items.length) % items.length].focus();
};

function AddToWatchlistMenu({ symbols, trigger, onSuccess, size = 'small' }) {
  const [open, setOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const anchorRef = useRef(null);
  const queryClient = useQueryClient();

  // Normalize symbols to array
  const symbolList = Array.isArray(symbols) ? symbols : [symbols];
  const normalizedSymbols = [...new Set(symbolList.map(
    (symbol) => symbol.trim().replace(/^\$+/, '').toUpperCase(),
  ))];
  const membershipQueryKey = ['userWatchlistMemberships', normalizedSymbols];

  // Fetch watchlists
  const {
    data: watchlistsData,
    isLoading: isWatchlistsLoading,
    error: watchlistsError,
  } = useQuery({
    queryKey: ['userWatchlists'],
    queryFn: getWatchlists,
    enabled: open,
  });

  const {
    data: membershipData,
    isFetching: isMembershipFetching,
    error: membershipError,
  } = useQuery({
    queryKey: membershipQueryKey,
    queryFn: () => getWatchlistMemberships(normalizedSymbols),
    enabled: open && normalizedSymbols.length > 0,
  });

  const watchlists = watchlistsData?.watchlists || [];
  const memberships = membershipData?.memberships || {};

  const recordMembership = (watchlistId, querySymbols, symbolsToRecord = querySymbols) => {
    queryClient.setQueryData(['userWatchlistMemberships', querySymbols], (current) => {
      const nextMemberships = { ...(current?.memberships || {}) };
      symbolsToRecord.forEach((symbol) => {
        nextMemberships[symbol] = [
          ...new Set([...(nextMemberships[symbol] || []), watchlistId]),
        ];
      });
      return { memberships: nextMemberships };
    });
  };

  // Create watchlist mutation
  const createMutation = useMutation({
    mutationFn: createWatchlist,
    onSuccess: async (newWatchlist) => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      setNewWatchlistName('');
      setShowNewInput(false);
      // Add symbols to the new watchlist
      await handleAddToWatchlist(newWatchlist.id);
    },
  });

  // Add item mutation (single)
  const addItemMutation = useMutation({
    mutationFn: ({ watchlistId, data }) => addItem(watchlistId, data),
    onSuccess: (_, variables) => {
      invalidateWatchlistItems(queryClient, variables.watchlistId);
      recordMembership(variables.watchlistId, [variables.data.symbol]);
      onSuccess?.();
    },
  });

  // Bulk add mutation
  const bulkAddMutation = useMutation({
    mutationFn: ({ watchlistId, symbols }) => bulkAddItems(watchlistId, symbols),
    onSuccess: (addedItems, variables) => {
      invalidateWatchlistItems(queryClient, variables.watchlistId);
      recordMembership(
        variables.watchlistId,
        variables.symbols,
        addedItems.map((item) => item.symbol),
      );
      onSuccess?.();
    },
  });

  const handleClose = () => {
    setOpen(false);
    setShowNewInput(false);
    setNewWatchlistName('');
  };

  const handleClick = (event) => {
    event.stopPropagation();
    if (open) {
      handleClose();
      return;
    }
    queryClient.invalidateQueries({
      queryKey: membershipQueryKey,
      refetchType: 'none',
    });
    setOpen(true);
  };

  const handleAddToWatchlist = async (watchlistId) => {
    if (normalizedSymbols.length === 1) {
      addItemMutation.mutate({
        watchlistId,
        data: { symbol: normalizedSymbols[0] },
      });
    } else {
      bulkAddMutation.mutate({
        watchlistId,
        symbols: normalizedSymbols,
      });
    }
  };

  const handleCreateAndAdd = () => {
    if (newWatchlistName.trim()) {
      createMutation.mutate({ name: newWatchlistName.trim() });
    }
  };

  const isPending = addItemMutation.isPending || bulkAddMutation.isPending || createMutation.isPending;
  const isLoading = isWatchlistsLoading || isMembershipFetching;
  const visibleError = watchlistsError
    || membershipError
    || addItemMutation.error
    || bulkAddMutation.error
    || createMutation.error;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <PopoverPrimitive.Anchor asChild>
        {trigger ? (
          <span ref={anchorRef} className="inline-flex" onClick={handleClick}>{trigger}</span>
        ) : (
          <button
            ref={anchorRef}
            type="button"
            aria-label="Add to watchlist"
            title="Add to watchlist"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={handleClick}
            className={cn(
              'tw inline-grid shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
              size === 'small' ? 'size-7' : 'size-9',
            )}
          >
            <ListPlus aria-hidden="true" className={size === 'small' ? 'size-4' : 'size-5'} />
          </button>
        )}
      </PopoverPrimitive.Anchor>

      {/* No portal: the menu also opens inside MUI modals, whose focus trap
          would pull focus back out of a portalled popover. Radix positions it
          with `position: fixed`, so table overflow does not clip it. */}
      <PopoverPrimitive.Content
        role="menu"
        align="end"
        sideOffset={6}
        collisionPadding={8}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={moveFocus}
        onInteractOutside={(event) => {
          // The trigger toggles on its own click.
          if (anchorRef.current?.contains(event.target)) event.preventDefault();
        }}
        className="tw z-toast flex max-h-[400px] min-w-52 flex-col overflow-y-auto rounded-md border border-border bg-surface p-1 text-foreground shadow-lg outline-none"
      >
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Add {symbolList.length > 1 ? `${symbolList.length} stocks` : symbolList[0]} to:
        </p>
        <div className="my-1 h-px bg-border" />

        {visibleError && (
          <Notice tone="error" className="m-1 text-xs">
            {getErrorMessage(visibleError, 'Unable to update watchlist')}
          </Notice>
        )}

        {isLoading ? (
          <div role="progressbar" aria-label="Loading watchlists" className="flex justify-center py-3">
            <span aria-hidden="true" className="size-5 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
          </div>
        ) : (
          <>
            {watchlists.map((watchlist) => {
              const alreadyAdded = normalizedSymbols.every(
                (symbol) => memberships[symbol]?.includes(watchlist.id),
              );
              const disabled = isPending || Boolean(membershipError) || alreadyAdded;
              return (
                <button
                  key={watchlist.id}
                  type="button"
                  role="menuitem"
                  aria-label={alreadyAdded ? `${watchlist.name} Already added` : watchlist.name}
                  aria-disabled={disabled || undefined}
                  onClick={() => {
                    if (!disabled) handleAddToWatchlist(watchlist.id);
                  }}
                  className={ITEM}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{watchlist.name}</span>
                    {alreadyAdded && <span className="block text-xs text-muted-foreground">Already added</span>}
                  </span>
                  {alreadyAdded && <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />}
                </button>
              );
            })}

            {watchlists.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No watchlists yet</p>
            )}
          </>
        )}

        <div className="my-1 h-px bg-border" />

        {showNewInput ? (
          <div className="flex gap-1 p-1">
            <input
              type="text"
              aria-label="New watchlist name"
              placeholder="Watchlist name"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateAndAdd();
                }
              }}
              autoFocus
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:h-8"
            />
            <button
              type="button"
              aria-label="Create watchlist and add"
              onClick={handleCreateAndAdd}
              disabled={!newWatchlistName.trim() || isPending}
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-accent outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 md:size-8"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : (
          <button type="button" role="menuitem" onClick={() => setShowNewInput(true)} className={ITEM}>
            <Plus aria-hidden="true" className="size-4 text-muted-foreground" />
            Create new watchlist
          </button>
        )}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  );
}

export default AddToWatchlistMenu;
