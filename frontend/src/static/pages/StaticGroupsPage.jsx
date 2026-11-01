import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  useStaticManifest,
  fetchStaticJson,
  resolveStaticMarketEntry,
  staticQueryOptions,
  useStaticGeneration,
  useStaticGroupsRRG,
  useStaticGroupMatrix,
} from '../dataClient';
import { useStaticChartIndex } from '../chartClient';
import StaticGroupDetailModal from '../StaticGroupDetailModal';
import RRGChart from '../../components/Charts/RRGChart';
import GroupViewTabs from '../../features/groups/GroupViewTabs';
import RankChange from '../../features/groups/RankChange';
import { DEFAULT_MATRIX_PREFERENCES } from '../../features/groups/matrix/groupMatrixModel';
import { useRRGScopeSelection } from '../../components/Charts/useRRGScopeSelection';
import TickerCell from '../../components/common/TickerCell';
import { useStaticMarket } from '../StaticMarketContext';
import {
  STATIC_GROUP_RANKING_COLUMNS,
  formatGroupRs,
} from '../../features/groups/groupRankingFields';
import { sortGroupRankings } from '../../features/groups/groupRankingSort';
import { GROUP_RS_TINT_CLASS, groupRsTone } from '../../features/groups/groupRsVisualEncoding';
import { PageSkeleton, TableSkeleton } from '../../components/common/LoadingSkeletons';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';

const GroupMatrixPanel = lazy(() => import('../../features/groups/matrix/GroupMatrixPanel'));

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };
const TH = 'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5';

function SortableTableCell({ field, label, description, align = 'left', orderBy, order, onSort }) {
  const active = orderBy === field;
  const Arrow = active && order === 'desc' ? ArrowDown : ArrowUp;
  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined} className={cn(TH, ALIGN[align])}>
      <button
        type="button"
        onClick={() => onSort(field)}
        title={description}
        className={cn('group inline-flex cursor-pointer items-center gap-0.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring', active && 'text-foreground')}
      >
        {label}
        <Arrow aria-hidden="true" className={cn('size-3', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')} />
      </button>
    </th>
  );
}

function StaticRankingCell({ row, column }) {
  const align = ALIGN[column.staticAlign || column.align] || 'text-left';

  if (column.kind === 'rank') {
    return <td className={cn(TD, align, 'font-semibold tabular-nums')}>{row.rank}</td>;
  }

  if (column.kind === 'group') {
    return <td className={TD}>{row.industry_group}</td>;
  }

  if (column.kind === 'rs') {
    const value = row[column.field];
    const tone = groupRsTone(value);
    return (
      <td data-rs-tone={tone} className={cn(TD, align, 'tabular-nums', GROUP_RS_TINT_CLASS[tone])}>
        {formatGroupRs(value)}
      </td>
    );
  }

  if (column.kind === 'integer') {
    return <td className={cn(TD, align, 'tabular-nums')}>{row[column.field]}</td>;
  }

  if (column.kind === 'rankChange') {
    return (
      <td className={cn(TD, align)}>
        <RankChange value={row[column.field]} />
      </td>
    );
  }

  return (
    <td className={cn(TD, align, 'text-xs')}>
      <TickerCell symbol={row.top_symbol} companyName={row.top_symbol_name} />
    </td>
  );
}

