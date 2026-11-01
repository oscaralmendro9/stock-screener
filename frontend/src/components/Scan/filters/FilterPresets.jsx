/**
 * FilterPresets component - compact UI for managing filter presets.
 * Displays a dropdown to select presets, save button, and update button.
 */
import { useState } from 'react';
import { ChevronDown, EllipsisVertical, Pencil, RefreshCw, Save, Trash2 } from 'lucide-react';

import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';

function Spinner() {
  return <span aria-hidden="true" className="inline-block size-3.5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />;
}

/**
 * FilterPresets component for managing saved filter configurations.
 *
 * @param {Object} props
 * @param {Array} props.presets - List of available presets
 * @param {number|null} props.activePresetId - Currently selected preset ID
 * @param {boolean} props.hasUnsavedChanges - Whether current filters differ from preset
 * @param {boolean} props.isLoading - Whether presets are loading
 * @param {boolean} props.isSaving - Whether a save operation is in progress
 * @param {Function} props.onLoadPreset - Callback when a preset is selected
 * @param {Function} props.onSavePreset - Callback to open save dialog
 * @param {Function} props.onUpdatePreset - Callback to update current preset
 * @param {Function} props.onRenamePreset - Callback to rename a preset
 * @param {Function} props.onDeletePreset - Callback to delete a preset
 */
function FilterPresets({
  presets = [],
  activePresetId,
  hasUnsavedChanges,
  isLoading,
  isSaving,
  onLoadPreset,
  onSavePreset,
  onUpdatePreset,
  onRenamePreset,
  onDeletePreset,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const activePreset = presets.find((p) => p.id === activePresetId);

  const handleRename = () => {
    if (activePresetId && onRenamePreset) {
      onRenamePreset(activePresetId);
    }
  };

  const handleDelete = () => {
    setConfirmDelete(false);
    if (activePresetId && onDeletePreset) {
      onDeletePreset(activePresetId);
    }
  };

  // Native <option> values are strings; hand callers the preset's own id.
  const handleSelect = (event) => {
    const match = presets.find((p) => String(p.id) === event.target.value);
    onLoadPreset(match ? match.id : null);
  };

  return (
    <div className="tw flex items-center gap-1">
      <span className="relative">
        <select
          aria-label="Filter preset"
          value={activePresetId ?? ''}
          onChange={handleSelect}
          disabled={isLoading}
          className="h-11 w-40 cursor-pointer appearance-none truncate rounded-md border border-border bg-surface pr-7 pl-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:h-7"
        >
          <option value="">Select Preset</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </span>

      <Button
        variant="secondary"
        size="icon"
        className="md:size-7"
        onClick={onSavePreset}
        disabled={isSaving}
        aria-label="Save as new preset"
        title="Save as new preset"
      >
        {isSaving ? <Spinner /> : <Save aria-hidden="true" />}
      </Button>

      {/* Update: only when a loaded preset has changes */}
      {activePresetId && hasUnsavedChanges && (
        <Button
          variant="primary"
          size="icon"
          className="md:size-7"
          onClick={onUpdatePreset}
          disabled={isSaving}
          aria-label={`Update "${activePreset?.name || 'preset'}"`}
          title={`Update "${activePreset?.name || 'preset'}"`}
        >
          {isSaving ? <Spinner /> : <RefreshCw aria-hidden="true" />}
        </Button>
      )}

      {activePresetId && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:size-7" aria-label="Preset actions">
                <EllipsisVertical aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={handleRename}>
                <Pencil aria-hidden="true" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-loss" onSelect={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent
              role="alertdialog"
              title="Delete preset?"
              size="sm"
              footer={(
                <>
                  <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
                </>
              )}
            >
              <p className="text-sm">{`Delete preset “${activePreset?.name ?? ''}”? This cannot be undone.`}</p>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export default FilterPresets;
