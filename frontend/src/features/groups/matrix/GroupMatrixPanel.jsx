import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/ui/button';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';
import { buildMatrixModel, groupLabel, sectorLabel } from './groupMatrixModel';
import { MATRIX_METRICS, matrixColor, matrixLegend } from './groupMatrixColors';
import GroupMatrixLayouts from './GroupMatrixLayouts';
import GroupMatrixDetails from './GroupMatrixDetails';
import GroupMatrixTileInspector from './GroupMatrixTileInspector';
import { TableSkeleton } from '../../../components/common/LoadingSkeletons';
const EMPTY_STOCKS = [];
const UNAVAILABLE = {
  missing_ibd_mappings: 'IBD classifications are not available for this market yet.',
  no_published_run: 'No published daily stock snapshot is available yet.',
  no_feature_rows: 'The published snapshot has no stock features.',
  publication_identity_mismatch: 'The stock snapshot could not be matched to a consistent publication.',
};
const TOGGLE = 'h-11 cursor-pointer px-3 text-xs font-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none md:h-8';
function MatrixLegend({ metric }) {
  const {values, labels} = matrixLegend(metric);
  return <div aria-label={`${MATRIX_METRICS[metric].label} color legend`} className="my-2 flex flex-wrap gap-0.5 text-[11px] tabular-nums">
    {values.map((value, i) => <span key={value} className="rounded-xs px-2 py-1 text-white"
      style={{ backgroundColor: matrixColor(value, metric).backgroundColor }}>{labels[i]}</span>)}
    <span className="px-2 py-1">— Missing</span>
  </div>;
}
export default function GroupMatrixPanel({ data, isLoading, error, onRetry, preferences, onPreferencesChange }) {
  const [sector, setSector] = useState('');
  const [group, setGroup] = useState('');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState(null);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const triggerRef = useRef(null);
  const listButtonRef = useRef(null);
  const stocks = data?.stocks || EMPTY_STOCKS;
  const visibleTiers = useMemo(() => (data?.tiers || []).filter(t => preferences.tiers.includes(t.id)), [data?.tiers, preferences.tiers]);
  const model = useMemo(() => buildMatrixModel(stocks, {sector, group, search, tiers: preferences.tiers}), [stocks, sector, group, search, preferences.tiers]);
  const sectors = useMemo(() => [...new Set(stocks.map(s => sectorLabel(s.sector)))].sort(), [stocks]);
  const groups = useMemo(() => [...new Set(stocks.filter(s => !sector || sectorLabel(s.sector) === sector).map(s => groupLabel(s.ibd_industry_group)))].sort(), [stocks, sector]);
  const update = next => onPreferencesChange({ ...preferences, ...next });
  const open = useCallback(value => {
    if (!selection) triggerRef.current = document.activeElement;
    setSelection(value);
  }, [selection]);
  const selectStock = useCallback(stock => open({stock}), [open]);
  const close = () => {
    setSelection(null);
    const target = triggerRef.current?.isConnected ? triggerRef.current : listButtonRef.current;
    setTimeout(() => target?.focus(), 0);
  };
  if (isLoading) return <TableSkeleton label="Loading group matrix" />;
  if (error) return <Notice tone="error" className="tw" action={<Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}>Failed to load the stock matrix.</Notice>;
  if (!data?.available) return <Notice className="tw">{UNAVAILABLE[data?.reason] || 'Matrix data is not available in this snapshot.'}</Notice>;
  const coverage = data.coverage;
  return <section className="tw min-w-0 rounded-lg border border-border bg-surface p-2 text-foreground sm:p-4">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><h2 className="text-lg font-bold">{data.market} Stock Matrix</h2>
        <p className="text-[11px] text-muted-foreground">Sector · IBD industry · market cap in USD</p></div>
      <div className="flex flex-wrap items-end gap-2">
        <div role="group" aria-label="Matrix layout" className="flex overflow-hidden rounded-md border border-border">
          {[['grid', 'Grid'], ['clusters', 'Clusters']].map(([value, label]) => <button key={value} type="button"
            aria-pressed={preferences.layout === value} onClick={() => update({layout:value})}
            className={cn(TOGGLE, preferences.layout === value ? 'bg-surface-subtle font-semibold text-foreground' : 'bg-surface text-muted-foreground hover:text-foreground')}>{label}</button>)}
        </div>
        <NativeSelect label="Color" value={preferences.metric} onChange={metric => update({metric})} className="w-40">
          {Object.entries(MATRIX_METRICS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </NativeSelect>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <NativeSelect label="Sector" value={sector} className="w-44" onChange={next => {
        setSector(next);
        if (group && !stocks.some(s => (!next || sectorLabel(s.sector) === next) && groupLabel(s.ibd_industry_group) === group)) setGroup('');
      }}><option value="">All sectors</option>{sectors.map(v => <option key={v} value={v}>{v}</option>)}</NativeSelect>
      <NativeSelect label="IBD industry" value={group} onChange={setGroup} className="w-52 max-w-full">
        <option value="">All IBD groups</option>{groups.map(v => <option key={v} value={v}>{v}</option>)}</NativeSelect>
      <label className="flex min-w-52 flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-medium text-muted-foreground">Search symbol or company</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-surface px-2.5 font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8" />
      </label>
      <Button variant="ghost" size="sm" onClick={() => {setSector(''); setGroup(''); setSearch(''); update({tiers:data.tiers.map(t=>t.id)});}}>Reset filters</Button>
    </div>
    <div role="group" aria-label="Market cap tiers" className="my-3 flex flex-wrap gap-1.5">
      {data.tiers.map(tier => {
        const on = preferences.tiers.includes(tier.id);
        return <button key={tier.id} type="button" aria-pressed={on}
          onClick={() => update({tiers:on ? preferences.tiers.filter(t=>t!==tier.id) : [...preferences.tiers,tier.id]})}
          className={cn(TOGGLE, 'rounded-full border', on ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface text-foreground hover:bg-surface-subtle')}>{tier.label}</button>;
      })}
    </div>
    <p className="text-[11px] text-muted-foreground">Daily data: {data.as_of_date} · Metadata read: {data.metadata_read_at?.slice(0,10)} · Latest stored metadata, not intraday quotes</p>
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm tabular-nums" aria-live="polite">{model.stockCount.toLocaleString()} shown / {coverage.stock_count.toLocaleString()} stocks · IBD coverage {coverage.stock_count ? Math.round(coverage.ibd_mapped_count / coverage.stock_count * 100) : 0}%</p>
      <Button variant="ghost" size="sm" onClick={() => setCoverageOpen(v=>!v)} aria-expanded={coverageOpen}>Data coverage</Button>
      <Button variant="ghost" size="sm" ref={listButtonRef} onClick={() => open({title:'Matching stocks · current filters', stocks:model.stocks})}>View matching stocks</Button>
    </div>
    {coverageOpen && <Notice className="my-2">Universe: {coverage.universe_count}; missing features: {coverage.missing_feature_count || 0}; unknown sector: {coverage.unknown_sector_count || 0}; unknown cap: {coverage.unknown_cap_count || 0}; missing daily change: {coverage.missing_daily_change_count || 0}; missing weekly change: {coverage.missing_weekly_change_count ?? stocks.filter(stock=>!Number.isFinite(stock.price_change_1w)).length}; missing monthly change: {coverage.missing_monthly_change_count ?? stocks.filter(stock=>!Number.isFinite(stock.price_change_1m)).length}; missing RS: {coverage.missing_rs_count || 0}. Counts can overlap. Automated IBD mappings are estimates; inspect stock details for source.</Notice>}
    <MatrixLegend metric={preferences.metric} />
    {model.stockCount ? <GroupMatrixTileInspector stocks={model.stocks} data={data}><GroupMatrixLayouts layout={preferences.layout} model={model} tiers={visibleTiers} metric={preferences.metric} onSelectStock={selectStock} onSelectStocks={open} /></GroupMatrixTileInspector>
      : <Notice>No stocks match these filters. Reset filters to see the full matrix.</Notice>}
    <GroupMatrixDetails selection={selection} onClose={close} onSelectStock={stock=>setSelection({stock})} onSelectStocks={setSelection} matchingStocks={model.stocks} data={data} />
  </section>;
}
