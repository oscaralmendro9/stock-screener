import { cn } from '@/lib/cn';

// Flat surface separated by a border, not a shadow.
export function Card({ className, ...props }) {
  return <section className={cn('rounded-lg border border-border bg-surface text-foreground', className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <header className={cn('flex items-center justify-between gap-3 px-4 pt-3', className)} {...props} />;
}

export function CardTitle({ className, as: Comp = 'h2', ...props }) {
  return <Comp className={cn('text-sm font-semibold text-balance', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('px-4 pt-2 pb-4', className)} {...props} />;
}
