import { Check, Info, Minus, TrendingDown, TrendingUp, Users, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';

import {
  getRatingColor,
  getGrowthColor,
  getEpsRatingColor,
} from '../../utils/colorUtils';
import { formatPercent, formatRatio, formatPatternName, getScoreColor } from '../../utils/formatUtils';
import { resolveMarketCapDisplay } from '../../utils/marketCapUtils';

// The shared colour helpers return MUI palette keys; map them to theme tokens.
const TONE_CLASS = {
  'success.main': 'text-gain',
  'error.main': 'text-loss',
  'warning.main': 'text-warning',
  'primary.main': 'text-accent',
  'text.secondary': 'text-muted-foreground',
  'text.primary': '',
};
const RATING_TONE = { success: 'gain', warning: 'warning', default: 'neutral' };

/**
 * RS Trend icon component
 */
const RSTrendIcon = ({ trend }) => {
  if (trend === 1) return <TrendingUp role="img" aria-label="RS rising" className="size-4 text-gain" />;
  if (trend === -1) return <TrendingDown role="img" aria-label="RS falling" className="size-4 text-loss" />;
  return <Minus role="img" aria-label="RS flat" className="size-4 text-muted-foreground" />;
};

/**
 * Boolean indicator (check or cross)
 */
const BoolIndicator = ({ value }) => (
  value
    ? <Check role="img" aria-label="Yes" className="size-4 text-gain" />
    : <X role="img" aria-label="No" className="size-4 text-muted-foreground" />
);

/**
 * Metric row component for 2-column grid
 */
const MetricRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={cn('text-[13px] font-medium tabular-nums', TONE_CLASS[color] ?? '')}>{value}</span>
  </div>
);

const IconRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    {children}
  </div>
);

/**
 * Section with a small uppercase header and a 2-column metric grid
 */
const Section = ({ title, children, footer }) => (
  <section className="border-t border-border pt-3">
    <h3 className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">{children}</div>
    {footer}
  </section>
);

const About = ({ description }) => (
  <section>
    <h3 className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">About</h3>
    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
  </section>
);

const pct = (value) => (value != null ? `${value.toFixed(1)}%` : '-');

const ValuationRows = ({ marketCapMetric, fundamentals }) => (
  <>
    <MetricRow label={marketCapMetric.label} value={marketCapMetric.formattedValue} />
    <MetricRow label="P/E" value={formatRatio(fundamentals?.pe_ratio)} />
    <MetricRow label="Fwd P/E" value={formatRatio(fundamentals?.forward_pe)} />
    <MetricRow label="PEG" value={formatRatio(fundamentals?.peg_ratio)} />
    <MetricRow label="ROE" value={pct(fundamentals?.roe)} />
    <MetricRow label="Profit" value={pct(fundamentals?.profit_margin)} />
    <MetricRow label="Inst Own" value={pct(fundamentals?.institutional_ownership)} />
  </>
);

const growthRow = (label, value) => (
  <MetricRow label={label} value={formatPercent(value)} color={getGrowthColor(value)} />
);

/**
 * Stock metrics sidebar for chart viewer modal
 * Displays all screener scores, key metrics, and fundamentals in a compact 2-column layout
 *
 * @param {Object} props
 * @param {Object} props.stockData - Stock result data from scan (optional for watchlists)
 * @param {Object} props.fundamentals - Fundamentals data from cache
 */
