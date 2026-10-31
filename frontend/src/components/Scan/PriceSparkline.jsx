import { useMemo, memo } from 'react';

import { baseValue, monotoneXPath, scaleLinear } from './sparklineGeometry';

// The chart's own width is set by flex layout, so the SVG stretches a fixed
// viewBox horizontally: 1 unit = 1px vertically (margins and stroke stay in
// pixels) and the curve keeps its shape under the horizontal stretch.
const VIEW_WIDTH = 1000;
const MARGIN = 2;
const UP = 'var(--gain)';
const DOWN = 'var(--loss)';
const FLAT = 'var(--disabled-foreground)';

/**
 * Price Sparkline Component
 *
 * Renders an area chart sparkline showing the price trend
 * over the last 30 trading days. Uses normalized prices for
 * consistent visual comparison across stocks.
 *
 * Color coding (gain/loss tokens, so it follows light/dark mode):
 * - Green: Price up overall (30-day change positive)
 * - Red: Price down overall (30-day change negative)
 * - Grey: Flat
 *
 * Displays 1-day change as text badge
 */
function PriceSparkline({
  data,
  trend,
  change1d,
  industry,  // Industry to show in tooltip
  width = 100,
  height = 28,
  showChange = true,  // Whether to show the 1-day change text
  sparklineWidth = 60,  // Width of the inner sparkline chart when showChange is true
}) {

  const viewHeight = typeof height === 'number' ? height : 28;

  const { hasData, line, area, dotY, color } = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { hasData: false, color: FLAT };
    }

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);

    // Add 5% padding to domain
    const range = maxVal - minVal || 0.01;
    const padding = range * 0.05;

    // trend: 1 = up, -1 = down, 0 = flat
    const color = trend === 1 ? UP : trend === -1 ? DOWN : FLAT;

    const domain = [minVal - padding, maxVal + padding];
    const y = scaleLinear(domain, [viewHeight - MARGIN, MARGIN]);
    if (data.length === 1) {
      // recharts drew a lone point as a dot rather than a line.
      return { hasData: true, dotY: y(data[0]), color };
    }
    const step = VIEW_WIDTH / (data.length - 1);
    const line = monotoneXPath(data.map((value, i) => [i * step, y(value)]));
    // Filled to the padded floor, or to zero if the padding dips below it,
    // like recharts' Area.
    const base = y(baseValue(domain));
    const area = `${line}L${VIEW_WIDTH},${base}L0,${base}Z`;

    return { hasData: true, line, area, color };
  }, [data, trend, viewHeight]);

  // Format 1-day change for display
  const changeText = useMemo(() => {
    if (change1d === null || change1d === undefined) return null;
    const sign = change1d >= 0 ? '+' : '';
    return `${sign}${change1d.toFixed(1)}%`;
  }, [change1d]);

  const changeClass = useMemo(() => {
    if (change1d === null || change1d === undefined) return 'text-muted-foreground';
    return change1d >= 0 ? 'text-gain' : 'text-loss';
  }, [change1d]);

  // Tooltip content
  const tooltipText = useMemo(() => {
    const parts = [];

    // Add industry if available
    if (industry) {
      parts.push(industry);
    }

    // Add 30-day trend description
    const trendText = trend === 1 ? 'Up' : trend === -1 ? 'Down' : 'Flat';
    if (data && data.length > 0) {
      const overallChange = ((data[data.length - 1] - data[0]) / data[0]) * 100;
      parts.push(`30d: ${overallChange >= 0 ? '+' : ''}${overallChange.toFixed(1)}% (${trendText})`);
    }

    return parts.join(' | ') || 'No data';
  }, [industry, trend, data]);

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

  // The native title is the hover hint; the label carries the same summary
  // to screen readers.
  return (
    <div
      role="img"
      aria-label={tooltipText}
      title={tooltipText}
      className="flex items-center gap-1"
      style={{ width, height }}
    >
      {/* Sparkline Chart */}
      <div
        className="h-full min-w-0"
        style={{ width: showChange ? sparklineWidth : '100%', flex: showChange ? '1 1 auto' : 1 }}
      >
        {dotY === undefined ? (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
            preserveAspectRatio="none"
            style={{ display: 'block' }}
          >
            <path d={area} fill={color} fillOpacity={0.25} />
            <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </svg>
        ) : (
          // Unstretched, so the dot stays round.
          <svg width="100%" height="100%" style={{ display: 'block' }}>
            <circle cx="50%" cy={dotY} r={3} stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.25} />
          </svg>
        )}
      </div>

      {/* 1-Day Change Badge: 11px floor, aligned digits in the UI font */}
      {showChange && changeText && (
        <span className={`shrink-0 text-[11px] font-semibold whitespace-nowrap tabular-nums ${changeClass}`}>
          {changeText}
        </span>
      )}
    </div>
  );
}

// Memoize component - only re-render when data or key props change
export default memo(PriceSparkline, (prevProps, nextProps) => {
  // Deep compare data arrays
  if (prevProps.data === nextProps.data) {
    return (
      prevProps.trend === nextProps.trend &&
      prevProps.change1d === nextProps.change1d &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height &&
      prevProps.sparklineWidth === nextProps.sparklineWidth
    );
  }

  if (!prevProps.data || !nextProps.data) return false;
  if (prevProps.data.length !== nextProps.data.length) return false;

  // For sparkline data, compare first, last, and length (sufficient for visual comparison)
  return (
    prevProps.data[0] === nextProps.data[0] &&
    prevProps.data[prevProps.data.length - 1] === nextProps.data[nextProps.data.length - 1] &&
    prevProps.trend === nextProps.trend &&
    prevProps.change1d === nextProps.change1d &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.sparklineWidth === nextProps.sparklineWidth
  );
});
