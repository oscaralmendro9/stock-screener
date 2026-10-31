/**
 * Market coverage: one row per active market saying whether it can run, and
 * in plain words what is missing when it cannot (see coverageProblems.js).
 */
import { cn } from '@/lib/cn';
import { Badge } from '@/ui/badge';
import { Notice } from '@/ui/notice';

import { marketCoverage } from './coverageProblems';

const TH = 'border-b border-border px-2 py-1.5 text-left font-medium text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5 align-top';

const WORKER_LABELS = [
  ['market_jobs', 'Pipeline'],
  ['data_fetch', 'Prices'],
  ['user_scans', 'Scans'],
];

function ageLabel(iso) {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (Number.isNaN(minutes)) return '—';
  if (minutes < 60) return `${Math.max(minutes, 0)}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function Workers({ workers }) {
  return (
    <span className="flex flex-wrap gap-x-3 tabular-nums">
      {WORKER_LABELS.map(([family, label]) => {
        const count = workers[family];
        return (
          <span key={family} className={count === 0 ? 'text-loss' : undefined}>
            {label}: {count ?? '—'}
          </span>
        );
      })}
    </span>
  );
}

// Problems first (warning), then what is unknown or merely notable; OK only
// when there is nothing at all to say.
function Status({ row, tracked }) {
  const unchecked = uncheckedOf(row, tracked);
  if (!row.problems.length && !unchecked.length && !row.notes.length) {
    return <span className="text-gain">OK</span>;
  }
  return (
    <div>
      {row.problems.map((problem) => (
        <p key={problem} className="text-warning">{problem}</p>
      ))}
      {[...unchecked, ...row.notes].map((line) => (
        <p key={line} className="text-muted-foreground">{line}</p>
      ))}
    </div>
  );
}

// What could not be checked: never read as OK, and keeps the summary from
// calling the market wired up. tracked false: pipeline runs are not shown here.
function uncheckedOf(row, tracked) {
  if (row.outsideDeployment) return [];
  const unchecked = [];
  if (Object.values(row.workers).some((count) => count === null)) unchecked.push('Worker counts unknown');
  if (tracked && row.enabled && !row.pipelineKnown) unchecked.push('Pipeline runs unknown');
  if (tracked && row.pipelineNeverRan) unchecked.push('No daily pipeline run recorded yet');
  if (tracked && row.pipelineScheduleUnconfirmed) unchecked.push("Last run was manual, so Beat's schedule is not confirmed");
  return unchecked;
}

// markets: active markets in catalog order. queues: the jobs payload's queue
// summaries. tasks: scheduled tasks; undefined while loading, null when the
// tasks feature is off (pipeline runs are then left out). deploymentMarkets:
// the deployment's ENABLED_MARKETS (see coverageProblems.js).
export default function MarketCoverage({ markets, enabledMarkets = [], deploymentMarkets, queues = [], tasks }) {
  const tracked = tasks !== null;
  const enabled = new Set(enabledMarkets);
  const rows = [...markets]
    .sort((a, b) => Number(enabled.has(b)) - Number(enabled.has(a)))
    .map((market) => marketCoverage({
      market,
      enabled: enabled.has(market),
      deploymentMarkets,
      queues,
      pipelineTask: tasks?.find((task) => task.market === market && task.name.startsWith('daily-market-pipeline-')),
    }));
  const needAttention = rows.filter((row) => row.problems.length).map((row) => row.market);
  const allChecked = rows.length > 0 && rows.every((row) => uncheckedOf(row, tracked).length === 0);

  return (
    <section className="tw mt-6">
      <h2 className="mb-1 text-base font-semibold">Market coverage</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Whether each market can run. The app&apos;s enabled markets are chosen at setup; workers and Beat follow
        ENABLED_MARKETS in the deployment environment.
      </p>
      {needAttention.length > 0 ? (
        <Notice tone="warning" role="alert" className="mb-3">
          {needAttention.length === 1 ? '1 market needs' : `${needAttention.length} markets need`} attention:{' '}
          {needAttention.join(', ')}.
        </Notice>
      ) : allChecked ? (
        <p className="mb-2 text-sm text-gain">Every market shown is wired up.</p>
      ) : rows.length > 0 && (
        <p className="mb-2 text-sm text-muted-foreground">Some checks are not available yet.</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {['Market', 'In app', 'Workers', 'Daily pipeline', 'Status'].map((label) => (
                <th key={label} scope="col" className={TH}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.market}>
                <th scope="row" className={cn(TD, 'text-left font-semibold')}>{row.market}</th>
                <td className={TD}>
                  <Badge tone={row.enabled ? 'gain' : 'neutral'}>{row.enabled ? 'Enabled' : 'Not enabled'}</Badge>
                </td>
                <td className={TD}><Workers workers={row.workers} /></td>
                <td className={cn(TD, 'tabular-nums')}>
                  {!row.pipelineKnown ? '—' : row.pipelineRun?.started_at ? ageLabel(row.pipelineRun.started_at) : 'Never'}
                </td>
                <td className={TD}><Status row={row} tracked={tracked} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
