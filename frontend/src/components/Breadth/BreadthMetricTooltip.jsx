import { useState } from 'react';
import { Info } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';

import { breadthMetricDefinitions } from './breadthMetricDefinitions';


// Toggletip: opens on mouse hover, on click/tap and from the keyboard, so the
// formula is reachable on phones where hover does not exist. The trigger's
// ::after pad grows its tap target to at least 24px (WCAG 2.5.8) without
// moving the icon or the label beside it.
function BreadthMetricTooltip({ metric, compact = false }) {
  const [open, setOpen] = useState(false);
  const definition = breadthMetricDefinitions[metric];
  if (!definition) return null;

  const hover = (next) => (event) => {
    if (event.pointerType === 'mouse') setOpen(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${definition.label} formula details`}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        className={cn(
          "relative ml-0.5 inline-grid shrink-0 cursor-pointer place-items-center rounded-sm text-muted-foreground outline-none after:absolute after:-inset-1 after:content-[''] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          compact ? 'size-4' : 'size-5',
        )}
      >
        <Info aria-hidden="true" className={compact ? 'size-3' : 'size-3.5'} />
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <p className="font-semibold">
          {definition.formulaOrigin}
          {definition.groupOrigin ? ` · ${definition.groupOrigin}` : ''}
        </p>
        <p className="mt-1">{definition.description}</p>
        <p className="mt-1">History: {definition.requiredHistory}</p>
        {definition.liquidityRule && (
          <p className="mt-1">Liquidity: {definition.liquidityRule}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default BreadthMetricTooltip;
