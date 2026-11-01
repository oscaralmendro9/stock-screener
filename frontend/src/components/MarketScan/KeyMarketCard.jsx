import { cn } from '@/lib/cn';
import { Card } from '@/ui/card';
import { Change } from '@/ui/change';
import PriceSparkline from '../Scan/PriceSparkline';
import { formatLocalCurrency } from '../../utils/formatUtils';

const toneClass = (value) => (value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-muted-foreground');

// Index/ETF tile on the Daily page. The 1D change and the sparkline's trend are
// labelled separately: a green day inside a falling window must not read as a
// contradiction.
export default function KeyMarketCard({ item, currency }) {
  // Keep each close's position so a gap (null close) doesn't shorten the window.
  const points = (item.history || [])
    .map((h, index) => ({ index, close: h.close }))
    .filter((p) => p.close != null);
  const closes = points.map((p) => p.close);
  const sessions = points.length > 1 ? points[points.length - 1].index - points[0].index : 0;
  const first = closes[0];
  const last = closes[closes.length - 1];
  const trend = Math.sign(last - first);
  const periodChange = first ? (last / first - 1) * 100 : null;

  return (
    <Card className="flex h-full flex-col p-3">
      <span title={item.symbol} className="truncate text-sm font-semibold">{item.symbol}</span>
      <span className="truncate text-xs text-muted-foreground">{item.display_name}</span>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-lg font-semibold tabular-nums">
          {formatLocalCurrency(item.latest_close, currency)}
        </span>
        <span className="flex items-baseline gap-1 text-xs">
          <span className="text-muted-foreground">1D</span>
          <Change value={item.change_1d != null ? item.change_1d / 100 : null} />
        </span>
      </div>
      <div className="mt-1.5 min-h-9 flex-1">
        <PriceSparkline
          data={closes}
          trend={trend}
          change1d={null}
          width="100%"
          height={36}
          showChange={false}
        />
      </div>
      {periodChange != null && sessions > 0 && (
        <span className={cn('mt-0.5 self-end text-xs font-medium tabular-nums', toneClass(periodChange))}>
          {`${sessions}D ${periodChange > 0 ? '▲' : periodChange < 0 ? '▼' : '–'} ${Math.abs(periodChange).toFixed(1)}%`}
        </span>
      )}
    </Card>
  );
}
