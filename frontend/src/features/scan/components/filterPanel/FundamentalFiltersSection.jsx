import Grid from './FilterGrid';
import {
  CompactRangeInput,
  CompactSelect,
  CompactMultiSelect,
  FilterSection,
  IpoDateFilter,
} from '../../../../components/Scan/filters';
import { EXPRESSION_LIMITS } from '../../scanFilterFields';
import { MARKET_CAP_OPTIONS, MARKET_OPTIONS, VOLUME_OPTIONS } from './constants';

function FundamentalFiltersSection({
  filters,
  filterOptions,
  updateFilter,
  updateRangeFilter,
  activeCount,
  defaultExpanded,
}) {
  return (
    <FilterSection
      title="Fundamental"
      category="fundamental"
      activeCount={activeCount}
      defaultExpanded={defaultExpanded}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={1.5}>
          <label className="tw flex flex-col">
            <span className="mb-1 block text-[11px] text-muted-foreground">Symbol</span>
            <input
              value={filters.symbolSearch || ''}
              onChange={(event) => updateFilter('symbolSearch', event.target.value)}
              placeholder="Search..."
              className="h-11 w-full rounded-md border border-border bg-surface px-2 font-[inherit] text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:h-7"
            />
          </label>
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <CompactSelect
            label="Mkt Cap (local)"
            value={filters.minMarketCap}
            options={MARKET_CAP_OPTIONS}
            onChange={(value) => updateFilter('minMarketCap', value)}
          />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <CompactSelect
            label="Dollar Vol (local)"
            value={filters.minVolume}
            options={VOLUME_OPTIONS}
            onChange={(value) => updateFilter('minVolume', value)}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={1.5}>
          <CompactRangeInput
            label="Price"
            minValue={filters.price?.min}
            maxValue={filters.price?.max}
            onChange={(range) => updateRangeFilter('price', range)}
            step={1}
            minLimit={0}
            prefix="$"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={1.5}>
          <CompactRangeInput
            label="EPS Growth"
            minValue={filters.epsGrowth?.min}
            maxValue={filters.epsGrowth?.max}
            onChange={(range) => updateRangeFilter('epsGrowth', range)}
            step={5}
            suffix="%"
            minOnly
          />
        </Grid>
        <Grid item xs={6} sm={4} md={1.5}>
          <CompactRangeInput
            label="Sales Growth"
            minValue={filters.salesGrowth?.min}
            maxValue={filters.salesGrowth?.max}
            onChange={(range) => updateRangeFilter('salesGrowth', range)}
            step={5}
            suffix="%"
            minOnly
          />
        </Grid>
        <Grid item xs={6} sm={4} md={1.5}>
          <CompactRangeInput
            label="EPS Rating"
            minValue={filters.epsRating?.min}
            maxValue={filters.epsRating?.max}
            onChange={(range) => updateRangeFilter('epsRating', range)}
            step={5}
            minLimit={0}
            maxLimit={99}
            minOnly
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.5}>
          <CompactMultiSelect
            label="IBD Industry"
            values={filters.ibdIndustries?.values || []}
            options={filterOptions.ibdIndustries || []}
            onChange={(values) => updateFilter('ibdIndustries', { ...filters.ibdIndustries, values })}
            mode={filters.ibdIndustries?.mode || 'include'}
            onModeChange={(mode) => updateFilter('ibdIndustries', { ...filters.ibdIndustries, mode })}
            showModeToggle
            maxValues={EXPRESSION_LIMITS.maxCategoricalValues}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.5}>
          <CompactMultiSelect
            label="GICS Sector"
            values={filters.gicsSectors?.values || []}
            options={filterOptions.gicsSectors || []}
            onChange={(values) => updateFilter('gicsSectors', { ...filters.gicsSectors, values })}
            mode={filters.gicsSectors?.mode || 'include'}
            onModeChange={(mode) => updateFilter('gicsSectors', { ...filters.gicsSectors, mode })}
            showModeToggle
            maxValues={EXPRESSION_LIMITS.maxCategoricalValues}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <IpoDateFilter
            value={filters.ipoAfter}
            onChange={(value) => updateFilter('ipoAfter', value)}
          />
        </Grid>
      </Grid>

      <hr className="my-3 border-border" />
      <p className="tw mb-2 text-[11px] tracking-wide text-muted-foreground uppercase">
        Cross-Market (USD-normalised)
      </p>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <CompactMultiSelect
            label="Markets"
            values={filters.markets || []}
            options={MARKET_OPTIONS}
            onChange={(values) => updateFilter('markets', values)}
            maxValues={EXPRESSION_LIMITS.maxCategoricalValues}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <CompactRangeInput
            label="Mkt Cap (USD)"
            minValue={filters.marketCapUsd?.min}
            maxValue={filters.marketCapUsd?.max}
            onChange={(range) => updateRangeFilter('marketCapUsd', range)}
            step={100000000}
            minLimit={0}
            prefix="$"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <CompactRangeInput
            label="ADV (USD)"
            minValue={filters.advUsd?.min}
            maxValue={filters.advUsd?.max}
            onChange={(range) => updateRangeFilter('advUsd', range)}
            step={1000000}
            minLimit={0}
            prefix="$"
          />
        </Grid>
      </Grid>
    </FilterSection>
  );
}

export default FundamentalFiltersSection;
