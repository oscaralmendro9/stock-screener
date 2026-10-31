import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Notice } from '@/ui/notice';

import { getValidationOverview } from '../api/validation';
import { ValidationSection } from '../components/Validation/ValidationPanels';
import { describeRequestError } from '../utils/requestErrors';

const SOURCES = [['scan_pick', 'Scan Picks'], ['theme_alert', 'Theme Alerts']];
const LOOKBACK_OPTIONS = [30, 90, 180];

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div role="group" aria-label={label} className="inline-flex self-start rounded-md border border-border p-0.5">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            aria-pressed={value === optionValue}
            onClick={() => { if (value !== optionValue) onChange(optionValue); }}
            className={cn(
              'h-9 cursor-pointer rounded-sm px-3 text-xs font-semibold whitespace-nowrap outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7',
              value === optionValue ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
            )}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function ValidationSkeleton() {
  const block = 'rounded-md bg-surface-subtle motion-safe:animate-pulse';
  return (
    <div className="tw flex flex-col gap-4" aria-busy="true" aria-label="Loading validation overview">
      <div className={`${block} h-36`} />
      <div className="grid gap-3 md:grid-cols-2">
        <div className={`${block} h-32`} />
        <div className={`${block} h-32`} />
      </div>
      <div className={`${block} h-48`} />
    </div>
  );
}

function ValidationPage() {
  const [sourceKind, setSourceKind] = useState('scan_pick');
  const [lookbackDays, setLookbackDays] = useState(90);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['validationOverview', sourceKind, lookbackDays],
    queryFn: () => getValidationOverview(sourceKind, lookbackDays),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });

  if (isLoading && !data) {
    return <ValidationSkeleton />;
  }

  if (error) {
    return (
      <Notice
        tone="error"
        className="tw"
        action={<Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>}
      >
        {`Failed to load validation overview: ${describeRequestError(error)}`}
      </Notice>
    );
  }

  return (
    <div className="tw flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4">
        <div>
          <h1 className="text-xl font-semibold">Validation</h1>
          <p className="text-sm text-muted-foreground">
            Deterministic scorecard for published scan picks and theme alerts using cached price history only.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
          <Segmented label="Source" options={SOURCES} value={sourceKind} onChange={setSourceKind} />
          <Segmented
            label="Lookback"
            options={LOOKBACK_OPTIONS.map((value) => [value, `${value}D`])}
            value={lookbackDays}
            onChange={setLookbackDays}
          />
          {isFetching && data && (
            <span role="status" className="text-xs text-muted-foreground md:ml-auto">Updating…</span>
          )}
        </div>
      </Card>

      {data && (
        <Card className="p-4">
          <ValidationSection
            degradedReasons={data.degraded_reasons}
            horizons={data.horizons}
            recentEvents={data.recent_events}
            failureClusters={data.failure_clusters}
          />
        </Card>
      )}
    </div>
  );
}

export default ValidationPage;
