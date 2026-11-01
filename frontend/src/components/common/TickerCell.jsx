import { cn } from '@/lib/cn';

function TickerCell({ symbol, companyName, align = 'left' }) {
  const column = cn('tw flex min-w-0 flex-col gap-0.5 leading-tight', align === 'center' ? 'items-center text-center' : 'items-start text-left');

  if (!symbol) {
    return (
      <span className={column}>
        <span className="text-sm text-muted-foreground">-</span>
      </span>
    );
  }

  return (
    <span className={column}>
      <span className="text-sm font-semibold">{symbol}</span>
      {companyName ? (
        <span title={companyName} className="block max-w-full min-w-0 truncate text-[11px] text-muted-foreground">
          {companyName}
        </span>
      ) : null}
    </span>
  );
}

export default TickerCell;
