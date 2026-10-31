/**
 * User Watchlist Manager Modal
 *
 * Allows users to:
 * - Create/rename/delete watchlists
 * - Include a watchlist in the daily scan
 * - Add/remove stocks from watchlists
 * - Reorder watchlists and stocks via drag-and-drop
 */
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';

import {
  getWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  getWatchlistData,
  addItem,
  removeItem,
  reorderWatchlists,
  reorderItems,
  importItems,
} from '../../api/userWatchlists';
import { invalidateWatchlistItems } from '../../api/userWatchlistQueries';
import { getErrorMessage } from '../../utils/errorMessage';

const INPUT = 'h-11 w-full min-w-0 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:h-8';
const ICON_BUTTON = 'grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 md:size-7';
const FEEDBACK_TONE = { error: 'error', success: 'info', warning: 'warning', info: 'info' };
const onEnter = (action) => (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    action();
  }
};

const NAMED_SYMBOL_LIMIT = 10;

const namedSymbols = (symbols) => {
  if (symbols.length === 0) {
    return '';
  }
  const shown = symbols.slice(0, NAMED_SYMBOL_LIMIT).join(', ');
  const more = symbols.length - NAMED_SYMBOL_LIMIT;
  return ` (${more > 0 ? `${shown} and ${more} more` : shown})`;
};

// Matches the backend's 1,000,000-character import cap; a 2000-symbol export is ~50 KB.
const MAX_IMPORT_CHARS = 1_000_000;

