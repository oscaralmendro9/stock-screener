import { FileText, LineChart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { THEME_STATUS_COLORS } from '../constants';
import { MomentumBar, VelocityIndicator } from './ThemeInsightsCards';
import { Pager, Pill, SortHeader, Spinner } from '../themeUi';
import { tdClass, thClass } from '../themeClasses';

const PAGE_SIZE = 50;
// THEME_STATUS_COLORS speaks MUI colour names; map them to pill tones.
const STATUS_TONE = { success: 'gain', error: 'loss', warning: 'warning', info: 'neutral', primary: 'neutral' };
const directionClass = (value, up, down) => (value >= up ? 'text-gain' : value <= down ? 'text-loss' : 'text-foreground');
const ICON = 'grid size-6 shrink-0 cursor-pointer place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';

export default function ThemesRankingsTable({
  isLoading,
  rankingsData,
  sortedRankings,
  orderBy,
  order,
  onSort,
  page,
  onPageChange,
  selectedPipeline,
  onSelectTheme,
  onOpenSources,
}) {
  if (isLoading) {
    return (
      <div className="tw flex min-h-[300px] items-center justify-center">
        <Spinner label="Loading theme rankings" />
      </div>
    );
  }

  const sortHeader = (field, label, align = 'left') => (
    <SortHeader label={label} align={align} active={orderBy === field} order={order} onSort={() => onSort(field)} />
  );

  return (
    <section className="tw rounded-lg border border-border bg-surface text-foreground">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h2 className="text-sm font-semibold">Theme Rankings</h2>
        {rankingsData && (
          <div className="flex items-center gap-2">
            <Pill>{selectedPipeline === 'technical' ? 'Technical' : 'Fundamental'}</Pill>
            <Pill tone="muted" className="tabular-nums">{`${rankingsData.total_themes} themes | ${rankingsData.date || 'Today'}`}</Pill>
          </div>
        )}
      </div>
      <div className="max-h-[calc(100vh-400px)] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {sortHeader('rank', '#')}
              <th scope="col" className={thClass()}>Theme</th>
              <th scope="col" className={thClass()}>Status</th>
              {sortHeader('momentum_score', 'Mom', 'center')}
              {sortHeader('mention_velocity', 'Vel', 'right')}
              {sortHeader('mentions_7d', '7D', 'right')}
              {sortHeader('basket_rs_vs_spy', 'RS', 'right')}
              {sortHeader('basket_return_1w', '1W', 'right')}
              {sortHeader('pct_above_50ma', '50MA', 'right')}
              <th scope="col" className={thClass('right')}>#</th>
              <th scope="col" className={thClass()}>Tickers</th>
            </tr>
          </thead>
          <tbody>
            {sortedRankings.map((row) => (
              <tr key={row.theme} className="hover:bg-surface-subtle">
                <td className={cn(tdClass, 'text-[11px] tabular-nums', row.rank <= 5 ? 'font-bold text-accent' : 'font-semibold')}>{row.rank}</td>
                <td className={cn(tdClass, 'max-w-[180px] overflow-hidden')}>
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="flex-1 truncate font-medium" title={row.theme}>{row.theme}</span>
                    <button
                      type="button"
                      title="Open sources"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenSources({ id: row.theme_cluster_id, name: row.theme });
                      }}
                      aria-label={`Open sources for ${row.theme}`}
                      className={ICON}
                    >
                      <FileText aria-hidden="true" className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="View details"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectTheme({ id: row.theme_cluster_id, name: row.theme });
                      }}
                      aria-label={`View details for ${row.theme}`}
                      className={ICON}
                    >
                      <LineChart aria-hidden="true" className="size-3.5" />
                    </button>
                  </span>
                  {row.first_seen && (
                    <span className="block text-[11px] text-muted-foreground">Since {new Date(row.first_seen).toLocaleDateString()}</span>
                  )}
                </td>
                <td className={tdClass}>
                  <Pill tone={STATUS_TONE[THEME_STATUS_COLORS[row.status]] || 'muted'} className="h-5">{row.status}</Pill>
                </td>
                <td className={cn(tdClass, 'text-center')}><MomentumBar score={row.momentum_score} /></td>
                <td className={cn(tdClass, 'text-right')}><VelocityIndicator velocity={row.mention_velocity} /></td>
                <td className={cn(tdClass, 'text-right tabular-nums')}>{row.mentions_7d}</td>
                <td className={cn(tdClass, 'text-right font-semibold tabular-nums', directionClass(row.basket_rs_vs_spy, 60, 40))}>
                  {row.basket_rs_vs_spy?.toFixed(0)}
                </td>
                <td className={cn(tdClass, 'text-right tabular-nums', row.basket_return_1w > 0 ? 'text-gain' : row.basket_return_1w < 0 ? 'text-loss' : 'text-foreground')}>
                  {row.basket_return_1w > 0 ? '+' : ''}
                  {row.basket_return_1w?.toFixed(1)}%
                </td>
                <td className={cn(tdClass, 'text-right tabular-nums', directionClass(row.pct_above_50ma, 70, 30))}>
                  {row.pct_above_50ma?.toFixed(0)}%
                </td>
                <td className={cn(tdClass, 'text-right tabular-nums')}>{row.num_constituents}</td>
                <td className={tdClass}>
                  <span className="flex flex-nowrap gap-0.5">
                    {row.top_tickers?.slice(0, 8).map((ticker) => (
                      <span key={ticker} className="rounded-sm bg-surface-subtle px-1 text-[11px] font-semibold">{ticker}</span>
                    ))}
                    {row.top_tickers?.length > 8 && (
                      <span className="text-[11px] text-muted-foreground">+{row.top_tickers.length - 8}</span>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border">
        <Pager page={page} pageSize={PAGE_SIZE} total={rankingsData?.total_themes || 0} onPage={onPageChange} />
      </div>
    </section>
  );
}
