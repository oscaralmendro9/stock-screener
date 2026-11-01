import { formatOptionsMetric } from './optionsFormatting';

const humanize = (value) => String(value || '').replaceAll('_', ' ');

export function UnavailableMetric({ metric }) {
  const reason = metric?.reason_codes?.map(humanize).join(', ') || 'metric unavailable';
  return (
    <span className="text-muted-foreground" title={reason} aria-label={`Unavailable: ${reason}`}>—</span>
  );
}

const percentageMetrics = new Set([
  'atm_iv',
  'skew_25_delta',
  'realized_volatility',
  'vrp',
  'iv_percentile',
  'iv_rank',
  'atm_iv_change_5',
  'skew_25_delta_change_5',
  'realized_volatility_change_5',
  'vrp_change_5',
]);

export default function OptionsMetricTable({ metrics }) {
  return (
    <table aria-label="Options metrics" className="w-full border-separate border-spacing-0 text-xs">
      <tbody>
        {Object.entries(metrics).map(([name, metric]) => (
          <tr key={name}>
            <th scope="row" className="border-b border-border px-4 py-1.5 text-left font-normal text-muted-foreground">
              {metric.label}
            </th>
            <td className="border-b border-border px-4 py-1.5 text-right font-medium tabular-nums">
              {metric.available
                ? formatOptionsMetric(metric, {
                    percent: percentageMetrics.has(name),
                  })
                : <UnavailableMetric metric={metric} />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