function UserWatchlistManager({ open, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importDraftWatchlistId, setImportDraftWatchlistId] = useState(null);
  // Read when an import settles, which can be after the draft moved on.
  // Set with the state, never during render.
  const importDraftWatchlistIdRef = useRef(importDraftWatchlistId);
  const [importFileError, setImportFileError] = useState(null);

  // Fetch watchlists
  const { data: watchlistsData, isLoading: watchlistsLoading } = useQuery({
    queryKey: ['userWatchlists'],
    queryFn: getWatchlists,
    enabled: open,
  });

  const watchlists = watchlistsData?.watchlists || [];

  // Fetch watchlist data for editing
  const { data: watchlistData } = useQuery({
    queryKey: ['userWatchlistData', selectedWatchlistId],
    queryFn: () => getWatchlistData(selectedWatchlistId),
    enabled: !!selectedWatchlistId && open,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => createWatchlist(data),
    onSuccess: (newWatchlist) => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      setNewWatchlistName('');
      setFeedback(null);
      setSelectedWatchlistId(newWatchlist.id);
      onUpdate?.();
    },
    onError: (err) => setFeedback({ severity: 'error', message: getErrorMessage(err, 'Failed to create watchlist') }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => updateWatchlist(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      setEditingName(false);
      setFeedback(null);
      onUpdate?.();
    },
    onError: (err) => setFeedback({ severity: 'error', message: getErrorMessage(err, 'Failed to update watchlist') }),
  });

  const dailyScanMutation = useMutation({
    mutationFn: ({ id, include }) => updateWatchlist(id, { include_in_daily_scan: include }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      setFeedback(null);
      onUpdate?.();
    },
    onError: (err) => setFeedback({ severity: 'error', message: getErrorMessage(err, 'Failed to update the daily scan setting') }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteWatchlist(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      if (selectedWatchlistId === deletedId) {
        setSelectedWatchlistId(null);
      }
      setFeedback(null);
      onUpdate?.();
    },
    onError: (err) => setFeedback({ severity: 'error', message: getErrorMessage(err, 'Failed to delete watchlist') }),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ watchlistId, data }) => addItem(watchlistId, data),
    onSuccess: (_, { watchlistId }) => {
      invalidateWatchlistItems(queryClient, watchlistId);
      setNewSymbol('');
      setFeedback(null);
      onUpdate?.();
    },
    onError: (err) => setFeedback({ severity: 'error', message: getErrorMessage(err, 'Failed to add stock') }),
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ itemId }) => removeItem(itemId),
    onSuccess: (_, { watchlistId }) => {
      invalidateWatchlistItems(queryClient, watchlistId);
      setFeedback(null);
      onUpdate?.();
    },
    onError: (err) => setFeedback({ severity: 'error', message: getErrorMessage(err, 'Failed to remove stock') }),
  });

  const reorderWatchlistsMutation = useMutation({
    mutationFn: (ids) => reorderWatchlists(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      onUpdate?.();
    },
  });

  const reorderItemsMutation = useMutation({
    mutationFn: ({ watchlistId, itemIds }) => reorderItems(watchlistId, itemIds),
    onSuccess: (_, { watchlistId }) => {
      invalidateWatchlistItems(queryClient, watchlistId);
      onUpdate?.();
    },
  });

  const importItemsMutation = useMutation({
    mutationFn: ({ watchlistId, payload }) => importItems(watchlistId, payload),
    onSuccess: (result, variables) => {
      invalidateWatchlistItems(queryClient, variables.watchlistId);
      // A late import for another watchlist must not close or clear the
      // draft the dialog now holds.
      if (variables.watchlistId === importDraftWatchlistIdRef.current) {
        setImportContent('');
        setImportDialogOpen(false);
      }
      // Naming the symbols lets a stray note or sector word read as a ticker
      // be spotted; a header-less paste cannot tell the two apart.
      const parts = [
        `Imported ${result.added.length} symbol${result.added.length === 1 ? '' : 's'}${namedSymbols(result.added)}`,
      ];
      if (result.skipped_existing.length > 0) {
        parts.push(`${result.skipped_existing.length} already existed`);
      }
      if (result.invalid_symbols.length > 0) {
        parts.push(`${result.invalid_symbols.length} invalid${namedSymbols(result.invalid_symbols)}`);
      }
      setFeedback({ severity: 'success', message: parts.join(', ') });
      onUpdate?.();
    },
    // The import dialog shows the error while open; this keeps it once closed.
    onError: (err) => setFeedback({
      severity: 'error',
      message: getErrorMessage(err, 'Failed to import symbols'),
      source: 'import',
    }),
  });

  const handleCreate = () => {
    if (newWatchlistName.trim()) {
      createMutation.mutate({ name: newWatchlistName.trim() });
    }
  };

  const handleDelete = (id) => setPendingDeleteId(id);

  const handleStartRename = () => {
    const selected = watchlists.find((w) => w.id === selectedWatchlistId);
    if (selected) {
      setEditedName(selected.name);
      setEditingName(true);
    }
  };

  const handleSaveRename = () => {
    if (editedName.trim() && selectedWatchlistId) {
      updateMutation.mutate({ id: selectedWatchlistId, updates: { name: editedName.trim() } });
    }
  };

  const handleAddSymbol = () => {
    if (newSymbol.trim() && selectedWatchlistId) {
      addItemMutation.mutate({
        watchlistId: selectedWatchlistId,
        data: { symbol: newSymbol.trim().toUpperCase() },
      });
    }
  };

  const handleRemoveItem = (itemId) => {
    removeItemMutation.mutate({ itemId, watchlistId: selectedWatchlistId });
  };

  // A server error belongs to the text it rejected, so editing or replacing
  // that text clears it.
  const clearImportServerError = () => {
    if (importItemsMutation.isError) {
      importItemsMutation.reset();
    }
    // The manager alert keeps a copy for once the dialog closes; other
    // actions' feedback stays.
    setFeedback((current) => (
      current?.source === 'import' && current.severity === 'error' ? null : current
    ));
  };

  const handleOpenImportDialog = () => {
    setImportFileError(null);
    // Resetting a pending import for this watchlist would detach the dialog
    // from it: its late error would skip the dialog and Import would re-enable
    // mid-request. One for another watchlist is detached, so it never blocks
    // this one; its outcome still reaches the manager's alert.
    const pendingHere = importItemsMutation.isPending
      && importItemsMutation.variables?.watchlistId === selectedWatchlistId;
    if (!pendingHere) {
      importItemsMutation.reset();
    }
    if (importDraftWatchlistId !== selectedWatchlistId) {
      setImportContent('');
      setImportDraftWatchlistId(selectedWatchlistId);
      importDraftWatchlistIdRef.current = selectedWatchlistId;
    }
    setImportDialogOpen(true);
  };

  // Drag-drop handlers
  const handleWatchlistDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;

    const items = Array.from(watchlists);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    queryClient.setQueryData(['userWatchlists'], {
      ...watchlistsData,
      watchlists: items,
    });

    reorderWatchlistsMutation.mutate(items.map((item) => item.id));
  };

  const handleItemDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    if (!watchlistData?.items) return;

    const items = Array.from(watchlistData.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    queryClient.setQueryData(['userWatchlistData', selectedWatchlistId], {
      ...watchlistData,
      items,
    });

    reorderItemsMutation.mutate({
      watchlistId: selectedWatchlistId,
      itemIds: items.map((item) => item.id),
    });
  };

  const selectedWatchlist = watchlists.find((w) => w.id === selectedWatchlistId);
  const importTooLong = importContent.length > MAX_IMPORT_CHARS;
  const importError = importFileError
    || (importTooLong && `This text is over ${MAX_IMPORT_CHARS.toLocaleString('en-US')} characters.`)
    || (importItemsMutation.isError && getErrorMessage(importItemsMutation.error, 'Failed to import symbols'));

  const pendingDelete = watchlists.find((w) => w.id === pendingDeleteId);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        title="Manage Watchlists"
        size="md"
        bodyClassName="min-h-[450px]"
        footer={<DialogClose asChild><Button variant="ghost" size="sm">Close</Button></DialogClose>}
      >
        {feedback && (
          <Notice
            tone={FEEDBACK_TONE[feedback.severity] || 'info'}
            className="mb-3"
            onDismiss={() => setFeedback(null)}
          >
            {feedback.message}
          </Notice>
        )}

        <div className="flex h-full flex-col gap-4 sm:flex-row">
          {/* Left Panel: Watchlist List */}
          <section className="shrink-0 border-border sm:w-56 sm:border-r sm:pr-4">
            <h3 className="mb-2 text-sm font-semibold">Watchlists</h3>

            {/* Create new watchlist */}
            <div className="mb-3 flex gap-1">
              <input
                type="text"
                aria-label="New watchlist name"
                placeholder="New watchlist"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                onKeyDown={onEnter(handleCreate)}
                className={INPUT}
              />
              <button
                type="button"
                aria-label="Create watchlist"
                onClick={handleCreate}
                disabled={!newWatchlistName.trim() || createMutation.isPending}
                className={cn(ICON_BUTTON, 'size-11 text-accent md:size-8')}
              >
                <Plus aria-hidden="true" className="size-4" />
              </button>
            </div>

            {/* Watchlist list with drag-drop */}
            <DragDropContext onDragEnd={handleWatchlistDragEnd}>
              <Droppable droppableId="watchlists">
                {(provided) => (
                  <ul className="flex flex-col gap-0.5" ref={provided.innerRef} {...provided.droppableProps}>
                    {watchlists.map((watchlist, index) => (
                      <Draggable key={watchlist.id} draggableId={`wl-${watchlist.id}`} index={index}>
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              'flex items-center gap-1 rounded-md pr-1',
                              watchlist.id === selectedWatchlistId ? 'bg-accent/10' : 'hover:bg-surface-subtle',
                              snapshot.isDragging && 'bg-surface-subtle shadow-md',
                            )}
                          >
                            <span
                              {...provided.dragHandleProps}
                              aria-label={`Reorder ${watchlist.name}`}
                              className="grid h-9 w-6 shrink-0 cursor-grab place-items-center rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <GripVertical aria-hidden="true" className="size-4" />
                            </span>
                            <button
                              type="button"
                              aria-current={watchlist.id === selectedWatchlistId ? 'true' : undefined}
                              onClick={() => setSelectedWatchlistId(watchlist.id)}
                              className={cn(
                                'min-h-9 min-w-0 flex-1 cursor-pointer truncate rounded-sm text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                watchlist.id === selectedWatchlistId && 'font-semibold text-accent',
                              )}
                            >
                              {watchlist.name}
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${watchlist.name}`}
                              onClick={() => handleDelete(watchlist.id)}
                              className={cn(ICON_BUTTON, 'hover:text-loss')}
                            >
                              <Trash2 aria-hidden="true" className="size-3.5" />
                            </button>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {watchlists.length === 0 && !watchlistsLoading && (
                      <li className="px-1 text-xs text-muted-foreground">No watchlists yet</li>
                    )}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          </section>

          {/* Right Panel: Watchlist Details */}
          <section className="min-w-0 flex-1">
            {selectedWatchlist ? (
              <>
                {/* Watchlist name with rename */}
                <div className="mb-3 flex items-center gap-2">
                  {editingName ? (
                    <>
                      <input
                        type="text"
                        aria-label="Watchlist name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={onEnter(handleSaveRename)}
                        autoFocus
                        className={cn(INPUT, 'flex-1')}
                      />
                      <Button size="sm" onClick={handleSaveRename}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold">{selectedWatchlist.name}</h3>
                      <button
                        type="button"
                        aria-label={`Rename ${selectedWatchlist.name}`}
                        onClick={handleStartRename}
                        className={ICON_BUTTON}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="mb-3">
                  <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedWatchlist.include_in_daily_scan)}
                      disabled={dailyScanMutation.isPending}
                      onChange={(e) => dailyScanMutation.mutate({
                        id: selectedWatchlist.id,
                        include: e.target.checked,
                      })}
                      className="size-4 cursor-pointer accent-accent"
                    />
                    Include in daily scan
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Scanned after each of its markets&apos; daily scans, with the default screeners.
                    Any watchlist can still be scanned manually.
                  </p>
                </div>

                {/* Add symbol */}
                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    aria-label="Symbol to add"
                    placeholder="Add symbol (e.g., NVDA)"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    onKeyDown={onEnter(handleAddSymbol)}
                    className={cn(INPUT, 'sm:w-52')}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddSymbol}
                      disabled={!newSymbol.trim() || addItemMutation.isPending}
                    >
                      <Plus aria-hidden="true" />
                      Add
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleOpenImportDialog}>
                      <Upload aria-hidden="true" />
                      Import
                    </Button>
                  </div>
                </div>

                {/* Items list with drag-drop */}
                {watchlistData?.items && watchlistData.items.length > 0 ? (
                  <DragDropContext onDragEnd={handleItemDragEnd}>
                    <Droppable droppableId="items">
                      {(provided) => (
                        <ul className="flex flex-col" ref={provided.innerRef} {...provided.droppableProps}>
                          {watchlistData.items.map((item, index) => (
                            <Draggable key={item.id} draggableId={`item-${item.id}`} index={index}>
                              {(provided, snapshot) => (
                                <li
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    'flex items-center gap-2 rounded-md border-b border-border py-1 pr-1',
                                    snapshot.isDragging && 'bg-surface-subtle shadow-md',
                                  )}
                                >
                                  <span
                                    {...provided.dragHandleProps}
                                    aria-label={`Reorder ${item.symbol}`}
                                    className="grid h-9 w-6 shrink-0 cursor-grab place-items-center rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <GripVertical aria-hidden="true" className="size-4" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{item.symbol}</p>
                                    {item.company_name && (
                                      <p className="truncate text-xs text-muted-foreground">{item.company_name}</p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    aria-label={`Remove ${item.symbol}`}
                                    onClick={() => handleRemoveItem(item.id)}
                                    className={cn(ICON_BUTTON, 'hover:text-loss')}
                                  >
                                    <Trash2 aria-hidden="true" className="size-3.5" />
                                  </button>
                                </li>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </ul>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <p className="text-sm text-muted-foreground">No stocks in this watchlist yet.</p>
                )}
              </>
            ) : (
              <p className="flex min-h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
                {watchlists.length > 0
                  ? 'Select a watchlist to edit'
                  : 'Create a watchlist to get started'}
              </p>
            )}
          </section>
        </div>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent
            title="Import Symbols"
            size="sm"
            footer={(
              <>
                <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
                <Button
                  size="sm"
                  onClick={() => importItemsMutation.mutate({
                    watchlistId: selectedWatchlistId,
                    payload: { content: importContent, format: 'auto' },
                  })}
                  disabled={
                    !selectedWatchlistId || !importContent.trim() || importTooLong || importItemsMutation.isPending
                  }
                >
                  Import
                </Button>
              </>
            )}
          >
            <p id="watchlist-import-help" className="mb-3 text-sm text-muted-foreground">
              Paste newline, comma, tab, or CSV-formatted symbols, or choose a .txt/.csv file such as a
              TradingView watchlist export. The importer will dedupe entries and report invalid symbols.
            </p>
            <label className="mb-3 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold hover:bg-surface-subtle focus-within:ring-2 focus-within:ring-ring md:h-8">
              <Upload aria-hidden="true" className="size-4" />
              Choose file
              <input
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                className="sr-only"
                onChange={async (event) => {
                  const [file] = event.target.files;
                  event.target.value = '';
                  if (!file) {
                    return;
                  }
                  if (file.size > MAX_IMPORT_CHARS) {
                    setImportFileError(`${file.name} is over 1 MB.`);
                    return;
                  }
                  try {
                    setImportContent(await file.text());
                    setImportFileError(null);
                    clearImportServerError();
                  } catch {
                    setImportFileError(`Could not read ${file.name}.`);
                  }
                }}
              />
            </label>
            {importError && (
              <Notice tone="error" className="mb-3">{importError}</Notice>
            )}
            <textarea
              autoFocus
              rows={8}
              aria-label="Symbols to import"
              aria-describedby="watchlist-import-help"
              placeholder={'NVDA\nMSFT\nAAPL'}
              value={importContent}
              onChange={(event) => {
                setImportContent(event.target.value);
                clearImportServerError();
              }}
              className="w-full rounded-md border border-border bg-surface p-2.5 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(pendingDelete)} onOpenChange={(next) => { if (!next) setPendingDeleteId(null); }}>
          <DialogContent
            role="alertdialog"
            title="Delete watchlist?"
            size="sm"
            footer={(
              <>
                <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deleteMutation.mutate(pendingDeleteId);
                    setPendingDeleteId(null);
                  }}
                >
                  Delete
                </Button>
              </>
            )}
          >
            <p className="text-sm">
              {`Delete “${pendingDelete?.name ?? ''}” and all its stocks? This cannot be undone.`}
            </p>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export default UserWatchlistManager;
