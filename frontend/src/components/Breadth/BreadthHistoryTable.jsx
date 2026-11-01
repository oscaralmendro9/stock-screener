import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';

import { cn } from '@/lib/cn';

import BreadthMetricTooltip from './BreadthMetricTooltip';
import {
  breadthMetricDefinitions,
  primaryBreadthMetrics,
  secondaryBreadthMetrics,
  tableContextMetrics,
} from './breadthMetricDefinitions';
import {
  BREADTH_VISUAL_COLORS,
  buildDirectionalToneThresholds,
  isDirectionalMetric,
  metricTone,
} from './breadthVisualEncoding';

const formatValue = (row, metric) => {
  const value = row?.[metric];
  if (value == null) return '—';
  if (metric === 'ratio_5day' || metric === 'ratio_10day') {
    return Number(value).toFixed(2);
  }
  const eligibleField = breadthMetricDefinitions[metric]?.eligibleField;
  const eligibleValue = eligibleField ? row?.[eligibleField] : null;
  if (eligibleValue != null && Number(eligibleValue) <= 0) return '—';
  if (metric === 't2108_pct') return `${Number(value).toFixed(2)}%`;
  return value;
};

const metricHeaderLines = {
  stocks_up_4pct: ['Stocks Up', '4%+ Today'],
  stocks_down_4pct: ['Stocks Down', '4%+ Today'],
  ratio_5day: ['5 Day', 'Ratio'],
  ratio_10day: ['10 Day', 'Ratio'],
  stocks_up_25pct_quarter: ['Up 25%+', 'Quarter'],
  stocks_down_25pct_quarter: ['Down 25%+', 'Quarter'],
  stocks_up_25pct_month: ['Up 25%+', 'Month'],
  stocks_down_25pct_month: ['Down 25%+', 'Month'],
  stocks_up_50pct_month: ['Up 50%+', 'Month'],
  stocks_down_50pct_month: ['Down 50%+', 'Month'],
  stocks_up_13pct_34days: ['Up 13%+', '34 Days'],
  stocks_down_13pct_34days: ['Down 13%+', '34 Days'],
  atr_10x_extension_count: ['10x ATR', 'Extension'],
  t2108_pct: ['T2108', '> 40D SMA'],
  broad_universe_count: ['Broad Universe'],
};

const GROUPS = [
  {
    key: 'primary',
    label: 'Primary Breadth Indicators',
    description: 'Daily movers & ratios',
    metrics: primaryBreadthMetrics,
  },
  {
    key: 'secondary',
    label: 'Secondary Breadth Indicators',
    description: 'Trend windows',
    metrics: secondaryBreadthMetrics,
  },
  {
    key: 'context',
    label: 'Context',
    description: 'Market context',
    metrics: tableContextMetrics,
  },
];

const groupStartMetrics = new Set(GROUPS.map((group) => group.metrics[0]));
const EMPTY_CONTRIBUTOR_DATES = new Set();
// A 1px rule marks where each indicator group starts.
const groupRule = (metric) => groupStartMetrics.has(metric) && 'border-l border-l-border';

function MetricHeader({ metric }) {
  const lines = metricHeaderLines[metric] ?? [breadthMetricDefinitions[metric].label];
  return (
    <th
      scope="col"
      data-testid={`breadth-header-${metric}`}
      aria-label={breadthMetricDefinitions[metric].label}
      className={cn('h-14 border-b border-border px-0.5 py-1 text-center text-[11px] leading-tight font-medium', groupRule(metric))}
      style={{ whiteSpace: 'normal' }}
    >
      <div className="flex items-center justify-center">
        <span>
          {lines.map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
        </span>
        <BreadthMetricTooltip metric={metric} compact />
      </div>
    </th>
  );
}

function BreadthHistoryTable({
  rows = [],
  maxRows = 90,
  contributorDates = EMPTY_CONTRIBUTOR_DATES,
  onContributorCellClick,
}) {
  const metrics = [
    ...primaryBreadthMetrics,
    ...secondaryBreadthMetrics,
    ...tableContextMetrics,
  ];
  const visibleRows = useMemo(() => rows.slice(0, maxRows), [maxRows, rows]);
  const toneThresholds = useMemo(
    () => buildDirectionalToneThresholds(visibleRows),
    [visibleRows],
  );
  return (
    <div
      data-testid="breadth-history-scroll"
      className="tw"
      style={{ overflowX: 'auto', maxHeight: 'calc(100dvh - 360px)' }}
    >
      <table
        data-testid="breadth-history-table"
        className="min-w-[980px] border-separate border-spacing-0 text-xs"
        style={{ width: '100%', tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: 76 }} />
          {metrics.map((metric) => (
            <col
              key={metric}
              style={{ width: tableContextMetrics.includes(metric) ? 72 : 62 }}
            />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-[3] bg-surface">
          <tr>
            <th
              scope="col"
              rowSpan={2}
              className="sticky left-0 z-[4] border-r border-b border-border bg-surface px-1.5 text-left font-semibold"
            >
              Date
            </th>
            {GROUPS.map((group) => (
              <th
                key={group.key}
                scope="colgroup"
                colSpan={group.metrics.length}
                data-testid={`breadth-group-${group.key}`}
                className="border-b border-l border-border px-1 py-1.5 text-center"
              >
                <div className="text-xs leading-tight font-semibold">{group.label}</div>
                <div className="text-[11px] leading-tight font-normal text-muted-foreground">
                  {group.description}
                </div>
              </th>
            ))}
          </tr>
          <tr>
            {metrics.map((metric) => <MetricHeader key={metric} metric={metric} />)}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.date}>
              <th
                scope="row"
                className="sticky left-0 z-[2] border-r border-b border-border bg-surface px-1.5 text-left font-semibold whitespace-nowrap tabular-nums"
              >
                {format(parseISO(row.date), 'MM/dd/yy')}
              </th>
              {metrics.map((metric) => {
                const tone = metricTone(row, metric, toneThresholds);
                const definition = breadthMetricDefinitions[metric];
                const value = Number(row?.[metric]);
                const interactive = Boolean(
                  definition?.contributor
                  && contributorDates.has(row.date)
                  && Number.isFinite(value)
                  && value > 0
                  && onContributorCellClick,
                );
                return (
                  <td
                    key={metric}
                    data-testid={`breadth-cell-${metric}`}
                    data-tone={tone}
                    className={cn(
                      'h-8 border-b border-white/5 text-right whitespace-nowrap tabular-nums',
                      isDirectionalMetric(metric) ? 'font-bold' : 'font-medium',
                      !interactive && 'px-1',
                      groupRule(metric),
                    )}
                    style={{ color: '#fff', backgroundColor: BREADTH_VISUAL_COLORS[tone] }}
                  >
                    {interactive ? (
                      <button
                        type="button"
                        aria-label={`View ${value} contributing stocks for ${definition.label}`}
                        onClick={(event) => onContributorCellClick(metric, row, event.currentTarget)}
                        className="flex h-8 w-full cursor-pointer items-center justify-end px-1 underline decoration-white/40 underline-offset-2 outline-none hover:decoration-white focus-visible:outline-2 focus-visible:-outline-offset-[3px] focus-visible:outline-white"
                      >
                        {formatValue(row, metric)}
                      </button>
                    ) : formatValue(row, metric)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BreadthHistoryTable;
