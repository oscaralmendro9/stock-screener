import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/ui/button';
import { Dialog, DialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';
import { getCandidateThemeQueue, reviewCandidateThemes } from '../../api/themes';
import { Pill, Spinner } from '../../features/themes/themeUi';

const confidenceBandTone = (band) => {
  if (band === '0.85-1.00') return 'gain';
  if (band === '0.70-0.84') return 'neutral';
  if (band === '0.40-0.69') return 'warning';
  return 'muted';
};

const EMPTY_ITEMS = [];
const TH = 'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-2 text-xs font-semibold text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5';

export function ThemeCandidateReviewContent({ pipeline = 'technical' }) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [errorText, setErrorText] = useState(null);

  const { data: queue, isLoading, error } = useQuery({
    queryKey: ['candidateThemeQueue', pipeline],
    queryFn: () => getCandidateThemeQueue({ limit: 200, offset: 0, pipeline }),
    staleTime: 30_000,
  });

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const items = queue?.items ?? EMPTY_ITEMS;
  const visibleItemIds = useMemo(() => items.map((row) => row.theme_cluster_id), [items]);
  const selectedVisibleIds = useMemo(
    () => visibleItemIds.filter((id) => selectedSet.has(id)),
    [visibleItemIds, selectedSet],
  );
  const allSelected = items.length > 0 && selectedVisibleIds.length === items.length;

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => visibleItemIds.includes(id)));
  }, [visibleItemIds]);

  const reviewMutation = useMutation({
    mutationFn: ({ action, ids }) =>
      reviewCandidateThemes(
        {
          theme_cluster_ids: ids,
          action,
          actor: 'analyst_ui',
        },
        pipeline,
      ),
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['candidateThemeQueue', pipeline] });
      queryClient.invalidateQueries({ queryKey: ['themeRankings'] });
      queryClient.invalidateQueries({ queryKey: ['themeDetail'] });
    },
    onError: (mutationError) => {
      setErrorText(mutationError?.message || 'Review action failed');
    },
  });

  const toggleTheme = (themeId) => {
    setSelectedIds((current) => {
      if (current.includes(themeId)) return current.filter((id) => id !== themeId);
      return [...current, themeId];
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(items.map((row) => row.theme_cluster_id));
  };

  const runAction = (action) => {
    setErrorText(null);
    if (!selectedVisibleIds.length) {
      setErrorText('Select at least one candidate theme.');
      return;
    }
    reviewMutation.mutate({ action, ids: selectedVisibleIds });
  };

  return (
    <div className="tw p-4 text-foreground">
      {(errorText || error) && (
        <Notice tone="error" className="mb-4">
          {errorText || error?.message || 'Failed to load candidate queue'}
        </Notice>
      )}

      {queue?.confidence_bands?.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {queue.confidence_bands.map((band) => (
            <Pill key={band.band} tone={confidenceBandTone(band.band)} className="tabular-nums">{`${band.band}: ${band.count}`}</Pill>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground tabular-nums">{queue?.total ?? 0} candidates in queue</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => runAction('promote')} disabled={reviewMutation.isPending || selectedVisibleIds.length === 0}>
            <CircleCheck aria-hidden="true" />
            Promote Selected
          </Button>
          <Button variant="secondary" size="sm" className="text-loss" onClick={() => runAction('reject')} disabled={reviewMutation.isPending || selectedVisibleIds.length === 0}>
            <CircleX aria-hidden="true" />
            Reject Selected
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner label="Loading candidate queue" /></div>
      ) : (
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th scope="col" className={cn(TH, 'w-10')}>
                  <input
                    type="checkbox"
                    aria-label="Select all candidates"
                    ref={(node) => { if (node) node.indeterminate = selectedVisibleIds.length > 0 && !allSelected; }}
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="size-4 cursor-pointer accent-accent"
                  />
                </th>
                <th scope="col" className={cn(TH, 'text-left')}>Theme</th>
                <th scope="col" className={cn(TH, 'text-right')}>Mentions (7D)</th>
                <th scope="col" className={cn(TH, 'text-right')}>Sources (7D)</th>
                <th scope="col" className={cn(TH, 'text-right')}>Persistence</th>
                <th scope="col" className={cn(TH, 'text-right')}>Avg Conf (30D)</th>
                <th scope="col" className={cn(TH, 'text-left')}>Band</th>
                <th scope="col" className={cn(TH, 'text-left')}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const selected = selectedSet.has(row.theme_cluster_id);
                const name = row.theme_display_name || row.theme_name;
                return (
                  <tr
                    key={row.theme_cluster_id}
                    aria-selected={selected}
                    onClick={() => toggleTheme(row.theme_cluster_id)}
                    className={cn('cursor-pointer hover:bg-surface-subtle', selected && 'bg-surface-subtle')}
                  >
                    <td className={TD}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${name}`}
                        checked={selected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleTheme(row.theme_cluster_id);
                        }}
                        className="size-4 cursor-pointer accent-accent"
                      />
                    </td>
                    <td className={cn(TD, 'font-semibold')}>{name}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{row.mentions_7d}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{row.source_diversity_7d}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{row.persistence_days_7d}d</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{(row.avg_confidence_30d * 100).toFixed(0)}%</td>
                    <td className={TD}><Pill tone={confidenceBandTone(row.confidence_band)}>{row.confidence_band}</Pill></td>
                    <td className={cn(TD, 'max-w-[240px] truncate')} title={row.queue_reason || '-'}>{row.queue_reason || '-'}</td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">Candidate queue is empty.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ThemeCandidateReviewModal({ open, onClose, pipeline = 'technical' }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title="Candidate Theme Queue Review" size="lg" bodyClassName="p-0">
        <p className="px-4 pt-3 text-sm text-muted-foreground">
          Promote high-quality candidates to active or reject noise in bulk.
        </p>
        <ThemeCandidateReviewContent pipeline={pipeline} />
      </DialogContent>
    </Dialog>
  );
}

export default ThemeCandidateReviewModal;
