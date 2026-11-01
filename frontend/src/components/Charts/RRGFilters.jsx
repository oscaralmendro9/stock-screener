/**
 * RRG filter controls: a quadrant multi-select + a current-rank range (two
 * native sliders) + a name multi-select. Presentational only — state lives in
 * useRRGFilters. Shared by the live and static Group Rankings pages via RRGChart.
 */
import CompactMultiSelect from '../Scan/filters/CompactMultiSelect';
import { QUADRANTS, useQuadrantColors } from './rrgColors';

const RANGE = 'h-6 w-full cursor-pointer accent-accent';

export default function RRGFilters({
  scopeLabel,
  names,
  selected,
  onSelected,
  quadrants,
  onQuadrants,
  maxRank,
  rankValue,
  onRankChange,
}) {
  const { colorOf } = useQuadrantColors();
  const [low, high] = rankValue;
  const toggleQuadrant = (q) => onQuadrants(quadrants.includes(q) ? quadrants.filter((v) => v !== q) : [...quadrants, q]);
  return (
    <>
      {/* Quadrant multi-select — empty selection means "all shown". Each button
          takes its quadrant color when active. */}
      <div role="group" aria-label="Filter by quadrant" className="flex overflow-hidden rounded-md border border-border">
        {QUADRANTS.map((q) => {
          const on = quadrants.includes(q);
          return (
            <button
              key={q}
              type="button"
              aria-pressed={on}
              onClick={() => toggleQuadrant(q)}
              style={on ? { color: colorOf(q), boxShadow: `inset 0 -2px 0 ${colorOf(q)}` } : undefined}
              className={`h-11 cursor-pointer border-r border-border px-2.5 text-xs outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:h-8 ${on ? 'bg-surface-subtle font-bold' : 'bg-surface text-muted-foreground hover:text-foreground'}`}
            >
              {q}
            </button>
          );
        })}
      </div>
      {maxRank > 1 && (
        <div role="group" aria-label="Current rank range" className="w-48">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Rank {low}–{high}
          </span>
          <input
            type="range"
            aria-label="Best rank shown"
            min={1}
            max={maxRank}
            value={low}
            onChange={(e) => onRankChange([Math.min(Number(e.target.value), high), high])}
            className={RANGE}
          />
          <input
            type="range"
            aria-label="Worst rank shown"
            min={1}
            max={maxRank}
            value={high}
            onChange={(e) => onRankChange([low, Math.max(Number(e.target.value), low)])}
            className={RANGE}
          />
        </div>
      )}
      <div className="w-80 max-w-full">
        <CompactMultiSelect
          label={`Filter ${scopeLabel.toLowerCase()}`}
          values={selected}
          options={names}
          onChange={onSelected}
          placeholder="All shown"
        />
      </div>
    </>
  );
}
