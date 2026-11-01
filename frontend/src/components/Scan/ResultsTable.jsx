import { useLayoutEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, ChartLine, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { NativeSelect } from '@/ui/native-select';
import RSSparkline from './RSSparkline';
import PriceSparkline from './PriceSparkline';
import FieldAvailabilityChip from './FieldAvailabilityChip';
import MarketBadge from './MarketBadge';
import MarketThemesList from '../Stock/MarketThemesList';
import AddToWatchlistMenu from '../common/AddToWatchlistMenu';
import OpportunityEvidenceDrawer from '../shared/OpportunityEvidenceDrawer';
import ActionStateBadge from '../shared/ActionStateBadge';
import StockRowCard from '../shared/StockRowCard';
import { useIsMobileShell } from '../Layout/shellNav';
import { TableSkeleton } from '../common/LoadingSkeletons';
import OpportunityResultCells from './OpportunityResultCells';
import { useOpportunityEvidenceSelection } from './useOpportunityEvidenceSelection';
import {
  getStageColor,
  getRatingColor,
  getGrowthColor,
  getEpsRatingColor,
  getGroupRankColor,
} from '../../utils/colorUtils';
import {
  formatLargeNumber,
  formatIpoAge,
  getIpoAgeColor,
  getCurrencyPrefix,
  formatLocalCurrency,
  formatPatternName,
} from '../../utils/formatUtils';
import { heatClass, heatFill, heatStep } from '../../utils/scoreHeat';

// Row height constant for virtualization
const ROW_HEIGHT = 48;
// Phone layout: one StockRowCard per result (fixed height keeps the virtualizer
// exact). Content needs ~75px; the rest is headroom for larger system text.
const MOBILE_CARD_HEIGHT = 84;
// Phone cards show the value of the active sort (pill label + desktop-style
// formatting), so the visible number matches the order. Covers every sortable
// column the card doesn't already show, plus preset-only sort fields (units from
// the preset filters in backend/app/services/preset_screens.py). Sorts not
// listed are text (sector, pattern, action state, RS blue dot) or already on
// the card (composite, symbol, price, 1D change, group rank, industry), and
// keep the composite.
const oneDp = (value) => Number(value).toFixed(1);
const pct = (value) => `${Number(value).toFixed(1)}%`;
const ratio = (value) => `${Number(value).toFixed(1)}×`;
const whole = (value) => Number(value).toFixed(0);
const CARD_METRICS = {
  minervini_score: { label: 'Min', name: 'Minervini', format: oneDp },
  canslim_score: { label: 'CAN', name: 'CANSLIM', format: oneDp },
  ipo_score: { label: 'IPO', name: 'IPO score', format: oneDp },
  custom_score: { label: 'Cust', name: 'Custom score', format: oneDp },
  volume_breakthrough_score: { label: 'VolB', name: 'Volume breakthrough', format: oneDp },
  se_setup_score: { label: 'SE', name: 'Setup score', format: oneDp },
  vcp_score: { label: 'VScr', name: 'VCP score', format: oneDp },
  resilience_score: { label: 'Res', name: 'Resilience', format: oneDp },
  rs_rating: { label: 'RS', name: 'RS rating', format: whole },
  rs_rating_1m: { label: 'RS1M', name: 'RS rating 1 month', format: whole },
  rs_rating_3m: { label: 'RS3M', name: 'RS rating 3 months', format: whole },
  rs_rating_12m: { label: 'RS12M', name: 'RS rating 12 months', format: whole },
  rs_trend: { label: 'RS', name: 'RS trend', format: (v) => (v > 0 ? '▲' : v < 0 ? '▼' : '–') },
  eps_rating: { label: 'EPS', name: 'EPS rating', format: whole },
  beta: { label: 'β', name: 'Beta', format: (v) => Number(v).toFixed(2) },
  beta_adj_rs: { label: 'βRS', name: 'Beta-adjusted RS', format: whole },
  stage: { label: 'Stg', name: 'Stage', format: (v) => `S${whole(v)}` },
  eps_growth_qq: { label: 'EPS', name: 'EPS growth Q/Q', format: pct },
  sales_growth_qq: { label: 'Sales', name: 'Sales growth Q/Q', format: pct },
  adr_percent: { label: 'ADR', name: 'ADR', format: pct },
  se_distance_to_pivot_pct: { label: 'Pvt', name: 'Distance to pivot', format: pct },
  se_bb_width_pctile_252: { label: 'Sqz', name: 'Squeeze percentile', format: whole },
  se_volume_vs_50d: { label: 'V50', name: 'Volume vs 50-day', format: ratio },
  se_pivot_price: { label: 'Pvt', name: 'Pivot price', format: (v, row) => formatLocalCurrency(v, row.currency) },
  vcp_pivot: { label: 'Pvt', name: 'VCP pivot', format: (v, row) => formatLocalCurrency(v, row.currency) },
  volume: { label: '$Vol', name: 'Dollar volume', format: (v, row) => formatLargeNumber(v, getCurrencyPrefix(row.currency)) },
  // market_cap sorts by the native value (backend mixed_market_policy), so show
  // that, in local currency; market_cap_usd is a separate sort.
  market_cap: { label: 'MCap', name: 'Market cap', format: (v, row) => formatLargeNumber(v, getCurrencyPrefix(row.currency)) },
  market_cap_usd: { label: 'MCap$', name: 'Market cap USD', format: (v) => formatLargeNumber(v, '$') },
  adv_usd: { label: 'ADV', name: 'Average dollar volume', format: (v) => formatLargeNumber(v, '$') },
  // The list sorts by the raw date, so show the date (an age would read in
  // the opposite direction to the sort arrow).
  ipo_date: { label: 'IPO', name: 'IPO date', format: (v) => String(v).slice(0, 10), text: true },
  gap_percent: { label: 'Gap', name: 'Gap', format: pct },
  // Preset-only fields: present on static-site rows (static_scan_bundle_exporter
  // extended fields); the live scan API doesn't return them yet, so live cards
  // fall back to the composite for these sorts.
  perf_week: { label: '1W', name: 'Performance 1 week', format: pct },
  perf_month: { label: '1M', name: 'Performance 1 month', format: pct },
  perf_3m: { label: '3M', name: 'Performance 3 months', format: pct },
  perf_6m: { label: '6M', name: 'Performance 6 months', format: pct },
  week_52_high_distance: { label: '52W', name: 'From 52-week high', format: pct },
  week_52_low_distance: { label: '52WL', name: 'From 52-week low', format: pct },
  volume_surge: { label: 'Vol', name: 'Volume surge', format: ratio },
  se_up_down_volume_ratio_10d: { label: 'U/D', name: 'Up/down volume 10 days', format: ratio },
};
// Same text as the desktop symbol cell's matched-setups chip.
const matchedGroupsLabel = (row) => {
  const groups = row.matched_groups || [];
  if (!groups.length) return null;
  return groups.length === 1 ? groups[0].name : `${groups[0].name} +${groups.length - 1}`;
};
// Text sorts the pill can't fit: their value leads the card's group line.
const CARD_SORT_NOTES = {
  gics_sector: (row) => row.gics_sector || null,
  se_pattern_primary: (row) => (row.se_pattern_primary ? formatPatternName(row.se_pattern_primary) : null),
  rs_line_blue_dot_recent: (row) => (row.rs_line_blue_dot_recent ? 'RS blue dot' : null),
  correction_survivor: (row) => (row.correction_survivor ? 'Correction survivor' : null),
};
// The card's labelled metric for this row, or null to keep the composite.
const cardMetricFor = (row, sortBy) => {
  const spec = CARD_METRICS[sortBy];
  const raw = row[sortBy];
  if (!spec || raw == null || raw === '') return null;
  if (!spec.text && !Number.isFinite(Number(raw))) return null;
  const value = spec.format(raw, row);
  return value && value !== '-' ? { label: spec.label, value, name: spec.name } : null;
};
// Friendly picker names for sortable columns the metric table doesn't name.
const SORT_NAMES = {
  symbol: 'Symbol',
  price_change_1d: '1D change',
  current_price: 'Price',
  price: 'Price', // sortable alias of current_price (scanFilterFields.json)
  correction_survivor: 'Correction survivor',
  gics_sector: 'Sector',
  ibd_industry_group: 'Industry',
  ibd_group_rank: 'Group rank',
  composite_score: 'Composite score',
  se_pattern_primary: 'Pattern',
  rs_line_blue_dot_recent: 'RS blue dot',
  action_state: 'Action state',
};
// Sortable aliases of a table column (scanFilterFields.json): `price` sorts
// the same column as current_price.
const SORT_ALIASES = { price: 'current_price' };
const sortName = (id) => SORT_NAMES[id] || CARD_METRICS[id]?.name || columns.find((column) => column.id === id)?.label || 'Current sort';
// Common sorts lead the phone picker; every other sortable column follows.
const MOBILE_SORT_FIELDS = [
  ['composite_score', 'Composite score'],
  ['minervini_score', 'Minervini'],
  ['canslim_score', 'CANSLIM'],
  ['se_setup_score', 'Setup score'],
  ['rs_rating', 'RS rating'],
  ['price_change_1d', '1D change'],
  ['ibd_group_rank', 'Group rank'],
  ['symbol', 'Symbol'],
];
const SYMBOL_COLUMN_WIDTH = 210;
const OPPORTUNITY_COLUMNS_WIDTH = 153;
const TABLE_MIN_WIDTH = Object.freeze({
  WITH_ACTIONS: 2673,
  WITHOUT_ACTIONS: 2613,
});

// MCap column display modes. USD is the default per 3axp: cross-market
// parity is the common case; local is one click away. Kept as constants
// (rather than bare strings) so callers grep-reliably and typos fail fast.
const MCAP_DISPLAY = Object.freeze({
  USD: 'usd',
  LOCAL: 'local',
});

const formatGroupRankDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map((part) => Number(part));
  if (year && month && day) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }
  return String(value);
};

