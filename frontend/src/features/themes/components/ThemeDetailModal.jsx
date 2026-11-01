import ThemeDevelopmentTimeline from '../../../components/Themes/ThemeDevelopmentTimeline';
import { useQuery } from '@tanstack/react-query';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Dialog, DialogContent } from '@/ui/dialog';
import { cn } from '@/lib/cn';
import {
  getThemeDetail,
  getThemeHistory,
  getThemeRelationshipGraph,
  getThemeMentions,
} from '../../../api/themes';
import TranslatedText from '../../../components/common/TranslatedText';
import { AttachmentEvidence } from '../../../components/Themes/ThemeSourcesModal';
import { Pill, Spinner } from '../themeUi';
import { linkClass, tdClass, thClass } from '../themeClasses';

function getSafeExternalUrl(url) {
  if (!url) {
    return null;
  }
  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl.href : null;
  } catch {
    return null;
  }
}

const RELATION_TONE = { subset: 'warning', related: 'neutral' };
const relationTooltip = (type) => (
  type === 'subset'
    ? 'Subset: one theme is mostly contained by another. Review before merging.'
    : type === 'related'
      ? 'Related: topical overlap exists, but themes can still be distinct.'
      : 'Distinct: themes should remain separate unless new evidence appears.'
);
const pct = (value) => `${(Math.max(0, Math.min(1, value || 0)) * 100).toFixed(0)}%`;
const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)' };

