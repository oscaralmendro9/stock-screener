import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/cn';

// One accent (primary). Press feedback only: no hover lift or glow.
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-foreground hover:bg-accent/90',
        secondary: 'border border-border bg-surface text-foreground hover:bg-surface-subtle',
        // Transparent border colour (no width) so a switch to secondary fades the
        // border in instead of flashing preflight's currentColor default.
        ghost: 'border-transparent text-foreground hover:bg-surface-subtle',
        destructive: 'bg-loss text-loss-foreground hover:bg-loss/90',
      },
      // md and icon meet the 44px touch target on phones; sm is desktop-dense.
      size: {
        sm: 'h-8 px-3',
        md: 'h-11 px-4 md:h-9',
        icon: 'size-11 md:size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export const Button = forwardRef(function Button({ className, variant, size, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
