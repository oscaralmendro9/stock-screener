import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SOURCE_TYPES } from '../constants';
import { TabBar } from '../themeUi';

const SEGMENT = 'inline-flex h-11 cursor-pointer items-center gap-1 px-3 text-[11px] font-medium outline-none first:rounded-l-md last:rounded-r-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:h-7';
const CHIP = 'inline-flex h-11 cursor-pointer items-center rounded-full border px-2.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-6';
const chipTone = (on) => (on ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface text-foreground hover:bg-surface-subtle');

// Handlers keep the (event, value) signature the container already uses.
export default function ThemesFiltersPanel({
  themeView,
  onViewChange,
  l1Categories,
  categoryFilter,
  onCategoryFilterChange,
  selectedTab,
  onTabChange,
  selectedSourceTypes,
  onSourceTypeToggle,
}) {
  return (
    <section className="tw mb-6 rounded-lg border border-border bg-surface text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div role="group" aria-label="Theme view" className="flex rounded-md border border-border">
          {[['grouped', 'L1 Grouped', LayoutGrid], ['flat', 'All Themes', List]].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={themeView === value}
              onClick={() => onViewChange(null, value)}
              className={cn(SEGMENT, themeView === value ? 'bg-surface-subtle text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {themeView === 'grouped' && l1Categories?.categories?.length > 0 && (
          <div role="group" aria-label="Sector" className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[11px] text-muted-foreground">Sector:</span>
            <button type="button" aria-pressed={categoryFilter === null} onClick={() => onCategoryFilterChange(null)} className={cn(CHIP, chipTone(categoryFilter === null))}>
              All
            </button>
            {l1Categories.categories.map((category) => {
              const on = categoryFilter === category.category;
              return (
                <button
                  key={category.category}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onCategoryFilterChange(on ? null : category.category)}
                  className={cn(CHIP, 'capitalize', chipTone(on))}
                >
                  {`${category.category} (${category.count})`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {themeView === 'flat' && (
        <>
          <TabBar
            label="Theme lifecycle"
            className="px-2"
            value={selectedTab}
            onChange={(value) => onTabChange(null, value)}
            tabs={[
              { value: 'all', label: 'All Themes' },
              { value: 'trending', label: 'Trending' },
              { value: 'emerging', label: 'Emerging' },
              { value: 'active', label: 'Active' },
              { value: 'fading', label: 'Fading' },
            ]}
          />

          <div role="group" aria-label="Sources" className="flex flex-wrap items-center gap-2 px-4 py-3">
            <span className="mr-1 text-sm text-muted-foreground">Sources:</span>
            {SOURCE_TYPES.map((source) => {
              const on = selectedSourceTypes.includes(source.value);
              return (
                <button key={source.value} type="button" aria-pressed={on} onClick={() => onSourceTypeToggle(source.value)} className={cn(CHIP, chipTone(on))}>
                  {source.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
