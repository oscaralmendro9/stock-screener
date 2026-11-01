import { useEffect, useRef } from 'react';

import { Sheet, SheetContent, SheetTitle } from '@/ui/sheet';

import { recordOpportunityEvidenceOpen } from '../../features/opportunityState/opportunityTelemetry';
import ActionStateBadge from './ActionStateBadge';

const NOT_AVAILABLE = 'Not available';

const PILLARS = Object.freeze([
  ['benchmark_leadership', 'Benchmark leadership'],
  ['multi_horizon_rs', 'Multi-horizon RS'],
  ['trend_integrity', 'Trend integrity'],
  ['structure_tightness', 'Structure/tightness'],
  ['liquidity_freshness', 'Liquidity/freshness'],
]);

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return NOT_AVAILABLE;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatScore = (score) => {
  if (score === null || score === undefined || score === '') return NOT_AVAILABLE;
  const numericScore = Number(score);
  return Number.isFinite(numericScore) ? numericScore.toFixed(1) : String(score);
};

const formatCode = (value) => {
  const words = String(value).replace(/[_-]/g, ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right tabular-nums">{formatValue(value)}</span>
    </div>
  );
}

function EvidenceList({ values, formatItem = formatCode }) {
  if (!Array.isArray(values) || values.length === 0) {
    return <p className="text-sm text-muted-foreground">{NOT_AVAILABLE}</p>;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {values.map((value, index) => (
        <li key={`${String(value)}-${index}`} className="text-sm">{formatItem(value)}</li>
      ))}
    </ul>
  );
}

function EvidenceDetails({ values, formatValues = false }) {
  if (!isRecord(values) || Object.keys(values).length === 0) {
    return <p className="text-sm text-muted-foreground">{NOT_AVAILABLE}</p>;
  }

  return Object.entries(values).map(([key, value]) => (
    <Detail
      key={key}
      label={formatCode(key)}
      value={formatValues && typeof value === 'string' ? formatCode(value) : value}
    />
  ));
}

function OpportunityEvidenceDrawer({
  open,
  row,
  onClose,
  onEvidenceOpen,
  opportunityTelemetrySurface,
}) {
  const wasOpen = useRef(false);
  const hasRow = isRecord(row);
  const isOpen = Boolean(open && hasRow);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      onEvidenceOpen?.(row);
      if (opportunityTelemetrySurface) {
        const evidence = isRecord(row.opportunity_state) ? row.opportunity_state : {};
        void recordOpportunityEvidenceOpen(evidence.market, opportunityTelemetrySurface);
      }
    }
    wasOpen.current = isOpen;
  }, [isOpen, onEvidenceOpen, opportunityTelemetrySurface, row]);

  if (!hasRow) return null;

  const evidence = isRecord(row.opportunity_state) ? row.opportunity_state : {};
  const scorePillars = isRecord(evidence.score_pillars)
    ? evidence.score_pillars
    : {};

  return (
    <Sheet open={isOpen} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <SheetContent
        side="right"
        showClose
        closeLabel="Close opportunity evidence"
        aria-describedby={undefined}
        className="p-4 sm:w-[420px]"
      >
        <SheetTitle id="opportunity-evidence-title" className="mb-4 pr-10 text-lg font-semibold">
          Opportunity evidence
        </SheetTitle>

        <Section title="Action state">
          <ActionStateBadge state={row.action_state} />
        </Section>

        <Section title="Resilience score">
          <p className="text-3xl font-semibold tabular-nums">{formatScore(row.resilience_score)}</p>
        </Section>

        <Section title="Score pillars">
          {PILLARS.map(([key, label]) => <Detail key={key} label={label} value={scorePillars[key]} />)}
        </Section>

        <Section title="Data availability">
          <EvidenceDetails values={evidence.data_availability} formatValues />
        </Section>

        <Section title="Metrics">
          <EvidenceDetails values={evidence.metrics} />
        </Section>

        <Section title="Passed checks">
          <EvidenceList values={evidence.passed_checks} />
        </Section>

        <Section title="Failed checks">
          <EvidenceList values={evidence.failed_checks} />
        </Section>

        <Section title="Warnings">
          <EvidenceList values={evidence.warnings} />
        </Section>

        <Section title="Action reasons">
          <EvidenceList values={evidence.action_reasons} formatItem={(reason) => String(reason)} />
        </Section>

        <Section title="Provenance">
          <Detail label="Market" value={evidence.market} />
          <Detail label="MIC" value={evidence.mic} />
          <Detail label="Benchmark" value={evidence.benchmark_symbol} />
          <Detail label="As-of date" value={evidence.as_of_date} />
          <Detail label="Benchmark date" value={evidence.benchmark_as_of_date} />
        </Section>
      </SheetContent>
    </Sheet>
  );
}

export { OpportunityEvidenceDrawer };
export default OpportunityEvidenceDrawer;
