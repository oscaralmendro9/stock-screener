import { useMemo } from 'react';
import GroupMatrixStockTile from './GroupMatrixStockTile';
import { MORE_BUTTON } from './MatrixStockPreview';
import { packMatrixStocks } from './groupMatrixPacking';
export default function MatrixBubblePreview({ stocks, title, metric, onSelectStock, onSelectStocks }) {
  const bubbles = useMemo(() => packMatrixStocks(stocks, metric), [stocks, metric]);
  return <>
    <div className="group-matrix-bubble-pack relative mx-auto size-64">
      {bubbles.map(bubble => <GroupMatrixStockTile key={bubble.stock.symbol} stock={bubble.stock}
        bubble={bubble} metric={metric} onSelect={onSelectStock} />)}
    </div>
    {stocks.length > bubbles.length && <button type="button" className={MORE_BUTTON}
      aria-label={`+${stocks.length - bubbles.length} more in ${title}`}
      onClick={() => onSelectStocks({ title, stocks })}>+{stocks.length - bubbles.length} more</button>}
  </>;
}
