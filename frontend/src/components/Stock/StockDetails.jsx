import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QueryErrorAlert from '../common/QueryErrorAlert';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, Plus, X } from 'lucide-react';

import { getStockDecisionDashboard, getStockValidation } from '../../api/stocks';
import CandlestickChart from '../Charts/CandlestickChart';
import AddToWatchlistMenu from '../common/AddToWatchlistMenu';
import PeerComparisonModal from '../Scan/PeerComparisonModal';
import MarketThemesList from './MarketThemesList';
import {
  ValidationDegradedAlert,
  ValidationFailureClustersTable,
  ValidationRecentEventsTable,
  ValidationSummaryCards,
} from '../Validation/ValidationPanels';
import {
  formatPercent,
  formatRatio,
} from '../../utils/formatUtils';
import { resolveMarketCapDisplay } from '../../utils/marketCapUtils';
import { useStrategyProfileData } from '../../contexts/StrategyProfileContext';
import { useRuntime } from '../../contexts/RuntimeContext';
import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import KeyStatsGrid from '../../features/stock/KeyStatsGrid';
import StockHeader, { StockTabs } from '../../features/stock/StockHeader';
import { OptionsChainView } from '../../pages/OptionsChainPage';

const LOOKBACK_OPTIONS = [90, 180, 365];

// Collapsed by default, like the MUI accordions it replaces. Native
// <details> keeps the content in the DOM and handles the keyboard itself.
function Section({ title, badge, children }) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 outline-none select-none focus-visible:bg-accent/10 [&::-webkit-details-marker]:hidden">
        <h2 className="text-sm font-semibold">{title}</h2>
        {badge}
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="px-4 pt-1 pb-4">{children}</div>
    </details>
  );
}

const SectionHeader = ({ children }) => (
  <h3 className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">{children}</h3>
);

const MetricRow = ({ label, value, accent = false }) => (
  <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn('text-right font-medium', accent && 'text-accent')}>{value}</span>
  </div>
);

const BoolIndicator = ({ value }) => (value ? (
  <Check role="img" aria-label="Passed" className="size-3.5 shrink-0 text-accent" />
) : (
  <X role="img" aria-label="Failed" className="size-3.5 shrink-0 text-muted-foreground" />
));

