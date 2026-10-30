import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { ACTION_STATE_META } from '../../features/opportunityState/actionState';
import DailyScanRowsTable from './DailyScanRowsTable';
import OpportunityEvidenceDrawer from './OpportunityEvidenceDrawer';

const EMPTY_ROWS = [];
// ACTION_STATE_META speaks MUI color names; map them to the badge tones.
const BADGE_TONES = { error: 'loss', warning: 'warning', success: 'gain', info: 'accent', default: 'neutral' };

function CorrectionSurvivorsPanel({
  summary,
  posture,
  chartEnabledSymbols = null,
  navigationSymbols,
  onOpenChart = null,
  opportunityTelemetrySurface,
}) {
  const [opportunitySymbol, setOpportunitySymbol] = useState(null);
  const isComplete = summary?.available === true && summary?.complete === true;
  const rows = isComplete && Array.isArray(summary?.rows) ? summary.rows : EMPTY_ROWS;
  const rowSymbols = useMemo(
    () => rows.map((row) => row?.symbol).filter(Boolean),
    [rows],
  );
  const resolvedNavigationSymbols = navigationSymbols ?? rowSymbols;
  const opportunityRow = useMemo(
    () => rows.find((row) => row?.symbol === opportunitySymbol) ?? null,
    [opportunitySymbol, rows],
  );
  useEffect(() => {
    if (
      opportunitySymbol != null
      && (!isComplete || !opportunityRow?.opportunity_state)
    ) {
      setOpportunitySymbol(null);
    }
  }, [isComplete, opportunityRow, opportunitySymbol]);

  return (
    <Card data-testid="correction-survivors-panel" className="tw overflow-hidden">
      <CardHeader className="flex-wrap items-start">
        <div>
          <CardTitle>Correction Survivors</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {posture?.stance || 'Market posture unavailable'}
          </p>
        </div>
        {posture ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {posture.date || 'Date unavailable'} · {posture.benchmark_symbol || 'Benchmark unavailable'}
          </span>
        ) : null}
      </CardHeader>

      {!isComplete ? (
        <CardContent>
          <p role="status" className="text-sm text-warning">Survivor data incomplete</p>
        </CardContent>
      ) : (
        <>
          <CardContent className="flex flex-wrap items-center gap-1.5">
            <span className="mr-2 text-sm font-semibold tabular-nums">Total survivors: {summary.count}</span>
            {Object.entries(ACTION_STATE_META).map(([state, meta]) => (
              <Badge key={state} tone={BADGE_TONES[meta.color] ?? 'neutral'}>
                {`${meta.label}: ${summary.counts_by_action_state?.[state] ?? 0}`}
              </Badge>
            ))}
          </CardContent>
          <DailyScanRowsTable
            bare
            title="Top Resilience"
            subtitle="Top 20 rows in the persisted survivor ranking. Select an action state for evidence."
            rows={rows}
            chartEnabledSymbols={chartEnabledSymbols}
            navigationSymbols={resolvedNavigationSymbols}
            onOpenChart={onOpenChart}
            emptyMessage="No correction survivors in this snapshot."
            scoreField="resilience_score"
            showActionState
            onOpenOpportunity={(row) => setOpportunitySymbol(row?.symbol ?? null)}
          />
        </>
      )}

      <OpportunityEvidenceDrawer
        open={Boolean(opportunityRow)}
        row={opportunityRow}
        onClose={() => setOpportunitySymbol(null)}
        opportunityTelemetrySurface={opportunityTelemetrySurface}
      />
    </Card>
  );
}

export { CorrectionSurvivorsPanel };
export default CorrectionSurvivorsPanel;
