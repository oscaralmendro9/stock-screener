import {
  explanationMap, formatSocialScore, socialCoverage, socialStateLabel,
} from './socialSignalPresentation';

const HEADINGS = [
  'Symbol', 'Market', 'Queue', 'Social', 'Confirmation', 'Mentions', 'Authors', 'Setup',
  'RS', 'Group', 'Theme', 'State', 'Freshness',
];
const TONE = { success: 'text-gain', warning: 'text-warning', error: 'text-loss' };
const TD = 'border-b border-border px-2 py-1.5';

export default function SocialSignalsTable({ title, items = [], window, onSelect }) {
  if (!items.length) return null;
  return (
    <div className="tw mb-4 text-foreground">
      {title ? <h3 className="mb-1.5 text-sm font-semibold">{title}</h3> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table aria-label={title || 'Ranked Social Signals'} className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {HEADINGS.map((heading) => (
                <th key={heading} scope="col" className="border-b border-border px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-muted-foreground">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const explanation = explanationMap(item);
              const coverage = socialCoverage(item, window);
              return (
                <tr
                  key={item.candidate_key}
                  tabIndex={0}
                  onClick={() => onSelect?.(item)}
                  onKeyDown={(event) => event.key === 'Enter' && onSelect?.(item)}
                  className="cursor-pointer outline-none hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <td className={`${TD} font-bold`}>{item.canonical_symbol}</td>
                  <td className={TD}>{item.market || 'Global'}</td>
                  <td className={`${TD} tabular-nums`}>{formatSocialScore(item.queue_score)}</td>
                  <td className={`${TD} tabular-nums`}>{formatSocialScore(item.social_score)}</td>
                  <td className={`${TD} tabular-nums`}>{formatSocialScore(item.confirmation_score)}</td>
                  <td className={`${TD} tabular-nums`}>{item.mention_count}</td>
                  <td className={`${TD} tabular-nums`}>{explanation.author_count ?? '—'}</td>
                  <td className={TD}>{explanation.readiness || formatSocialScore(explanation.setup_score)}</td>
                  <td className={`${TD} tabular-nums`}>{formatSocialScore(explanation.rs_rating_3m ?? explanation.rs_rating_1m)}</td>
                  <td className={`${TD} tabular-nums`}>{explanation.group_rank ?? '—'}</td>
                  <td className={TD}>{explanation.theme || explanation.linked_theme || '—'}</td>
                  <td className={TD}>
                    <span className="inline-flex h-5 items-center rounded-full border border-border px-2 text-[11px] whitespace-nowrap">
                      {socialStateLabel(item.state)}
                    </span>
                  </td>
                  <td className={TD}>
                    <span className="block text-[11px]">{coverage.label}</span>
                    <span className={`text-[11px] ${TONE[coverage.tone] || 'text-muted-foreground'}`}>{coverage.detail}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
