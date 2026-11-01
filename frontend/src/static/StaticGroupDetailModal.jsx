import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { GroupDetailOverview } from '../features/groups/GroupDetailModal';
import StaticGroupChartsGrid from './StaticGroupChartsGrid';

const CHARTS_TOP_N_GROUPS = 50;

// Same overview as the live dialog, fed from the static bundle. Charts are
// baked for the top groups only, so the tab says why it is off for the rest.
function StaticGroupDetailModal({ group, detail, chartIndex = null, open, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (open) {
      setActiveTab('overview');
    }
  }, [open, group]);

  const chartsEnabled = (detail?.current_rank ?? Infinity) <= CHARTS_TOP_N_GROUPS;
  const chartSymbols = useMemo(
    () => (detail?.stocks || []).map((stock) => stock.symbol).filter(Boolean),
    [detail?.stocks],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // 95vw leaves 2.5vw either side, so the dialog never overflows a
          // narrow viewport.
          style={{ width: '95vw', maxWidth: '95vw' }}
          className="tw fixed top-1/2 left-1/2 z-modal flex max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-surface text-foreground outline-none"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-lg font-semibold">
              {group}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close group detail"
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring md:size-9"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!detail ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger
                    value="charts"
                    disabled={!chartsEnabled}
                    title={chartsEnabled ? undefined : `Charts available for top ${CHARTS_TOP_N_GROUPS} groups only`}
                  >
                    Charts
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="outline-none">
                  <GroupDetailOverview detail={detail} />
                </TabsContent>
                {chartsEnabled && (
                  <TabsContent value="charts" className="outline-none">
                    <StaticGroupChartsGrid symbols={chartSymbols} chartIndex={chartIndex} />
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default StaticGroupDetailModal;
