import { cn } from '@/lib/cn';

import BreadthMetricTooltip from './BreadthMetricTooltip';
import { breadthMetricDefinitions } from './breadthMetricDefinitions';
import { BREADTH_VISUAL_COLORS } from './breadthVisualEncoding';


const contextMetrics = [
  't2108_pct',
  'atr_10x_extension_count',
  'broad_universe_count',
];

const eligibleValue = (row, metric) => {
  const eligibleField = breadthMetricDefinitions[metric].eligibleField;
  return eligibleField ? row?.[eligibleField] : null;
};

const formatContextValue = (row, metric) => {
  if (!row) return '—';
  if (metric === 'broad_universe_count') {
    return row[metric] ?? '—';
  }
  const eligible = eligibleValue(row, metric);
  if (!eligible) return '—';
  if (metric === 't2108_pct') {
    const count = row.t2108_count ?? 0;
    const percentage = row.t2108_pct ?? (count / eligible) * 100;
    return `${Number(percentage).toFixed(2)}% (${count} / ${eligible})`;
  }
  return `${row[metric] ?? 0} / ${eligible}`;
};

const percent = (count, denominator) => (
  denominator > 0 ? Math.max(0, Math.min(100, (count / denominator) * 100)) : 0
);

function HealthBar({
  testId,
  left,
  right,
  neutral,
  isAvailable,
  eligibleLabel,
  colors,
}) {
  const leftPercent = percent(left.count, left.denominator);
  const rightPercent = percent(right.count, right.denominator);
  const neutralPercent = neutral ? percent(neutral.count, neutral.denominator) : 0;
  const ariaLabel = isAvailable
    ? [
      `${left.label} ${leftPercent.toFixed(1)}%`,
      `${right.label} ${rightPercent.toFixed(1)}%`,
      neutral ? `${neutral.label} ${neutralPercent.toFixed(1)}%` : null,
    ].filter(Boolean).join(', ')
    : `${left.label} and ${right.label} unavailable`;

  return (
    <div
      data-testid={testId}
      aria-label={ariaLabel}
      className="min-w-0 rounded-md border border-border p-3"
    >
      <div className="flex justify-between gap-4">
        {[left, right].map((item, index) => {
          const itemPercent = index === 0 ? leftPercent : rightPercent;
          return (
            <div key={item.metric} className={cn('min-w-0', index === 1 && 'text-right')}>
              <div className={cn('flex items-center', index === 1 && 'justify-end')}>
                <span className="text-[11px] font-semibold" style={{ color: colors[index] }}>
                  {item.label}
                </span>
                <BreadthMetricTooltip metric={item.metric} compact />
              </div>
              <p
                className={cn('text-sm font-semibold tabular-nums', !isAvailable && 'text-muted-foreground')}
                style={isAvailable ? { color: colors[index] } : undefined}
              >
                {isAvailable ? `${item.count} (${itemPercent.toFixed(1)}%)` : '—'}
              </p>
            </div>
          );
        })}
      </div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-surface-subtle"
      >
        <div
          data-testid={`${testId}-${left.segment}`}
          style={{ width: `${leftPercent}%`, backgroundColor: colors[0] }}
        />
        {neutral && (
          <div
            data-testid={`${testId}-${neutral.segment}`}
            style={{ width: `${neutralPercent}%`, backgroundColor: BREADTH_VISUAL_COLORS.unchanged }}
          />
        )}
        <div
          data-testid={`${testId}-${right.segment}`}
          style={{ width: `${rightPercent}%`, backgroundColor: colors[1] }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">{eligibleLabel}</p>
    </div>
  );
}

function BreadthContextStrip({ row }) {
  const advanceDeclineEligible = Number(row?.advance_decline_eligible_count) || 0;
  const advancing = Number(row?.advancing_count) || 0;
  const declining = Number(row?.declining_count) || 0;
  const unchanged = Number(row?.unchanged_count) || 0;
  const newHighs = Number(row?.new_high_52week_count) || 0;
  const newLows = Number(row?.new_low_52week_count) || 0;
  const highLowEvents = newHighs + newLows;
  const highLowEligible = Number(row?.high_low_52week_eligible_count) || 0;

  return (
    <div aria-label="Breadth context" className="tw flex flex-col gap-2">
      <div className="grid gap-2 md:grid-cols-2">
        <HealthBar
          testId="breadth-health-advance-decline"
          left={{
            metric: 'advancing_count',
            label: 'Advancing',
            count: advancing,
            denominator: advanceDeclineEligible,
            segment: 'advancing',
          }}
          right={{
            metric: 'declining_count',
            label: 'Declining',
            count: declining,
            denominator: advanceDeclineEligible,
            segment: 'declining',
          }}
          neutral={{
            label: 'Unchanged',
            count: unchanged,
            denominator: advanceDeclineEligible,
            segment: 'unchanged',
          }}
          isAvailable={advanceDeclineEligible > 0}
          eligibleLabel={`${advanceDeclineEligible || '—'} advance/decline eligible stocks`}
          colors={['var(--gain)', 'var(--loss)']}
        />
        <HealthBar
          testId="breadth-health-high-low"
          left={{
            metric: 'new_high_52week_count',
            label: 'New High',
            count: newHighs,
            denominator: highLowEvents,
            segment: 'high',
          }}
          right={{
            metric: 'new_low_52week_count',
            label: 'New Low',
            count: newLows,
            denominator: highLowEvents,
            segment: 'low',
          }}
          isAvailable={highLowEligible > 0}
          eligibleLabel={`${highLowEligible || '—'} high/low eligible stocks`}
          colors={[BREADTH_VISUAL_COLORS.newHigh, BREADTH_VISUAL_COLORS.newLow]}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {contextMetrics.map((metric) => (
          <div
            key={metric}
            data-testid={`breadth-context-${metric}`}
            className="min-w-0 rounded-md border border-border px-3 py-2"
          >
            <div className="flex items-center">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {breadthMetricDefinitions[metric].label}
              </span>
              <BreadthMetricTooltip metric={metric} compact />
            </div>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatContextValue(row, metric)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BreadthContextStrip;
