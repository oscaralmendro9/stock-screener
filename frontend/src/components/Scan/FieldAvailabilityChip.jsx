import { useState } from 'react';
import { Info } from 'lucide-react';

import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';

// Status values that should *not* be surfaced as "unavailable" — e.g. when
// the server returned an entry with status "available", we ignore it.
const SURFACED_STATUSES = new Set(['unavailable', 'unsupported', 'missing', 'computed']);

// The chip sits inside clickable table rows and cards. React bubbles events
// from the portalled dialog through this wrapper too, so stopping them here
// keeps every click (chip, dialog, overlay) from opening the row.
const stop = (event) => event.stopPropagation();

/**
 * Per-row transparency chip. Renders when the scan result carries any
 * field_availability entries whose status means "not a clean supported
 * value", or when growth_metric_basis is the "unavailable" sentinel.
 *
 * Silent in the common US-quarterly case (empty/null availability dict),
 * so US rows stay visually quiet.
 */
function FieldAvailabilityChip({ fieldAvailability, growthMetricBasis }) {
  const [open, setOpen] = useState(false);

  // Recompute inline per render; fieldAvailability is small (≤5 keys in
  // practice) and TanStack Query returns a fresh object per refetch, so a
  // useMemo against that changing identity would bust on every render
  // anyway — the memo overhead outweighs the saved work.
  const entries = [];
  if (fieldAvailability && typeof fieldAvailability === 'object') {
    for (const [field, entry] of Object.entries(fieldAvailability)) {
      if (!entry || typeof entry !== 'object') continue;
      if (!SURFACED_STATUSES.has(entry.status)) continue;
      entries.push({ field, ...entry });
    }
  }

  const cadenceNote = growthMetricBasis === 'unavailable'
    ? 'Growth metrics are unavailable for this row (insufficient statement history).'
    : null;

  const count = entries.length;
  if (count === 0 && !cadenceNote) return null;

  const label = count > 0
    ? `${count} field${count === 1 ? '' : 's'} unavailable or computed — click for details`
    : 'Growth metrics unavailable — click for details';

  return (
    <span className="tw contents" onClick={stop} onKeyDown={stop}>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
        data-testid="field-availability-chip"
        className="ml-1 inline-flex h-4 shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-warning/60 px-1 text-[11px] leading-none text-warning outline-none hover:bg-warning/10 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info aria-hidden="true" className="size-3" />
        {count > 0 ? String(count) : '!'}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Data Availability"
          size="sm"
          footer={<DialogClose asChild><Button variant="ghost" size="sm">Close</Button></DialogClose>}
        >
          {cadenceNote && (
            <p className={entries.length ? 'mb-4 text-sm' : 'text-sm'}>{cadenceNote}</p>
          )}
          {entries.length > 0 && (
            <ul className="flex flex-col gap-2">
              {entries.map(({ field, status, reason_code }) => (
                <li key={field}>
                  <p className="font-mono text-[13px]">{field}</p>
                  <p className="text-xs text-muted-foreground">{reason_code ? `${status} — ${reason_code}` : status}</p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </span>
  );
}

export default FieldAvailabilityChip;
