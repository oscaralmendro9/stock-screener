import { useQueries } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { getScanResults } from '../../api/scans';
import { formatLargeNumber, formatLocalCurrency } from '../../utils/formatUtils';
import { LEFT, RIGHT, ROWS_PER_SIGNAL, SIGNALS } from './signals';

function signedChange(value) {
  if (value == null || !Number.isFinite(Number(value))) return <span className="text-muted-foreground">-</span>;
  const number = Number(value);
  return (
    <span className={number > 0 ? 'text-gain' : number < 0 ? 'text-loss' : 'text-muted-foreground'}>
      {`${number > 0 ? '+' : ''}${number.toFixed(2)}%`}
    </span>
  );
}

function SignalTable({ caption, groups }) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-border bg-surface-subtle text-muted-foreground">
          <tr>
            <th scope="col" className="px-2 py-1.5 text-left font-medium">Ticker</th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">Last</th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium">Change</th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium whitespace-nowrap">$ Volume</th>
            <th scope="col" className="px-2 py-1.5 text-left font-medium">Signal</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ label, rows, isLoading, isError }) => {
            if (isLoading || isError || rows.length === 0) {
              return (
                <tr key={label} className="border-b border-border/60 last:border-0">
                  <td colSpan={4} className="px-2 py-1 text-muted-foreground">
                    {isLoading ? 'Loading…' : isError ? 'Could not load' : 'None today'}
                  </td>
                  <td className="px-2 py-1 text-accent">{label}</td>
                </tr>
              );
            }
            return rows.map((row, index) => (
              <tr key={`${label}-${row.symbol}`} className={cn('border-b border-border/60 last:border-0', index === 0 && 'border-t border-t-border')}>
                <td className="px-2 py-1">
                  <RouterLink
                    to={`/stocks/${encodeURIComponent(row.symbol)}`}
                    title={row.company_name || undefined}
                    className="rounded-sm font-semibold text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {row.symbol}
                  </RouterLink>
                </td>
                <td className="px-2 py-1 text-right tabular-nums">{formatLocalCurrency(row.current_price, row.currency)}</td>
                <td className="px-2 py-1 text-right tabular-nums">{signedChange(row.price_change_1d)}</td>
                <td className="px-2 py-1 text-right text-muted-foreground tabular-nums">
                  {row.volume != null ? formatLargeNumber(row.volume, '$') : '-'}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-accent">{label}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Finviz-style signal lists for the day: strength on the left, weakness and
 * leadership on the right. `leaders` comes from the daily snapshot, so it
 * costs no extra request.
 */
export default function SignalTables({ scanId, leaders = [] }) {
  const ids = [...LEFT, ...RIGHT];
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['homeSignal', scanId, id],
      queryFn: () => getScanResults(scanId, {
        ...SIGNALS[id].params,
        page: 1,
        per_page: ROWS_PER_SIGNAL,
        include_sparklines: false,
      }),
      enabled: Boolean(scanId),
      staleTime: 5 * 60_000,
    })),
  });
  const group = (id) => {
    const query = results[ids.indexOf(id)];
    return {
      label: SIGNALS[id].label,
      rows: query.data?.results ?? [],
      isLoading: query.isLoading,
      isError: query.isError,
    };
  };

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      <SignalTable caption="Strength signals" groups={LEFT.map(group)} />
      <SignalTable
        caption="Weakness and leadership signals"
        groups={[
          ...RIGHT.map(group),
          { label: 'Leader', rows: leaders.slice(0, ROWS_PER_SIGNAL), isLoading: false, isError: false },
        ]}
      />
    </div>
  );
}
