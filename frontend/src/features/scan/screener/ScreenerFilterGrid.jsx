import { memo, useId, useState } from 'react';
import { ChevronDown, Layers, ListFilter, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { CompactMultiSelect, FilterPresets, SavePresetDialog } from '../../../components/Scan/filters';
import { EXPRESSION_LIMITS } from '../scanFilterFields';
import { buildActiveFilters, isFilterActive, resetFilterValue } from '../components/filterPanel/utils';
import { BoolSelect, ChoiceSelect, RangePresetSelect, TextFilter } from './FilterControls';
import { FILTER_GRID, FILTER_TABS } from './filterGridConfig';

function FilterControl({ spec, id, filters, filterOptions, onFilterChange }) {
  const value = filters[spec.key];
  const set = (next) => onFilterChange(spec.key, next);
  switch (spec.type) {
    case 'text':
      return <TextFilter id={id} value={value} onChange={set} placeholder={spec.placeholder} />;
    case 'select':
      return <ChoiceSelect id={id} value={value} onChange={set} options={spec.options} />;
    case 'bool':
      return <BoolSelect id={id} value={value} onChange={set} />;
    case 'range':
      return (
        <RangePresetSelect
          id={id}
          label={spec.label}
          value={value}
          onChange={set}
          presets={spec.presets}
          minOnly={spec.minOnly}
          prefix={spec.prefix}
          suffix={spec.suffix}
        />
      );
    case 'multi': {
      const options = spec.options(filterOptions);
      if (spec.moded) {
        return (
          <CompactMultiSelect
            inline
            id={id}
            label={spec.label}
            values={value?.values || []}
            options={options}
            onChange={(values) => set({ ...value, values })}
            mode={value?.mode || 'include'}
            onModeChange={(mode) => set({ ...value, mode })}
            showModeToggle
            placeholder="Any"
            maxValues={EXPRESSION_LIMITS.maxCategoricalValues}
          />
        );
      }
      return (
        <CompactMultiSelect
          inline
          id={id}
          label={spec.label}
          values={value || []}
          options={options}
          onChange={set}
          placeholder="Any"
          maxValues={EXPRESSION_LIMITS.maxCategoricalValues}
        />
      );
    }
    default:
      return null;
  }
}

/**
 * Finviz-style filter block for the live screener: every filter as a
 * "label | control" cell in a dense grid, grouped by tabs, with presets for
 * ranges. Same props as FilterPanel, so the page can swap one for the other.
 */
function ScreenerFilterGrid({
  filters,
  onFilterChange,
  onReset,
  filterOptions = {},
  expanded = true,
  onToggle,
  presetsEnabled = true,
  presets = [],
  activePresetId = null,
  hasUnsavedChanges = false,
  presetsLoading = false,
  presetsSaving = false,
  onLoadPreset,
  onSavePreset,
  onUpdatePreset,
  onRenamePreset,
  onDeletePreset,
  saveDialogOpen = false,
  saveDialogMode = 'save',
  saveDialogInitialName = '',
  saveDialogInitialDescription = '',
  saveDialogError = null,
  onSaveDialogClose,
  onSaveDialogSave,
  groupedFilteringEnabled = false,
  expression = null,
  onOpenLogicBuilder,
}) {
  const baseId = useId();
  const gridId = `${baseId}-grid`;
  const [tab, setTab] = useState('descriptive');
  const activeFilters = buildActiveFilters(filters);
  const enabledSetupCount = expression?.groups?.filter((group) => group.enabled !== false).length ?? 0;
  const countIn = (tabId) => FILTER_GRID
    .filter((spec) => tabId === 'all' || spec.tab === tabId)
    .filter((spec) => isFilterActive(filters, spec.key)).length;
  const visible = FILTER_GRID.filter((spec) => tab === 'all' || spec.tab === tab);

  return (
    <Card className="tw mb-3 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={gridId}
          onClick={onToggle}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-md px-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8"
        >
          <ListFilter aria-hidden="true" className="size-4 text-muted-foreground" />
          Filters
          {activeFilters.length > 0 && <Badge tone="accent">{activeFilters.length}</Badge>}
          <ChevronDown aria-hidden="true" className={cn('size-4 text-muted-foreground transition-transform duration-150 ease-out', expanded && 'rotate-180')} />
        </button>

        {presetsEnabled && (
          <FilterPresets
            presets={presets}
            activePresetId={activePresetId}
            hasUnsavedChanges={hasUnsavedChanges}
            isLoading={presetsLoading}
            isSaving={presetsSaving}
            onLoadPreset={onLoadPreset}
            onSavePreset={onSavePreset}
            onUpdatePreset={onUpdatePreset}
            onRenamePreset={onRenamePreset}
            onDeletePreset={onDeletePreset}
          />
        )}

        {groupedFilteringEnabled && (
          <Button variant={enabledSetupCount ? 'primary' : 'secondary'} size="sm" onClick={() => onOpenLogicBuilder?.()}>
            <Layers aria-hidden="true" />
            Logic builder{enabledSetupCount ? ` · ${enabledSetupCount}` : ''}
          </Button>
        )}

        <div className="flex-1" />

        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
            <X aria-hidden="true" />
            Reset
          </Button>
        )}
      </div>

      {expanded && (
        <div id={gridId} className="border-t border-border">
          <div role="group" aria-label="Filter category" className="flex gap-1 overflow-x-auto border-b border-border bg-surface-subtle px-2 py-1.5">
            {FILTER_TABS.map((item) => {
              const count = countIn(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm whitespace-nowrap outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7 md:text-xs',
                    tab === item.id
                      ? 'bg-surface font-semibold text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                  {count > 0 && <span className="rounded-sm bg-accent/15 px-1 text-[11px] font-semibold text-accent tabular-nums">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="grid gap-x-6 gap-y-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1700px]:grid-cols-5">
            {visible.map((spec) => {
              const id = `${baseId}-${spec.key}`;
              return (
                <div key={spec.key} className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-2">
                  <label htmlFor={id} className="truncate pt-3 text-right text-xs text-muted-foreground md:pt-1.5" title={spec.label}>
                    {spec.label}
                  </label>
                  <FilterControl
                    spec={spec}
                    id={id}
                    filters={filters}
                    filterOptions={filterOptions}
                    onFilterChange={onFilterChange}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2">
          {activeFilters.map(({ key, label }) => (
            <li key={key}>
              <span className="inline-flex items-center gap-1 rounded-sm bg-accent/15 py-0.5 pr-0.5 pl-1.5 text-xs font-medium text-accent">
                {label}
                <button
                  type="button"
                  aria-label={`Remove ${label}`}
                  onClick={() => onFilterChange(key, resetFilterValue(key))}
                  className="grid size-8 cursor-pointer place-items-center rounded-sm outline-none hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-ring md:size-5"
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {presetsEnabled && (
        <SavePresetDialog
          open={saveDialogOpen}
          onClose={onSaveDialogClose}
          onSave={onSaveDialogSave}
          mode={saveDialogMode}
          initialName={saveDialogInitialName}
          initialDescription={saveDialogInitialDescription}
          error={saveDialogError}
          isLoading={presetsSaving}
        />
      )}
    </Card>
  );
}

export default memo(ScreenerFilterGrid);
