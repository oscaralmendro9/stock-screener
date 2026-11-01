/**
 * Maps: the market map full screen, Finviz-style. Same data as Home's map
 * (the daily snapshot's scan), with more names and an industry level.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/cn';
import MarketHeatmap from '../features/home/MarketHeatmap';
import { useMarket } from '../contexts/MarketContext';
import { useIsMobileShell } from '../components/Layout/shellNav';
import { dailySnapshotQuery } from '../pageBootstrapQueries';

const SIZES = [300, 500, 1000];
const GROUPINGS = [
  { id: 'industry', label: 'Sector & industry' },
  { id: 'sector', label: 'Sector' },
];
// Space above and below the map: top bar, page gutters, map header, legend.
const CHROME_HEIGHT = 170;

function useViewportHeight() {
  const [height, setHeight] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return height;
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-md border border-border p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'h-11 cursor-pointer rounded-sm px-2.5 text-sm whitespace-nowrap outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7 md:text-xs',
            value === option.id ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function MapsPage() {
  const { selectedMarket } = useMarket();
  const isMobile = useIsMobileShell();
  const viewportHeight = useViewportHeight();
  const [size, setSize] = useState(500);
  const [grouping, setGrouping] = useState('industry');
  const snapshot = useQuery(dailySnapshotQuery(selectedMarket));
  const scanId = snapshot.data?.scan_id ?? null;
  // Phones also lose the bottom bar; keep the map tall enough to read.
  const height = Math.max(420, viewportHeight - CHROME_HEIGHT - (isMobile ? 64 : 0));

  return (
    <div className="tw pb-2">
      <h1 className="sr-only">Market map</h1>
      {snapshot.isError ? (
        <p role="alert" className="rounded-md border border-loss/40 bg-loss/10 px-4 py-3 text-sm">
          The market map needs today&apos;s snapshot, which could not be loaded.
        </p>
      ) : (
        <MarketHeatmap
          scanId={scanId}
          title={`${snapshot.data?.market_display_name || selectedMarket} market map`}
          limit={size}
          height={height}
          byIndustry={grouping === 'industry'}
          actions={(
            <>
              <Segmented
                label="Map size"
                value={size}
                onChange={setSize}
                options={SIZES.map((value) => ({ id: value, label: `Top ${value}` }))}
              />
              <Segmented label="Grouping" value={grouping} onChange={setGrouping} options={GROUPINGS} />
            </>
          )}
        />
      )}
    </div>
  );
}
