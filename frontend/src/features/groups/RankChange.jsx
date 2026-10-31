import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/cn';

// Places gained (+) or lost (−) in the ranking. Direction carries a sign and
// an arrow as well as color.
export default function RankChange({ value, className }) {
  if (value === null || value === undefined) {
    return <span className={cn('text-muted-foreground tabular-nums', className)}>-</span>;
  }
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : null;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-end gap-0.5 tabular-nums',
        value > 0 ? 'font-semibold text-gain' : value < 0 ? 'font-semibold text-loss' : 'text-muted-foreground',
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="size-3" />}
      {value > 0 ? '+' : ''}{value}
    </span>
  );
}
