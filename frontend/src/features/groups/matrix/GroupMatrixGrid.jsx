import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { groupLabel, sectorLabel } from './groupMatrixModel';
import MatrixStockPreview from './MatrixStockPreview';
export default function GroupMatrixGrid({ model, tiers, metric, onSelectStock, onSelectStocks }) {
  const scrollRef = useRef(null);
  const small = useMediaQuery('(max-width:599px)');
  const rows = model.gridRows;
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current,
    estimateSize: index => rows[index].kind === 'sector' ? 38 : small ? 238 : 190,
    getItemKey: index => rows[index].key, overscan: 2, initialRect: { width: 1400, height: 640 }, scrollMargin: 38 });
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [model]);
  const labelWidth = small ? 140 : 220;
  const columns = `${labelWidth}px repeat(${tiers.length}, minmax(238px, 1fr))`;
  return <div ref={scrollRef} role="region" aria-label="Stock matrix grid, industries by market cap" tabIndex={0}
    className="h-[640px] overflow-auto rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <div style={{ minWidth: labelWidth + tiers.length * 238 }}>
      <div className="sticky top-0 z-[4] grid h-[38px] border-b border-border bg-surface text-xs font-bold" style={{ gridTemplateColumns: columns }}>
        <div className="sticky left-0 bg-surface p-2">{small ? 'Sector / IBD' : 'Sector / IBD industry'}</div>
        {tiers.map(tier => <div key={tier.id} className="p-2">{tier.label}</div>)}
      </div>
      <div className="relative" style={{ height: virtual.getTotalSize() }}>
        {virtual.getVirtualItems().map(item => {
          const row = rows[item.index];
          return <div key={item.key} className="absolute top-0 left-0 grid w-full border-b border-border"
            style={{ height: item.size, transform: `translateY(${item.start - 38}px)`, gridTemplateColumns: columns }}>
            {row.kind === 'sector' ? <div className="col-span-full bg-surface-subtle p-2">
              <p className="sticky left-2 w-fit text-xs font-extrabold">{sectorLabel(row.sector)}</p>
            </div> : <>
              <div className="sticky left-0 z-[2] border-r border-border bg-surface p-2">
                <button type="button" className="cursor-pointer rounded-sm text-left text-xs font-semibold text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onSelectStocks({ title: `${sectorLabel(row.sector)} / ${groupLabel(row.group)}`, stocks: row.stocks })}>{groupLabel(row.group)}</button>
                <span className="block text-[11px] text-muted-foreground tabular-nums">{row.stocks.length} stocks</span>
              </div>
              {tiers.map(tier => <div key={tier.id} className="border-r border-border p-1.5">
                <MatrixStockPreview stocks={row.stocksByTier[tier.id] || []} limit={12}
                  title={`${groupLabel(row.group)} · ${tier.label}`} metric={metric} onSelectStock={onSelectStock} onSelectStocks={onSelectStocks} />
              </div>)}
            </>}
          </div>;
        })}
      </div>
    </div>
  </div>;
}
