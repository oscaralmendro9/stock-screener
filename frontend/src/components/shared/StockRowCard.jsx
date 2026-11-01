import PriceSparkline from '../Scan/PriceSparkline';
import { formatLocalCurrency } from '../../utils/formatUtils';
import { cn } from '@/lib/cn';

const oneDecimal = (value) => (Number.isFinite(Number(value)) && value != null ? Number(value).toFixed(1) : '-');

// Slots sit above the stretched open-button overlay so their controls get the
// tap. A tap on inert content in them (a rating chip) still opens the card.
const OVERLAY_SLOT = 'relative z-[1] flex items-center gap-1';
const INTERACTIVE = 'button, a, [role="button"], input, select';

const forwardInertTap = (onOpen) => (onOpen
  ? (event) => { if (!event.target.closest(INTERACTIVE)) onOpen(event); }
  : undefined);

/**
 * Phone-width stand-in for a stock table row: everything a reader scans for
 * (symbol, score, price, 1D change, trend, group) in ~370px, no sideways scroll.
 *
 * When `onOpen` is set, only the symbol is a real button ("Open FORM chart");
 * its ::after overlay stretches over the card so the whole card is the tap
 * target, while the rest of the card stays readable to screen readers and
 * `badge` (e.g. a clickable action state) sits above the overlay as a sibling,
 * not nested inside the button.
 */
export default function StockRowCard({
  row,
  // Unlabelled value for the pill (Daily lists pass e.g. resilience_score).
  scoreField = 'composite_score',
  // Optional labelled override, already formatted: { label, value, name }
  // (the Scan list passes its active sort's value).
  metric = null,
  badge = null,
  actions = null,
  // Text value of a text sort (sector, pattern…); leads the group line.
  sortNote = null,
  meta = null,
  onOpen = null,
}) {
  const onSlotClick = forwardInertTap(onOpen);
  const shown = metric || { label: null, value: oneDecimal(row[scoreField]), name: 'Score' };
  const change = Number(row.price_change_1d);
  const hasChange = row.price_change_1d != null && Number.isFinite(change);
  // Rank first: long industry names truncate, and the rank is the part worth keeping.
  const group = [row.ibd_group_rank != null ? `Grp #${row.ibd_group_rank}` : null, row.ibd_industry_group, meta]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={cn(
        'tw relative grid grid-cols-[minmax(0,1fr)_88px_72px] items-center gap-2.5 px-3 py-2 text-foreground',
        onOpen && 'cursor-pointer hover:bg-surface-subtle',
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Open ${row.symbol} chart`}
              // The ticker keeps its width beside the action icons.
              style={{ flexShrink: 0 }}
              className="max-w-[70%] cursor-pointer truncate border-0 bg-transparent p-0 text-left text-sm font-bold text-foreground outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
            >
              {row.symbol}
            </button>
          ) : (
            <span style={{ flexShrink: 0 }} className="max-w-[70%] truncate text-sm font-bold">{row.symbol}</span>
          )}
          {actions ? (
            // Actions stay on the ticker row; badges go on the company line
            // so the two can't squeeze each other out at 360px.
            <div style={{ flexShrink: 0 }} className={OVERLAY_SLOT} onClick={onSlotClick}>
              {actions}
            </div>
          ) : null}
        </div>
        {row.company_name || badge ? (
          <div className="flex min-w-0 items-center gap-1.5">
            {badge ? (
              // Badges keep up to 75% of the line; the company name truncates first.
              // An inert badge (a rating chip) lets taps fall through to open.
              <div
                style={{ minWidth: 0 }}
                onClick={onSlotClick}
                className={cn(OVERLAY_SLOT, 'max-w-[75%] flex-none overflow-hidden [&>*]:max-w-full')}
              >
                {badge}
              </div>
            ) : null}
            {row.company_name ? (
              <p className="min-w-0 truncate text-xs text-muted-foreground">{row.company_name}</p>
            ) : null}
          </div>
        ) : null}
        {group || sortNote ? (
          <p className="truncate text-[11px] text-muted-foreground">
            {sortNote ? (
              <span data-testid="card-sort-note" className="font-semibold text-foreground">{sortNote}</span>
            ) : null}
            {sortNote && group ? ' · ' : ''}
            {group}
          </p>
        ) : null}
      </div>

      <div>
        {row.price_sparkline_data ? (
          <PriceSparkline
            data={row.price_sparkline_data}
            trend={row.price_trend}
            change1d={null}
            industry={row.ibd_industry_group}
            width={88}
            height={32}
            showChange={false}
          />
        ) : null}
      </div>

      <div className="text-right tabular-nums">
        <span className="inline-block rounded bg-surface-subtle px-1.5 text-[11px] font-bold">
          {/* An aria-label on a span isn't announced; give screen readers the
              full name as real text and hide the abbreviation from them. */}
          <span aria-hidden="true">{shown.label ? `${shown.label} ` : ''}{shown.value}</span>
          <span className="sr-only">{`${shown.name} ${shown.value}`}</span>
        </span>
        <p className="mt-0.5 text-[13px] font-semibold">
          {formatLocalCurrency(row.current_price, row.currency)}
        </p>
        <p
          className={cn(
            'text-[11.5px]',
            hasChange && change > 0 ? 'text-gain' : hasChange && change < 0 ? 'text-loss' : 'text-muted-foreground',
          )}
        >
          {hasChange ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : '-'}
        </p>
      </div>
    </div>
  );
}
