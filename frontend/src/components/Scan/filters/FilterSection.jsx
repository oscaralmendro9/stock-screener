import { useId, useState } from 'react';
import { ChartLine, ChevronDown, ChevronUp, Landmark, Star } from 'lucide-react';

// Neutral section chrome; the theme accent marks only the icon and the
// active-filter count, so the sections don't compete with the results.
const CATEGORY_ICONS = {
  fundamental: Landmark,
  technical: ChartLine,
  rating: Star,
};

/**
 * Collapsible filter section with category-specific styling
 */
function FilterSection({
  title,
  category = 'fundamental',
  activeCount = 0,
  defaultExpanded = true,
  children
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const IconComponent = CATEGORY_ICONS[category] || CATEGORY_ICONS.fundamental;
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <section className="tw mb-3 overflow-hidden rounded-md border border-border bg-surface-subtle text-foreground">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(!expanded)}
        className="flex min-h-11 w-full cursor-pointer items-center px-3 py-1.5 text-left outline-none select-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:min-h-8"
      >
        <IconComponent aria-hidden="true" className="mr-2 size-4 text-accent" />
        <span className="grow text-xs font-semibold tracking-wide uppercase">{title}</span>
        {activeCount > 0 && (
          <span className="mr-2 inline-flex h-[18px] items-center rounded-full bg-accent px-2 text-[11px] font-medium text-accent-foreground tabular-nums">
            {`${activeCount} active`}
          </span>
        )}
        <Chevron aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>

      {expanded && (
        <div id={panelId} className="px-3 pt-1 pb-3">
          {children}
        </div>
      )}
    </section>
  );
}

export default FilterSection;
