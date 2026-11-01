import { useQuery } from '@tanstack/react-query';

import { Notice } from '@/ui/notice';
import { getSocialThemePulse } from '../../api/socialSignals';
import { isSocialSignalMarket, SOCIAL_SIGNAL_MARKETS_COPY } from './socialSignalMarkets';
import { formatSocialScore } from './socialSignalPresentation';

const STATUS = {
  confirmed: 'Confirmed', discovering: 'Discovering',
  insufficient_market_data: 'Insufficient market data',
};

const Spinner = ({ label }) => (
  <span role="progressbar" aria-label={label} className="mt-2 inline-block size-5 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
);

export default function SocialThemePulse({ enabled, market }) {
  const marketSupported = isSocialSignalMarket(market);
  const query = useQuery({
    queryKey: ['socialSignals', 'themePulse', market],
    queryFn: () => getSocialThemePulse(market),
    enabled: enabled && marketSupported,
    staleTime: 60_000,
  });
  if (!enabled) return null;
  return (
    <section className="tw my-4 rounded-lg border border-border bg-surface p-3 text-foreground">
      <h2 className="text-lg font-semibold">Social Pulse</h2>
      <p className="text-sm text-muted-foreground">
        Display-only evidence from the published Social run; it does not change legacy Theme ordering.
      </p>
      {!marketSupported ? <Notice className="mt-2">{SOCIAL_SIGNAL_MARKETS_COPY}</Notice> : null}
      {marketSupported && query.isLoading ? <Spinner label="Loading Theme Social Pulse" /> : null}
      {marketSupported && query.isError ? <Notice tone="warning" className="mt-2">Theme Social Pulse could not be loaded.</Notice> : null}
      {marketSupported && query.data?.available === false ? (
        <Notice className="mt-2">
          {query.data.reason_code === 'no_published_run'
            ? 'The first Social Signal run is still warming up.'
            : 'Theme Social Pulse is unavailable.'}
        </Notice>
      ) : null}
      {marketSupported ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {(query.data?.items || []).map((item) => (
            <div key={item.theme_key} className="min-w-[220px] rounded-md border border-border p-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{item.name}</h3>
                <span className="inline-flex h-5 items-center rounded-full border border-border px-2 text-[11px] whitespace-nowrap">
                  {STATUS[item.status] || item.status}
                </span>
              </div>
              <p className="text-sm tabular-nums">Social strength {formatSocialScore(item.social_strength)}</p>
              <p className="text-sm tabular-nums">Market strength {formatSocialScore(item.market_strength)}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {item.measured_company_count ?? 0}/{item.accepted_company_count ?? 0} companies
                {item.benchmark_symbol ? ` · ${item.benchmark_symbol}` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
