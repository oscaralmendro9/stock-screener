import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';
import { Pill } from '../../features/themes/themeUi';

const words = (value) => String(value || '').replaceAll('_', ' ');
const CARD = 'rounded-md border border-border p-3';

function ReviewSection({ title, empty, children }) {
  return (
    <section className="mt-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-2 flex flex-col gap-2">
        {empty ? <p className="text-muted-foreground">None.</p> : children}
      </div>
    </section>
  );
}

export default function EconomicTaxonomyReview({ review, onRefresh, isRefreshing = false }) {
  if (!review) {
    return <Notice className="tw">No Economic Taxonomy review snapshot is available.</Notice>;
  }
  const stale = (review.operation_previews || []).some((row) => row.stale);

  return (
    <div className="tw text-foreground">
      <div className="flex flex-col justify-between gap-2 sm:flex-row">
        <div>
          <h2 className="text-2xl font-semibold">Economic Taxonomy Review</h2>
          <p className="text-muted-foreground">Generation {review.generation_id}</p>
        </div>
        {stale && (
          <Button variant="secondary" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing…' : 'Refresh review'}
          </Button>
        )}
      </div>

      {stale && <Notice tone="warning" className="mt-4">Stale preview — refresh before approval.</Notice>}

      <ReviewSection title="Split allocations" empty={!review.allocations?.length}>
        {(review.allocations || []).map((row, index) => (
          <div className={CARD} key={`${row.legacy_theme_cluster_id}:${row.allocation_key}:${index}`}>
            <p className="font-bold">Legacy theme {row.legacy_theme_cluster_id}</p>
            <p>
              {row.allocation_key} → {row.destination_theme_id || 'reviewed exclusion'}
            </p>
            <Pill className="mt-2">{words(row.allocation_kind)}</Pill>
          </div>
        ))}
      </ReviewSection>

      <hr className="my-4 border-border" />
      <ReviewSection title="Social decision reconciliation" empty={!review.reconciliation?.length}>
        {(review.reconciliation || []).flatMap((group) =>
          (group.memberships || []).map((row, index) => (
            <div className={CARD} key={`${group.economic_theme_id}:${row.association_id || index}`}>
              <p className="font-bold">
                {row.canonical_symbol || `Security ${row.security_id}`} · {row.market || 'market unavailable'}
              </p>
              <p>{words(row.state)} · {words(row.admission_state)}</p>
              {row.state === 'conflict_review_required' && (
                <Notice tone="error" className="mt-2">Conflict review required</Notice>
              )}
            </div>
          )),
        )}
      </ReviewSection>

      <hr className="my-4 border-border" />
      <ReviewSection title="Operation previews" empty={!review.operation_previews?.length}>
        {(review.operation_previews || []).map((row) => (
          <div className={CARD} key={row.operation_request_id}>
            <div className="flex items-center gap-2">
              <p className="font-bold">{words(row.operation_kind)}</p>
              <Pill>{words(row.status)}</Pill>
              {row.stale && <Pill tone="warning">Stale preview</Pill>}
            </div>
            <p className="mt-2">Preview hash: {row.preview_hash}</p>
            <p>Reviewer reason: {row.reviewer_reason || 'Not provided'}</p>
          </div>
        ))}
      </ReviewSection>
    </div>
  );
}
