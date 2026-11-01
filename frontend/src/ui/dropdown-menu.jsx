import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

export function DropdownMenuContent({ className, align = 'end', sideOffset = 6, ...props }) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn('tw z-modal min-w-44 rounded-md border border-border bg-surface p-1 text-foreground shadow-lg', className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuLabel({ className, ...props }) {
  return <MenuPrimitive.Label className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)} {...props} />;
}

export function DropdownMenuRadioItem({ className, children, ...props }) {
  return (
    <MenuPrimitive.RadioItem
      className={cn(
        'relative flex h-9 cursor-pointer items-center rounded-sm pr-2 pl-8 text-sm outline-none select-none data-[highlighted]:bg-surface-subtle',
        className,
      )}
      {...props}
    >
      <MenuPrimitive.ItemIndicator className="absolute left-2 inline-flex">
        <Check aria-hidden="true" className="size-4 text-accent" />
      </MenuPrimitive.ItemIndicator>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuItem({ className, ...props }) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'flex h-9 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-subtle [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }) {
  return <MenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}
