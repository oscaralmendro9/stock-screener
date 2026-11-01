import { Dialog, DialogContent } from '@/ui/dialog';
import { Pill } from '../themeUi';

const METRICS = [
  ['technical_attention', 'Technical Attention'],
  ['fundamental_attention', 'Fundamental Attention'],
  ['narrative_attention', 'Narrative Attention'],
  ['emerging', 'Emerging'],
  ['broad_confirmation', 'Broad Confirmation'],
];

const displayMetric = (metric = {}) => {
  if (metric.availability !== 'available') {
    return `Unavailable${metric.components?.reason ? ` — ${metric.components.reason}` : ''}`;
  }
  if (metric.percentile !== null && metric.percentile !== undefined) {
    return `${Number(metric.percentile).toFixed(0)} percentile`;
  }
  if (metric.raw_value !== null && metric.raw_value !== undefined) {
    return String(metric.raw_value);
  }
  return 'Available';
};

function Section({ title, children }) {
  return (
    <section className="mt-4">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

function EmptyAwareList({ rows, renderRow }) {
  if (!rows?.length) {
    return <p className="text-muted-foreground">No published records.</p>;
  }
  return <div className="flex flex-col gap-1">{rows.map(renderRow)}</div>;
}

export default function EconomicThemeDetailModal({
  open,
  theme,
  generationId,
  onClose,
}) {
  if (!theme) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title={theme.display_name} size="lg">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Pill>{theme.lifecycle || 'lifecycle unavailable'}</Pill>
          <Pill tone="muted">{`Identity ${theme.economic_theme_id}`}</Pill>
          {generationId && <Pill tone="muted">{`Generation ${generationId}`}</Pill>}
        </div>

        <p>{theme.definition || 'Definition unavailable.'}</p>
        <p className="mt-2 text-muted-foreground">{theme.mechanism || 'Economic mechanism unavailable.'}</p>

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {METRICS.map(([key, label]) => (
            <div key={key} className="rounded-md border border-border p-3" data-testid={`metric-${key}`}>
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="font-bold">{displayMetric(theme.metrics?.[key])}</p>
            </div>
          ))}
        </div>

        <Section title="Evidence provenance">
          <div className="flex flex-col gap-4 sm:flex-row tabular-nums">
            <p>Direct evidence: {theme.direct_observation_count ?? 0}</p>
            <p>Derived evidence: {theme.derived_observation_count ?? 0}</p>
            <p>Independent source families: {theme.deduplicated_source_family_count ?? 0}</p>
          </div>
        </Section>

        <hr className="my-4 border-border" />
        <Section title="Facets">
          <div className="flex flex-wrap gap-2">
            {(theme.facets || []).map((facet) => (
              <Pill key={`${facet.dimension}:${facet.value || facet.display_value}`}>
                {`${facet.dimension}: ${facet.display_value || facet.value}`}
              </Pill>
            ))}
            {!theme.facets?.length && <p className="text-muted-foreground">No facets.</p>}
          </div>
        </Section>

        <Section title="Relationships">
          <EmptyAwareList
            rows={theme.relationships}
            renderRow={(row, index) => (
              <p key={row.id || index}>
                {row.kind} · {row.source_theme_id || theme.economic_theme_id} → {row.target_theme_id}
              </p>
            )}
          />
        </Section>

        <Section title="Structured signals">
          <EmptyAwareList
            rows={theme.signals}
            renderRow={(row, index) => (
              <p key={row.signal_id || index}>
                {row.signal_kind} · {row.canonical_symbol || 'theme-wide'}
              </p>
            )}
          />
        </Section>

        <Section title="Developments">
          <EmptyAwareList
            rows={theme.developments}
            renderRow={(row, index) => (
              <p key={row.observation_id || index}>
                {row.classification || 'unclassified'} · {row.analysis_channel || 'channel unavailable'}
              </p>
            )}
          />
        </Section>

        <Section title="Constituents">
          <EmptyAwareList
            rows={theme.constituents}
            renderRow={(row, index) => (
              <p key={row.exposure_id || index}>
                {row.canonical_symbol || `Security ${row.security_id}`} · {row.market || 'market unavailable'} · {row.exposure_kind}
              </p>
            )}
          />
        </Section>
      </DialogContent>
    </Dialog>
  );
}
