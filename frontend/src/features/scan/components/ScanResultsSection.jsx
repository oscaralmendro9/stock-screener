import { useState } from 'react';
import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';
import { Download } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Button as UiButton } from '@/ui/button';
import { Card } from '@/ui/card';
import ResultsTable from '../../../components/Scan/ResultsTable';
import { useIsMobileShell } from '../../../components/Layout/shellNav';
import { expressionSummary } from '../filterExpressionBuilder';
import { TableSkeleton } from '../../../components/common/LoadingSkeletons';
import ScreenerTable, { ScreenerPagination } from '../screener/ScreenerTable';
import { DEFAULT_VIEW, RESILIENCE_COLUMN, SCREENER_VIEWS } from '../screener/screenerViews';

const VIEW_STORAGE_KEY = 'stockscanner-scan-view';

// The chosen view is a per-viewer convenience; storage can be blocked.
function readSavedView() {
  try {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (SCREENER_VIEWS.some((item) => item.id === saved)) return saved;
  } catch {
    // Fall through to the default.
  }
  return DEFAULT_VIEW;
}

function saveView(id) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, id);
  } catch {
    // Not persisting is fine; the tab still switches for this visit.
  }
}

export default function ScanResultsSection({
  resultsLoading,
  resultsData,
  expression,
  resultsFetching = false,
  resultsError = null,
  onExport,
  page,
  perPage,
  sortBy,
  sortOrder,
  onPageChange,
  onPerPageChange,
  onSortChange,
  onOpenChart,
  onRowHover,
  onRetry,
  defaultView,
}) {
  const isMobile = useIsMobileShell();
  const [viewId, setViewId] = useState(() => defaultView ?? readSavedView());
  const view = SCREENER_VIEWS.find((item) => item.id === viewId) ?? SCREENER_VIEWS[0];
  const selectView = (id) => {
    setViewId(id);
    saveView(id);
  };
  const errorMessage = resultsError?.response?.data?.detail
    || resultsError?.message
    || 'The results request failed. Your previous results are still shown.';

  if (resultsLoading) {
    return <TableSkeleton label="Loading results..." rows={10} columns={8} title={false} />;
  }

  if (resultsData && resultsData.results && resultsData.results.length > 0) {
    const unfilteredTotal = resultsData.unfiltered_total ?? resultsData.total;
    const hasAppliedFilter = expression
      ? expression.required.conditions.length > 0 || expression.groups.some((group) => group.enabled !== false)
      : false;
    const countSuffix = hasAppliedFilter && unfilteredTotal !== resultsData.total
      ? `stocks matching of ${unfilteredTotal.toLocaleString()}`
      : 'stocks';
    const opportunityState = resultsData.capabilities?.opportunity_state === true;
    return (
      <>
        {resultsFetching && (
          <div className="tw mb-2" role="status" aria-live="polite">
            <span className="block h-1 overflow-hidden rounded-full bg-surface-subtle"><span className="block h-full w-1/3 rounded-full bg-accent motion-safe:animate-pulse" /></span>
            <span className="text-[11px] text-muted-foreground">Updating results…</span>
          </div>
        )}
        {resultsError && (
          <Notice tone="error" className="tw mb-2" action={<Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}>
            {typeof errorMessage === 'string' ? errorMessage : 'The results request failed. Your previous results are still shown.'}
          </Notice>
        )}
        <div className="tw mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {/* Screen readers (and tests) get the full sentence; the eye gets a big count. */}
            <h2 className="flex flex-wrap items-baseline gap-x-2 text-pretty">
              <span className="sr-only">Results: {resultsData.total.toLocaleString()} {countSuffix}</span>
              <span aria-hidden="true" className="text-2xl font-semibold tabular-nums">{resultsData.total.toLocaleString()}</span>
              <span aria-hidden="true" className="text-sm text-muted-foreground">{countSuffix}</span>
            </h2>
            {expression && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge tone={hasAppliedFilter ? 'accent' : 'neutral'}>{hasAppliedFilter ? 'Filtered' : 'Unfiltered'}</Badge>
                <span className="min-w-0">{expressionSummary(expression)}</span>
              </p>
            )}
          </div>
          <UiButton variant="secondary" size="sm" onClick={onExport} disabled={!resultsData.total}>
            <Download aria-hidden="true" />
            Export to CSV
          </UiButton>
        </div>

        {!isMobile && (
          <div className="tw flex flex-wrap items-end justify-between gap-2">
            <div role="group" aria-label="Results view" className="flex gap-0.5 overflow-x-auto">
              {SCREENER_VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={view.id === item.id}
                  onClick={() => selectView(item.id)}
                  className={cn(
                    '-mb-px h-8 shrink-0 cursor-pointer rounded-t-md border border-b-0 px-3 text-xs whitespace-nowrap outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring',
                    view.id === item.id
                      ? 'relative border-border bg-surface font-semibold text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {view.columns && (
              <div className="pb-1">
                <ScreenerPagination compact page={page} perPage={perPage} total={resultsData.total} onPageChange={onPageChange} />
              </div>
            )}
          </div>
        )}

        {isMobile || !view.columns ? (
          <ResultsTable
            results={resultsData.results}
            total={resultsData.total}
            page={page}
            perPage={perPage}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onPageChange={onPageChange}
            onPerPageChange={onPerPageChange}
            onSortChange={onSortChange}
            onOpenChart={onOpenChart}
            onRowHover={onRowHover}
            loading={resultsLoading}
            showOpportunityState={opportunityState}
            opportunityTelemetrySurface="scan"
          />
        ) : (
          <Card className="tw overflow-hidden rounded-tl-none">
            <ScreenerTable
              caption={`Scan results, ${view.label} view`}
              rows={resultsData.results}
              columns={opportunityState && view.id === 'overview' ? [...view.columns, RESILIENCE_COLUMN] : view.columns}
              page={page}
              perPage={perPage}
              total={resultsData.total}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
              onPageChange={onPageChange}
              onPerPageChange={onPerPageChange}
              onOpenChart={onOpenChart}
              onRowHover={onRowHover}
            />
          </Card>
        )}
      </>
    );
  }

  return (
    <div className="tw rounded-lg border border-border bg-surface p-10 text-center text-foreground">
      {resultsFetching && (
        <div className="mb-4" role="status" aria-live="polite">
          <span className="block h-1 overflow-hidden rounded-full bg-surface-subtle"><span className="block h-full w-1/3 rounded-full bg-accent motion-safe:animate-pulse" /></span>
          <span className="text-[11px] text-muted-foreground">Updating results…</span>
        </div>
      )}
      <h3 className="text-lg font-semibold">
        {resultsError ? 'Could not update scan results' : 'No stocks match the applied logic'}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {resultsError
          ? (typeof errorMessage === 'string' ? errorMessage : 'The results request failed.')
          : (
              <>
                {expression ? expressionSummary(expression) : 'The current filters returned no rows.'}
                {' '}Try disabling one setup, switching “match all” to “match any,” or widening a range.
              </>
            )}
      </p>
      <Button variant="secondary" onClick={onRetry} className="mt-4">
        Retry Loading Results
      </Button>
    </div>
  );
}
