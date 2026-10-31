import { Check, TriangleAlert, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Notice } from '@/ui/notice';
import { Sheet, SheetContent, SheetTitle } from '@/ui/sheet';

import { formatPatternName, getScoreColor } from '../../utils/formatUtils';

// getScoreColor returns MUI palette keys; map them onto theme tokens.
const SCORE_TEXT = { 'success.main': 'text-gain', 'warning.main': 'text-warning', 'error.main': 'text-loss' };
const SCORE_TONE = { 'success.main': 'gain', 'warning.main': 'warning', 'error.main': 'loss' };
const scoreText = (value) => SCORE_TEXT[getScoreColor(value)] || '';
const scoreTone = (value) => SCORE_TONE[getScoreColor(value)] || 'neutral';

// Human-readable names for common check/flag strings
const CHECK_NAME_MAP = {
  setup_score_ok: 'Setup score meets threshold',
  quality_floor_ok: 'Quality score above floor',
  readiness_floor_ok: 'Readiness score above floor',
  in_early_zone: 'Within early-stage zone',
  atr14_within_limit: 'ATR14 within volatility limit',
  volume_sufficient: 'Volume above minimum',
  rs_leadership_ok: 'RS leadership confirmed',
  stage_ok: 'Stage is acceptable',
  setup_score_below_threshold: 'Setup score below threshold',
  quality_below_threshold: 'Quality score below threshold',
  readiness_below_threshold: 'Readiness score below threshold',
  outside_early_zone: 'Outside early-stage zone',
  atr14_pct_exceeds_limit: 'ATR14 exceeds volatility limit',
  volume_below_minimum: 'Volume below minimum',
  rs_leadership_insufficient: 'RS leadership insufficient',
  stage_not_ok: 'Stage not acceptable',
  ma_alignment_ok: 'MA alignment meets minimum',
  ma_alignment_insufficient: 'MA alignment below minimum',
  rs_rating_ok: 'RS rating meets minimum',
  rs_rating_insufficient: 'RS rating below minimum',
  no_primary_pattern: 'No primary pattern detected',
  insufficient_data: 'Insufficient data',
  primary_pattern_selected: 'Primary pattern selected',
  primary_pattern_fallback_selected: 'Primary selected via fallback',
  detector_pipeline_executed: 'Detector pipeline executed',
  cross_detector_calibration_applied: 'Cross-detector calibration applied',
  too_extended: 'Entry is too extended past pivot',
  breaks_50d_support: 'Price below 50-day moving average',
  low_liquidity: 'Average daily volume below liquidity threshold',
  earnings_soon: 'Earnings announcement within risk window',
};

// Operational flags with hard severity (structural break — renders red).
// All other operational flags are soft (caution — renders amber).
const HARD_FLAGS = new Set(['breaks_50d_support']);

const getFlagCode = (flag) => {
  if (!flag) return '';
  if (typeof flag === 'string') return String(flag).split(':')[0];
  if (typeof flag === 'object' && !Array.isArray(flag) && flag.code) return String(flag.code);
  return '';
};

const getFlagMessage = (flag) => {
  if (!flag) return '';
  if (typeof flag === 'string') return String(flag);
  if (typeof flag === 'object' && !Array.isArray(flag)) {
    if (flag.message) return String(flag.message);
    if (flag.code) return String(flag.code);
  }
  return '';
};

/**
 * Format a check/flag string to human-readable text
 */
