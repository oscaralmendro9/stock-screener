import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';

import {
  getSocialContext, getSocialEvidence, getSocialQueue, getSocialUnresolved,
  socialQueueKey,
} from '../../api/socialSignals';
import ChartViewerModal from '../../components/Scan/ChartViewerModalLazy';
import { useMarket } from '../../contexts/MarketContext';
import SocialEvidenceDrawer from './SocialEvidenceDrawer';
import { isSocialSignalMarket, SOCIAL_SIGNAL_MARKETS_COPY } from './socialSignalMarkets';
import SocialSignalsTable from './SocialSignalsTable';
import { socialFreshnessLabel, visibleSocialRows } from './socialSignalPresentation';

const EMPTY = [];
const FILTERS = [
  ['source', 'Source'], ['theme', 'Theme'], ['instrument', 'Instrument'],
  ['state', 'State'], ['ticker', 'Ticker'],
];

const unavailableCopy = {
  no_published_run: 'The first Social Signal run is still warming up. Saved results will appear after publication.',
  social_signals_disabled: 'Social Signals are not enabled for this installation.',
  reauthentication_required: 'X access needs attention. An administrator can reauthenticate the provider in Operations.',
};

export default function SocialSignalsTab() {
  const navigate = useNavigate();
  const { selectedMarket } = useMarket();
  const market = selectedMarket || 'US';
  const marketSupported = isSocialSignalMarket(market);
  const [window, setWindow] = useState('7d');
  const [view, setView] = useState('actionable');
  const [rankMode, setRankMode] = useState('blended');
  const [page, setPage] = useState(1);
  const [contextPage, setContextPage] = useState(1);
  const [unresolvedPage, setUnresolvedPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [chartOpen, setChartOpen] = useState(false);
  const controls = { market, window, view, rankMode, page, pageSize: 50, filters };
  const queueQuery = useQuery({
    queryKey: socialQueueKey(controls), queryFn: () => getSocialQueue(controls),
    staleTime: 60_000, enabled: marketSupported,
  });
  const contextQuery = useQuery({
    queryKey: ['socialSignals', 'context', market, window, contextPage],
    queryFn: () => getSocialContext({ market, window, page: contextPage, pageSize: 50 }),
    enabled: marketSupported && view === 'all',
  });
  const unresolvedQuery = useQuery({
    queryKey: ['socialSignals', 'unresolved', 'global', window, unresolvedPage],
    queryFn: () => getSocialUnresolved({ market, window, page: unresolvedPage, pageSize: 50 }),
    enabled: marketSupported && view === 'all',
  });
  const evidenceQuery = useQuery({
    queryKey: ['socialSignals', 'evidence', selected?.candidate_key, window],
    queryFn: () => getSocialEvidence(selected.candidate_key, window),
    enabled: marketSupported && Boolean(selected),
  });
  const rows = useMemo(
    () => visibleSocialRows(queueQuery.data?.items || EMPTY, filters),
    [filters, queueQuery.data?.items],
  );
  const visibleSymbols = useMemo(
    () => [...new Set(rows.filter((row) => row.market && row.canonical_symbol)
      .map((row) => row.canonical_symbol))], [rows],
  );
  const selectControl = (setter, value) => { setter(value); setPage(1); };
  const scanVisible = () => {
    const params = new URLSearchParams({ market, symbols: visibleSymbols.join(',') });
    navigate({ pathname: '/scan', search: `?${params.toString()}` });
  };

  return (
    <div className="tw h-full overflow-auto p-2 text-foreground">
      <section className="mb-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-col justify-between gap-2 lg:flex-row">
          <div>
            <h2 className="text-lg font-semibold">Social Signal Queue</h2>
            <p className="text-sm text-muted-foreground">
              X-list attention ranked with frozen setup, relative-strength, group, Theme, and Market confirmation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {['1d', '7d', '14d'].map((value) => (
              <Toggle key={value} on={window === value} onClick={() => selectControl(setWindow, value)}>{value.toUpperCase()}</Toggle>
            ))}
            <Toggle on={view === 'actionable'} onClick={() => selectControl(setView, 'actionable')}>Actionable</Toggle>
            <Toggle on={view === 'all'} onClick={() => selectControl(setView, 'all')}>All Signals</Toggle>
            <Toggle on={rankMode === 'blended'} onClick={() => selectControl(setRankMode, 'blended')}>Blended</Toggle>
            <Toggle on={rankMode === 'pure_social'} onClick={() => selectControl(setRankMode, 'pure_social')}>Pure Social</Toggle>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {FILTERS.map(([key, label]) => (
            <label key={key} className="flex w-[135px] flex-col gap-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              <input
                value={filters[key] || ''}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, [key]: event.target.value }));
                  setPage(1);
                }}
                className="h-11 rounded-md border border-border bg-surface px-2 font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8"
              />
            </label>
          ))}
        </div>
      </section>

      {!marketSupported ? <Notice>{SOCIAL_SIGNAL_MARKETS_COPY}</Notice> : null}
      {marketSupported && queueQuery.isLoading ? (
        <div className="py-16 text-center">
          <span role="progressbar" aria-label="Loading Social Signals" className="inline-block size-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
        </div>
      ) : null}
      {queueQuery.isError ? (
        <Notice tone="error">
          {queueQuery.error?.response?.status === 401 ? 'Your session expired. Sign in again.' : 'Social Signals could not be loaded.'}
        </Notice>
      ) : null}
      {queueQuery.data?.available === false ? (
        queueQuery.data.latest_attempt
          ? <LatestAttemptPanel attempt={queueQuery.data.latest_attempt}
              onOpenOperations={() => navigate('/operations#sources')} />
          : <Notice>
              {unavailableCopy[queueQuery.data.reason_code] || 'Social Signals are temporarily unavailable.'}
            </Notice>
      ) : null}
      {queueQuery.data?.available ? (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="tabular-nums">{queueQuery.data.total} published candidates</span>
            <span className={queueQuery.data.stale ? 'text-warning' : 'text-gain'}>
              {socialFreshnessLabel(queueQuery.data)}
            </span>
            <span>Formula {queueQuery.data.items?.[0]?.formula_version || '—'}</span>
            <Button variant="ghost" size="sm" disabled={!visibleSymbols.length} onClick={scanVisible}>Send visible to Scan</Button>
          </div>
          {!rows.length ? <Notice className="mb-2">No signals match these controls.</Notice> : null}
          <SocialSignalsTable items={rows} window={window} onSelect={setSelected} />
          {view === 'all' ? <>
            <SocialSignalsTable title="Context" items={contextQuery.data?.items || EMPTY}
              window={window} onSelect={setSelected} />
            <SectionPager page={contextPage} total={contextQuery.data?.total || 0}
              onPage={setContextPage} label="Context" />
            <SocialSignalsTable title="Needs resolution" items={unresolvedQuery.data?.items || EMPTY}
              window={window} onSelect={setSelected} />
            <SectionPager page={unresolvedPage} total={unresolvedQuery.data?.total || 0}
              onPage={setUnresolvedPage} label="Needs resolution" />
          </> : null}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <span className="text-[11px] tabular-nums">Page {page}</span>
            <Button variant="ghost" size="sm" disabled={page * 50 >= queueQuery.data.total}
              onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </>
      ) : null}
      <SocialEvidenceDrawer open={Boolean(selected)} onClose={() => setSelected(null)}
        selected={selected} query={evidenceQuery} onOpenChart={() => setChartOpen(true)}
        onOpenTheme={(themeId) => navigate(`/themes?theme=${encodeURIComponent(themeId)}`)}
        onScan={scanVisible} />
      <ChartViewerModal open={chartOpen} onClose={() => setChartOpen(false)}
        initialSymbol={selected?.canonical_symbol} scanId={null}
        navigationSymbolsOverride={visibleSymbols}
        currentPageResults={rows.map((row) => ({ ...row, symbol: row.canonical_symbol }))} />
    </div>
  );
}

