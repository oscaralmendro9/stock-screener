import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/ui/sheet';
import { cn } from '@/lib/cn';
import { formatMatrixValue } from './groupMatrixColors';
import { groupLabel } from './groupMatrixModel';
import { stockMetadataRows } from './groupMatrixStockDetails';
function ConstituentList({ stocks, onSelectStock }) {
  const ref = useRef(null);
  const virtual = useVirtualizer({ count: stocks.length, getScrollElement: () => ref.current,
    estimateSize: () => 56, overscan: 3, initialRect: { width: 420, height: 560 } });
  return <div ref={ref} className="h-[65vh] overflow-auto" role="list" aria-label="Matching stocks">
    <div className="relative" style={{ height: virtual.getTotalSize() }}>
      {virtual.getVirtualItems().map(item => {
        const stock = stocks[item.index];
        const change = stock.price_change_1d;
        return <button type="button" key={stock.symbol} aria-label={`Open ${stock.symbol} details`}
          onClick={() => onSelectStock(stock)} style={{ top: item.start }}
          className="absolute flex h-14 w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 text-left outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring">
          <span className="min-w-0"><span className="block text-sm font-bold">{stock.symbol}</span><span className="block truncate text-[11px] text-muted-foreground">{stock.company_name}</span></span>
          <span className={cn('text-xs tabular-nums', change > 0 ? 'text-gain' : change < 0 ? 'text-loss' : 'text-muted-foreground')}>
            {formatMatrixValue(change, 'price_change_1d')}
          </span>
        </button>;
      })}
    </div>
  </div>;
}
export default function GroupMatrixDetails({ selection, onClose, onSelectStock, onSelectStocks, matchingStocks, data }) {
  const stock = selection?.stock;
  const details = stock && stockMetadataRows(stock, data);
  return <Sheet open={Boolean(selection)} onOpenChange={next => { if (!next) onClose(); }}>
    {/* The panel puts focus back itself, also when the trigger was virtualized away. */}
    <SheetContent side="right" aria-describedby={undefined} onCloseAutoFocus={event => event.preventDefault()} className="p-4">
      <div className="flex items-center justify-between gap-2">
        <SheetTitle className="min-w-0 truncate text-lg font-semibold">{stock ? stock.symbol : selection?.title}</SheetTitle>
        <Button variant="ghost" size="sm" onClick={onClose} autoFocus>Close</Button>
      </div>
      {stock ? <>
        <p className="mb-4 text-sm text-muted-foreground">{stock.company_name}</p>
        <dl className="m-0">{details.map(([label, value]) => <div key={label} className="grid grid-cols-2 gap-2 border-b border-border py-2 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="m-0 [overflow-wrap:anywhere] tabular-nums">{value}</dd>
        </div>)}</dl>
        <p className="my-4 text-[11px] text-muted-foreground">Cap and classification use latest stored metadata. Automated classifications are estimates.</p>
        <Button variant="secondary" size="sm" className="self-start" onClick={() => onSelectStocks({ title: `${groupLabel(stock.ibd_industry_group)} · current filters`,
          stocks: matchingStocks.filter(s => s.sector === stock.sector && s.ibd_industry_group === stock.ibd_industry_group) })}>View industry constituents</Button>
      </> : <>
        <p className="my-2 text-sm tabular-nums">{selection?.stocks?.length || 0} stocks</p>
        <hr className="border-border" />
        {selection && <ConstituentList stocks={selection.stocks} onSelectStock={onSelectStock} />}
      </>}
    </SheetContent>
  </Sheet>;
}
