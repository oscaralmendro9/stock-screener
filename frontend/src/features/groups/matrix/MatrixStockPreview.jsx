import GroupMatrixStockTile from './GroupMatrixStockTile';
export const MORE_BUTTON = 'min-h-8 w-full cursor-pointer rounded-sm text-[11px] font-semibold text-accent outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring';
export default function MatrixStockPreview({ stocks, limit, title, metric, onSelectStock, onSelectStocks }) {
  return <div className="grid grid-cols-[repeat(3,minmax(72px,1fr))] gap-[3px]">
    {stocks.slice(0, limit).map(stock => <GroupMatrixStockTile key={stock.symbol} stock={stock} metric={metric} onSelect={onSelectStock} />)}
    {stocks.length > limit && <button type="button" className={`${MORE_BUTTON} col-span-full`}
      aria-label={`+${stocks.length - limit} more in ${title}`}
      onClick={() => onSelectStocks({ title, stocks })}>+{stocks.length - limit} more</button>}
  </div>;
}
