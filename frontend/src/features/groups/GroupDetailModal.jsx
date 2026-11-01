import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';

import { getGroupDetail } from '../../api/groups';
import GroupChartsGrid from '../../components/Charts/GroupChartsGrid';
import PriceSparkline from '../../components/Scan/PriceSparkline';
import RSSparkline from '../../components/Scan/RSSparkline';
import RankChange from './RankChange';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AXIS = { stroke: 'var(--border)', tick: { fill: 'var(--muted-foreground)', fontSize: 11 }, tickLine: false };
const TH = 'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-1.5 font-medium text-muted-foreground';
const TD = 'border-b border-border px-2 py-1 tabular-nums';
const RANK_CHANGES = [
  { label: '1 Week', key: 'rank_change_1w' },
  { label: '1 Month', key: 'rank_change_1m' },
  { label: '3 Months', key: 'rank_change_3m' },
  { label: '6 Months', key: 'rank_change_6m' },
];

const signedPercent = (value) => (
  value != null ? `${value > 0 ? '+' : ''}${value.toFixed(0)}%` : '-'
);
const directionClass = (value) => (
  value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-muted-foreground'
);

function RankTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold tabular-nums">{point.date}</p>
      <p className="tabular-nums">Rank: {point.rank}</p>
    </div>
  );
}

function Stat({ value, label, small = false }) {
  return (
    <div className="text-center">
      <p className={cn('font-semibold tabular-nums', small ? 'text-base' : 'text-2xl')}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading group detail" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-md bg-surface-subtle motion-safe:animate-pulse" />)}
      </div>
      <div className="h-56 rounded-md bg-surface-subtle motion-safe:animate-pulse" />
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-6 rounded bg-surface-subtle motion-safe:animate-pulse" />)}
    </div>
  );
}

