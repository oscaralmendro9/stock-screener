import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/cn';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex items-center gap-1 rounded-md bg-surface-subtle p-1', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-9 cursor-pointer items-center rounded-sm px-3 text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-surface data-[state=active]:text-foreground md:h-7',
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