const getGroupRankTooltip = (row) => {
  if (row.ibd_group_rank == null || !row.ibd_group_rank_date) return undefined;
  return `Group rank ${row.ibd_group_rank} as of ${formatGroupRankDate(row.ibd_group_rank_date)}`;
};

// Column definitions with explicit widths
const columns = [
  { id: 'chart', label: '', sortable: false, width: 60 },
  // Width fits "0700.HK" + MarketBadge + FieldAvailabilityChip on a single
  // line without overflow (nowrap guards the rest).
  { id: 'symbol', label: 'Sym', sortable: true, width: SYMBOL_COLUMN_WIDTH },
  { id: 'rs_trend', label: 'RS Trend', sortable: true, width: 110 },
  { id: 'price_change_1d', label: 'Price', sortable: true, width: 110 },
  { id: 'gics_sector', label: 'Sector', sortable: true, width: 80 },
  { id: 'ibd_industry_group', label: 'IBD Industry', sortable: true, width: 140 },
  { id: 'market_themes', label: 'Themes', sortable: false, width: 180 },
  { id: 'ibd_group_rank', label: 'Grp', sortable: true, width: 45 },
  { id: 'composite_score', label: 'Comp', sortable: true, width: 50 },
  { id: 'minervini_score', label: 'Min', sortable: true, width: 45 },
  { id: 'canslim_score', label: 'CAN', sortable: true, width: 45 },
  { id: 'ipo_score', label: 'IPO', sortable: true, width: 45 },
  { id: 'custom_score', label: 'Cust', sortable: true, width: 45 },
  { id: 'volume_breakthrough_score', label: 'VolB', sortable: true, width: 50 },
  { id: 'se_setup_score', label: 'SE', sortable: true, width: 45 },
  { id: 'se_pattern_primary', label: 'Pat', sortable: true, width: 55 },
  { id: 'se_distance_to_pivot_pct', label: 'Pvt%', sortable: true, width: 50 },
  { id: 'se_bb_width_pctile_252', label: 'Sqz', sortable: true, width: 45 },
  { id: 'se_volume_vs_50d', label: 'V50', sortable: true, width: 45 },
  { id: 'se_rs_line_new_high', label: 'RSH', sortable: false, width: 35 },
  { id: 'se_rs_line_blue_dot', label: 'SEBD', sortable: false, width: 42 },
  { id: 'rs_line_blue_dot_recent', label: 'RSBD', sortable: true, width: 42 },
  { id: 'se_pivot_price', label: 'Pvt$', sortable: true, width: 55 },
  { id: 'resilience_score', label: 'Res', sortable: true, width: 48 },
  { id: 'action_state', label: 'Action', sortable: true, width: 105 },
  { id: 'rs_rating', label: 'RS', sortable: true, width: 40 },
  { id: 'rs_rating_1m', label: '1M', sortable: true, width: 40 },
  { id: 'rs_rating_3m', label: '3M', sortable: true, width: 40 },
  { id: 'rs_rating_12m', label: '12M', sortable: true, width: 45 },
  { id: 'beta', label: 'β', sortable: true, width: 45 },
  { id: 'beta_adj_rs', label: 'βRS', sortable: true, width: 45 },
  { id: 'eps_rating', label: 'EPS Rtg', sortable: true, width: 55 },
  { id: 'stage', label: 'Stg', sortable: true, width: 40 },
  { id: 'current_price', label: 'Price', sortable: true, width: 65 },
  { id: 'volume', label: '$Vol', sortable: true, width: 60 },
  // MCap column header label is overridden per-render based on the USD/Local
  // toggle; keep the underlying sort key stable at 'market_cap' so the
  // sort-by dropdown / URL state doesn't shift when the user flips modes.
  { id: 'market_cap', label: 'MCap', sortable: true, width: 75 },
  { id: 'adv_usd', label: 'ADV ($)', sortable: true, width: 70 },
  { id: 'ipo_date', label: 'IPO', sortable: true, width: 50 },
  { id: 'eps_growth_qq', label: 'EPS', sortable: true, width: 50 },
  { id: 'sales_growth_qq', label: 'Sales', sortable: true, width: 50 },
  { id: 'adr_percent', label: 'ADR', sortable: true, width: 50 },
  { id: 'ma_alignment', label: 'MA', sortable: false, width: 35 },
  { id: 'vcp_detected', label: 'VCP', sortable: false, width: 40 },
  { id: 'vcp_score', label: 'VScr', sortable: true, width: 50 },
  { id: 'vcp_pivot', label: 'Pvt', sortable: true, width: 55 },
  { id: 'vcp_ready_for_breakout', label: 'Rdy', sortable: false, width: 35 },
  { id: 'passes_template', label: 'Pass', sortable: false, width: 40 },
  { id: 'rating', label: 'Rate', sortable: false, width: 80 },
];

