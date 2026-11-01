import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/cn';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

// Small floating panel anchored to its trigger. Radix handles collision,
// Escape and outside clicks. Portalled so table scroll areas don't clip it.
export function PopoverContent({ className, sideOffset = 6, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'tw z-toast max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-md outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