const formatCheckName = (name) => {
  if (!name) return '-';
  if (CHECK_NAME_MAP[name]) return CHECK_NAME_MAP[name];
  // Fallback: snake_case to Title Case
  return String(name)
    .replace(/:/g, ' \u2013 ')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Section header (literal uppercase text, not a CSS transform)
 */
const DrawerSection = ({ title, children }) => (
  <section className="mb-4">
    <h3 className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">{title}</h3>
    {children}
  </section>
);

/**
 * Score grid item
 */
const ScoreItem = ({ label, value }) => (
  <div className="text-center">
    <p className={cn('text-lg leading-tight font-semibold tabular-nums', scoreText(value))}>
      {value != null ? value.toFixed(1) : '-'}
    </p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
);

const PassIcon = ({ small = false }) => (
  <Check role="img" aria-label="Passed" className={cn('shrink-0 text-gain', small ? 'size-3' : 'size-4')} />
);
const FailIcon = ({ small = false }) => (
  <X role="img" aria-label="Failed" className={cn('shrink-0 text-loss', small ? 'size-3' : 'size-4')} />
);

/**
 * Check list item with icon
 */
const CheckItem = ({ icon, text, className }) => (
  <div className="flex items-center gap-1.5 py-0.5">
    {icon}
    <span className={cn('text-[13px]', className)}>{text}</span>
  </div>
);

const InfoRow = ({ label, children, className }) => (
  <div className="flex justify-between gap-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={cn('text-[13px] font-medium tabular-nums', className)}>{children}</span>
  </div>
);

/**
 * SetupEngineDrawer — slide-out panel showing the full explain payload
 * for a stock's Setup Engine evaluation.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether drawer is open
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.stockData - Stock result from scan (needs se_* fields)
 */
function SetupEngineDrawer({ open, onClose, stockData, isLoading = false }) {
  if (!stockData) return null;

  const explain =
    stockData.se_explain && typeof stockData.se_explain === 'object' && !Array.isArray(stockData.se_explain)
      ? stockData.se_explain
      : null;
  const candidates = Array.isArray(stockData.se_candidates) ? stockData.se_candidates : null;

  const hasInsufficientData = explain?.invalidation_flags?.some(
    (f) => {
      const code = getFlagCode(f);
      const text = getFlagMessage(f);
      return code === 'insufficient_data' || text.startsWith('data_policy:insufficient') || (code === 'data_policy' && text.includes('insufficient'));
    }
  );
  const hasDegradedData = !hasInsufficientData && explain?.invalidation_flags?.some(
    (f) => {
      const text = getFlagMessage(f);
      const code = getFlagCode(f);
      return text.startsWith('data_policy:degraded') || (code === 'data_policy' && text.includes('degraded'));
    }
  );

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="right" showClose aria-describedby={undefined} className="sm:w-[420px]">
        <div className="border-b border-border py-3 pr-12 pl-4">
          <SheetTitle className="text-base font-semibold">
            Setup Engine Details{stockData.symbol ? ` — ${stockData.symbol}` : ''}
          </SheetTitle>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div role="progressbar" aria-label="Loading setup details" className="mt-4 flex justify-center">
              <span aria-hidden="true" className="size-6 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
            </div>
          ) : !explain ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Setup details not available for this stock.
            </p>
          ) : (
            <>
              {hasInsufficientData && (
                <Notice tone="warning" className="mb-4">
                  Insufficient historical data — scores and pattern detection are unavailable for this stock.
                </Notice>
              )}
              {hasDegradedData && (
                <Notice tone="info" className="mb-4">
                  Some data sources are degraded. Scores may be less reliable.
                </Notice>
              )}

              <DrawerSection title="SETUP SUMMARY">
                <div className="mb-3 flex items-center gap-2">
                  <p className="font-semibold">{formatPatternName(stockData.se_pattern_primary)}</p>
                  {stockData.se_pattern_confidence != null && (
                    <Badge tone={scoreTone(stockData.se_pattern_confidence)}>
                      {`${stockData.se_pattern_confidence.toFixed(0)}%`}
                    </Badge>
                  )}
                </div>

                {(stockData.se_setup_score != null ||
                  stockData.se_quality_score != null ||
                  stockData.se_readiness_score != null) && (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <ScoreItem label="Setup" value={stockData.se_setup_score} />
                    <ScoreItem label="Quality" value={stockData.se_quality_score} />
                    <ScoreItem label="Readiness" value={stockData.se_readiness_score} />
                  </div>
                )}

                <div className="mb-2 flex items-center gap-2">
                  {stockData.se_setup_ready != null && (
                    <Badge tone={stockData.se_setup_ready ? 'gain' : 'neutral'} className="font-semibold">
                      {stockData.se_setup_ready ? 'READY' : 'NOT READY'}
                    </Badge>
                  )}
                  {stockData.se_timeframe && <Badge>{stockData.se_timeframe}</Badge>}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {stockData.se_pivot_price != null && (
                    <InfoRow label="Pivot">${stockData.se_pivot_price.toFixed(2)}</InfoRow>
                  )}
                  {stockData.se_pivot_type && (
                    <InfoRow label="Type" className="font-normal">{formatCheckName(stockData.se_pivot_type)}</InfoRow>
                  )}
                  {stockData.se_pivot_date && (
                    <InfoRow label="Pivot Date" className="font-normal">{stockData.se_pivot_date}</InfoRow>
                  )}
                  {stockData.se_distance_to_pivot_pct != null && (
                    <InfoRow
                      label="Dist to Pivot"
                      className={stockData.se_distance_to_pivot_pct <= 0 ? 'text-gain' : 'text-warning'}
                    >
                      {stockData.se_distance_to_pivot_pct >= 0 ? '+' : ''}
                      {stockData.se_distance_to_pivot_pct.toFixed(1)}%
                    </InfoRow>
                  )}
                  {stockData.se_atr14_pct != null && (
                    <InfoRow label="ATR14" className="font-normal">{stockData.se_atr14_pct.toFixed(2)}%</InfoRow>
                  )}
                </div>
              </DrawerSection>

              {explain.passed_checks?.length > 0 && (
                <DrawerSection title="PASSED CHECKS">
                  {explain.passed_checks.map((check) => (
                    <CheckItem key={check} icon={<PassIcon />} text={formatCheckName(check)} />
                  ))}
                </DrawerSection>
              )}

              {explain.failed_checks?.length > 0 && (
                <DrawerSection title="FAILED CHECKS">
                  {explain.failed_checks.map((check) => (
                    <CheckItem key={check} icon={<FailIcon />} text={formatCheckName(check)} className="text-loss" />
                  ))}
                </DrawerSection>
              )}

              {explain.key_levels && typeof explain.key_levels === 'object' && !Array.isArray(explain.key_levels) && Object.keys(explain.key_levels).length > 0 && (
                <DrawerSection title="KEY LEVELS">
                  {Object.entries(explain.key_levels).map(([name, price]) => (
                    <div key={name} className="flex justify-between py-0.5 text-[13px]">
                      <span>{formatCheckName(name)}</span>
                      <span className="font-medium tabular-nums">
                        {price != null && Number.isFinite(Number(price)) ? `$${Number(price).toFixed(2)}` : '-'}
                      </span>
                    </div>
                  ))}
                </DrawerSection>
              )}

              {explain.invalidation_flags?.length > 0 && (
                <DrawerSection title="INVALIDATION FLAGS">
                  {explain.invalidation_flags.map((flag, idx) => {
                    const flagBase = getFlagCode(flag);
                    const flagText = getFlagMessage(flag);
                    const tone = HARD_FLAGS.has(flagBase) ? 'text-loss' : 'text-warning';
                    return (
                      <CheckItem
                        key={`${flagBase || 'flag'}-${idx}`}
                        icon={<TriangleAlert aria-hidden="true" className={cn('size-4 shrink-0', tone)} />}
                        text={formatCheckName(flagText)}
                        className={tone}
                      />
                    );
                  })}
                </DrawerSection>
              )}

              {candidates?.length > 0 && (
                <DrawerSection title="PATTERN CANDIDATES">
                  {candidates.map((c, idx) => (
                    <div key={`${c.pattern || 'candidate'}-${idx}`} className="mb-2 rounded-md border border-border p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <p className="text-sm font-semibold">{formatPatternName(c.pattern)}</p>
                        {c.confidence_pct != null && (
                          <Badge tone={scoreTone(Number(c.confidence_pct))}>
                            {`${Number(c.confidence_pct).toFixed(0)}%`}
                          </Badge>
                        )}
                        {c.timeframe && <Badge>{c.timeframe}</Badge>}
                      </div>

                      <div className="mb-1.5 grid grid-cols-3 gap-1">
                        {[['setup_score', 'Setup'], ['quality_score', 'Quality'], ['readiness_score', 'Readiness']]
                          .filter(([key]) => c[key] != null)
                          .map(([key, label]) => (
                            <div key={key} className="text-center">
                              <p className={cn('text-[13px] font-medium tabular-nums', scoreText(c[key]))}>{c[key].toFixed(1)}</p>
                              <p className="text-[11px] text-muted-foreground">{label}</p>
                            </div>
                          ))}
                      </div>

                      {c.pivot_price != null && (
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          Pivot: ${c.pivot_price.toFixed(2)}
                          {c.pivot_type ? ` (${formatCheckName(c.pivot_type)})` : ''}
                          {c.pivot_date ? ` — ${c.pivot_date}` : ''}
                        </p>
                      )}

                      {c.checks && typeof c.checks === 'object' && !Array.isArray(c.checks) && Object.keys(c.checks).length > 0 && (
                        <div className="mt-1">
                          {Object.entries(c.checks).map(([name, passed]) => (
                            <div key={name} className="flex items-center gap-1 py-px">
                              {passed ? <PassIcon small /> : <FailIcon small />}
                              <span className="text-[11px]">{formatCheckName(name)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {c.notes?.length > 0 && (
                        <div className="mt-1">
                          {c.notes.map((note, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground">{note}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </DrawerSection>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SetupEngineDrawer;
