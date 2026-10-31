import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;
export const DialogDescription = DialogPrimitive.Description;

const SIZES = {
  sm: 'sm:max-w-lg',
  md: 'sm:max-w-3xl',
  lg: 'sm:max-w-5xl',
  xl: 'sm:max-w-7xl',
};

// Centered modal. Full screen on phones, a card from `sm` up. The overlay
// centers it with flex rather than a translate, so drag-and-drop libraries
// that measure positions (hello-pangea/dnd) are not thrown off by a
// transformed ancestor. Radix handles focus trap, Escape and nesting.
export function DialogContent({ title, size = 'md', className, bodyClassName, footer, children, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="tw fixed inset-0 z-overlay flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4">
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'z-modal flex w-full flex-col bg-surface text-foreground outline-none sm:max-h-[90dvh] sm:rounded-lg sm:border sm:border-border',
            SIZES[size],
            className,
          )}
          {...props}
        >
          <div className="flex items-center gap-2 border-b border-border py-2 pr-2 pl-4">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-base font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring md:size-9"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className={cn('min-h-0 flex-1 overflow-y-auto p-4', bodyClassName)}>{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 border-t border-border px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  );
}
