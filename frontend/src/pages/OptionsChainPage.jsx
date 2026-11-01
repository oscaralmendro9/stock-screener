import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ChevronDown, LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { getOptionsChain, optionsChainKey } from '../api/optionsChain';
import { useIsMobileShell } from '../components/Layout/shellNav';
import { GexByStrikeChart, IvSmileChart } from '../features/optionsChain/ChainCharts';
import {
  atmStrike,
  daysUntil,
  formatCompact,
  formatCount,
  formatDelta,
  formatIv,
  formatMoney,
  formatPoints,
  nearSpotRows,
} from '../features/optionsChain/chainFormat';

const NEAR_SPOT_STRIKES = 21;

const ERROR_TEXT = {
  options_chain_unavailable: 'No listed options were found for this symbol.',
  options_provider_throttled: 'The options data provider is rate-limiting requests. Try again in a minute.',
  options_provider_unavailable: 'The options data provider did not respond. Try again in a moment.',
  invalid_symbol: 'That is not a valid ticker.',
};

const REASON_TEXT = {
  gex_inputs_unavailable: 'Needs a risk-free rate and open interest',
};

function Metric({ label, metric, format, hint }) {
  const value = metric?.available ? format(metric.value) : '—';
  const reason = !metric?.available ? metric?.reason_codes?.map((code) => REASON_TEXT[code] ?? code.replaceAll('_', ' ')).join(', ') : null;
  return (
    <div className="flex flex-col gap-0.5" title={reason || hint || undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ExpirationSelect({ expirations, value, asOf, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      Expiration
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full cursor-pointer appearance-none rounded-md border border-border bg-surface-subtle pr-8 pl-3 text-base text-foreground tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:text-sm"
        >
          {expirations.map((day) => (
            <option key={day} value={day}>{`${day} · ${daysUntil(day, asOf)}d`}</option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}

const CELL = 'px-2 py-1.5 text-right tabular-nums';

const mid = (q) => (q?.bid != null && q?.ask != null ? (q.bid + q.ask) / 2 : q?.last ?? null);

function ChainTable({ rows, spot, compact }) {
  const atm = atmStrike(rows, spot);
  // Phones: mid price and IV per side, so calls, strike and puts fit 360px.
  const callCols = compact
    ? [['Mid', (q) => formatMoney(mid(q))], ['IV', (q) => formatIv(q?.implied_volatility)]]
    : [['OI', (q) => formatCount(q?.open_interest)], ['Vol', (q) => formatCount(q?.volume)], ['IV', (q) => formatIv(q?.implied_volatility)], ['Δ', (q) => formatDelta(q?.delta)], ['Bid', (q) => formatMoney(q?.bid)], ['Ask', (q) => formatMoney(q?.ask)]];
  const putCols = [...callCols].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs md:text-sm">
        <caption className="sr-only">Option chain: calls on the left, puts on the right, by strike</caption>
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="colgroup" colSpan={callCols.length} className="px-2 py-1.5 text-center font-semibold text-series-1">Calls</th>
            <th scope="col" className="px-2 py-1.5" aria-hidden="true" />
            <th scope="colgroup" colSpan={putCols.length} className="px-2 py-1.5 text-center font-semibold text-series-2">Puts</th>
          </tr>
          <tr className="border-b border-border">
            {callCols.map(([label]) => <th key={`c-${label}`} scope="col" className={cn(CELL, 'font-medium')}>{label}</th>)}
            <th scope="col" className="bg-surface-subtle px-2 py-1.5 text-center font-semibold text-foreground">Strike</th>
            {putCols.map(([label]) => <th key={`p-${label}`} scope="col" className={cn(CELL, 'font-medium')}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const callItm = row.strike < spot;
            const isAtm = row.strike === atm;
            return (
              <tr key={row.strike} className={cn('border-b border-border/50', isAtm && 'border-y-2 border-y-accent')}>
                {callCols.map(([label, read]) => (
                  <td key={`c-${label}`} className={cn(CELL, callItm && 'bg-series-1/10')}>{read(row.call)}</td>
                ))}
                <th scope="row" className={cn('px-2 py-1.5 text-center font-semibold tabular-nums', isAtm ? 'bg-accent text-accent-foreground' : 'bg-surface-subtle')}>
                  {formatMoney(row.strike)}
                  {isAtm && <span className="sr-only"> (at the money)</span>}
                </th>
                {putCols.map(([label, read]) => (
                  <td key={`p-${label}`} className={cn(CELL, !callItm && row.strike !== spot && 'bg-series-2/10')}>{read(row.put)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChainSkeleton() {
  return (
    <div role="status" aria-label="Loading option chain" className="flex flex-col gap-3">
      <div className="h-24 rounded-lg bg-surface-subtle motion-safe:animate-pulse" />
      <div className="h-64 rounded-lg bg-surface-subtle motion-safe:animate-pulse" />
    </div>
  );
}

export default function OptionsChainPage() {
  const { symbol: rawSymbol } = useParams();
  return <OptionsChainView symbol={String(rawSymbol || '').toUpperCase()} />;
}

/**
 * The chain for one symbol. `embedded` is the stock page's Options tab: the
 * page title and the link back to the stock page are left to the host.
 */
export function OptionsChainView({ symbol, embedded = false }) {
  const isMobile = useIsMobileShell();
  const [expiration, setExpiration] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const chain = useQuery({
    queryKey: optionsChainKey(symbol, expiration),
    queryFn: () => getOptionsChain(symbol, expiration),
    staleTime: 60_000,
    retry: false,
    // Keep the current chain on screen while another expiration loads.
    placeholderData: keepPreviousData,
  });
  const data = chain.data;
  const errorCode = chain.error?.response?.data?.detail?.code;
  const visibleRows = data ? (showAll ? data.rows : nearSpotRows(data.rows, data.spot, NEAR_SPOT_STRIKES)) : [];
  const m = data?.metrics;

  return (
    <div className="tw flex flex-col gap-3 pb-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {!embedded && <h1 className="text-xl font-semibold text-balance">{symbol} options</h1>}
          <p className="text-sm text-pretty text-muted-foreground">
            {data ? (
              <>
                Spot <span className="font-medium text-foreground tabular-nums">{formatMoney(data.spot)}</span>
                {' '}({data.spot_source === 'cached_close' ? 'last close' : 'provider last price'})
                {' · '}fetched {new Date(data.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </>
            ) : 'Delayed option chain from Yahoo Finance'}
          </p>
        </div>
        <div className="flex items-end gap-3">
          {chain.isFetching && data && <LoaderCircle aria-label="Loading expiration" className="mb-3 size-4 animate-spin text-muted-foreground motion-reduce:animate-none" />}
          {data && (
            <ExpirationSelect
              expirations={data.expirations}
              value={data.expiration}
              asOf={data.as_of}
              onChange={(value) => { setExpiration(value); setShowAll(false); }}
            />
          )}
          {!embedded && (
            <Button asChild variant="secondary" size="sm" className="mb-0.5">
              <RouterLink to={`/stocks/${encodeURIComponent(symbol)}`}>Stock page</RouterLink>
            </Button>
          )}
        </div>
      </header>

      {chain.isPending && <ChainSkeleton />}

      {chain.isError && !data && (
        <Card role="alert" className="flex flex-col items-start gap-3 p-6">
          <h2 className="text-base font-semibold">Option chain unavailable</h2>
          <p className="text-sm text-pretty text-muted-foreground">
            {ERROR_TEXT[errorCode] ?? 'The option chain could not be loaded.'}
          </p>
          {errorCode !== 'invalid_symbol' && errorCode !== 'options_chain_unavailable' && (
            <Button variant="secondary" size="sm" onClick={() => chain.refetch()}>Retry</Button>
          )}
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{data.expiration} · {data.days_to_expiration} days</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="ATM IV" metric={m.atm_iv} format={formatIv} />
                <Metric label="Realized vol (20D)" metric={m.realized_volatility} format={formatIv} />
                <Metric label="IV − realized" metric={m.vrp} format={formatPoints} />
                <Metric label="25Δ put − call skew" metric={m.skew_25_delta} format={formatPoints} />
                <Metric label="Max pain" metric={m.max_pain} format={formatMoney} />
                <Metric label="Call / put volume" metric={m.call_put_volume_ratio} format={(value) => value.toFixed(2)} />
                <Metric label="Est. net GEX" metric={m.net_gex} format={formatCompact} hint="Model estimate: calls positive, puts negative. Not observed dealer positioning." />
                <Metric label="Est. gamma flip" metric={m.gamma_flip} format={formatMoney} />
                <Metric label="Est. call wall" metric={m.call_wall} format={formatMoney} />
                <Metric label="Est. put wall" metric={m.put_wall} format={formatMoney} />
                <Metric label="Volume / OI" metric={m.volume_oi_ratio} format={(value) => value.toFixed(2)} />
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Volatility smile</CardTitle></CardHeader>
              <CardContent><IvSmileChart rows={data.rows} spot={data.spot} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Estimated gamma exposure by strike</CardTitle></CardHeader>
              <CardContent><GexByStrikeChart gexByStrike={data.gex_by_strike} spot={data.spot} /></CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Chain</CardTitle>
              {data.rows.length > NEAR_SPOT_STRIKES && (
                <Button variant="ghost" size="sm" onClick={() => setShowAll((value) => !value)} aria-pressed={showAll}>
                  {showAll ? `Near spot (${NEAR_SPOT_STRIKES})` : `All ${data.rows.length} strikes`}
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-0 md:px-4">
              <ChainTable rows={visibleRows} spot={data.spot} compact={isMobile} />
            </CardContent>
          </Card>

          <p className="text-xs text-pretty text-muted-foreground">
            Delayed data. Δ from Black-Scholes on each contract&apos;s implied volatility
            {data.risk_free_rate != null ? ` with a ${formatIv(data.risk_free_rate)} rate (13-week T-bill)` : ''} and no dividend.
            GEX figures are model estimates, not observed dealer positions.
          </p>
        </>
      )}
    </div>
  );
}
