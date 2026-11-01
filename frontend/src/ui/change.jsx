import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { cn } from '@/lib/cn';

const percent = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

// Price change shown with sign and arrow as well as color, so direction
// never depends on color alone. `value` is a fraction: 0.0123 → +1.23%.
export function Change({ value, className }) {
  if (value == null || Number.isNaN(value)) {
    return <span className={cn('text-muted-foreground tabular-nums', className)}>—</span>;
  }
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const Icon = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }[direction];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-medium tabular-nums',
        { up: 'text-gain', down: 'text-loss', flat: 'text-muted-foreground' }[direction],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {percent.format(value)}
    </span>
  );
}
