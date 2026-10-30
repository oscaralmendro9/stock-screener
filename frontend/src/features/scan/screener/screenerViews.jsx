/**
 * Column sets for the screener's view tabs (Finviz's Overview / Valuation /
 * Performance idea): each view shows ~10 columns of the same result rows.
 * "All" keeps the full ResultsTable, so no column is lost.
 */
/* eslint-disable react-refresh/only-export-components -- column config whose
   cells render JSX; it declares no component, so fast refresh does not apply. */
import { Badge } from '@/ui/badge';
import scanFilterContract from '../scanFilterFields.json';
import { formatLargeNumber, formatLocalCurrency, formatPatternName } from '../../../utils/formatUtils';
import { resolveMarketCapDisplay } from '../../../utils/marketCapUtils';
import ScoreCell from './ScoreCell';

// Sortable means the scan API accepts it as sort_by (scanFilterFields.json).
// Read the raw contract: sort-only fields (current_price) have no filter kind,
// so FILTER_FIELD_CATALOG leaves them out.
const SORTABLE = new Set(scanFilterContract.fields.filter((field) => field.sortable).map((field) => field.field));

const DASH = <span className="text-muted-foreground">-</span>;
const isNumber = (value) => value != null && value !== '' && Number.isFinite(Number(value));
const fixed = (value, digits = 1) => (isNumber(value) ? Number(value).toFixed(digits) : DASH);
const toneOf = (value) => (value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-muted-foreground');
const signedPercent = (value, digits = 2) => {
  if (!isNumber(value)) return DASH;
  const number = Number(value);
  return <span className={toneOf(number)}>{`${number > 0 ? '+' : ''}${number.toFixed(digits)}%`}</span>;
};
const yesNo = (value) => (value == null ? DASH : value ? <Badge tone="gain">Yes</Badge> : <span className="text-muted-foreground">No</span>);

const col = (id, label, render, options = {}) => ({
  id,
  label,
  render,
  align: options.align ?? 'right',
  sortable: options.sortable ?? SORTABLE.has(id),
  className: options.className,
  title: options.title,
});

const TICKER = col('symbol', 'Ticker', (row) => (
  <span title={row.company_name || undefined} className="font-semibold text-accent">{row.symbol}</span>
), { align: 'left' });
const COMPANY = col('company_name', 'Company', (row) => (
  <span title={row.company_name || undefined} className="block max-w-64 truncate">{row.company_name || '-'}</span>
), { align: 'left', sortable: false });
const PRICE = col('current_price', 'Price', (row) => formatLocalCurrency(row.current_price, row.currency));
const CHANGE = col('price_change_1d', 'Change', (row) => signedPercent(row.price_change_1d));
const DOLLAR_VOLUME = col('volume', '$ Volume', (row) => (isNumber(row.volume) ? formatLargeNumber(row.volume, '$') : DASH), { title: 'Dollar volume' });
const MARKET_CAP = col('market_cap_usd', 'Market cap', (row) => resolveMarketCapDisplay(row, null, { preferUsd: true }).formattedValue);
const score = (id, label, options) => col(id, label, (row) => <ScoreCell value={row[id]} strong={options?.strong} />, options);
const rating = (id, label) => col(id, label, (row) => fixed(row[id], 0));

export const SCREENER_VIEWS = [
  {
    id: 'overview',
    label: 'Overview',
    columns: [
      TICKER,
      COMPANY,
      col('gics_sector', 'Sector', (row) => row.gics_sector || '-', { align: 'left', className: 'max-w-40 truncate' }),
      col('ibd_industry_group', 'Industry', (row) => row.ibd_industry_group || row.gics_industry || '-', { align: 'left', className: 'max-w-48 truncate' }),
      col('market', 'Market', (row) => row.market || '-', { align: 'left', sortable: false }),
      MARKET_CAP,
      PRICE,
      CHANGE,
      DOLLAR_VOLUME,
      score('composite_score', 'Score', { strong: true }),
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    columns: [
      TICKER,
      COMPANY,
      col('eps_growth_qq', 'EPS Q/Q', (row) => signedPercent(row.eps_growth_qq, 1)),
      col('eps_growth_yy', 'EPS Y/Y', (row) => signedPercent(row.eps_growth_yy, 1)),
      col('sales_growth_qq', 'Sales Q/Q', (row) => signedPercent(row.sales_growth_qq, 1)),
      col('sales_growth_yy', 'Sales Y/Y', (row) => signedPercent(row.sales_growth_yy, 1)),
      rating('eps_rating', 'EPS rating'),
      col('peg_ratio', 'PEG', (row) => fixed(row.peg_ratio, 2)),
      PRICE,
      CHANGE,
    ],
  },
  {
    id: 'technical',
    label: 'Technical',
    columns: [
      TICKER,
      col('stage', 'Stage', (row) => (row.stage_name || (isNumber(row.stage) ? `Stage ${row.stage}` : '-')), { align: 'left' }),
      rating('rs_rating', 'RS'),
      rating('rs_rating_1m', 'RS 1M'),
      rating('rs_rating_3m', 'RS 3M'),
      rating('rs_rating_12m', 'RS 12M'),
      col('beta', 'Beta', (row) => fixed(row.beta, 2)),
      rating('beta_adj_rs', 'β-adj RS'),
      col('adr_percent', 'ADR', (row) => (isNumber(row.adr_percent) ? `${Number(row.adr_percent).toFixed(1)}%` : DASH)),
      col('ma_alignment', 'MA aligned', (row) => yesNo(row.ma_alignment), { align: 'left' }),
      PRICE,
      CHANGE,
      DOLLAR_VOLUME,
    ],
  },
  {
    id: 'setups',
    label: 'Setups',
    columns: [
      TICKER,
      col('se_pattern_primary', 'Pattern', (row) => (row.se_pattern_primary ? formatPatternName(row.se_pattern_primary) : '-'), { align: 'left' }),
      score('se_setup_score', 'Setup'),
      col('se_pivot_price', 'Pivot', (row) => (isNumber(row.se_pivot_price) ? formatLocalCurrency(row.se_pivot_price, row.currency) : DASH)),
      col('se_distance_to_pivot_pct', 'To pivot', (row) => (isNumber(row.se_distance_to_pivot_pct) ? `${Number(row.se_distance_to_pivot_pct).toFixed(1)}%` : DASH)),
      col('se_bb_width_pctile_252', 'Squeeze', (row) => fixed(row.se_bb_width_pctile_252, 0), { title: 'Bollinger width percentile over a year (low = tight)' }),
      col('se_volume_vs_50d', 'Vol/50d', (row) => (isNumber(row.se_volume_vs_50d) ? `${Number(row.se_volume_vs_50d).toFixed(1)}x` : DASH)),
      score('vcp_score', 'VCP'),
      col('vcp_ready_for_breakout', 'VCP ready', (row) => yesNo(row.vcp_ready_for_breakout), { align: 'left' }),
      col('se_setup_ready', 'Ready', (row) => yesNo(row.se_setup_ready), { align: 'left' }),
      PRICE,
      CHANGE,
    ],
  },
  {
    id: 'scores',
    label: 'Scores',
    columns: [
      TICKER,
      COMPANY,
      score('composite_score', 'Composite', { strong: true }),
      score('minervini_score', 'Minervini'),
      score('canslim_score', 'CANSLIM'),
      score('ipo_score', 'IPO'),
      score('custom_score', 'Custom'),
      score('volume_breakthrough_score', 'Vol BT'),
      score('se_setup_score', 'Setup'),
      col('rating', 'Rating', (row) => (row.rating ? <Badge>{row.rating}</Badge> : DASH), { align: 'left' }),
      col('passes_template', 'Template', (row) => yesNo(row.passes_template), { align: 'left' }),
      col('ibd_group_rank', 'Grp rank', (row) => (row.ibd_group_rank ?? DASH)),
    ],
  },
  { id: 'all', label: 'All columns', columns: null },
];

export const DEFAULT_VIEW = 'overview';

// Appended to Overview when the scan reports opportunity state (correction
// survivors sort by it); the action workflow itself lives in "All columns".
export const RESILIENCE_COLUMN = score('resilience_score', 'Resilience');