export function GroupDetailOverview({ detail }) {
  // Oldest first for the chart.
  const chartData = detail.history
    ? [...detail.history].reverse().map((item) => {
      const d = new Date(item.date);
      return {
        date: item.date,
        rank: item.rank,
        displayDate: `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
      };
    })
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={detail.current_rank} label="Current Rank" />
        <Stat value={detail.current_avg_rs?.toFixed(1)} label="Avg RS Rating" />
        <Stat value={detail.num_stocks} label="Stocks" />
        <Stat
          small
          value={detail.top_symbol || '-'}
          label={`Top Stock (RS: ${detail.top_rs_rating?.toFixed(1) || '-'})`}
        />
      </div>

      {chartData.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold">Rank History (1 Year)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  {...AXIS}
                  interval={Math.floor(chartData.length / 6)}
                />
                <YAxis
                  {...AXIS}
                  width={32}
                  scale="log"
                  domain={[1, 200]}
                  reversed
                  ticks={[1, 5, 10, 20, 50, 100, 197]}
                />
                <Tooltip content={<RankTooltip />} cursor={{ stroke: 'var(--border)' }} />
                <ReferenceLine y={20} stroke="var(--gain)" strokeDasharray="3 3" strokeOpacity={0.6} />
                <ReferenceLine y={177} stroke="var(--loss)" strokeDasharray="3 3" strokeOpacity={0.6} />
                <Line
                  type="monotone"
                  dataKey="rank"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-1 text-sm font-semibold">Rank Changes</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RANK_CHANGES.map(({ label, key }) => (
            <div key={key} className="flex flex-col items-center rounded-md bg-surface-subtle p-2">
              <RankChange value={detail[key]} className="text-sm" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {detail.stocks?.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold">Constituent Stocks ({detail.stocks.length})</h3>
          <div className="max-h-[300px] overflow-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th scope="col" className={cn(TH, 'text-left')}>Sym</th>
                  <th scope="col" className={cn(TH, 'text-center')}>Price 30d</th>
                  <th scope="col" className={cn(TH, 'text-center')}>RS 30d</th>
                  {['Price', 'RS', '1M', '3M', 'EPS Q', 'EPS Y', 'Sls Q', 'Sls Y'].map((label) => (
                    <th key={label} scope="col" className={cn(TH, 'text-right')}>{label}</th>
                  ))}
                  <th scope="col" className={cn(TH, 'text-center')}>Stg</th>
                </tr>
              </thead>
              <tbody>
                {detail.stocks.map((stock) => (
                  <tr key={stock.symbol}>
                    <td className={cn(TD, 'font-semibold')}>{stock.symbol}</td>
                    <td className={cn(TD, 'px-0.5 text-center')}>
                      <PriceSparkline
                        data={stock.price_sparkline_data}
                        trend={stock.price_trend}
                        change1d={stock.price_change_1d}
                        width={80}
                        height={22}
                        showChange={false}
                      />
                    </td>
                    <td className={cn(TD, 'px-0.5 text-center')}>
                      <RSSparkline
                        data={stock.rs_sparkline_data}
                        trend={stock.rs_trend}
                        width={60}
                        height={20}
                      />
                    </td>
                    <td className={cn(TD, 'text-right')}>{stock.price?.toFixed(2) || '-'}</td>
                    <td className={cn(TD, 'text-right font-semibold')}>{stock.rs_rating?.toFixed(0) || '-'}</td>
                    <td className={cn(TD, 'text-right')}>{stock.rs_rating_1m?.toFixed(0) || '-'}</td>
                    <td className={cn(TD, 'text-right')}>{stock.rs_rating_3m?.toFixed(0) || '-'}</td>
                    {['eps_growth_qq', 'eps_growth_yy', 'sales_growth_qq', 'sales_growth_yy'].map((field) => (
                      <td key={field} className={cn(TD, 'text-right', directionClass(stock[field]))}>
                        {signedPercent(stock[field])}
                      </td>
                    ))}
                    <td className={cn(TD, 'text-center')}>
                      <Badge tone={stock.stage === 2 ? 'accent' : 'neutral'}>S{stock.stage || '-'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {detail.history?.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold">Rank History</h3>
          <div className="max-h-[180px] overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th scope="col" className={cn(TH, 'text-left')}>Date</th>
                  <th scope="col" className={cn(TH, 'text-right')}>Rank</th>
                  <th scope="col" className={cn(TH, 'text-right')}>Avg RS</th>
                  <th scope="col" className={cn(TH, 'text-right')}>Stocks</th>
                </tr>
              </thead>
              <tbody>
                {detail.history.slice(0, 20).map((row) => (
                  <tr key={row.date}>
                    <td className={TD}>{row.date}</td>
                    <td className={cn(TD, 'text-right')}>{row.rank}</td>
                    <td className={cn(TD, 'text-right')}>{row.avg_rs_rating?.toFixed(1)}</td>
                    <td className={cn(TD, 'text-right')}>{row.num_stocks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function GroupDetailModal({ group, market, open, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!open) setActiveTab('overview');
  }, [open]);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['groupDetail', market, group],
    queryFn: () => getGroupDetail(group, 365, market),
    enabled: !!group && open,
  });

  const chartSymbols = useMemo(
    () => (detail?.stocks || []).map((s) => s.symbol).filter(Boolean),
    [detail?.stocks],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="tw fixed inset-0 z-modal flex flex-col bg-surface text-foreground outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[90dvh] sm:w-[min(1200px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:border-border"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-lg font-semibold">
              {group}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring md:size-9"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <DetailSkeleton />
            ) : detail ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="charts">
                    {`Charts${chartSymbols.length ? ` (${chartSymbols.length})` : ''}`}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="outline-none">
                  <GroupDetailOverview detail={detail} />
                </TabsContent>
                <TabsContent value="charts" className="outline-none">
                  <GroupChartsGrid symbols={chartSymbols} period="6mo" height={200} />
                </TabsContent>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
