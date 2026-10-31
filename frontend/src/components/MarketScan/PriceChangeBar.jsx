/**
 * Price Change Bar Component
 *
 * Renders a horizontal bar showing relative price change.
 * Mimics Google Sheets SPARKLINE bar chart formula:
 * - Center of bar = 0%
 * - Gain bar extends RIGHT for positive values
 * - Loss bar extends LEFT for negative values
 * - Scale based on min/max across all stocks in theme
 *
 * Displays:
 * - Percentage text (signed, gain/loss colour)
 * - Relative bar beside the text
 */
import { useMemo } from 'react';

import { cn } from '@/lib/cn';

const directionClass = (value) => (value >= 0 ? 'text-gain' : 'text-loss');

function PriceChangeBar({ value, min, max, width = 60, height = 24 }) {
  // Calculate bar properties based on Google Sheets formula logic
  const barData = useMemo(() => {
    if (value === null || value === undefined) {
      return { barLeft: 0, barWidth: 0 };
    }

    // Total range spans from min (negative or 0) to max (positive or 0)
    const absMin = Math.abs(min);
    const absMax = Math.abs(max);
    const totalRange = absMin + absMax;

    if (totalRange === 0) {
      return { barLeft: 50, barWidth: 0 };
    }

    // Center position = |min| / totalRange (as percentage from left)
    const centerPercent = (absMin / totalRange) * 100;
    const barPercent = (Math.abs(value) / totalRange) * 100;
    return {
      barLeft: value >= 0 ? centerPercent : centerPercent - barPercent,
      barWidth: barPercent,
    };
  }, [value, min, max]);

  const hasValue = value !== null && value !== undefined;
  const percentText = hasValue ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}%` : '-';

  return (
    <div className="flex items-center gap-1" style={{ width, height }}>
      {/* Percentage text on the left: 11px floor, aligned digits */}
      <span
        className={cn(
          'min-w-[38px] text-right text-[11px] leading-none font-semibold tabular-nums',
          hasValue ? directionClass(value) : 'text-disabled-foreground',
        )}
      >
        {percentText}
      </span>

      {/* Bar on the right */}
      <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-surface">
        {hasValue && (
          <div
            className={cn('absolute h-full rounded-sm', value >= 0 ? 'bg-gain' : 'bg-loss')}
            style={{ left: `${barData.barLeft}%`, width: `${barData.barWidth}%` }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Compact version showing just the value text with color
 */
export function PriceChangeText({ value, showSign = true }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-disabled-foreground">-</span>;
  }

  const sign = value >= 0 && showSign ? '+' : '';
  return (
    <span className={cn('text-[11px] font-semibold tabular-nums', directionClass(value))}>
      {sign}{value.toFixed(1)}%
    </span>
  );
}

export default PriceChangeBar;
