import { activeSources, failingSources, useContentSources } from './contentSources';

const TH = 'border-b border-border px-2 py-1.5 text-left font-medium text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5 align-top';

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : 'Never';
}

export default function ThemeSourceHealth() {
  const { data, isLoading, isError } = useContentSources();
  const active = activeSources(data);
  const failing = failingSources(data);

  return (
    <section className="tw">
      <h2 className="mb-2 text-base font-semibold">Theme content sources</h2>
      {isLoading ? (
        <span role="progressbar" aria-label="Loading theme content sources" className="inline-block size-5 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" />
      ) : isError ? (
        <p className="text-sm text-loss">Failed to load theme content sources.</p>
      ) : (
        <>
          <p className={`mb-3 text-sm ${failing.length === 0 ? 'text-gain' : 'text-muted-foreground'}`}>
            {active.length} active · {failing.length === 0 ? 'all healthy' : `${failing.length} failing`}
          </p>
          {failing.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    {['Source', 'Failures', 'Last success', 'Last error'].map((label) => (
                      <th key={label} scope="col" className={TH}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {failing.map((source) => (
                    <tr key={source.id}>
                      <td className={TD}>
                        <p>{source.name}</p>
                        <p className="text-xs text-muted-foreground">{source.source_type}</p>
                      </td>
                      <td className={`${TD} tabular-nums`}>{source.consecutive_failures}× in a row</td>
                      <td className={`${TD} tabular-nums`}>{formatTime(source.last_success_at)}</td>
                      <td className={`${TD} max-w-[420px]`}>
                        <p className="truncate" title={source.last_error || undefined}>{source.last_error || '—'}</p>
                        {source.last_error_at && (
                          <p className="text-xs text-muted-foreground tabular-nums">{formatTime(source.last_error_at)}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
