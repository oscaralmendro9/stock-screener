import { useMemo, memo } from 'react';

import { barRects, roundedTopRectPath } from './sparklineGeometry';

/**
 * RS Sparkline Component
 *
 * Renders a column/bar sparkline showing the RS ratio trend
 * over the last 30 trading days. Mimics Google Sheets SPARKLINE formula:
 * =SPARKLINE(stock_price/SPY_price, {"charttype","column";"color","lightgreen";"highcolor","blue";"lowcolor","red"})
 *
 * Color coding (matching Google Sheets):
 * - Light green bars: All bars (default)
 * - Blue bar: Single highest RS ratio value (peak performance)
 * - Red bar: Single lowest RS ratio value (weakest point)
 */
function RSSparkline({ data, trend, width = 60, height = 20 }) {
  const hasData = Array.isArray(data) && data.length > 0;
  // Raw RS ratios (stock_price / SPY_price), like Google Sheets
  const { bars, maxIndex, minIndex } = useMemo(() => {
    if (!hasData) {
      return { bars: [], maxIndex: -1, minIndex: -1 };
    }

    const values = data;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    // Find indices of max and min values for color highlighting
    const maxIndex = values.indexOf(maxVal);
    const minIndex = values.indexOf(minVal);

    // Add padding to domain for better visualization
    const range = maxVal - minVal || 0.01;
    const padding = range * 0.1;

    const bars = barRects(values, {
      width,
      height,
      margin: 1,
      domain: [minVal - padding, maxVal + padding],
      maxBarSize: 3,
    });
    return { bars, maxIndex, minIndex };
  }, [data, hasData, width, height]);

  // Get trend text and percentage for tooltip
  const tooltipText = useMemo(() => {
    if (!hasData) return 'No RS data';
    const trendText = trend === 1 ? 'Improving' : trend === -1 ? 'Declining' : 'Flat';
    const firstVal = data[0] || 1;
    const lastVal = data[data.length - 1] || 1;
    const change = ((lastVal - firstVal) / firstVal) * 100;
    const sign = change >= 0 ? '+' : '';
    return `RS ${trendText} (${sign}${change.toFixed(1)}% over 30d)`;
  }, [trend, data, hasData]);

  // No data - show placeholder
  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center text-[11px] text-disabled-foreground"
        style={{ width, height }}
      >
        -
      </div>
    );
  }

  // Native title for hover; the same summary is the accessible label.
  return (
    <div role="img" aria-label={tooltipText} title={tooltipText} style={{ width, height }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {bars.map((rect, index) => {
          // Color coding matching Google Sheets, in theme colours:
          // - Accent: highest value (highcolor)
          // - Loss: lowest value (lowcolor)
          // - Lighter gain: all other bars (color)
          const extreme = index === maxIndex || index === minIndex;
          const fillColor = index === maxIndex
            ? 'var(--accent)'
            : index === minIndex ? 'var(--loss)' : 'var(--gain)';
          return (
            <path
              key={index}
              d={roundedTopRectPath(rect, 1)}
              fill={fillColor}
              fillOpacity={extreme ? 1 : 0.55}
            />
          );
        })}
      </svg>
    </div>
  );
}

// Memoize component - only re-render when data or dimensions change
export default memo(RSSparkline, (prevProps, nextProps) => {
  // Deep compare data arrays
  if (prevProps.data === nextProps.data) return true;
  if (!prevProps.data || !nextProps.data) return false;
  if (prevProps.data.length !== nextProps.data.length) return false;

  // For sparkline data, compare first, last, and length (sufficient for visual comparison)
  return (
    prevProps.data[0] === nextProps.data[0] &&
    prevProps.data[prevProps.data.length - 1] === nextProps.data[nextProps.data.length - 1] &&
    prevProps.trend === nextProps.trend &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height
  );
});
