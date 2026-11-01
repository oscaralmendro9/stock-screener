import { memo } from 'react';
import { ChevronDown, ChevronUp, Layers, ListFilter, X } from 'lucide-react';
import { Button } from '@/ui/button';
import {
  FilterPresets,
  SavePresetDialog,
} from '../../../components/Scan/filters';
import {
  FUNDAMENTAL_KEYS,
  TECHNICAL_KEYS,
  RATING_KEYS,
} from './filterPanel/constants';
import {
  buildActiveFilters,
  countActiveInCategory,
  resetFilterValue,
} from './filterPanel/utils';
import FundamentalFiltersSection from './filterPanel/FundamentalFiltersSection';
import TechnicalFiltersSection from './filterPanel/TechnicalFiltersSection';
import RatingFiltersSection from './filterPanel/RatingFiltersSection';

const CHIP = 'inline-flex h-6 items-center gap-0.5 rounded-full bg-surface-subtle pr-0.5 pl-2 text-[11px]';

function FilterChip({ label, onDelete }) {
  return (
    <span className={CHIP}>
      {label}
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onDelete}
        className="grid size-5 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </span>
  );
}

function FilterPanel({
  filters,
  onFilterChange,
  onReset,
  filterOptions = {},
  expanded = true,
  onToggle,
  presetsEnabled = true,
  sectionDefaultExpanded = {
    fundamental: true,
    technical: true,
    rating: true,
  },
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
  const updateFilter = (key, value) => onFilterChange(key, value);

  const updateRangeFilter = (key, range) => onFilterChange(key, range);

  const handleDeleteFilter = (key) => {
    onFilterChange(key, resetFilterValue(key));
  };

  const activeFilters = buildActiveFilters(filters);
  const fundamentalCount = countActiveInCategory(filters, FUNDAMENTAL_KEYS);
  const technicalCount = countActiveInCategory(filters, TECHNICAL_KEYS);
  const ratingCount = countActiveInCategory(filters, RATING_KEYS);
  const enabledSetupCount = expression?.groups?.filter((group) => group.enabled !== false).length ?? 0;

  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <section aria-label="Filters" className="tw mb-4 rounded-lg border border-border bg-surface p-3 text-foreground">
      <div className="flex flex-wrap items-center gap-y-2">
        {/* The whole bar toggles; its own controls stop the click. */}
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          className="mr-4 flex min-h-11 cursor-pointer items-center gap-2 rounded-sm text-sm font-semibold outline-none select-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-8"
        >
          <ListFilter aria-hidden="true" className="size-4 text-muted-foreground" />
          Filters
          {activeFilters.length > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] text-accent-foreground tabular-nums">
              {activeFilters.length}
            </span>
          )}
          <Chevron aria-hidden="true" className="size-4 text-muted-foreground" />
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
          <Button
            size="sm"
            variant={enabledSetupCount ? 'primary' : 'secondary'}
            onClick={() => onOpenLogicBuilder?.()}
            className="ml-2"
          >
            <Layers aria-hidden="true" />
            Logic builder{enabledSetupCount ? ` · ${enabledSetupCount}` : ''}
          </Button>
        )}

        <span className="grow" />

        {!expanded && activeFilters.length > 0 && (
          <div className="mr-2 flex max-w-[60%] flex-wrap gap-1">
            {activeFilters.slice(0, 5).map(({ key, label }) => (
              <FilterChip key={key} label={label} onDelete={() => handleDeleteFilter(key)} />
            ))}
            {activeFilters.length > 5 && (
              <span className={CHIP}>{`+${activeFilters.length - 5}`}</span>
            )}
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={onReset}>
          <X aria-hidden="true" />
          Reset
        </Button>
      </div>

      {expanded && (
        <div className="mt-3">
          <FundamentalFiltersSection
            filters={filters}
            filterOptions={filterOptions}
            updateFilter={updateFilter}
            updateRangeFilter={updateRangeFilter}
            activeCount={fundamentalCount}
            defaultExpanded={sectionDefaultExpanded.fundamental ?? true}
          />

          <TechnicalFiltersSection
            filters={filters}
            updateFilter={updateFilter}
            updateRangeFilter={updateRangeFilter}
            activeCount={technicalCount}
            defaultExpanded={sectionDefaultExpanded.technical ?? true}
          />

          <RatingFiltersSection
            filters={filters}
            updateFilter={updateFilter}
            updateRangeFilter={updateRangeFilter}
            activeCount={ratingCount}
            defaultExpanded={sectionDefaultExpanded.rating ?? true}
          />

          {activeFilters.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-2">
              <span className="mr-1 text-[11px] text-muted-foreground">Active:</span>
              {activeFilters.map(({ key, label }) => (
                <FilterChip key={key} label={label} onDelete={() => handleDeleteFilter(key)} />
              ))}
            </div>
          )}
        </div>
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
    </section>
  );
}

export default memo(FilterPanel);
