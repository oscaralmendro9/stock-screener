import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

const SIDES = {
  bottom: 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg border-t pb-[env(safe-area-inset-bottom)]',
  right: 'inset-y-0 right-0 h-dvh w-full border-l sm:w-[440px] pr-[env(safe-area-inset-right)]',
};

// Modal panel from an edge of the screen. Radix handles focus trap, Escape
// and returning focus to the trigger. No slide animation (motion budget).
export function SheetContent({ side = 'bottom', className, children, showClose = false, closeLabel = 'Close', ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-black/50" />
      <DialogPrimitive.Content
        className={cn(
          'tw fixed z-modal flex flex-col overflow-y-auto border-border bg-surface text-foreground outline-none',
          SIDES[side],
          className,
        )}
        {...props}
      >
        {side === 'bottom' && <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-disabled-foreground" />}
        {children}
        {showClose && (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="absolute top-2 right-2 grid size-11 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring md:size-9"
          >
            <X aria-hidden="true" className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