function Toggle({ on, onClick, children }) {
  return (
    <Button variant={on ? 'primary' : 'secondary'} size="sm" aria-pressed={on} onClick={onClick}>
      {children}
    </Button>
  );
}

const attemptReasonCopy = {
  daily_limit_exhausted: 'Daily X read budget used up',
  incremental_gap_suspected: 'More posts than one read covers; some older posts were not read',
  provider_error: 'Provider error',
  provider_network_error: 'Network error after one retry',
  provider_timeout: 'Provider timed out after one retry',
  provider_unavailable: 'Provider unavailable',
  rate_limited: 'Rate limited',
  reauthentication_required: 'X authentication needs attention',
};

function LatestAttemptPanel({ attempt, onOpenOperations }) {
  const collectionFailed = attempt.status === 'collection_failed';
  const analysisFailed = attempt.status === 'failed';
  const title = collectionFailed
    ? 'Latest collection did not publish'
    : analysisFailed
      ? 'Latest analysis failed'
    : attempt.status === 'processing'
      ? 'Posts collected; analysis is in progress'
      : 'First collection is in progress';
  return (
    <Notice tone={collectionFailed || analysisFailed ? 'error' : 'info'} className="mb-3 items-start">
      <p className="font-semibold">{title}</p>
      <p className="mb-2 text-sm">Started {new Date(attempt.started_at).toLocaleString()}</p>
      <div className="flex flex-col gap-1.5">
        {(attempt.sources || []).map((source) => {
          const collected = source.read_status === 'success';
          const status = collected ? 'Collected' : source.read_status === 'failed' ? 'Failed' : 'Waiting';
          const count = source.received_count == null ? '—' : source.received_count;
          const limited = source.history_status === 'warming_up'
            || (source.reason_codes || []).includes('bounded_provider_read');
          const reasons = (source.reason_codes || [])
            .filter((reason) => reason !== 'bounded_provider_read')
            .map((reason) => attemptReasonCopy[reason] || reason.replaceAll('_', ' '));
          return (
            <div key={source.name} className="rounded-md border border-border p-2">
              <p className="text-sm font-semibold">{source.name}</p>
              <p className="text-sm tabular-nums">{status} · {count} posts</p>
              {limited ? <p className="text-[11px] text-warning">Limited history</p> : null}
              {reasons.map((reason) => (
                <p key={reason} className={source.read_status === 'failed' ? 'text-[11px] text-loss' : 'text-[11px] text-muted-foreground'}>{reason}</p>
              ))}
            </div>
          );
        })}
      </div>
      {collectionFailed ? <p className="mt-2 text-sm">Analysis did not start because no enabled list collected successfully.</p> : null}
      {analysisFailed ? <p className="mt-2 text-sm">Collected posts were not published because analysis failed. Review and retry failed work in Operations.</p> : null}
      <Button variant="secondary" size="sm" className="mt-2" onClick={onOpenOperations}>Open Operations</Button>
    </Notice>
  );
}

function SectionPager({ page, total, onPage, label }) {
  if (total <= 50 && page === 1) return null;
  return (
    <div className="-mt-2 mb-4 flex items-center justify-end gap-2">
      <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => onPage(page - 1)}>
        Previous {label}
      </Button>
      <span className="text-[11px] tabular-nums">Page {page}</span>
      <Button variant="ghost" size="sm" disabled={page * 50 >= total} onClick={() => onPage(page + 1)}>
        Next {label}
      </Button>
    </div>
  );
}
