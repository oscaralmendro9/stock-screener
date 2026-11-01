import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';

const PILL = 'inline-flex h-6 items-center rounded-full border px-2 text-[11px] whitespace-nowrap';
const QUOTE = 'm-0 mt-1 border-l-2 border-border pl-2 text-sm';

// Presentational view of one research job and, when ready, its shadow
// preview. The preview is an unaccepted research result: it never claims
// live membership, a company-wide "verified" badge or a confidence score.

const UNKNOWN_MATERIALITY = 'Not separately disclosed in reviewed evidence';

const SUPPORT_LABELS = {
  primary_explicit: 'Primary source — explicit',
  primary_synthesis: 'Primary source — bounded synthesis',
  secondary_reported: 'Secondary report only',
  inferred_unverified: 'Inferred, not verified',
  unresolved: 'Unresolved',
};

const STATUS_LABELS = {
  research: 'Research', announced: 'Announced', qualification: 'Qualification',
  commercially_available: 'Commercially available',
  shipping_or_operating: 'Shipping / operating', discontinued: 'Discontinued',
  unknown: 'Stage unknown',
};

const CONDITION_TEXT = {
  review_required: 'Issuer identity needs administrator review before research continues.',
  multiple_ciks: 'More than one SEC CIK matches this ticker.',
  issuer_link_required: 'No accepted issuer link for this listing.',
  sec_user_agent_not_configured: 'SEC access is not configured (contact User-Agent missing).',
  route_not_approved: 'The subscription text route is not enabled.',
  subscription_credentials_missing: 'Subscription credentials are not configured.',
  allocation_not_configured: 'No daily research allocation is configured.',
  theme_definition_unavailable: 'The theme has no sealed definition to research against.',
};

const shortDate = (value) => (value ? String(value).slice(0, 10) : 'undated');

function materialityText(materiality) {
  if (!materiality || materiality.display || materiality.basis === 'unknown') {
    return materiality?.display || UNKNOWN_MATERIALITY;
  }
  if (materiality.qualitative_label) return `Qualitative: ${materiality.qualitative_label}`;
  const scope = materiality.scope_label ? ` of ${materiality.scope_label}` : '';
  const unit = materiality.unit ? ` ${materiality.unit}` : '';
  // The currency is stored apart from the unit: show it unless the unit
  // already names it (e.g. "USD_million").
  const currency = materiality.currency
    && !(materiality.unit || '').toUpperCase().includes(materiality.currency.toUpperCase())
    ? ` ${materiality.currency}` : '';
  const denominator = materiality.denominator_definition
    ? ` (denominator: ${materiality.denominator_definition})` : '';
  return `${materiality.metric}${currency} ${materiality.value}${unit}${scope}, ${materiality.period}${denominator}`;
}

