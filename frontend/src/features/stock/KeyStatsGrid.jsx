import { cn } from '@/lib/cn';
import { buildKeyStats } from './keyStats';

function Value({ value }) {
  if (value == null) return <span className="text-muted-foreground">-</span>;
  if (typeof value === 'object') {
    return (
      <span className="whitespace-nowrap">
        {value.prefix ? <span className="mr-1 text-foreground">{value.prefix}</span> : null}
        <span className={value.signed > 0 ? 'text-gain' : value.signed < 0 ? 'text-loss' : 'text-muted-foreground'}>{value.text}</span>
      </span>
    );
  }
  return <span className="truncate">{value}</span>;
}

/**
 * Finviz-style key statistics: six dense label/value columns under the chart.
 */
export default function KeyStatsGrid({ data }) {
  const columns = buildKeyStats(data);
  return (
    <section aria-label="Key statistics" className="grid overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {columns.map((rows, columnIndex) => (
        <dl key={columnIndex} className={cn('min-w-0 text-xs', columnIndex > 0 && 'border-t border-border sm:border-t-0 sm:border-l')}>
          {rows.map(([label, value], rowIndex) => (
            <div
              key={label}
              className={cn('flex items-center justify-between gap-3 px-2.5 py-1 tabular-nums', rowIndex % 2 === 1 && 'bg-surface-subtle/60')}
            >
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 text-right font-semibold"><Value value={value} /></dd>
            </div>
          ))}
        </dl>
      ))}
    </section>
  );
}