function MoversCard({ title, rows }) {
  return (
    <section className="h-full rounded-lg border border-border p-3">
      <h2 className="mb-1 text-[13px] font-semibold tracking-wide uppercase">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="col" className={cn(TH, 'text-left')}>Group</th>
              <th scope="col" className={cn(TH, 'text-right')}>Rank</th>
              <th scope="col" className={cn(TH, 'text-right')}>Change</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).slice(0, 5).map((row) => (
              <tr key={`${title}-${row.industry_group}`}>
                <td className={TD}>{row.industry_group}</td>
                <td className={cn(TD, 'text-right tabular-nums')}>{row.rank}</td>
                <td className={cn(TD, 'text-right')}><RankChange value={row.rank_change_1w} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GroupsTableView({ movers, moversPeriod, rankings, onSelectGroup }) {
  const [orderBy, setOrderBy] = useState('rank');
  const [order, setOrder] = useState('asc');
  const sortedRankings = useMemo(
    () => sortGroupRankings(rankings, orderBy, order),
    [rankings, orderBy, order],
  );

  const handleSort = (field) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <MoversCard title={`Top Gainers (${moversPeriod.toUpperCase()})`} rows={movers.gainers} />
        <MoversCard title={`Top Losers (${moversPeriod.toUpperCase()})`} rows={movers.losers} />
      </div>

      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-1 text-[13px] font-semibold tracking-wide uppercase">Current Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {STATIC_GROUP_RANKING_COLUMNS.map((column) => (
                  <SortableTableCell
                    key={column.field}
                    field={column.field}
                    label={column.staticLabel || column.label}
                    description={column.description}
                    align={column.staticAlign || column.align}
                    orderBy={orderBy}
                    order={order}
                    onSort={handleSort}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRankings.map((row) => (
                <tr
                  key={row.industry_group}
                  onClick={() => onSelectGroup(row.industry_group)}
                  tabIndex={0}
                  aria-label={`Open ${row.industry_group} detail`}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectGroup(row.industry_group);
                    }
                  }}
                  className="cursor-pointer outline-none hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {STATIC_GROUP_RANKING_COLUMNS.map((column) => (
                    <StaticRankingCell key={column.field} row={row} column={column} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function StaticGroupsPage() {
  const manifestQuery = useStaticManifest();
  const { selectedMarket } = useStaticMarket();
  const marketEntry = useMemo(
    () => resolveStaticMarketEntry(manifestQuery.data, selectedMarket),
    [manifestQuery.data, selectedMarket],
  );
  const { generation, dataRoot } = useStaticGeneration();
  const groupsQuery = useQuery(staticQueryOptions({
    key: ['staticGroups', marketEntry.pages?.groups?.path],
    generation,
    queryFn: () => fetchStaticJson(marketEntry.pages.groups.path, dataRoot),
    enabled: Boolean(marketEntry.pages?.groups?.path),
  }));
  const chartIndexQuery = useStaticChartIndex(marketEntry.assets?.charts?.path);
  const rrgQuery = useStaticGroupsRRG(marketEntry);
  const rrgAvailable = Boolean(marketEntry.assets?.groups_rrg?.path);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [view, setView] = useState('table');
  const [matrixPreferences, setMatrixPreferences] = useState(DEFAULT_MATRIX_PREFERENCES);
  const matrixAvailable = Boolean(marketEntry.assets?.groups_matrix?.path);
  const matrixQuery = useStaticGroupMatrix(marketEntry, view === 'matrix');
  useEffect(() => {
    setSelectedGroup(null);
    if (!matrixAvailable && view === 'matrix') setView('table');
  }, [selectedMarket, matrixAvailable, view]);
  const [rrgScope, setRrgScope] = useState('groups'); // 'groups' | 'sectors'
  const { availableScopes: availableRrgScopes } = useRRGScopeSelection({
    view,
    scope: rrgScope,
    setView,
    setScope: setRrgScope,
    rrgAvailable,
    bundle: rrgQuery.data,
  });

  if (manifestQuery.isLoading) {
    return (
      <PageSkeleton label="Loading group rankings" />
    );
  }

  if (manifestQuery.isError) {
    return <Notice tone="error" className="tw">Failed to load group rankings.</Notice>;
  }

  const payload = groupsQuery.data?.payload || {};
  const rankings = payload.rankings?.rankings || [];
  const movers = payload.movers || {};
  const moversPeriod = payload.movers_period || movers.period || '1w';
  const groupDetails = payload.group_details || {};

  return (
    <div className="tw text-foreground">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">
        {marketEntry.display_name} Group Rankings
      </h1>
      <p className="mb-4 text-xs text-muted-foreground">
        Latest ranking date:{' '}
        {groupsQuery.isLoading
          ? <span aria-hidden="true" className="inline-block h-3 w-20 rounded-sm bg-surface-subtle align-middle motion-safe:animate-pulse" />
          : `${payload.rankings?.date || '-'}.`}
      </p>

      <GroupViewTabs
          view={view}
          onView={setView}
          scope={rrgScope}
          onScope={setRrgScope}
          rrgAvailable={rrgAvailable}
          matrixAvailable={matrixAvailable}
          availableScopes={availableRrgScopes}
          className="mb-4"
        />

      <div role="tabpanel" id={`group-panel-${view}`} aria-labelledby={`group-tab-${view}`}>
      {view === 'matrix' ? (
        <Suspense fallback={<TableSkeleton label="Loading group matrix" />}>
          <GroupMatrixPanel key={selectedMarket} data={matrixQuery.data} isLoading={matrixQuery.isLoading}
            error={matrixQuery.error} onRetry={() => matrixQuery.refetch()}
            preferences={matrixPreferences} onPreferencesChange={setMatrixPreferences} />
        </Suspense>
      ) : view === 'rrg' ? (
        <RRGChart
          data={rrgQuery.data?.payload?.[rrgScope]}
          isLoading={rrgQuery.isLoading}
          error={rrgQuery.isError ? rrgQuery.error : null}
          onSelectGroup={(name) => rrgScope === 'groups' && setSelectedGroup(name)}
        />
      ) : groupsQuery.isLoading ? <TableSkeleton label="Loading group rankings" rows={12} columns={8} />
        : groupsQuery.isError ? <Notice tone="error">Failed to load group rankings.</Notice>
        : !groupsQuery.data?.available ? <Notice>{groupsQuery.data?.message || 'No group rankings are available.'}</Notice>
        : (
        <GroupsTableView
          movers={movers}
          moversPeriod={moversPeriod}
          rankings={rankings}
          onSelectGroup={setSelectedGroup}
        />
      )}

      </div>

      <StaticGroupDetailModal
        group={selectedGroup}
        detail={selectedGroup ? groupDetails[selectedGroup] : null}
        chartIndex={chartIndexQuery.data}
        open={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </div>
  );
}

export default StaticGroupsPage;
