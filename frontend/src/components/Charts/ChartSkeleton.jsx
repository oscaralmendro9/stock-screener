// Fixed bar heights (no Math.random) so the placeholder doesn't change on re-render.
const PRICE_BARS = Array.from({ length: 40 }, (_, i) => 20 + Math.sin(i * 0.3) * 30 + ((i * 37) % 20));
const VOLUME_BARS = Array.from({ length: 40 }, (_, i) => 20 + ((i * 53) % 60));
const PULSE = 'rounded-sm bg-surface-subtle motion-safe:animate-pulse';

/**
 * Chart skeleton placeholder that shows chart structure while loading.
 * Same chrome as the loaded chart, from the theme tokens.
 */
const ChartSkeleton = ({ height }) => (
  <div className="tw relative flex w-full flex-col bg-surface p-4" style={{ height }}>
    <div className="flex flex-1">
      {/* Price axis labels */}
      <div className="flex w-[60px] flex-col justify-between pr-2">
        {[...Array(6)].map((_, i) => <span key={i} className={`${PULSE} h-3 w-10`} />)}
      </div>

      {/* Chart area */}
      <div className="relative flex-1 border-b border-l border-border">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute inset-x-0 border-t border-dashed border-border opacity-50" style={{ top: `${(i + 1) * 16.67}%` }} />
        ))}

        <div className="flex h-[70%] items-end gap-0.5 px-2 pt-4">
          {PRICE_BARS.map((h, i) => <span key={i} className={`${PULSE} max-w-3 flex-1`} style={{ height: `${h}%` }} />)}
        </div>

        <div className="flex h-1/4 items-end gap-0.5 border-t border-border px-2 pt-1">
          {VOLUME_BARS.map((h, i) => <span key={i} className={`${PULSE} max-w-3 flex-1 opacity-50`} style={{ height: `${h}%` }} />)}
        </div>
      </div>
    </div>

    {/* Time axis labels */}
    <div className="flex justify-around pt-2 pl-16">
      {[...Array(6)].map((_, i) => <span key={i} className={`${PULSE} h-3 w-12`} />)}
    </div>

    <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
      <span role="progressbar" aria-label="Loading chart" className="inline-block size-8 rounded-full border-2 border-border border-t-disabled-foreground motion-safe:animate-spin" />
      <span className="text-[11px] text-muted-foreground">Loading chart...</span>
    </div>
  </div>
);

export default ChartSkeleton;
