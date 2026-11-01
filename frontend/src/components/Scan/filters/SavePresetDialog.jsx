/**
 * SavePresetDialog component - dialog for saving/renaming filter presets.
 */
import { useState, useEffect } from 'react';

import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';

const FIELD = 'w-full rounded-md font-[inherit] border border-border bg-surface px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

/**
 * Dialog for saving or renaming a filter preset.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {Function} props.onClose - Callback when dialog closes
 * @param {Function} props.onSave - Callback when save is clicked (receives name and description)
 * @param {string} props.mode - 'save' for new preset, 'rename' for existing
 * @param {string} props.initialName - Initial preset name (for rename mode)
 * @param {string} props.initialDescription - Initial description (for rename mode)
 * @param {string|null} props.error - Error message to display
 * @param {boolean} props.isLoading - Whether save is in progress
 */
function SavePresetDialog({
  open,
  onClose,
  onSave,
  mode = 'save',
  initialName = '',
  initialDescription = '',
  error = null,
  isLoading = false,
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
    }
  }, [open, initialName, initialDescription]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (name.trim() && !isLoading) {
      onSave(name.trim(), description.trim());
    }
  };

  const title = mode === 'rename' ? 'Rename Preset' : 'Save Filter Preset';
  const saveButtonText = mode === 'rename' ? 'Rename' : 'Save';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        title={title}
        size="sm"
        footer={(
          <>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" disabled={isLoading}>Cancel</Button>
            </DialogClose>
            <Button size="sm" type="submit" form="save-preset-form" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Saving...' : saveButtonText}
            </Button>
          </>
        )}
      >
        <form id="save-preset-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <Notice tone="error">{error}</Notice>}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Preset Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High RS Leaders"
              maxLength={100}
              disabled={isLoading}
              className={`${FIELD} h-11 md:h-9`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., RS > 80, Stage 2"
              rows={2}
              maxLength={500}
              disabled={isLoading}
              className={`${FIELD} resize-y py-2`}
            />
          </label>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SavePresetDialog;