function ClaimCard({ claim }) {
  // Verifier reasons (e.g. status_not_stated) are warnings too, not just
  // registry holds and staleness.
  const reasons = claim.hold_reasons || [];
  const held = claim.active_holds?.length > 0
    || reasons.length > 0
    || claim.freshness_state !== 'current';
  const primary = claim.support_basis?.startsWith('primary') && reasons.length === 0;
  return (
    <div className="rounded-md border border-border p-3" data-testid="exposure-claim">
      <div className="mb-1.5 flex flex-wrap gap-2">
        <span className={cn(PILL, 'border-transparent bg-surface-subtle')}>{claim.claim_kind.replaceAll('_', ' ')}</span>
        <span className={cn(PILL, primary ? 'border-gain/60 text-gain' : 'border-border')}>
          {SUPPORT_LABELS[claim.support_basis] || claim.support_basis}
        </span>
        <span className={cn(PILL, 'border-border')}>{STATUS_LABELS[claim.commercial_status] || claim.commercial_status}</span>
        {claim.conclusion !== 'supported' && (
          <span className={cn(PILL, 'border-transparent bg-warning/15 text-warning')}>{`Conclusion: ${claim.conclusion}`}</span>
        )}
        {claim.carried_forward && <span className={cn(PILL, 'border-border')}>Carried forward</span>}
        {(claim.active_holds || []).map((hold) => (
          <span key={hold} className={cn(PILL, 'border-transparent bg-warning/15 text-warning')}>{`Hold: ${hold}`}</span>
        ))}
        {reasons.map((reason) => (
          <span key={`check-${reason}`} className={cn(PILL, 'border-warning/60 text-warning')}>{`Check: ${reason}`}</span>
        ))}
      </div>
      <p>{claim.statement}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Supported as of {shortDate(claim.supported_as_of)}
        {claim.fresh_until ? ` · usable until ${shortDate(claim.fresh_until)}` : ''}
        {' · '}freshness {claim.freshness_state}
        {claim.reporting_scope === 'segment_or_subsidiary' && claim.scope_label
          ? ` · scope: ${claim.scope_label}` : ''}
      </p>
      <p className="mt-1 text-sm">
        Materiality: {materialityText(claim.materiality)}
      </p>
      {/* The wording a displayed measure rests on, shown as plain text. */}
      {(claim.materiality?.evidence || []).map((item) => (
        <blockquote key={`${item.role}-${item.passage_id}`} className={QUOTE}>
          <span className="text-[11px] text-muted-foreground">Materiality {item.role}:{' '}</span>
          {item.quote}
        </blockquote>
      ))}
      {held && (
        <p className="mt-1 text-sm text-warning">
          Held from new automated use until reviewed or refreshed.
        </p>
      )}
      <ul className="mt-1">
        {(claim.evidence || []).map((item) => (
          <li key={item.link_id} className="py-1">
            <p className="text-[11px] text-muted-foreground">
              {item.direction === 'conflicting' ? 'Conflicting' : 'Supporting'}
              {' · '}{item.evidence_role.replaceAll('_', ' ')}
              {item.language && item.language !== 'en' ? ` · ${item.language}` : ''}
            </p>
            {/* Original passages render as plain text, never as HTML. */}
            <blockquote className={cn(QUOTE, 'mt-0')}>{item.quote}</blockquote>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ExposureResearchPanel({ job, preview }) {
  if (!job) return null;
  const condition = job.condition ? CONDITION_TEXT[job.condition] || job.condition : null;
  const gaps = (preview?.coverage || []).filter(
    (item) => item.outcome !== 'complete_for_requested_scope',
  );
  return (
    <div data-testid="exposure-research-panel" className="tw text-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-bold">Research job</h3>
        <span className={cn(PILL, 'border-transparent bg-surface-subtle')}>{job.state || 'queued'}</span>
        <span className={cn(PILL, 'border-border')}>Research progress — not accepted</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(job.stages || []).map((stage) => (
          <span key={stage.stage} className={cn(PILL, 'border-border')}>
            {`${stage.stage.replaceAll('_', ' ')}: ${stage.pause_reason || stage.status}`}
          </span>
        ))}
      </div>
      {condition && (
        <Notice tone={job.state === 'terminal_failure' ? 'error' : 'warning'} className="mt-2">
          {condition}
        </Notice>
      )}

      {preview && (
        <div className="mt-4">
          <hr className="mb-3 border-border" />
          <Notice>
            Shadow preview — research result for review only. It does not change theme membership
            or any live basket.
          </Notice>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Dossier revision {preview.revision_number} · {preview.assessment_revision_id}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {preview.claims.map((claim) => <ClaimCard key={claim.claim_revision_id} claim={claim} />)}
            {!preview.claims.length && (
              <p className="text-muted-foreground">
                No supported claims in the reviewed evidence. This is not evidence of no exposure.
              </p>
            )}
          </div>
          {(preview.conflicts || []).length > 0 && (
            <div className="mt-3" data-testid="exposure-conflicts">
              <h4 className="text-sm font-semibold">Same-date disagreements (held for review)</h4>
              {preview.conflicts.flatMap((conflict) => (conflict.evidence || []).map((item, index) => (
                <blockquote key={`${conflict.proposition}:${item.passage_id}:${index}`} className={QUOTE}>
                  <span className="text-[11px] text-muted-foreground">
                    Set aside ({(item.commercial_status || 'unknown').replaceAll('_', ' ')}):{' '}
                  </span>
                  {/* Original passages render as plain text, never as HTML. */}
                  {item.quote}
                </blockquote>
              )))}
            </div>
          )}
          {gaps.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-semibold">Coverage gaps</h4>
              {gaps.map((item, index) => (
                <p key={`${item.route}:${item.reason}:${index}`} className="text-sm text-muted-foreground">
                  {item.route} · {item.outcome.replaceAll('_', ' ')}{item.reason ? ` · ${item.reason}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