const getStatusChipProps = (row) => {
  const isInsufficientHistoryRow =
    row.data_status === 'insufficient_history' || row.rating === 'Insufficient Data';

  if (row.scan_mode === 'listing_only' && isInsufficientHistoryRow) {
    return {
      label: 'New IPO',
      color: 'warning',
      title: 'Visible in the scan table, but not yet scannable because price history is still limited.',
    };
  }
  if (row.scan_mode === 'ipo_weighted' && isInsufficientHistoryRow) {
    return {
      label: 'IPO Weighted',
      color: 'info',
      title: row.composite_reason === 'ipo_uplift'
        ? 'Composite uses applicable screeners plus an IPO uplift while the stock is still young.'
        : 'Composite uses only the screeners that have enough history to run.',
    };
  }
  return null;
};

// colorUtils speaks MUI palette paths; these are the same tones as tokens.
const TONE_CLASS = {
  'text.primary': 'text-foreground',
  'text.secondary': 'text-muted-foreground',
  'text.disabled': 'text-disabled-foreground',
  'primary.main': 'text-accent',
  'success.main': 'text-gain',
  'warning.main': 'text-warning',
  'error.main': 'text-loss',
};
const toneClass = (path) => TONE_CLASS[path] ?? '';
// getRatingColor and the status chip use MUI colour names.
const RATING_CLASS = { success: 'text-gain', warning: 'text-warning', default: 'text-muted-foreground' };
const PILL = 'inline-flex h-[18px] shrink-0 items-center rounded-full border px-1.5 text-[11px] leading-none whitespace-nowrap';
const STATUS_PILL = { warning: 'border-warning/60 text-warning', info: 'border-border text-muted-foreground' };

