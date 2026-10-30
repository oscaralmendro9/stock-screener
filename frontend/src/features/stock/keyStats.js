/** Cells of the stock page's key-statistics grid (six label/value columns). */
import { formatLargeNumber } from '../../utils/formatUtils';
import {
  atr,
  averageVolume,
  dayChange,
  distancePct,
  performance,
  rangeVolatility,
  relativeVolume,
  rsi,
  sma,
} from './stockStats';

const isNumber = (value) => value != null && value !== '' && Number.isFinite(Number(value));
const fixed = (value, digits = 2) => (isNumber(value) ? Number(value).toFixed(digits) : null);
const money = (value, digits = 2) => (isNumber(value) ? `$${Number(value).toFixed(digits)}` : null);
const large = (value, prefix = '') => (isNumber(value) ? formatLargeNumber(Number(value), prefix) : null);
const percent = (value, digits = 2) => (isNumber(value) ? `${Number(value).toFixed(digits)}%` : null);
const yesNo = (value) => (value == null ? null : value ? 'Yes' : 'No');
// Signed, colored values: performance and distances (direction carries a sign).
const signed = (value, digits = 2) => (isNumber(value) ? { signed: Number(value), text: `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(digits)}%` } : null);

/** Cells for the six columns, from the stock dashboard payload. Pure, for tests. */
export function buildKeyStats(data) {
  const info = data.info || {};
  const fundamentals = data.fundamentals || {};
  const technicals = data.technicals || {};
  const chart = data.chart?.chart_data || {};
  const history = data.chart?.price_history || [];
  const price = info.current_price ?? technicals.current_price ?? chart.current_price ?? history.at(-1)?.close;
  const high = technicals.high_52w;
  const low = technicals.low_52w;
  const volW = rangeVolatility(history, 5);
  const volM = rangeVolatility(history, 21);
  const marginPct = isNumber(fundamentals.profit_margin) ? Number(fundamentals.profit_margin) * 100 : null;

  return [
    [
      ['Market cap', large(fundamentals.market_cap_usd ?? fundamentals.market_cap ?? info.market_cap, '$')],
      ['P/E', fixed(fundamentals.pe_ratio)],
      ['PEG', fixed(fundamentals.peg_ratio)],
      ['EPS (ttm)', money(fundamentals.eps_current)],
      ['Revenue', large(fundamentals.revenue_current, '$')],
      ['Profit margin', percent(marginPct, 1)],
      ['Inst own', percent(fundamentals.institutional_ownership, 1)],
      ['Avg $ volume', large(fundamentals.adv_usd, '$')],
    ],
    [
      ['Change', signed(dayChange(history))],
      ['Perf week', signed(performance(history, 5))],
      ['Perf month', signed(performance(history, 21))],
      ['Perf quarter', signed(performance(history, 63))],
      ['Perf half Y', signed(performance(history, 124))],
      ['52W high', isNumber(high) ? { ...signed(distancePct(price, high)), prefix: money(high) } : null],
      ['52W low', isNumber(low) ? { ...signed(distancePct(price, low)), prefix: money(low) } : null],
      ['52W range', isNumber(high) && isNumber(low) ? `${money(low)} – ${money(high)}` : null],
    ],
    [
      ['SMA20', signed(distancePct(price, sma(history, 20)))],
      ['SMA50', signed(distancePct(price, technicals.ma_50 ?? sma(history, 50)))],
      ['SMA150', signed(distancePct(price, technicals.ma_150))],
      ['SMA200', signed(distancePct(price, technicals.ma_200))],
      ['RSI (14)', fixed(rsi(history, 14))],
      ['ATR (14)', fixed(atr(history, 14))],
      ['Stage', isNumber(chart.stage) ? `Stage ${chart.stage}` : null],
      ['MA aligned', yesNo(chart.ma_alignment)],
    ],
    [
      ['Price', money(price)],
      ['Volume', large(history.at(-1)?.volume)],
      ['Avg volume', large(averageVolume(history, 50))],
      ['Rel volume', fixed(relativeVolume(history, 50))],
      ['Volatility', volW != null && volM != null ? `${volW.toFixed(2)}% ${volM.toFixed(2)}%` : null],
      ['ADR', percent(chart.adr_percent)],
      ['Beta', fixed(chart.beta)],
      ['β-adj RS', fixed(chart.beta_adj_rs, 0)],
    ],
    [
      ['RS rating', fixed(chart.rs_rating, 0)],
      ['RS 1M', fixed(chart.rs_rating_1m, 0)],
      ['RS 3M', fixed(chart.rs_rating_3m, 0)],
      ['RS 12M', fixed(chart.rs_rating_12m, 0)],
      ['RS trend', chart.rs_trend == null ? null : chart.rs_trend > 0 ? '▲ Rising' : chart.rs_trend < 0 ? '▼ Falling' : '– Flat'],
      ['EPS rating', fixed(chart.eps_rating, 0)],
      ['Group rank', fixed(chart.ibd_group_rank, 0)],
      ['IBD group', chart.ibd_industry_group || null],
    ],
    [
      ['Composite', fixed(chart.composite_score, 1)],
      ['Rating', chart.rating || null],
      ['Minervini', fixed(chart.minervini_score, 1)],
      ['CANSLIM', fixed(chart.canslim_score, 1)],
      ['IPO score', fixed(chart.ipo_score, 1)],
      ['Custom', fixed(chart.custom_score, 1)],
      ['VCP score', fixed(chart.vcp_score, 1)],
      ['Template', chart.passes_template == null ? null : chart.passes_template ? 'Pass' : 'Fail'],
    ],
  ];
}
