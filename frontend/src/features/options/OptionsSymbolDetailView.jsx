import { ArrowLeft, ChevronDown } from 'lucide-react';

import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Notice } from '@/ui/notice';

import OptionsHistoryChart from './OptionsHistoryChart';
import OptionsMetricTable from './OptionsMetricTable';
import OptionsQualityBadge from './OptionsQualityBadge';
import OptionsSourceBadges from './OptionsSourceBadges';
import OptionsStatusBanner from './OptionsStatusBanner';
import OptionsStrikeCharts from './OptionsStrikeCharts';

const humanize = (value) => String(value || '').replaceAll('_', ' ');

function SummaryCard({ title, children }) {
  return (
    <Card className="p-4">
      <h2 className="text-xs font-semibold text-muted-foreground">{title}</h2>
      {children}
    </Card>
  );
}

function MetricsCard({ title, metrics }) {
  return (
    <Card className="overflow-hidden">
      <h2 className="px-4 pt-3 pb-1 text-sm font-semibold">{title}</h2>
      <OptionsMetricTable metrics={metrics} />
    </Card>
  );
}

export default function OptionsSymbolDetailView({ data, onBack }) {
  const { item } = data;
  return (
    <div className="tw flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft aria-hidden="true" />
          Back to Command Center
        </Button>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{item.symbol} options</h1>
          <OptionsSourceBadges
            badges={item.source_badges}
            candidateRank={item.candidate_rank}
            leaderRank={item.leader_rank}
          />
          <OptionsQualityBadge state={item.state} reasonCodes={item.reason_codes} />
        </div>
      </div>
      <div>
        <OptionsStatusBanner data={{ ...data, items: [item] }} />
        {item.warnings.length > 0 && <Notice tone="warning" role="alert">{item.warnings.join(' · ')}</Notice>}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Contract snapshot">
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {item.spot_price == null ? '—' : `$${item.spot_price.toLocaleString()}`}
          </p>
          <p className="text-sm tabular-nums">Expiration {item.expiration || 'Unavailable'}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {item.call_open_interest?.toLocaleString() ?? '—'} call OI · {item.put_open_interest?.toLocaleString() ?? '—'} put OI
          </p>
        </SummaryCard>
        <SummaryCard title="Observation depth">
          <p className="mt-1 text-sm tabular-nums">{item.lifetime_observation_count} lifetime observations</p>
          <p className="text-sm tabular-nums">{item.short_history_observation_count} short-history observations</p>
          <p className="text-sm tabular-nums">{item.iv_history_observation_count} IV-history observations</p>
        </SummaryCard>
        <SummaryCard title="Publication quality">
          <p className="mt-1 text-sm tabular-nums">{Math.round(data.coverage * 100)}% current coverage</p>
          <p className="text-sm">Provider: {data.provider}</p>
          <p className="text-sm tabular-nums">Retries: {item.retry_count}</p>
        </SummaryCard>
      </div>
      <OptionsStrikeCharts points={data.strike_points} spotPrice={item.spot_price} />
      <div className="grid items-start gap-4 md:grid-cols-2">
        <MetricsCard title="Current snapshot metrics" metrics={item.metrics} />
        <MetricsCard title="Historical context" metrics={item.historical_metrics} />
      </div>
      <OptionsHistoryChart history={data.history} />
      <Card>
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 outline-none select-none focus-visible:bg-accent/10 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-semibold">Method and data quality</span>
            <ChevronDown aria-hidden="true" className="ml-auto size-4 text-muted-foreground transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <section>
              <h3 className="text-xs font-semibold">Assumptions</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {Object.entries(item.assumptions).map(([key, value]) => (
                  <Badge key={key}>{`${humanize(key)}: ${String(value)}`}</Badge>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-xs font-semibold">Quality evidence</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {Object.entries(item.quality_evidence).map(([key, value]) => (
                  <Badge key={key}>{`${humanize(key)}: ${value ?? 'Unavailable'}`}</Badge>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-xs font-semibold">Reasons and warnings</h3>
              <p className="mt-1 text-sm">
                {[...item.reason_codes, ...item.warnings].map(humanize).join(' · ') || 'No additional warnings'}
              </p>
            </section>
            <p className="text-xs text-muted-foreground">
              GEX, gamma flip, and wall values are model estimates, not observed dealer positions.
            </p>
          </div>
        </details>
      </Card>
    </div>
  );
}