// Fixed column widths as literal classes (Tailwind only emits classes it can
// see), so each cell resolves a class instead of an inline style.
const WIDTH = {
  35: 'w-[35px] min-w-[35px]',
  40: 'w-[40px] min-w-[40px]',
  42: 'w-[42px] min-w-[42px]',
  45: 'w-[45px] min-w-[45px]',
  48: 'w-[48px] min-w-[48px]',
  50: 'w-[50px] min-w-[50px]',
  55: 'w-[55px] min-w-[55px]',
  60: 'w-[60px] min-w-[60px]',
  65: 'w-[65px] min-w-[65px]',
  70: 'w-[70px] min-w-[70px]',
  75: 'w-[75px] min-w-[75px]',
  80: 'w-[80px] min-w-[80px]',
  105: 'w-[105px] min-w-[105px]',
  110: 'w-[110px] min-w-[110px]',
  140: 'w-[140px] min-w-[140px]',
  180: 'w-[180px] min-w-[180px]',
};
const TD = 'border-b border-border px-1.5 py-1';
const NUM = 'tabular-nums';
const ELLIPSIS = 'max-w-0 truncate';

const stopPropagation = (event) => event.stopPropagation();
// Screener scores: 0 means "could not score" (insufficient data, error, no
// breakthrough; see VolumeBreakthroughScanner._insufficient_data_result), not a
// weak score, so it stays untinted.
const scoreValue = (score) => (Number(score?.toFixed(1)) === 0 ? null : score);
function ScoreTd({ score, width, strong = false }) {
  const value = scoreValue(score);
  const heat = heatStep(value);
  return (
    <td
      className={cn(TD, WIDTH[width], NUM, 'text-center', strong && 'font-semibold', heatClass(value))}
      style={heat ? { backgroundColor: heatFill(heat) } : undefined}
    >
      {score != null ? score.toFixed(1) : '-'}
    </td>
  );
}

const check = (value, falseClass = 'text-disabled-foreground') => (
  value
    ? <Check data-testid="CheckIcon" aria-label="Yes" className="mx-auto size-3.5 text-gain" />
    : <X data-testid="CloseIcon" aria-label="No" className={cn('mx-auto size-3.5', falseClass)} />
);
const BlueDot = ({ title }) => <span title={title} className="inline-block size-2.5 rounded-full bg-accent" />;
const Dash = () => <span className="text-disabled-foreground">-</span>;

/**
 * Memoized table row component to prevent unnecessary re-renders
 */
