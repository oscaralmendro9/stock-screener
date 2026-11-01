import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { groupLabel, sectorLabel } from './groupMatrixModel';
import MatrixBubblePreview from './MatrixBubblePreview';
import { CLUSTER_PREVIEW_LIMIT } from './groupMatrixPacking';
function ClusterColumn({ cards, tier, metric, onSelectStock, onSelectStocks }) {
  const scrollRef = useRef(null);
  const virtual = useVirtualizer({ count: cards.length, getScrollElement: () => scrollRef.current,
    estimateSize: i => cards[i].kind === 'sector' ? 38 : 310 + (cards[i].stocks.length > CLUSTER_PREVIEW_LIMIT ? 32 : 0),
    getItemKey: i => cards[i].key, overscan: 1, initialRect: { width: 250, height: 600 } });
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [cards]);
  return <div className="min-w-[270px] flex-[1_0_270px] border-r border-border">
    <p className="h-[38px] p-2 text-xs font-bold">{tier.label}</p>
    <div ref={scrollRef} role="region" aria-label={`${tier.label} industry clusters`} tabIndex={0}
      className="h-[600px] overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="relative" style={{ height: virtual.getTotalSize() }}>
        {virtual.getVirtualItems().map(item => {
          const card = cards[item.index];
          return <div key={item.key} className="absolute top-0 left-0 w-full p-1" style={{ height: item.size, transform: `translateY(${item.start}px)` }}>
            {card.kind === 'sector' ? <p className="bg-surface-subtle p-1.5 text-xs font-extrabold">{sectorLabel(card.sector)}</p>
              : <div className="rounded-md border border-border p-1">
                <button type="button" title={groupLabel(card.group)}
                  className="block h-9 max-w-full cursor-pointer truncate rounded-sm px-1 text-left text-[11px] font-semibold text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onSelectStocks({ title: `${groupLabel(card.group)} · ${tier.label}`, stocks: card.stocks })}>{groupLabel(card.group)} ({card.stocks.length})</button>
                <MatrixBubblePreview stocks={card.stocks} title={`${groupLabel(card.group)} · ${tier.label}`}
                  metric={metric} onSelectStock={onSelectStock} onSelectStocks={onSelectStocks} />
              </div>}
          </div>;
        })}
      </div>
    </div>
  </div>;
}
export default function GroupMatrixClusters({ model, tiers, ...props }) {
  return <>
    <p className="mb-2 text-[11px] text-muted-foreground">
      Bubble size: market cap within each cluster, with a minimum size for visibility. Unknown caps use equal sizes.
    </p>
    <div role="region" aria-label="Stock matrix clusters" className="flex overflow-x-auto rounded-md border border-border">
      {tiers.map(tier => <ClusterColumn key={tier.id} cards={model.clustersByTier[tier.id] || []} tier={tier} {...props} />)}
    </div>
  </>;
}
