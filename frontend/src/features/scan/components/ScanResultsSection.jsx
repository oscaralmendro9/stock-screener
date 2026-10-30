import { Alert, Box, Button, LinearProgress, Paper, Typography } from '@mui/material';
import { Download } from 'lucide-react';

import { Badge } from '@/ui/badge';
import { Button as UiButton } from '@/ui/button';
import ResultsTable from '../../../components/Scan/ResultsTable';
import { expressionSummary } from '../filterExpressionBuilder';
import { TableSkeleton } from '../../../components/common/LoadingSkeletons';

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
}) {
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
    return (
      <>
        {resultsFetching && (
          <Box sx={{ mb: 1 }} role="status" aria-live="polite">
            <LinearProgress />
            <Typography variant="caption" color="text.secondary">Updating results…</Typography>
          </Box>
        )}
        {resultsError && (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>} sx={{ mb: 1 }}>
            {typeof errorMessage === 'string' ? errorMessage : 'The results request failed. Your previous results are still shown.'}
          </Alert>
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
          showOpportunityState={resultsData.capabilities?.opportunity_state === true}
          opportunityTelemetrySurface="scan"
        />
      </>
    );
  }

  return (
    <Paper sx={{ p: 5, textAlign: 'center' }}>
      {resultsFetching && (
        <Box sx={{ mb: 2 }} role="status" aria-live="polite">
          <LinearProgress />
          <Typography variant="caption" color="text.secondary">Updating results…</Typography>
        </Box>
      )}
      <Typography variant="h6">
        {resultsError ? 'Could not update scan results' : 'No stocks match the applied logic'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {resultsError
          ? (typeof errorMessage === 'string' ? errorMessage : 'The results request failed.')
          : (
              <>
                {expression ? expressionSummary(expression) : 'The current filters returned no rows.'}
                {' '}Try disabling one setup, switching “match all” to “match any,” or widening a range.
              </>
            )}
      </Typography>
      <Button variant="outlined" onClick={onRetry} sx={{ mt: 2 }}>
        Retry Loading Results
      </Button>
    </Paper>
  );
}