function StockMetricsSidebar({
  stockData,
  fundamentals,
  width = 450,
  height = '100%',
  onViewPeers,
  onViewSetupDetails,
}) {
  // A responsive width ({ xs, md } as the static viewer passes) means: full
  // width stacked under the chart on phones, a 450px column from md up.
  const responsive = typeof width === 'object';
  const frame = cn(
    'tw flex shrink-0 flex-col gap-3 overflow-auto border-border bg-surface p-4 text-foreground',
    responsive ? 'w-full border-t md:h-full md:w-[450px] md:border-t-0 md:border-r' : 'border-r',
  );
  const frameStyle = responsive ? undefined : { width, height };

  // Show loading only if neither stockData nor fundamentals are available
  if (!stockData && !fundamentals) {
    return (
      <div className="tw p-4 text-sm text-muted-foreground" style={typeof width === 'object' ? undefined : { width }}>
        Loading stock data...
      </div>
    );
  }

  const marketCapMetric = resolveMarketCapDisplay(stockData, fundamentals, { preferUsd: true });

  // Minimal view when only fundamentals are available (e.g., watchlists)
  if (!stockData && fundamentals) {
    return (
      <aside className={frame} style={frameStyle}>
        <p className="text-sm font-medium">{fundamentals.symbol}</p>
        {fundamentals?.description && <About description={fundamentals.description} />}
        <Section title="Growth">
          {growthRow('EPS Q/Q', fundamentals.eps_growth_qq)}
          {growthRow('Sales Q/Q', fundamentals.sales_growth_qq)}
          {growthRow('EPS TTM', fundamentals.eps_growth_annual)}
          {growthRow('Rev Growth', fundamentals.revenue_growth)}
        </Section>
        <Section title="Valuation">
          <ValuationRows marketCapMetric={marketCapMetric} fundamentals={fundamentals} />
        </Section>
      </aside>
    );
  }

  const showSetupSection =
    stockData?.se_setup_score != null ||
    stockData?.se_quality_score != null ||
    stockData?.se_readiness_score != null ||
    stockData?.se_pattern_primary != null ||
    stockData?.se_setup_ready != null ||
    stockData?.se_explain != null ||
    (Array.isArray(stockData?.se_candidates) && stockData.se_candidates.length > 0) ||
    stockData?.screeners_run?.includes('setup_engine');

  return (
    <aside className={frame} style={frameStyle}>
      {/* Header: Company Name + Rating */}
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm leading-snug font-medium">{stockData.company_name || stockData.symbol}</p>
        {stockData.rating && (
          <Badge tone={RATING_TONE[getRatingColor(stockData.rating)] || 'neutral'}>{stockData.rating}</Badge>
        )}
      </div>

      {fundamentals?.description && <About description={fundamentals.description} />}

      <Section title="Scores">
        <MetricRow label="Composite" value={stockData.composite_score?.toFixed(1) || '-'} color="primary.main" />
        <MetricRow
          label="EPS Rating"
          value={stockData.eps_rating != null ? stockData.eps_rating : '-'}
          color={getEpsRatingColor(stockData.eps_rating)}
        />
        <MetricRow label="Minervini" value={stockData.minervini_score?.toFixed(1) || '-'} />
        <MetricRow label="CANSLIM" value={stockData.canslim_score?.toFixed(1) || '-'} />
        <MetricRow label="IPO" value={stockData.ipo_score?.toFixed(1) || '-'} />
        <MetricRow label="Custom" value={stockData.custom_score?.toFixed(1) || '-'} />
        <MetricRow label="Vol Break" value={stockData.volume_breakthrough_score?.toFixed(1) || '-'} />
      </Section>

      <Section title="Relative Strength">
        <IconRow label="RS Rating">
          <span className="inline-flex items-center gap-1 text-[13px] font-medium tabular-nums">
            {stockData.rs_rating?.toFixed(1) || '-'}
            <RSTrendIcon trend={stockData.rs_trend} />
          </span>
        </IconRow>
        <MetricRow label="RS 1M" value={stockData.rs_rating_1m?.toFixed(1) || '-'} />
        <MetricRow label="RS 3M" value={stockData.rs_rating_3m?.toFixed(1) || '-'} />
        <MetricRow label="RS 12M" value={stockData.rs_rating_12m?.toFixed(1) || '-'} />
        <MetricRow label="Beta" value={stockData.beta?.toFixed(2) || '-'} />
        <MetricRow label="β-adj RS" value={stockData.beta_adj_rs?.toFixed(0) || '-'} />
      </Section>

      <Section title="Growth">
        {growthRow('EPS Q/Q', stockData.eps_growth_qq ?? fundamentals?.eps_growth_qq)}
        {growthRow('Sales Q/Q', stockData.sales_growth_qq ?? fundamentals?.sales_growth_qq)}
        {growthRow('EPS Y/Y', stockData.eps_growth_yy ?? fundamentals?.eps_growth_yy)}
        {growthRow('Sales Y/Y', stockData.sales_growth_yy ?? fundamentals?.sales_growth_yy)}
        {growthRow('EPS TTM', fundamentals?.eps_growth_annual)}
        {growthRow('Rev Growth', fundamentals?.revenue_growth)}
      </Section>

      <Section title="Valuation">
        <ValuationRows marketCapMetric={marketCapMetric} fundamentals={fundamentals} />
      </Section>

      {stockData.vcp_detected && (
        <Section title="VCP Pattern">
          <IconRow label="Detected"><BoolIndicator value={stockData.vcp_detected} /></IconRow>
          <MetricRow label="Score" value={stockData.vcp_score?.toFixed(1) || '-'} />
          <MetricRow label="Pivot" value={stockData.vcp_pivot ? `$${stockData.vcp_pivot.toFixed(2)}` : '-'} />
          <IconRow label="Ready"><BoolIndicator value={stockData.vcp_ready_for_breakout} /></IconRow>
        </Section>
      )}

      {showSetupSection && (
        <Section
          title="Setup Engine"
          footer={onViewSetupDetails && (
            <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={onViewSetupDetails}>
              <Info aria-hidden="true" />
              View Setup Details
            </Button>
          )}
        >
          <MetricRow label="Pattern" value={formatPatternName(stockData.se_pattern_primary)} />
          <MetricRow
            label="Confidence"
            value={stockData.se_pattern_confidence != null ? `${stockData.se_pattern_confidence.toFixed(0)}%` : '-'}
          />
          <MetricRow label="Setup" value={stockData.se_setup_score?.toFixed(1) || '-'} color={getScoreColor(stockData.se_setup_score)} />
          <MetricRow label="Quality" value={stockData.se_quality_score?.toFixed(1) || '-'} color={getScoreColor(stockData.se_quality_score)} />
          <MetricRow label="Readiness" value={stockData.se_readiness_score?.toFixed(1) || '-'} color={getScoreColor(stockData.se_readiness_score)} />
          <IconRow label="Ready"><BoolIndicator value={stockData.se_setup_ready} /></IconRow>
        </Section>
      )}

      <Section title="Price & Technical">
        <MetricRow label="Price" value={stockData.current_price ? `$${stockData.current_price.toFixed(2)}` : '-'} />
        <IconRow label="Stage">
          {stockData.stage
            ? <Badge tone={stockData.stage === 2 ? 'accent' : 'neutral'}>{`S${stockData.stage}`}</Badge>
            : <span className="text-[13px]">-</span>}
        </IconRow>
        <IconRow label="MA Align"><BoolIndicator value={stockData.ma_alignment} /></IconRow>
        <IconRow label="Pass Tmpl"><BoolIndicator value={stockData.passes_template} /></IconRow>
      </Section>

      {stockData.ibd_industry_group && onViewPeers && (
        <Button variant="secondary" size="sm" className="mt-auto w-full" onClick={onViewPeers}>
          <Users aria-hidden="true" />
          View Industry Peers
        </Button>
      )}
    </aside>
  );
}

export default StockMetricsSidebar;
