import { Badge } from '@/ui/badge';
import { Notice } from '@/ui/notice';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
});

const formatDate = (value) => (value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : 'Unknown');
const formatTime = (value) => (value ? timeFormatter.format(new Date(value)) : 'Unavailable');

export default function OptionsStatusBanner({ data }) {
  const buildingCount = data.items?.filter((item) => item.state === 'building_history').length || 0;
  return (
    <div className="tw mb-4 flex flex-col gap-3">
      {data.stale && (
        <Notice tone="warning" role="alert">
          Showing the previous published options snapshot. Equity data may be newer; use the options observation time below.
        </Notice>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums">
        <span>
          Equity source: {formatDate(data.source_as_of_date)} · run {data.source_feature_run_id ?? 'unknown'}
        </span>
        <span className="text-muted-foreground">
          Options observed: {formatTime(data.latest_observation_at)}
        </span>
        <span className="text-muted-foreground">
          {data.provider === 'yahoo' ? 'Yahoo' : data.provider} · {data.calculation_version} · {Math.round(data.coverage * 100)}% coverage
        </span>
        {buildingCount > 0 && <Badge>{`${buildingCount} building history`}</Badge>}
      </div>
    </div>
  );
}
