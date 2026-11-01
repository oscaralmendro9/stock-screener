import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Card } from '@/ui/card';

import OptionsQualityBadge from './OptionsQualityBadge';
import OptionsSourceBadges from './OptionsSourceBadges';
import OptionsStatusBanner from './OptionsStatusBanner';
import { UnavailableMetric } from './OptionsMetricTable';
import { formatOptionsMetric } from './optionsFormatting';

const LENSES = {
  gamma: [
    { name: 'net_gex' },
    { name: 'gamma_flip' },
    { name: 'call_wall' },
    { name: 'put_wall' },
  ],
  volatility: [
    { name: 'atm_iv', percent: true },
    { name: 'realized_volatility', percent: true },
    { name: 'vrp', percent: true },
  ],
  skew: [
    { name: 'skew_25_delta', percent: true },
    { name: 'near_spot_volume_concentration', percent: true },
  ],
  activity: [
    { name: 'activity_intensity' },
    { name: 'call_put_volume_ratio' },
    { name: 'volume_oi_ratio' },
    { name: 'near_spot_volume_concentration', percent: true },
    { name: 'near_spot_open_interest_concentration', percent: true },
  ],
};
const LENS_LABELS = { gamma: 'Gamma', volatility: 'Volatility', skew: 'Skew', activity: 'Activity' };

const TH = 'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-1.5 font-medium text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5';

const sortRows = (items, metricName, direction) => [...items].sort((left, right) => {
  const leftMetric = left.metrics[metricName];
  const rightMetric = right.metrics[metricName];
  if (!leftMetric.available && !rightMetric.available) return left.symbol.localeCompare(right.symbol);
  if (!leftMetric.available) return 1;
  if (!rightMetric.available) return -1;
  const difference = leftMetric.value - rightMetric.value;
  return difference === 0 ? left.symbol.localeCompare(right.symbol) : difference * direction;
});

export default function OptionsCommandCenterView({ data, onOpenSymbol }) {
  const [lens, setLens] = useState('gamma');
  const [sort, setSort] = useState({ metric: LENSES.gamma[0].name, direction: -1 });
  const columns = LENSES[lens];
  const rows = useMemo(
    () => sortRows(data.items, sort.metric, sort.direction),
    [data.items, sort],
  );
  const rankedSymbols = useMemo(
    () => rows.filter((item) => item.metrics[sort.metric].available).map((item) => item.symbol),
    [rows, sort.metric],
  );

  const changeLens = (nextLens) => {
    if (nextLens === lens) return;
    setLens(nextLens);
    setSort({ metric: LENSES[nextLens][0].name, direction: -1 });
  };

  const changeSort = (metric) => {
    setSort((current) => ({
      metric,
      direction: current.metric === metric ? current.direction * -1 : -1,
    }));
  };

  const openFromKeyboard = (event, symbol) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenSymbol(symbol);
    }
  };

  return (
    <div className="tw">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-balance">Options Command Center</h1>
        <p className="text-sm text-muted-foreground">
          A focused read of the current liquid Candidates and Leaders—not an option-chain scanner.
        </p>
      </div>
      <OptionsStatusBanner data={data} />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <h2 className="text-sm font-semibold tabular-nums">{data.items.length} current symbols</h2>
          <div role="group" aria-label="Metric focus" className="inline-flex rounded-md border border-border p-0.5">
            {Object.keys(LENSES).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={lens === value}
                onClick={() => changeLens(value)}
                className={cn(
                  'h-9 cursor-pointer rounded-sm px-3 text-xs font-semibold outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7',
                  lens === value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
                )}
              >
                {LENS_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table aria-label="Options Command Center current symbols" className="w-full min-w-[720px] border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th scope="col" className={cn(TH, 'w-8 text-left')}>#</th>
                <th scope="col" className={cn(TH, 'text-left')}>Symbol</th>
                <th scope="col" className={cn(TH, 'text-left')}>Equity source</th>
                <th scope="col" className={cn(TH, 'text-left')}>Quality</th>
                {columns.map(({ name }) => {
                  const label = data.items.find((item) => item.metrics[name])?.metrics[name]?.label || name;
                  const selected = sort.metric === name;
                  const direction = selected && sort.direction === 1 ? 'ascending' : 'descending';
                  const Icon = sort.direction === 1 ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={name}
                      scope="col"
                      aria-sort={selected ? direction : undefined}
                      className={cn(TH, 'text-right', selected && 'text-foreground')}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Sort by ${label}${selected ? `, ${direction}` : ''}`}
                        onClick={() => changeSort(name)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-sm text-right outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {label}
                        {selected && <Icon aria-hidden="true" className="size-3 shrink-0" />}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const rank = rankedSymbols.indexOf(item.symbol) + 1;
                return (
                  <tr
                    key={item.symbol}
                    tabIndex={0}
                    onClick={() => onOpenSymbol(item.symbol)}
                    onKeyDown={(event) => openFromKeyboard(event, item.symbol)}
                    className="cursor-pointer outline-none hover:bg-surface-subtle focus-visible:bg-accent/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <td className={cn(TD, 'text-muted-foreground tabular-nums')}>
                      {rank > 0 && <span aria-label={`Metric rank ${rank}`}>{rank}</span>}
                    </td>
                    <td className={TD}>
                      <p className="text-sm font-semibold">{item.symbol}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">Max Pain: {item.metrics.max_pain.available ? formatOptionsMetric(item.metrics.max_pain) : '—'}</p>
                    </td>
                    <td className={TD}>
                      <OptionsSourceBadges
                        badges={item.source_badges}
                        candidateRank={item.candidate_rank}
                        leaderRank={item.leader_rank}
                      />
                    </td>
                    <td className={TD}><OptionsQualityBadge state={item.state} reasonCodes={item.reason_codes} /></td>
                    {columns.map(({ name, percent }) => {
                      const metric = item.metrics[name];
                      return (
                        <td key={name} className={cn(TD, 'text-right font-medium tabular-nums')}>
                          {metric.available
                            ? formatOptionsMetric(metric, { percent })
                            : <UnavailableMetric metric={metric} />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
