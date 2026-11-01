import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { stockMetadataRows } from './groupMatrixStockDetails';
const GAP = 8;
// Above the tile when it fits, else below; clamped inside the viewport.
function placeAbove(anchor, popup) {
  const rect = anchor.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = popup;
  const preferred = rect.top - height - GAP >= GAP ? rect.top - height - GAP : rect.bottom + GAP;
  const top = Math.max(GAP, Math.min(preferred, window.innerHeight - height - GAP));
  const left = Math.max(GAP, Math.min(rect.left, window.innerWidth - width - GAP));
  return { top, left };
}
// One delegated inspector for the map avoids a tooltip instance on every tile.
export default function GroupMatrixTileInspector({ stocks, data, children }) {
  const [anchor, setAnchor] = useState(null);
  const [position, setPosition] = useState(null);
  const popupRef = useRef(null);
  const id = useId();
  const bySymbol = useMemo(() => new Map(stocks.map(stock => [stock.symbol, stock])), [stocks]);
  const stock = anchor?.isConnected ? bySymbol.get(anchor.dataset.matrixStock) : null;
  useEffect(() => setAnchor(null), [stocks]);
  useLayoutEffect(() => {
    if (!anchor || !stock) return undefined;
    anchor.setAttribute('aria-describedby', id);
    if (popupRef.current) setPosition(placeAbove(anchor, popupRef.current));
    return () => anchor.removeAttribute('aria-describedby');
  }, [anchor, stock, id]);
  const inspect = event => {
    const tile = event.target.closest?.('[data-matrix-stock]');
    if (tile) setAnchor(tile);
  };
  const leave = event => {
    const related = event.relatedTarget;
    if (related instanceof Node && (anchor?.contains(related) || popupRef.current?.contains(related))) return;
    if (document.activeElement !== anchor) setAnchor(null);
  };
  return <div onMouseOver={inspect} onFocusCapture={inspect} onMouseOut={leave}
    onBlurCapture={() => setAnchor(null)} onScrollCapture={event => { if (!popupRef.current?.contains(event.target)) setAnchor(null); }}
    onClickCapture={() => setAnchor(null)}
    onKeyDown={event => { if (event.key === 'Escape') setAnchor(null); }}>
    {children}
    {stock && createPortal(
      <div id={id} role="tooltip" ref={popupRef} onMouseLeave={leave}
        className="tw fixed z-toast max-h-[70vh] w-[360px] max-w-[90vw] overflow-y-auto rounded-md border border-border bg-surface p-3 text-foreground shadow-md"
        style={position ? { top: position.top, left: position.left } : { top: 0, left: 0, visibility: 'hidden' }}>
        <p className="text-sm font-semibold">{stock.symbol} · {stock.company_name || stock.symbol}</p>
        <dl className="my-2 grid grid-cols-2 gap-1 text-[11px]">
          {stockMetadataRows(stock, data).map(([label,value]) => <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="m-0 [overflow-wrap:anywhere] tabular-nums">{value}</dd>
          </div>)}
        </dl>
      </div>,
      document.body,
    )}
  </div>;
}
