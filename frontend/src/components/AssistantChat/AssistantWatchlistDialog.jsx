import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { previewWatchlistAdd } from '../../api/assistant';
import { bulkAddItems, getWatchlists } from '../../api/userWatchlists';
import { invalidateWatchlistItems } from '../../api/userWatchlistQueries';
import { getErrorMessage } from '../../utils/errorMessage';
import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';

const Spinner = () => (
  <div role="status" aria-label="Loading" className="flex justify-center py-2">
    <span aria-hidden="true" className="inline-block size-6 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
  </div>
);

function AssistantWatchlistDialog({ open, symbols, onClose }) {
  const queryClient = useQueryClient();
  const [selectedWatchlistId, setSelectedWatchlistId] = useState('');

  const watchlistsQuery = useQuery({
    queryKey: ['assistant-watchlists'],
    queryFn: getWatchlists,
    enabled: open,
  });

  const watchlists = useMemo(
    () => watchlistsQuery.data?.watchlists || [],
    [watchlistsQuery.data?.watchlists],
  );
  const selectedWatchlist = useMemo(
    () => watchlists.find((watchlist) => String(watchlist.id) === String(selectedWatchlistId)) || null,
    [selectedWatchlistId, watchlists],
  );

  useEffect(() => {
    if (!open) {
      setSelectedWatchlistId('');
      return;
    }
    if (watchlists.length === 0) {
      return;
    }
    const hasSelected = watchlists.some(
      (watchlist) => String(watchlist.id) === String(selectedWatchlistId),
    );
    if (!hasSelected) {
      setSelectedWatchlistId(String(watchlists[0].id));
    }
  }, [open, selectedWatchlistId, watchlists]);

  const previewQuery = useQuery({
    queryKey: ['assistant-watchlist-preview', selectedWatchlistId, symbols],
    queryFn: () => previewWatchlistAdd({ watchlist: selectedWatchlist.name, symbols }),
    enabled: open && Boolean(selectedWatchlist),
  });

  const addMutation = useMutation({
    mutationFn: ({ watchlistId, addableSymbols }) => bulkAddItems(watchlistId, addableSymbols),
    onSuccess: (_, { watchlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      invalidateWatchlistItems(queryClient, watchlistId);
      onClose();
    },
  });

  const noWatchlists = open && !watchlistsQuery.isLoading && watchlists.length === 0;
  const preview = previewQuery.data;
  const canConfirm = Boolean(preview?.addable_symbols?.length)
    && !watchlistsQuery.isError
    && !previewQuery.isError
    && !addMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        title="Add assistant tickers to watchlist"
        footer={(
          <>
            <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button
              size="sm"
              onClick={() => addMutation.mutate({
                watchlistId: Number(selectedWatchlistId),
                addableSymbols: preview.addable_symbols,
              })}
              disabled={!canConfirm}
            >
              {addMutation.isPending ? 'Adding...' : 'Confirm add'}
            </Button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Symbols extracted from the latest assistant response: {symbols.join(', ')}
          </p>

          {watchlistsQuery.isLoading ? (
            <Spinner />
          ) : watchlistsQuery.isError ? (
            <Notice tone="error">
              {getErrorMessage(watchlistsQuery.error, 'Failed to load watchlists.')}
            </Notice>
          ) : noWatchlists ? (
            <Notice>Create a watchlist first to add assistant suggestions.</Notice>
          ) : (
            <NativeSelect label="Watchlist" value={selectedWatchlistId} onChange={setSelectedWatchlistId}>
              {watchlists.map((watchlist) => (
                <option key={watchlist.id} value={String(watchlist.id)}>
                  {watchlist.name}
                </option>
              ))}
            </NativeSelect>
          )}

          {selectedWatchlist && previewQuery.isLoading && <Spinner />}

          {selectedWatchlist && previewQuery.isError && (
            <Notice tone="error">
              {getErrorMessage(previewQuery.error, 'Failed to preview symbols for this watchlist.')}
            </Notice>
          )}

          {preview?.summary && <Notice>{preview.summary}</Notice>}

          {preview && (
            <div className="flex flex-col gap-2 text-sm">
              <p>Addable: {preview.addable_symbols.join(', ') || 'None'}</p>
              <p>Already present: {preview.existing_symbols.join(', ') || 'None'}</p>
              <p>Invalid: {preview.invalid_symbols.join(', ') || 'None'}</p>
            </div>
          )}

          {addMutation.isError && (
            <Notice tone="error">
              {getErrorMessage(addMutation.error, 'Failed to add symbols.')}
            </Notice>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AssistantWatchlistDialog;