function Stat({ value, label, className }) {
  return (
    <div className="rounded-md bg-surface-subtle p-2 text-center">
      <p className={cn('text-xl font-bold tabular-nums', className)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function TableSection({ title, maxHeight, extra, children }) {
  return (
    <section className="mt-6">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-semibold">{title}</h3>
        {extra}
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-separate border-spacing-0 text-sm">{children}</table>
      </div>
    </section>
  );
}

export default function ThemeDetailModal({ themeId, themeName, open, onClose, selectedPipeline }) {
  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['themeDetail', themeId],
    queryFn: () => getThemeDetail(themeId),
    enabled: !!themeId && open,
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['themeHistory', themeId],
    queryFn: () => getThemeHistory(themeId, 30),
    enabled: !!themeId && open,
  });

  const { data: relationshipGraph, isLoading: isLoadingGraph } = useQuery({
    queryKey: ['themeRelationshipGraph', themeId, selectedPipeline],
    queryFn: () => getThemeRelationshipGraph(themeId, { pipeline: selectedPipeline, limit: 120 }),
    enabled: !!themeId && open,
  });

  const { data: mentions, isLoading: isLoadingMentions } = useQuery({
    queryKey: ['themeMentions', themeId],
    queryFn: () => getThemeMentions(themeId, 50),
    enabled: !!themeId && open,
  });

  const isLoading = isLoadingDetail || isLoadingHistory || isLoadingGraph || isLoadingMentions;
  const momentum = detail?.metrics?.momentum_score;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title={detail?.theme?.display_name || themeName} size="lg">
        {detail?.theme?.is_validated && <Pill tone="gain" className="mb-3">Validated</Pill>}
        {isLoading ? (
          <div className="flex justify-center p-8"><Spinner label="Loading theme" /></div>
        ) : detail ? (
          <div>
            <ThemeDevelopmentTimeline themeId={themeId} />
            {detail.metrics && (
              <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4">
                <Stat value={`#${detail.metrics.rank || '-'}`} label="Rank" />
                <Stat
                  value={momentum?.toFixed(0) || '-'}
                  label="Momentum"
                  className={momentum >= 70 ? 'text-gain' : momentum >= 50 ? 'text-warning' : 'text-loss'}
                />
                <Stat value={`${detail.metrics.mention_velocity?.toFixed(1) || '-'}x`} label="Velocity" />
                <Stat value={detail.metrics.basket_rs_vs_spy?.toFixed(0) || '-'} label="RS vs SPY" />
                <Stat value={`${detail.metrics.pct_above_50ma?.toFixed(0) || '-'}%`} label="Above 50MA" />
                <Stat value={detail.metrics.num_constituents || 0} label="Stocks" />
              </div>
            )}

            {history?.history?.length > 0 && (
              <section className="mb-6">
                <h3 className="text-sm font-semibold">Momentum Score History</h3>
                <p className="text-[11px] text-muted-foreground">Historical scores retain the grouping used on each date.</p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history.history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={AXIS} tickFormatter={(value) => value.slice(5)} />
                      <YAxis domain={[0, 100]} tick={AXIS} />
                      <RechartsTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} />
                      <Area type="monotone" dataKey="momentum_score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} name="Momentum" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {detail.constituents?.length > 0 && (
              <TableSection title={`Theme Constituents (${detail.constituents.length})`} maxHeight={250}>
                <thead>
                  <tr>
                    <th scope="col" className={thClass()}>Sym</th>
                    <th scope="col" className={thClass('right')}>Ment.</th>
                    <th scope="col" className={thClass('right')}>Conf</th>
                    <th scope="col" className={thClass('right')}>Corr</th>
                    <th scope="col" className={thClass()}>Src</th>
                    <th scope="col" className={thClass()}>Last</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.constituents.map((stock) => (
                    <tr key={stock.symbol} className="hover:bg-surface-subtle">
                      <td className={cn(tdClass, 'font-semibold')}>{stock.symbol}</td>
                      <td className={cn(tdClass, 'text-right tabular-nums')}>{stock.mention_count}</td>
                      <td className={cn(tdClass, 'text-right tabular-nums', stock.confidence >= 0.8 ? 'text-gain' : stock.confidence >= 0.5 ? 'text-warning' : 'text-muted-foreground')}>
                        {(stock.confidence * 100).toFixed(0)}%
                      </td>
                      <td className={cn(tdClass, 'text-right tabular-nums')}>{stock.correlation_to_theme?.toFixed(2) || '-'}</td>
                      <td className={tdClass}><span className="rounded-sm bg-surface-subtle px-1 text-[11px]">{stock.source || 'unk'}</span></td>
                      <td className={cn(tdClass, 'text-[11px] text-muted-foreground tabular-nums')}>
                        {stock.last_mentioned_at ? new Date(stock.last_mentioned_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableSection>
            )}

            {mentions?.mentions?.length > 0 ? (
              <TableSection title={`Source Articles (${mentions?.total_count || 0})`} maxHeight={300}>
                <thead>
                  <tr>
                    <th scope="col" className={thClass()}>Title</th>
                    <th scope="col" className={thClass()}>Excerpt</th>
                    <th scope="col" className={thClass()}>Source</th>
                    <th scope="col" className={thClass()}>Sentiment</th>
                    <th scope="col" className={thClass()}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mentions.mentions.map((mention) => {
                    const safeContentUrl = getSafeExternalUrl(mention.content_url);
                    return (
                      <tr key={mention.mention_id} className="align-top hover:bg-surface-subtle">
                        <td className={cn(tdClass, 'max-w-[200px]')}>
                          {safeContentUrl ? (
                            <a href={safeContentUrl} target="_blank" rel="noopener noreferrer" className={cn(linkClass, 'line-clamp-2 text-[11px] font-medium')}>
                              {mention.content_title || 'Untitled'}
                            </a>
                          ) : (
                            <span className="line-clamp-2 text-[11px] font-medium">{mention.content_title || 'Untitled'}</span>
                          )}
                        </td>
                        <td className={cn(tdClass, 'max-w-[280px]')}>
                          {mention.claim_support?.theme === 'inferred' && (
                            <span className="block text-[11px] text-muted-foreground">Theme inferred from source context</span>
                          )}
                          {mention.development && (
                            <p className="mb-1.5 text-[11px]"><strong>Development: </strong>{mention.development}</p>
                          )}
                          <AttachmentEvidence status={mention.attachment_status} attachments={mention.attachments} />
                          <TranslatedText
                            originalText={mention.excerpt}
                            translatedText={mention.translated_excerpt}
                            sourceLanguage={mention.source_language}
                            translationMetadata={mention.translation_metadata}
                            variant="caption"
                            textClassName="line-clamp-2 text-muted-foreground"
                          />
                        </td>
                        <td className={tdClass}>
                          <span className="flex items-center gap-1">
                            {mention.source_name && <span className="text-[11px] font-medium">{mention.source_name}</span>}
                            <span className="rounded-sm bg-surface-subtle px-1 text-[11px]">{mention.source_type}</span>
                          </span>
                        </td>
                        <td className={tdClass}>
                          <Pill tone={mention.sentiment === 'bullish' ? 'gain' : mention.sentiment === 'bearish' ? 'loss' : 'muted'} className="h-[18px]">
                            {mention.sentiment || 'neutral'}
                          </Pill>
                        </td>
                        <td className={cn(tdClass, 'text-[11px] whitespace-nowrap text-muted-foreground tabular-nums')}>
                          {mention.published_at ? new Date(mention.published_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableSection>
            ) : (
              <section className="mt-6">
                <h3 className="mb-1 text-xs font-semibold">{`Source Articles (${mentions?.total_count || 0})`}</h3>
                <p className="py-4 text-center text-[11px] text-muted-foreground">No articles found</p>
              </section>
            )}

            {detail.relationships?.length > 0 && (
              <TableSection title={`Theme Relationships (${detail.relationships.length})`} maxHeight={220}>
                <thead>
                  <tr>
                    <th scope="col" className={thClass()}>Direction</th>
                    <th scope="col" className={thClass()}>Type</th>
                    <th scope="col" className={thClass()}>Theme</th>
                    <th scope="col" className={thClass('right')}>Conf</th>
                    <th scope="col" className={thClass()}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.relationships.map((relationship) => (
                    <tr key={relationship.relation_id} className="hover:bg-surface-subtle">
                      <td className={tdClass}><Pill tone={relationship.direction === 'outgoing' ? 'neutral' : 'muted'}>{relationship.direction}</Pill></td>
                      <td className={tdClass}>
                        <Pill tone={RELATION_TONE[relationship.relationship_type] || 'muted'} title={relationTooltip(relationship.relationship_type)}>
                          {relationship.relationship_type}
                        </Pill>
                      </td>
                      <td className={cn(tdClass, 'font-semibold')}>{relationship.peer_theme_display_name || relationship.peer_theme_name || '-'}</td>
                      <td className={cn(tdClass, 'text-right tabular-nums')}>{pct(relationship.confidence)}</td>
                      <td className={cn(tdClass, 'text-[11px] text-muted-foreground')}>{relationship.provenance || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </TableSection>
            )}

            {relationshipGraph?.edges?.length > 0 && (
              <TableSection
                title="Relationship Graph Context"
                maxHeight={220}
                extra={(
                  <span className="flex gap-1">
                    <Pill tone="muted" className="tabular-nums">{`${relationshipGraph.total_nodes} nodes`}</Pill>
                    <Pill tone="muted" className="tabular-nums">{`${relationshipGraph.total_edges} edges`}</Pill>
                  </span>
                )}
              >
                <thead>
                  <tr>
                    <th scope="col" className={thClass()}>Source</th>
                    <th scope="col" className={thClass()}>Relation</th>
                    <th scope="col" className={thClass()}>Target</th>
                    <th scope="col" className={thClass('right')}>Conf</th>
                    <th scope="col" className={thClass()}>Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  {relationshipGraph.edges.slice(0, 100).map((edge) => (
                    <tr key={edge.relation_id} className="hover:bg-surface-subtle">
                      <td className={cn(tdClass, 'font-semibold')}>{edge.source_theme_name || edge.source_theme_id}</td>
                      <td className={tdClass}><Pill tone={RELATION_TONE[edge.relationship_type] || 'muted'}>{edge.relationship_type}</Pill></td>
                      <td className={cn(tdClass, 'font-semibold')}>{edge.target_theme_name || edge.target_theme_id}</td>
                      <td className={cn(tdClass, 'text-right tabular-nums')}>{pct(edge.confidence)}</td>
                      <td className={cn(tdClass, 'text-[11px] text-muted-foreground')}>{edge.provenance || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </TableSection>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No data available</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