const VirtualTableRow = memo(function VirtualTableRow({
  row,
  onRowClick,
  onRowHover,
  onOpenChart,
  showActions,
  showWatchlistMenu,
  chartEnabled,
  mcapDisplay,
  showOpportunityState,
  onOpenOpportunity,
}) {
  const statusChip = getStatusChipProps(row);
  const handleRowClick = useCallback(() => {
    if (!chartEnabled) {
      return;
    }
    onRowClick?.(row.symbol);
  }, [chartEnabled, onRowClick, row.symbol]);

  const handleRowHover = useCallback(() => {
    onRowHover?.(row.symbol);
  }, [onRowHover, row.symbol]);

  const handleChartClick = useCallback((e) => {
    e.stopPropagation();
    if (!chartEnabled) {
      return;
    }
    onOpenChart?.(row.symbol);
  }, [chartEnabled, onOpenChart, row.symbol]);

  const stageTone = toneClass(getStageColor(row.stage));

  return (
    <tr
      onClick={handleRowClick}
      onMouseEnter={handleRowHover}
      className={cn('h-12 hover:bg-surface-subtle', onRowClick && chartEnabled && 'cursor-pointer')}
    >
      {showActions && (
        <td onClick={stopPropagation} className={cn(TD, WIDTH[60], 'p-0.5 text-center whitespace-nowrap')}>
          {chartEnabled ? (
            <button
              type="button"
              aria-label={`Open ${row.symbol} chart`}
              onClick={handleChartClick}
              className="inline-grid size-7 cursor-pointer place-items-center rounded-md text-accent outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChartLine data-testid="ShowChartIcon" aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
          {showWatchlistMenu ? <AddToWatchlistMenu symbols={row.symbol} size="small" /> : null}
        </td>
      )}

      <td className={cn(TD, 'w-[210px] max-w-[210px] min-w-[210px] overflow-hidden')}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
            <span className="shrink-0 text-sm leading-tight font-semibold">{row.symbol}</span>
            <MarketBadge market={row.market} exchange={row.exchange} />
            <FieldAvailabilityChip
              fieldAvailability={row.field_availability}
              growthMetricBasis={row.growth_metric_basis}
            />
          </div>
          {row.company_name || statusChip || row.matched_groups?.length ? (
            <div className="flex min-w-0 items-center gap-1">
              {row.company_name ? (
                <span title={row.company_name} className="block min-w-0 flex-1 truncate text-[11px] leading-tight text-muted-foreground">
                  {row.company_name}
                </span>
              ) : null}
              {statusChip ? (
                <span title={statusChip.title} className={cn(PILL, STATUS_PILL[statusChip.color])}>{statusChip.label}</span>
              ) : null}
              {row.matched_groups?.length ? (
                <span
                  title={`Matched setups: ${row.matched_groups.map((group) => group.name).join(', ')}`}
                  className={cn(PILL, 'block max-w-[105px] truncate border-border pt-[3px] text-foreground')}
                >
                  {row.matched_groups.length === 1
                    ? row.matched_groups[0].name
                    : `${row.matched_groups[0].name} +${row.matched_groups.length - 1}`}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </td>

      <td className={cn(TD, WIDTH[110], 'p-1 text-center')}>
        <RSSparkline data={row.rs_sparkline_data} trend={row.rs_trend} width={100} height={28} />
      </td>

      <td className={cn(TD, WIDTH[110], 'p-1 text-center')}>
        <PriceSparkline
          data={row.price_sparkline_data}
          trend={row.price_trend}
          change1d={row.price_change_1d}
          industry={row.ibd_industry_group}
          width={100}
          height={28}
        />
      </td>

      <td className={cn(TD, WIDTH[80], ELLIPSIS, 'text-center text-muted-foreground')}>{row.gics_sector || '-'}</td>
      <td className={cn(TD, WIDTH[140], ELLIPSIS, 'text-left text-muted-foreground')}>{row.ibd_industry_group || '-'}</td>
      <td className={cn(TD, WIDTH[180], 'text-left text-muted-foreground')}>
        <MarketThemesList themes={row.market_themes} variant="compact" />
      </td>

      <td
        title={getGroupRankTooltip(row)}
        className={cn(TD, WIDTH[45], NUM, 'text-center', toneClass(getGroupRankColor(row.ibd_group_rank)), row.ibd_group_rank && row.ibd_group_rank <= 20 && 'font-semibold')}
      >
        {row.ibd_group_rank ?? '-'}
      </td>

      <ScoreTd score={row.composite_score} width={50} strong />
      <ScoreTd score={row.minervini_score} width={45} />
      <ScoreTd score={row.canslim_score} width={45} />
      <ScoreTd score={row.ipo_score} width={45} />
      <ScoreTd score={row.custom_score} width={45} />
      <ScoreTd score={row.volume_breakthrough_score} width={50} />
      <ScoreTd score={row.se_setup_score} width={45} />

      <td className={cn(TD, WIDTH[55], ELLIPSIS, 'text-center text-muted-foreground')}>{row.se_pattern_primary || '-'}</td>
      <td className={cn(TD, WIDTH[50], NUM, 'text-center')}>
        {row.se_distance_to_pivot_pct != null ? `${row.se_distance_to_pivot_pct.toFixed(1)}%` : '-'}
      </td>
      <td className={cn(TD, WIDTH[45], NUM, 'text-center')}>
        {row.se_bb_width_pctile_252 != null ? row.se_bb_width_pctile_252.toFixed(0) : '-'}
      </td>
      <td className={cn(TD, WIDTH[45], NUM, 'text-center')}>
        {row.se_volume_vs_50d != null ? `${row.se_volume_vs_50d.toFixed(1)}x` : '-'}
      </td>
      <td className={cn(TD, WIDTH[35], 'text-center')}>
        {row.se_rs_line_new_high == null ? '-' : check(row.se_rs_line_new_high)}
      </td>
      <td className={cn(TD, WIDTH[42], 'text-center')}>
        {row.se_rs_line_blue_dot ? <BlueDot title="Setup Engine RS line at new high before price" /> : <Dash />}
      </td>
      <td className={cn(TD, WIDTH[42], 'text-center')}>
        {row.rs_line_blue_dot_recent ? (
          <BlueDot title={row.rs_line_new_high_date ? `RS blue dot: latest RS high ${row.rs_line_new_high_date}` : 'RS blue dot within 5 trading days'} />
        ) : <Dash />}
      </td>
      <td className={cn(TD, WIDTH[55], NUM, 'text-right')}>
        {row.se_pivot_price != null ? `$${row.se_pivot_price.toFixed(2)}` : '-'}
      </td>

      <OpportunityResultCells
        row={row}
        visible={showOpportunityState}
        onOpenEvidence={onOpenOpportunity}
      />

      <td className={cn(TD, WIDTH[40], NUM, 'text-center')}>{row.rs_rating?.toFixed(0) || '-'}</td>
      <td className={cn(TD, WIDTH[40], NUM, 'text-center')}>{row.rs_rating_1m?.toFixed(0) || '-'}</td>
      <td className={cn(TD, WIDTH[40], NUM, 'text-center')}>{row.rs_rating_3m?.toFixed(0) || '-'}</td>
      <td className={cn(TD, WIDTH[45], NUM, 'text-center')}>{row.rs_rating_12m?.toFixed(0) || '-'}</td>
      <td className={cn(TD, WIDTH[45], NUM, 'text-center')}>{row.beta != null ? row.beta.toFixed(2) : '-'}</td>
      <td className={cn(TD, WIDTH[45], NUM, 'text-center')}>{row.beta_adj_rs != null ? row.beta_adj_rs.toFixed(0) : '-'}</td>
      <td className={cn(TD, WIDTH[55], NUM, 'text-center', toneClass(getEpsRatingColor(row.eps_rating)))}>
        {row.eps_rating != null ? row.eps_rating : '-'}
      </td>
      <td className={cn(TD, WIDTH[40], 'text-center')}>
        {row.stage != null ? (
          // Stage reads by its tone in text, not a filled traffic-light box.
          <span data-stage={row.stage} className={cn('text-[11px] font-semibold', stageTone || 'text-muted-foreground')}>
            S{row.stage}
          </span>
        ) : (
          '-'
        )}
      </td>
      <td className={cn(TD, WIDTH[65], NUM, 'text-right')}>{formatLocalCurrency(row.current_price, row.currency)}</td>
      <td className={cn(TD, WIDTH[60], NUM, 'text-right')}>{formatLargeNumber(row.volume, getCurrencyPrefix(row.currency))}</td>
      <td className={cn(TD, WIDTH[75], NUM, 'text-right')}>
        {mcapDisplay === MCAP_DISPLAY.USD
          ? formatLargeNumber(row.market_cap_usd, '$')
          : formatLargeNumber(row.market_cap, getCurrencyPrefix(row.currency))}
      </td>
      <td className={cn(TD, WIDTH[70], NUM, 'text-right')}>{formatLargeNumber(row.adv_usd, '$')}</td>
      <td className={cn(TD, WIDTH[50], NUM, 'text-center', toneClass(getIpoAgeColor(row.ipo_date)))}>{formatIpoAge(row.ipo_date)}</td>
      <td className={cn(TD, WIDTH[50], NUM, 'text-center', toneClass(getGrowthColor(row.eps_growth_qq)))}>
        {row.eps_growth_qq != null ? `${row.eps_growth_qq.toFixed(0)}%` : '-'}
      </td>
      <td className={cn(TD, WIDTH[50], NUM, 'text-center', toneClass(getGrowthColor(row.sales_growth_qq)))}>
        {row.sales_growth_qq != null ? `${row.sales_growth_qq.toFixed(0)}%` : '-'}
      </td>
      <td className={cn(TD, WIDTH[50], NUM, 'text-center')}>{row.adr_percent != null ? `${row.adr_percent.toFixed(1)}%` : '-'}</td>
      <td className={cn(TD, WIDTH[35], 'text-center')}>{check(row.ma_alignment, 'text-loss')}</td>
      <td className={cn(TD, WIDTH[40], 'text-center')}>{check(row.vcp_detected)}</td>
      <td className={cn(TD, WIDTH[50], NUM, 'text-center')}>{row.vcp_score != null ? row.vcp_score.toFixed(1) : '-'}</td>
      <td className={cn(TD, WIDTH[55], NUM, 'text-right')}>{row.vcp_pivot != null ? row.vcp_pivot.toFixed(2) : '-'}</td>
      <td className={cn(TD, WIDTH[35], 'text-center')}>{check(row.vcp_ready_for_breakout)}</td>
      <td className={cn(TD, WIDTH[40], 'text-center')}>{check(row.passes_template)}</td>
      <td className={cn(TD, WIDTH[80], 'text-center text-xs font-semibold whitespace-nowrap', RATING_CLASS[getRatingColor(row.rating)])}>
        {row.rating}
      </td>
    </tr>
  );
});

/** Rows-per-page picker, range and previous/next buttons (1-based pages). */
function Pagination({ total, page, perPage, onPageChange, onPerPageChange }) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const last = Math.max(1, Math.ceil(total / perPage));
  const nav = 'grid size-11 cursor-pointer place-items-center rounded-md text-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 md:size-8';
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-3 py-1.5 text-xs text-muted-foreground">
      <label className="flex items-center gap-2">
        Rows per page:
        <select
          value={perPage}
          onChange={(e) => {
            onPerPageChange?.(Number(e.target.value));
            onPageChange(1); // Reset to first page when changing per-page
          }}
          className="h-8 cursor-pointer rounded-md border border-border bg-surface px-1.5 font-[inherit] text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <span className="tabular-nums">{`${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}</span>
      <span className="flex gap-1">
        <button type="button" aria-label="Go to previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={nav}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <button type="button" aria-label="Go to next page" disabled={page >= last} onClick={() => onPageChange(page + 1)} className={nav}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </span>
    </div>
  );
}

const FRAME = 'tw rounded-lg border border-border bg-surface text-foreground';

/**
 * Display scan results in a sortable, paginated table with row virtualization
 * @param {Function} onRowHover - Optional callback when hovering over a row (for prefetching)
 */
function ResultsTable({
  results,
  total,
  page,
  perPage,
  sortBy,
  sortOrder,
  onPageChange,
  onPerPageChange,
  onSortChange,
  onOpenChart,
  loading,
  onRowHover,
  showActions = true,
  showWatchlistMenu = true,
  sortingEnabled = true,
  isChartEnabled,
  showOpportunityState = false,
  opportunityTelemetrySurface,
}) {
  const parentRef = useRef(null);
  // MCap column display mode — kept as local state; scan-level persistence
  // can lift this up later if users want it to survive navigation.
  const [mcapDisplay, setMcapDisplay] = useState(MCAP_DISPLAY.USD);
  const isMobile = useIsMobileShell();
  const {
    selectedRow: opportunityRow,
    openEvidence: handleOpenOpportunity,
    closeEvidence: handleCloseOpportunity,
  } = useOpportunityEvidenceSelection({
    rows: results,
    enabled: showOpportunityState,
  });
  const visibleColumns = useMemo(() => {
    const base = columns.filter((column) => (
      (showActions || column.id !== 'chart') &&
      (showOpportunityState || !['resilience_score', 'action_state'].includes(column.id))
    ));
    return base.map((column) =>
      column.id === 'market_cap'
        ? { ...column, label: mcapDisplay === MCAP_DISPLAY.USD ? 'MCap ($)' : 'MCap (local)' }
        : column,
    );
  }, [showActions, showOpportunityState, mcapDisplay]);

  const toggleMcapDisplay = useCallback(() => {
    setMcapDisplay((mode) =>
      mode === MCAP_DISPLAY.USD ? MCAP_DISPLAY.LOCAL : MCAP_DISPLAY.USD,
    );
  }, []);

  const handleRequestSort = useCallback((property) => {
    const isAsc = sortBy === property && sortOrder === 'asc';
    onSortChange(property, isAsc ? 'desc' : 'asc');
  }, [sortBy, sortOrder, onSortChange]);

  const handleRowClick = useCallback((symbol) => {
    onOpenChart?.(symbol);
  }, [onOpenChart]);

  // Virtualize rows - only render visible rows plus overscan
  const rowVirtualizer = useVirtualizer({
    count: results?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isMobile ? MOBILE_CARD_HEIGHT : ROW_HEIGHT),
    overscan: 10, // Render 10 extra rows above/below viewport
  });
  // Row height changes with the layout (e.g. rotating a tablet); drop cached
  // sizes before paint so cards never draw at the table's row spacing.
  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [isMobile, rowVirtualizer]);

  // Memoize virtual items to prevent recalculation
  const virtualRows = rowVirtualizer.getVirtualItems();

  if (loading) {
    return (
      <TableSkeleton label="Loading scan results" rows={10} columns={8} title={false} />
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className={cn(FRAME, 'p-6 text-center text-muted-foreground')}>
        No results found
      </div>
    );
  }

  const pagination = (
    <Pagination
      total={total}
      page={page}
      perPage={perPage}
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
    />
  );
  const opportunityDrawer = (
    <OpportunityEvidenceDrawer
      open={showOpportunityState && Boolean(opportunityRow)}
      row={opportunityRow}
      onClose={handleCloseOpportunity}
      opportunityTelemetrySurface={opportunityTelemetrySurface}
    />
  );

  // One badge per card, most explanatory first: the scan status says why a
  // card can't open (e.g. "New IPO"), then the action state, then the rating
  // the desktop table shows in its last column.
  const mobileBadge = (row) => {
    const status = getStatusChipProps(row);
    if (status) {
      return <span title={status.title} className={cn(PILL, STATUS_PILL[status.color])}>{status.label}</span>;
    }
    if (showOpportunityState) {
      return (
        <ActionStateBadge
          state={row.action_state}
          onClick={row.opportunity_state
            ? (event) => {
              event.stopPropagation();
              handleOpenOpportunity(row);
            }
            : undefined}
        />
      );
    }
    return row.rating
      ? <span className={cn(PILL, 'border-border', RATING_CLASS[getRatingColor(row.rating)])}>{row.rating}</span>
      : null;
  };

  if (isMobile) {
    // Same sortable columns as the desktop headers (visibleColumns already
    // drops opportunity columns when that capability is off), common ones
    // first; a preset-only active sort is appended so the picker can show it.
    const commonIds = new Set(MOBILE_SORT_FIELDS.map(([id]) => id));
    const moreSorts = visibleColumns
      .filter((column) => column.sortable && !commonIds.has(column.id))
      // An active alias takes over its column's option, so the picker lists it
      // once and keeps the preset's own sort key.
      .map((column) => [SORT_ALIASES[sortBy] === column.id ? sortBy : column.id, sortName(column.id)]);
    const listedIds = new Set([...commonIds, ...moreSorts.map(([id]) => id)]);
    if (sortBy && !listedIds.has(sortBy)) moreSorts.push([sortBy, sortName(sortBy)]);
    return (
      <div className={FRAME}>
        {sortingEnabled ? (
          <div className="flex items-end gap-2 border-b border-border px-3 py-2">
            <NativeSelect
              label="Sort by"
              value={sortBy ?? ''}
              onChange={(value) => onSortChange(value, sortOrder)}
              className="w-44"
            >
              {MOBILE_SORT_FIELDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              {moreSorts.length ? (
                <optgroup label="More sorts">
                  {moreSorts.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </optgroup>
              ) : null}
            </NativeSelect>
            <button
              type="button"
              aria-label={sortOrder === 'asc' ? 'Sorted ascending; switch to descending' : 'Sorted descending; switch to ascending'}
              onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
              className="grid size-11 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {sortOrder === 'asc' ? <ArrowUp aria-hidden="true" className="size-4" /> : <ArrowDown aria-hidden="true" className="size-4" />}
            </button>
          </div>
        ) : null}
        <div ref={parentRef} role="list" aria-label="Scan results" className="max-h-[calc(100dvh-300px)] min-h-60 overflow-auto">
          <div className="relative" style={{ height: rowVirtualizer.getTotalSize() }}>
            {virtualRows.map((virtualRow) => {
              const row = results[virtualRow.index];
              const chartEnabled = row.is_scannable !== false &&
                (isChartEnabled ? isChartEnabled(row.symbol) : Boolean(onOpenChart));
              return (
                <div
                  key={row.symbol}
                  role="listitem"
                  aria-setsize={results.length}
                  aria-posinset={virtualRow.index + 1}
                  className="absolute inset-x-0 top-0 overflow-hidden border-b border-border"
                  style={{ height: MOBILE_CARD_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}
                >
                  <StockRowCard
                    row={row}
                    metric={cardMetricFor(row, sortBy)}
                    sortNote={[CARD_SORT_NOTES[sortBy]?.(row), matchedGroupsLabel(row)].filter(Boolean).join(' · ') || null}
                    badge={(
                      <>
                        <MarketBadge market={row.market} exchange={row.exchange} />
                        {mobileBadge(row)}
                      </>
                    )}
                    actions={(
                      <>
                        <FieldAvailabilityChip
                          fieldAvailability={row.field_availability}
                          growthMetricBasis={row.growth_metric_basis}
                        />
                        {showActions && showWatchlistMenu ? <AddToWatchlistMenu symbols={row.symbol} size="small" /> : null}
                      </>
                    )}
                    onOpen={chartEnabled ? () => handleRowClick(row.symbol) : null}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t border-border">{pagination}</div>
        {opportunityDrawer}
      </div>
    );
  }

  return (
    <div className={FRAME}>
      <div className="flex items-center justify-end gap-2 border-b border-border px-4 py-1 text-[11px] text-muted-foreground">
        Market Cap display:
        <button
          type="button"
          onClick={toggleMcapDisplay}
          data-testid="mcap-display-toggle"
          aria-label={`Market cap in ${mcapDisplay === MCAP_DISPLAY.USD ? 'USD' : 'local currency'}; switch`}
          className="h-6 cursor-pointer rounded-full border border-border px-2 text-[11px] text-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mcapDisplay === MCAP_DISPLAY.USD ? 'USD' : 'Local'}
        </button>
      </div>
      <div ref={parentRef} className="max-h-[calc(100vh-280px)] overflow-auto">
        <table
          className="border-separate border-spacing-0 text-[13px]"
          style={{
            minWidth: (showActions
              ? TABLE_MIN_WIDTH.WITH_ACTIONS
              : TABLE_MIN_WIDTH.WITHOUT_ACTIONS) +
              (showOpportunityState ? OPPORTUNITY_COLUMNS_WIDTH : 0),
          }}
        >
          <thead>
            <tr>
              {visibleColumns.map((column) => {
                const active = sortBy === column.id;
                const sortable = column.sortable && sortingEnabled;
                const Arrow = active && sortOrder === 'desc' ? ArrowDown : ArrowUp;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={sortable && active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'sticky top-0 z-[1] border-b border-border bg-surface px-1.5 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground',
                      column.id === 'symbol' ? 'text-left' : 'text-center',
                    )}
                    style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleRequestSort(column.id)}
                        className={cn(
                          'group inline-flex cursor-pointer items-center gap-0.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                          active && 'text-foreground',
                        )}
                      >
                        {column.label}
                        <Arrow aria-hidden="true" className={cn('size-3 shrink-0', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')} />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Spacer for virtualization - pushes content down to correct position */}
            {virtualRows.length > 0 && virtualRows[0].start > 0 && (
              <tr style={{ height: virtualRows[0].start }} />
            )}
            {virtualRows.map((virtualRow) => {
              const row = results[virtualRow.index];
              return (
                <VirtualTableRow
                  key={row.symbol}
                  row={row}
                  onRowClick={onOpenChart ? handleRowClick : null}
                  onRowHover={onRowHover}
                  onOpenChart={onOpenChart}
                  showActions={showActions}
                  showWatchlistMenu={showWatchlistMenu}
                  chartEnabled={
                    row.is_scannable !== false &&
                    (isChartEnabled ? isChartEnabled(row.symbol) : Boolean(onOpenChart))
                  }
                  mcapDisplay={mcapDisplay}
                  showOpportunityState={showOpportunityState}
                  onOpenOpportunity={handleOpenOpportunity}
                />
              );
            })}
            {/* Bottom spacer for virtualization */}
            {virtualRows.length > 0 && (
              <tr style={{ height: rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end || 0) }} />
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border">{pagination}</div>

      {opportunityDrawer}
    </div>
  );
}

// Wrap with React.memo for component-level memoization
export default memo(ResultsTable, (prevProps, nextProps) => {
  // Only re-render if these key props change
  return (
    prevProps.results === nextProps.results &&
    prevProps.total === nextProps.total &&
    prevProps.page === nextProps.page &&
    prevProps.perPage === nextProps.perPage &&
    prevProps.sortBy === nextProps.sortBy &&
    prevProps.sortOrder === nextProps.sortOrder &&
    prevProps.loading === nextProps.loading &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.showWatchlistMenu === nextProps.showWatchlistMenu &&
    prevProps.isChartEnabled === nextProps.isChartEnabled &&
    prevProps.sortingEnabled === nextProps.sortingEnabled &&
    prevProps.showOpportunityState === nextProps.showOpportunityState &&
    prevProps.opportunityTelemetrySurface === nextProps.opportunityTelemetrySurface
  );
});
