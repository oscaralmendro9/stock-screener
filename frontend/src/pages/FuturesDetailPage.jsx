import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ChevronLeft, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Change } from '@/ui/change';
import { getCotHistory } from '../api/cot';
import { futuresKeys, getFuturesDashboard, getFuturesHistory } from '../api/futures';
import ChartSkeleton from '../components/Charts/ChartSkeleton';
import { useIsMobileShell } from '../components/Layout/shellNav';
import { CotCell, TrendBadge } from '../features/futures/FuturesMarks';
import { formatFuturesPrice, formatPercent } from '../features/futures/format';

const CandlestickChart = lazy(() => import('../components/Charts/CandlestickChart'));
const CotPositioningChart = lazy(() => import('../features/cot/CotPositioningChart'));

const PERIODS = [
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
];

function PeriodToggle({ value, onChange }) {
  return (
    <div role="group" aria-label="Chart period" className="flex gap-1">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          aria-pressed={value === period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            'h-11 min-w-11 cursor-pointer rounded-md px-2 text-sm tabular-nums outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-8 md:min-w-9',
            value === period.value
              ? 'bg-accent/15 font-semibold text-foreground'
              : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function CotSection({ slug }) {
  const [hidden, setHidden] = useState([]);
  const history = useQuery({
    queryKey: ['futures', 'cot', slug],
    queryFn: () => getCotHistory(slug, '1y'),
    staleTime: 60_000,
    retry: false,
  });
  if (history.isPending) return <ChartSkeleton height={320} />;
  if (history.isError) {
    return <p className="text-sm text-muted-foreground">CFTC positioning is not available yet.</p>;
  }
  const participants = history.data.weeks[0]?.positions ?? [];
  const visible = participants.map((item) => item.participant).filter((item) => !hidden.includes(item));
  return (
    <Suspense fallback={<ChartSkeleton height={320} />}>
      <CotPositioningChart
        history={history.data}
        mode="net"
        participant={history.data.focal_participant}
        visibleParticipants={visible}
        onToggleParticipant={(participant) => setHidden((current) => (
          current.includes(participant) ? current.filter((item) => item !== participant) : [...current, participant]
        ))}
      />
    </Suspense>
  );
}

export default function FuturesDetailPage() {
  const { symbol: rawSymbol } = useParams();
  const root = String(rawSymbol || '').toUpperCase().replace(/=F$/, '');
  const isMobile = useIsMobileShell();
  const [period, setPeriod] = useState('1y');

  // The dashboard payload holds this contract's metrics and COT summary.
  const dashboard = useQuery({ queryKey: futuresKeys.dashboard, queryFn: getFuturesDashboard, staleTime: 60_000 });
  const history = useQuery({
    queryKey: futuresKeys.history(root, period),
    queryFn: () => getFuturesHistory(root, period),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const contract = dashboard.data?.categories
    ?.flatMap((group) => group.contracts)
    .find((item) => item.root === root);
  const m = contract?.metrics;
  const name = contract?.name ?? history.data?.name ?? root;
  const unknown = history.error?.response?.data?.detail?.code === 'futures_contract_unknown'
    || (dashboard.data && !contract);

  return (
    <div className="tw flex flex-col gap-3 pb-4">
      <RouterLink to="/futures" className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:h-8">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Futures
      </RouterLink>

      {unknown ? (
        <Card className="flex flex-col items-start gap-3 p-6">
          <h1 className="text-base font-semibold">{root} is not a tracked futures contract</h1>
          <Button asChild variant="secondary"><RouterLink to="/futures">See all futures</RouterLink></Button>
        </Card>
      ) : (
        <>
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-balance">{name}</h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold tabular-nums">{root}</span>
                {contract && <> · {contract.exchange} · front-month continuous</>}
              </p>
            </div>
            {m && (
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold tabular-nums">{formatFuturesPrice(m.last)}</span>
                <Change value={m.change_1d} />
                <span className="text-xs text-muted-foreground tabular-nums">{m.as_of}</span>
              </div>
            )}
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Price</CardTitle>
              <PeriodToggle value={period} onChange={setPeriod} />
            </CardHeader>
            <CardContent>
              {history.isPending && <ChartSkeleton height={isMobile ? 300 : 420} />}
              {history.isError && (
                <div role="alert" className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <TriangleAlert aria-hidden="true" className="size-4" />
                  No cached prices for {root} yet. They load with the next futures refresh.
                </div>
              )}
              {history.data && (
                <Suspense fallback={<ChartSkeleton height={isMobile ? 300 : 420} />}>
                  <CandlestickChart
                    symbol={history.data.symbol}
                    priceData={history.data.bars}
                    period={period}
                    height={isMobile ? 300 : 420}
                  />
                </Suspense>
              )}
            </CardContent>
          </Card>

          {m && (
            <Card>
              <CardHeader><CardTitle>Performance and trend</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-6">
                  <Stat label="1 week"><Change value={m.change_1w} /></Stat>
                  <Stat label="1 month"><Change value={m.change_1m} /></Stat>
                  <Stat label="3 months"><Change value={m.change_3m} /></Stat>
                  <Stat label="Year to date"><Change value={m.change_ytd} /></Stat>
                  <Stat label="52W high">{formatFuturesPrice(m.high_52w)}</Stat>
                  <Stat label="52W low">{formatFuturesPrice(m.low_52w)}</Stat>
                  <Stat label="50-session average">{formatFuturesPrice(m.sma_50)}</Stat>
                  <Stat label="200-session average">{formatFuturesPrice(m.sma_200)}</Stat>
                  <Stat label="Trend"><TrendBadge trend={m.trend} /></Stat>
                  <Stat label="Realized vol (20D)">{formatPercent(m.realized_vol_20d)}</Stat>
                </dl>
              </CardContent>
            </Card>
          )}

          {contract?.cot_slug && (
            <Card>
              <CardHeader>
                <CardTitle>CFTC positioning</CardTitle>
                <CotCell cot={contract.cot} />
              </CardHeader>
              <CardContent>
                <CotSection slug={contract.cot_slug} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
