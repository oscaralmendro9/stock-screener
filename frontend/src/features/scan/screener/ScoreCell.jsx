import { cn } from '@/lib/cn';
import { heatStep } from '../../../utils/scoreHeat';

const DASH = <span className="text-muted-foreground">-</span>;
const isNumber = (value) => value != null && value !== '' && Number.isFinite(Number(value));

// Same buckets and strengths as the full table's heat (utils/scoreHeat).
export default function ScoreCell({ value, strong = false }) {
  if (!isNumber(value)) return DASH;
  const number = Number(value);
  const heat = heatStep(Number(number.toFixed(1)) === 0 ? null : number);
  const mix = heat
    ? heat.dir === 'up' ? `color-mix(in srgb, var(--gain) ${(6 + (24 * heat.step) / 5).toFixed(1)}%, transparent)`
      : `color-mix(in srgb, var(--loss) ${(6 + (18 * heat.step) / 3).toFixed(1)}%, transparent)`
    : undefined;
  return (
    <span className={cn('inline-block min-w-10 rounded-sm px-1 py-0.5 text-right', strong && 'font-semibold')} style={{ backgroundColor: mix }}>
      {number.toFixed(1)}
    </span>
  );
}
