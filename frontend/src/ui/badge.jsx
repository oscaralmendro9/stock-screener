import { cva } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium tabular-nums',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-subtle text-muted-foreground',
        accent: 'bg-accent/15 text-accent',
        gain: 'bg-gain/15 text-gain',
        loss: 'bg-loss/15 text-loss',
        warning: 'bg-warning/15 text-warning',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function Badge({ className, tone, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
