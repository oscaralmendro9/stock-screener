import { useQuery } from '@tanstack/react-query';
import { Notice } from '@/ui/notice';
import { getThemeDevelopments } from '../../api/themes';
import { Pill, linkClass } from '../../features/themes/themeUi';

const labels = { new_event: 'New event', repeated_coverage: 'Repeated coverage', material_update: 'Substantive update', contradiction: 'Conflicting report', additional_detail: 'Additional detail', uncertain: 'Event identity uncertain' };
function safeUrl(url) {
  try { const value = new URL(url); return ['http:', 'https:'].includes(value.protocol) ? value.href : undefined; } catch { return undefined; }
}
export default function ThemeDevelopmentTimeline({ themeId }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['themeDevelopments', themeId], queryFn: () => getThemeDevelopments(themeId), enabled: !!themeId });
  return <section className="tw mb-6 flex flex-col gap-2 text-foreground">
    <h3 className="text-lg font-semibold">Developments across posts</h3>
    {isLoading && <p>Loading developments…</p>}
    {error && <Notice tone="error">Unable to load development history.</Notice>}
    {data && <>
      {!data.tracking_enabled && <Notice>Automatic development preparation is disabled. Existing observations remain available.</Notice>}
      <p className="tabular-nums">{data.event_count} distinct events · {data.material_update_count} substantive updates</p>
      {!!(data.work_counts?.pending || data.work_counts?.processing || data.work_counts?.retry) && <p className="text-sm">Some sources are awaiting preparation or retry.</p>}
      {!!data.work_counts?.failed && <Notice tone="warning">{data.work_counts.failed} source revisions could not be prepared. Earlier observations are retained.</Notice>}
      {!data.observations.length && <p>No prepared developments for this theme yet.</p>}
      {data.observations.map((row) => <div key={row.id} className={row.superseded ? 'border-l-2 border-border py-2 pl-4 opacity-65' : 'border-l-2 border-border py-2 pl-4'}>
        <div className="flex flex-wrap gap-2"><Pill>{labels[row.classification] || row.classification}</Pill><Pill>{`Event ${row.event_id}`}</Pill>{row.superseded && <Pill tone="muted">Superseded revision</Pill>}</div>
        <p>{row.facts.summary}</p>
        <p className="text-[11px] text-muted-foreground">Source reports: {row.facts.status}. Published {row.published_at ? new Date(row.published_at).toLocaleString() : 'unknown'} · Prepared {new Date(row.available_at).toLocaleString()}</p>
        {safeUrl(row.url) && <div><a href={safeUrl(row.url)} target="_blank" rel="noopener noreferrer" className={linkClass}>{row.source_name || 'Source post'}</a></div>}
        {row.citations.map((citation, i) => <blockquote key={i} className="ml-0 text-sm">{citation.quote} <span className="text-[11px]">({safeUrl(citation.url) ? <a href={safeUrl(citation.url)} target="_blank" rel="noopener noreferrer" className={linkClass}>{citation.source_id === 'primary' ? 'Post evidence' : 'Attached evidence'}</a> : citation.source_id})</span></blockquote>)}
      </div>)}
    </>}
  </section>;
}
