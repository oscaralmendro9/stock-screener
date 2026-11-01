import { useQuery } from '@tanstack/react-query';

import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';
import { getSocialSummary } from '../../api/socialSignals';
import { isSocialSignalMarket, SOCIAL_SIGNAL_MARKETS_COPY } from './socialSignalMarkets';
import { formatSocialScore } from './socialSignalPresentation';

const unavailableCopy = {
  no_published_run: 'The first Social Signal run is still warming up.',
  social_signals_disabled: 'Social Signals are not enabled.',
};

const themeLabel = (value) => String(value || '').replaceAll('_', ' ')
  .replace(/^./, (letter) => letter.toUpperCase());
const PILL = 'inline-flex h-6 items-center rounded-full border border-border px-2 text-[11px] whitespace-nowrap';

export default function DailySocialSignalsCard({ market, onOpen }) {
  const marketSupported = isSocialSignalMarket(market);
  const query = useQuery({
    queryKey: ['socialSignals', 'summary', market],
    queryFn: () => getSocialSummary(market),
    staleTime: 60_000,
    enabled: marketSupported,
  });
  const data = query.data;
  const signals = (data?.top_signals || []).slice(0, 5);
  const exposure = signals.find((item) => item.explanation?.market_exposure != null)
    ?.explanation.market_exposure;

  return (
    <section className="tw mb-4 rounded-lg border border-border bg-surface p-3 text-foreground">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">Social Signals</h2>
          <p className="text-[11px] text-muted-foreground">Published X-list attention for {market}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onOpen} disabled={!marketSupported}>Open Social Signals</Button>
      </div>
      {!marketSupported ? <Notice className="mt-2">{SOCIAL_SIGNAL_MARKETS_COPY}</Notice> : null}
      {marketSupported && query.isLoading ? (
        <span role="progressbar" aria-label="Loading Social summary" className="mt-2 inline-block size-5 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
      ) : null}
      {marketSupported && query.isError ? <Notice tone="warning" className="mt-2">Social summary could not be loaded.</Notice> : null}
      {data?.available === false ? (
        <Notice className="mt-2">
          {unavailableCopy[data.reason_code] || 'Social Signals are temporarily unavailable.'}
        </Notice>
      ) : null}
      {data?.available ? (
        <>
          <div className="my-2 flex flex-wrap items-center gap-1.5">
            <span className={cn(PILL, data.stale ? 'text-warning' : 'text-gain')}>{data.stale ? 'Stale' : 'Fresh'}</span>
            <span className={cn(PILL, 'tabular-nums')}>{`${data.participating_source_count ?? 0}/${data.enabled_source_count ?? 0} sources`}</span>
            <span className={cn(PILL, 'tabular-nums')}>{`Exposure ${formatSocialScore(exposure)} · ${exposure == null
              ? 'Unavailable' : Number(exposure) >= 50 ? 'Risk-on' : 'Risk-off'}`}</span>
            <span className="text-[11px] text-muted-foreground">
              Last success {data.published_at ? new Date(data.published_at).toLocaleString() : '—'}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {signals.map((item) => (
              <p key={item.candidate_key} className="text-sm tabular-nums">
                <strong>{item.canonical_symbol}</strong> {formatSocialScore(item.queue_score)}
              </p>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {(data.dominant_themes || []).slice(0, 3).map((theme) => (
              `${themeLabel(theme.theme_key)} · ${theme.accepted_company_count} companies`
            )).join(' · ') || 'No dominant theme yet'}
          </p>
        </>
      ) : null}
    </section>
  );
}