const CriteriaList = ({ title, items, emptyText }) => (
  <div className="min-w-0 flex-1">
    <SectionHeader>{title}</SectionHeader>
    {items?.length ? (
      <ul className="grid gap-0.5">
        {items.map((item) => (
          <li key={`${item.screener_name}:${item.criterion_name}`} className="flex items-center justify-between gap-3 text-xs tabular-nums">
            <span className="text-muted-foreground">{item.criterion_name}</span>
            <span className="flex items-center gap-1">
              {item.score.toFixed(1)}/{item.max_score.toFixed(1)}
              <BoolIndicator value={item.passed} />
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-muted-foreground">{emptyText}</p>
    )}
  </div>
);

function InfoBox({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="truncate rounded-md border border-border bg-surface-subtle px-3 py-1 text-xs">{value || '-'}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Notice({ tone = 'info', children }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'tw rounded-md border px-3 py-2 text-sm',
        tone === 'error' && 'border-loss/40 bg-loss/10',
        tone === 'warning' && 'border-warning/40 bg-warning/10',
        tone === 'info' && 'border-border bg-surface-subtle',
      )}
    >
      {children}
    </div>
  );
}

function StockDetailsSkeleton() {
  return (
    <div className="tw flex flex-col gap-3 pb-4" role="status" aria-label="Loading stock">
      <div className="h-16 rounded-lg bg-surface-subtle motion-safe:animate-pulse" />
      <div className="h-[480px] rounded-lg bg-surface-subtle motion-safe:animate-pulse" />
      <div className="h-40 rounded-lg bg-surface-subtle motion-safe:animate-pulse" />
    </div>
  );
}

// gain/loss stay reserved for price direction; states use accent or warning.
const regimeTone = (label) => (label === 'offense' ? 'accent' : label === 'defense' ? 'warning' : 'neutral');
const earningsTone = (risk) => (risk === 'imminent' || risk === 'caution' ? 'warning' : 'neutral');

function StockDetails() {
  const { ticker: symbol } = useParams();
  const navigate = useNavigate();
  const {
    activeProfileDetail,
    isLoadingProfiles,
    requestProfile,
  } = useStrategyProfileData();
  const [peerModalOpen, setPeerModalOpen] = useState(false);
  const [validationLookbackDays, setValidationLookbackDays] = useState(365);
  const { features } = useRuntime();
  // Overview | Options, kept in the URL (?tab=options) so it can be linked.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'options' ? 'options' : 'overview';
  const setTab = (next) => setSearchParams(next === 'options' ? { tab: 'options' } : {}, { replace: true });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stockDecisionDashboard', symbol, requestProfile],
    queryFn: () => getStockDecisionDashboard(symbol, requestProfile),
    enabled: Boolean(symbol && requestProfile),
    staleTime: 60_000,
  });
  const {
    data: validationData,
    isLoading: isValidationLoading,
    error: validationError,
  } = useQuery({
    queryKey: ['stockValidation', symbol, validationLookbackDays],
    queryFn: () => getStockValidation(symbol, validationLookbackDays),
    enabled: Boolean(symbol),
    staleTime: 60_000,
  });

  if (isLoading || (isLoadingProfiles && !requestProfile)) {
    return <StockDetailsSkeleton />;
  }

  if (!requestProfile) {
    return (
      <Notice tone="warning">
        Strategy profile data is unavailable.
      </Notice>
    );
  }

  if (error) {
    return (
      <QueryErrorAlert title={`Failed to load ${symbol}`} error={error} onRetry={refetch} />
    );
  }

  if (!data) {
    return (
      <Notice tone="warning">
        No stock workspace data is available.
      </Notice>
    );
  }

  const info = data.info || {};
  const fundamentals = data.fundamentals || {};
  const technicals = data.technicals || {};
  const chart = data.chart?.chart_data || {};
  const price = info.current_price ?? technicals.current_price ?? chart.current_price;
  const decision = data.decision_summary || {
    composite_score: null,
    rating: null,
    screeners_passed: 0,
    screeners_total: 0,
    composite_method: null,
    top_strengths: [],
    top_weaknesses: [],
    freshness: data.freshness || {},
  };
  const freshness = decision.freshness || data.freshness || {};
  const regime = data.regime || null;
  const eventRisk = data.event_risk || { notes: [] };
  const regimeActions = data.regime_actions || {
    stance: regime?.label || 'unavailable',
    sizing_guidance: 'probe',
    avoid_new_entries: false,
    preferred_setups: [],
    caution_flags: [],
    summary: 'Action guidance is unavailable.',
  };
  const strengthsTitle = activeProfileDetail?.stock_action?.strengths_title || 'Top Strengths';
  const weaknessesTitle = activeProfileDetail?.stock_action?.weaknesses_title || 'Top Weaknesses';

  const groupRank = chart.ibd_group_rank;
  const marketGroup = chart.ibd_industry_group;
  const marketThemes = chart.market_themes || [];
  const sector = chart.gics_sector || info.sector;
  const industry = chart.gics_industry || info.industry;

  // Theme links are only missing because Themes is switched off: not a gap
  // worth flagging on every stock.
  const degradedReasons = (data.degraded_reasons || []).filter(
    (reason) => features.themes || reason !== 'missing_theme_links',
  );
  const history = data.chart?.price_history || [];
  const lastClose = history.at(-1)?.close;
  const prevClose = history.at(-2)?.close;
  const change1d = lastClose != null && prevClose ? (lastClose / prevClose - 1) * 100 : null;

  return (
    <div className="tw flex flex-col gap-3 pb-4">
      <StockHeader
        symbol={data.symbol}
        name={info.name}
        exchange={chart.exchange}
        market={chart.market}
        sector={sector}
        industry={industry}
        group={marketGroup}
        groupRank={groupRank}
        price={price}
        change={change1d}
        asOf={data.as_of_date || history.at(-1)?.date}
        rating={decision.rating}
        onViewPeers={() => setPeerModalOpen(true)}
        watchlistMenu={(
          <AddToWatchlistMenu
            symbols={data.symbol}
            trigger={<Button size="sm"><Plus aria-hidden="true" />Watchlist</Button>}
          />
        )}
      />

      {degradedReasons.length > 0 && (
        <Notice>
          Workspace is partially degraded: {degradedReasons.join(', ')}.
        </Notice>
      )}

      <StockTabs active={tab} onChange={setTab} />

      {tab === 'options' ? (
        <OptionsChainView symbol={data.symbol} embedded />
      ) : (
        <>
      <Card className="overflow-hidden">
        <CandlestickChart
          key={data.symbol}
          symbol={data.symbol}
          priceData={history}
          height={480}
        />
      </Card>

      <KeyStatsGrid data={data} />

      {fundamentals.description && (
        <Card className="px-4 py-3">
          <h2 className="mb-1 text-sm font-semibold">About</h2>
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">{fundamentals.description}</p>
        </Card>
      )}

      {/* ─── Collapsible sections ─── */}
      <Card className="overflow-hidden">

        <Section
          title="Decision Summary"
          badge={decision.composite_score != null && (
            <Badge>{`${decision.composite_score.toFixed(1)} · ${decision.screeners_passed}/${decision.screeners_total}`}</Badge>
          )}
        >
          <SectionHeader>OVERVIEW</SectionHeader>
          <div className="mb-3 grid gap-x-6 gap-y-1 sm:grid-cols-3">
            <MetricRow label="Composite" value={decision.composite_score != null ? decision.composite_score.toFixed(1) : '-'} accent />
            <MetricRow label="Screeners" value={`${decision.screeners_passed}/${decision.screeners_total}`} />
            <MetricRow label="Method" value={decision.composite_method || '-'} />
            <MetricRow label="Feature Date" value={freshness.feature_as_of_date || '-'} />
            <MetricRow label="Breadth Date" value={freshness.breadth_date || '-'} />
            <MetricRow label="Price History" value={freshness.has_price_history ? 'Ready' : 'Missing'} />
          </div>
          <div className="flex flex-col gap-4 border-t border-border pt-3 sm:flex-row sm:gap-8">
            <CriteriaList title={strengthsTitle.toUpperCase()} items={decision.top_strengths} emptyText="No positive criteria." />
            <CriteriaList title={weaknessesTitle.toUpperCase()} items={decision.top_weaknesses} emptyText="No failing criteria." />
          </div>
        </Section>

        <Section title="Screener Breakdown">
          {data.screener_explanations?.length ? (
            <div className="flex flex-col divide-y divide-border">
              {data.screener_explanations.map((screener) => (
                <div key={screener.screener_name} className="py-2 first:pt-0 last:pb-0">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <h3 className="text-[11px] font-semibold tracking-wide uppercase">
                      {screener.screener_name.replaceAll('_', ' ')}
                    </h3>
                    <Badge tone={screener.passes ? 'accent' : 'neutral'}>
                      {`${screener.score.toFixed(1)} · ${screener.rating}`}
                    </Badge>
                  </div>
                  <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
                    {screener.criteria.map((criterion) => (
                      <li key={criterion.name} className="flex items-center justify-between gap-3 text-xs tabular-nums">
                        <span className="text-muted-foreground">{criterion.name}</span>
                        <span className="flex items-center gap-1">
                          {criterion.score.toFixed(1)}/{criterion.max_score.toFixed(1)}
                          <BoolIndicator value={criterion.passed} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Screener explanations are unavailable for this symbol.
            </p>
          )}
        </Section>

        <Section
          title="Market Classification"
          badge={marketGroup && <Badge className="max-w-48 truncate">{marketGroup}</Badge>}
        >
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoBox label="Group" value={marketGroup || '-'} />
              <InfoBox label="Sector" value={sector || '-'} />
              <InfoBox label="Industry" value={industry || '-'} />
            </div>
            <div>
              <SectionHeader>MARKET THEMES</SectionHeader>
              <MarketThemesList themes={marketThemes} variant="wrap" />
            </div>
          </div>
        </Section>

        <Section
          title="Industry Peers"
          badge={data.peers?.length > 0 && <Badge>{data.peers.length}</Badge>}
        >
          {data.peers?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-2 py-1.5 text-left font-medium">Symbol</th>
                    <th scope="col" className="px-2 py-1.5 text-left font-medium">Company</th>
                    <th scope="col" className="px-2 py-1.5 text-right font-medium">Comp</th>
                    <th scope="col" className="px-2 py-1.5 text-right font-medium">RS</th>
                    <th scope="col" className="px-2 py-1.5 text-right font-medium">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.peers.slice(0, 12).map((peer) => (
                    <tr key={peer.symbol} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-1 font-semibold">
                        <RouterLink to={`/stocks/${encodeURIComponent(peer.symbol)}`} className="text-accent hover:underline">
                          {peer.symbol}
                        </RouterLink>
                      </td>
                      <td className="max-w-64 truncate px-2 py-1">{peer.company_name || '-'}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{peer.composite_score?.toFixed(1) || '-'}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{peer.rs_rating?.toFixed(0) || '-'}</td>
                      <td className="px-2 py-1 text-right">
                        {peer.stage != null ? <Badge>{`S${peer.stage}`}</Badge> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No peer data is available from the latest published feature run.
            </p>
          )}
        </Section>

        <Section title="Related Themes">
          {data.themes?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.themes.map((theme) => (
                <div key={theme.theme_id} className="rounded-md border border-border p-2">
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    <Badge tone="accent">{theme.display_name}</Badge>
                    {theme.status && <Badge>{theme.status}</Badge>}
                  </div>
                  <div className="grid gap-0.5">
                    <MetricRow label="Momentum" value={formatRatio(theme.momentum_score)} />
                    <MetricRow label="Velocity" value={`${formatRatio(theme.mention_velocity)}x`} />
                    <MetricRow label="1M Basket" value={formatPercent(theme.basket_return_1m)} />
                    {theme.lifecycle_state && <MetricRow label="Lifecycle" value={theme.lifecycle_state} />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This symbol is not currently linked to an active theme cluster.
            </p>
          )}
        </Section>

        <Section
          title="Market Regime & Risk Context"
          badge={regime && <Badge tone={regimeTone(regime.label)}>{regime.label}</Badge>}
        >
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
            {regime ? (
              <>
                <MetricRow label="Stance" value={regime.label} />
                <MetricRow label="5D Ratio" value={formatRatio(regime.ratio_5day)} />
                <MetricRow label="10D Ratio" value={formatRatio(regime.ratio_10day)} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground sm:col-span-3">
                Market regime context is unavailable for this symbol.
              </p>
            )}
            <MetricRow
              label="Market Cap"
              value={resolveMarketCapDisplay(fundamentals, info).formattedValue}
            />
            <MetricRow label="EPS Q/Q" value={formatPercent(fundamentals.eps_growth_quarterly ?? chart.eps_growth_qq)} />
            <MetricRow label="Revenue Growth" value={formatPercent(fundamentals.revenue_growth ?? chart.sales_growth_qq)} />
            <MetricRow
              label="52W Range"
              value={technicals.low_52w != null && technicals.high_52w != null
                ? `$${Number(technicals.low_52w).toFixed(0)}-$${Number(technicals.high_52w).toFixed(0)}`
                : '-'}
            />
          </div>
          {regime?.summary && (
            <p className="mt-2 text-xs text-muted-foreground">{regime.summary}</p>
          )}
        </Section>

        <Section
          title="Event Risk & Action Plan"
          badge={(
            <Badge tone={earningsTone(eventRisk.earnings_window_risk)}>
              {eventRisk.earnings_window_risk || 'safe'}
            </Badge>
          )}
        >
          <div className="flex flex-col gap-3">
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
              <MetricRow label="Next Earnings" value={eventRisk.next_earnings_date || '-'} />
              <MetricRow label="Days Until" value={eventRisk.days_until_earnings ?? '-'} />
              <MetricRow label="Window Risk" value={eventRisk.earnings_window_risk || '-'} />
              <MetricRow label="Beat Count (4)" value={eventRisk.beat_count_last_4 ?? '-'} />
              <MetricRow label="Miss Count (4)" value={eventRisk.miss_count_last_4 ?? '-'} />
              <MetricRow label="Recent Earnings" value={eventRisk.recent_earnings_count ?? '-'} />
              <MetricRow label="Avg Gap" value={formatPercent(eventRisk.avg_post_earnings_gap_pct)} />
              <MetricRow label="Avg 5S Return" value={formatPercent(eventRisk.avg_post_earnings_5s_return_pct)} />
              <MetricRow label="Inst Ownership" value={formatPercent(eventRisk.institutional_ownership_current)} />
              <MetricRow label="Inst Δ 90D" value={formatPercent(eventRisk.institutional_ownership_delta_90d)} />
              <MetricRow label="Sizing" value={regimeActions.sizing_guidance} />
              <MetricRow label="Avoid New Entries" value={regimeActions.avoid_new_entries ? 'Yes' : 'No'} />
            </div>

            <div>
              <SectionHeader>ACTION PLAN</SectionHeader>
              <p className="text-sm">{regimeActions.summary}</p>
            </div>

            <div>
              <SectionHeader>PREFERRED SETUPS</SectionHeader>
              {regimeActions.preferred_setups?.length ? (
                <div className="flex flex-wrap gap-1">
                  {regimeActions.preferred_setups.map((setup, index) => (
                    <Badge key={`${setup}-${index}`}>{setup}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No setup guidance is available.</p>
              )}
            </div>

            <div>
              <SectionHeader>CAUTION FLAGS</SectionHeader>
              {regimeActions.caution_flags?.length ? (
                <ul className="grid gap-0.5 text-xs text-muted-foreground">
                  {regimeActions.caution_flags.map((flag, index) => (
                    <li key={`${flag}-${index}`}>{flag}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No active caution flags.</p>
              )}
            </div>

            <div>
              <SectionHeader>EVENT NOTES</SectionHeader>
              {eventRisk.notes?.length ? (
                <ul className="grid gap-0.5 text-xs text-muted-foreground">
                  {eventRisk.notes.map((note, index) => (
                    <li key={`${note}-${index}`}>{note}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No additional event-risk notes.</p>
              )}
            </div>
          </div>
        </Section>

        <Section title="Historical Validation">
          <div className="flex flex-col gap-3">
            <div role="group" aria-label="Lookback" className="inline-flex w-fit overflow-hidden rounded-md border border-border">
              {LOOKBACK_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={validationLookbackDays === days}
                  onClick={() => setValidationLookbackDays(days)}
                  className={cn(
                    'min-h-8 px-3 text-xs font-medium tabular-nums transition-colors duration-150 ease-out not-first:border-l not-first:border-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                    validationLookbackDays === days
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
                  )}
                >
                  {`${days}D`}
                </button>
              ))}
            </div>

            {isValidationLoading && (
              <div role="status" aria-label="Loading validation" className="h-24 rounded-md bg-surface-subtle motion-safe:animate-pulse" />
            )}

            {validationError && (
              <Notice tone="error">
                Failed to load historical validation: {validationError.message}
              </Notice>
            )}

            {validationData && (
              <div className="flex flex-col gap-4">
                <ValidationDegradedAlert degradedReasons={validationData.degraded_reasons} />
                {(validationData.source_breakdown || []).map((section) => (
                  <div key={section.source_kind} className="rounded-md border border-border p-3">
                    <h3 className="mb-2 text-sm font-semibold">
                      {section.source_kind === 'scan_pick' ? 'Scan Picks' : 'Theme Alerts'}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <ValidationDegradedAlert degradedReasons={section.degraded_reasons} />
                      <ValidationSummaryCards horizons={section.horizons} />
                    </div>
                  </div>
                ))}

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Recent Events</h3>
                  <ValidationRecentEventsTable events={validationData.recent_events} showSourceKind />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Failure Clusters</h3>
                  <ValidationFailureClustersTable clusters={validationData.failure_clusters} />
                </div>
              </div>
            )}
          </div>
        </Section>
      </Card>
        </>
      )}

      <PeerComparisonModal
        open={peerModalOpen}
        onClose={() => setPeerModalOpen(false)}
        symbol={data.symbol}
        onOpenChart={(sym) => {
          setPeerModalOpen(false);
          navigate(`/stocks/${encodeURIComponent(sym)}`);
        }}
      />
    </div>
  );
}

export default StockDetails;
