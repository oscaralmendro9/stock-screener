import ThemeEquivalencePanel from './ThemeEquivalencePanel';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, ChevronDown, ChevronUp, CircleCheck, Play } from 'lucide-react';
import { Button } from '@/ui/button';
import { Dialog, DialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';
import { Pill, Spinner, TabBar } from '../../features/themes/themeUi';
import {
  getMergeSuggestions,
  approveMergeSuggestion,
  rejectMergeSuggestion,
  getMergeHistory,
  runThemeConsolidation,
} from '../../api/themes';

// Tones based on score thresholds
const getSimilarityTone = (score) => {
  if (score >= 95) return 'gain';
  if (score >= 85) return 'warning';
  return 'muted';
};

const getConfidenceTone = (score) => {
  if (score >= 90) return 'gain';
  if (score >= 70) return 'warning';
  return 'loss';
};

const getSimilarityTooltip = (score) => {
  if (!Number.isFinite(score)) return 'Similarity unavailable.';
  if (score >= 95) return 'Very high lexical/embedding overlap. Candidate duplicate.';
  if (score >= 85) return 'High overlap. Requires confidence + relationship validation.';
  return 'Lower overlap. Merge only with strong supporting reasoning.';
};

const getConfidenceTooltip = (score) => {
  if (!Number.isFinite(score)) return 'Model confidence unavailable.';
  if (score >= 90) return 'High confidence. Safe to fast-track when relationship is identical.';
  if (score >= 70) return 'Medium confidence. Review reasoning and aliases before action.';
  return 'Low confidence. Prefer reject or defer for additional evidence.';
};

const RELATIONSHIP_TONE = { identical: 'gain', subset: 'warning', related: 'neutral', distinct: 'loss' };

const getRelationshipTooltip = (relationship) => {
  switch (relationship) {
    case 'identical':
      return 'Themes are essentially the same - recommended to merge';
    case 'subset':
      return 'One theme is a subset of the other - review carefully';
    case 'related':
      return 'Themes are related but distinct - probably should not merge';
    case 'distinct':
      return 'Themes are clearly different - do not merge';
    default:
      return '';
  }
};

const TH = 'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-2 text-xs font-semibold text-muted-foreground';
const TD = 'border-b border-border px-2 py-1.5';
const CHECK = 'size-4 cursor-pointer accent-accent';

function Aliases({ aliases }) {
  if (!aliases?.length) return null;
  return (
    <span className="block text-[11px] text-muted-foreground">
      {aliases.slice(0, 2).join(', ')}
      {aliases.length > 2 && ` +${aliases.length - 2}`}
    </span>
  );
}

// Expandable row component for showing LLM reasoning
function SuggestionRow({ suggestion, onReject, isRejecting, checked, onToggle, disabled }) {
  const [expanded, setExpanded] = useState(false);

  const hasSimilarity = Number.isFinite(suggestion.similarity_score);
  const hasConfidence = Number.isFinite(suggestion.llm_confidence);
  const similarityPercent = hasSimilarity ? (suggestion.similarity_score * 100).toFixed(0) : null;
  const confidencePercent = hasConfidence ? (suggestion.llm_confidence * 100).toFixed(0) : null;
  const relationshipType = suggestion.relationship_type || 'unknown';
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <>
      <tr className="cursor-pointer hover:bg-surface-subtle" onClick={() => setExpanded(!expanded)}>
        <td className={cn(TD, 'w-10')} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`Select ${suggestion.source_theme_name} to ${suggestion.target_theme_name}`}
            checked={checked}
            onChange={() => onToggle(suggestion.id)}
            disabled={disabled}
            className={CHECK}
          />
        </td>
        <td className={cn(TD, 'w-10')}>
          <button
            type="button"
            aria-label={expanded ? 'Hide reasoning' : 'Show reasoning'}
            aria-expanded={expanded}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="grid size-7 cursor-pointer place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Chevron aria-hidden="true" className="size-4" />
          </button>
        </td>
        <td className={TD}>
          <span className="block text-sm font-medium">{suggestion.source_theme_name}</span>
          <Aliases aliases={suggestion.source_aliases} />
        </td>
        <td className={TD}>
          <span className="block text-sm font-medium">{suggestion.target_theme_name}</span>
          <Aliases aliases={suggestion.target_aliases} />
        </td>
        <td className={cn(TD, 'text-center')}>
          <Pill
            title={getSimilarityTooltip(parseFloat(similarityPercent))}
            tone={hasSimilarity ? getSimilarityTone(parseFloat(similarityPercent)) : 'muted'}
            className="min-w-14 justify-center font-semibold tabular-nums"
          >
            {hasSimilarity ? `${similarityPercent}%` : 'N/A'}
          </Pill>
        </td>
        <td className={cn(TD, 'text-center')}>
          <Pill
            title={getConfidenceTooltip(parseFloat(confidencePercent))}
            tone={hasConfidence ? getConfidenceTone(parseFloat(confidencePercent)) : 'muted'}
            className="min-w-14 justify-center font-semibold tabular-nums"
          >
            {hasConfidence ? `${confidencePercent}%` : 'N/A'}
          </Pill>
        </td>
        <td className={cn(TD, 'text-center')}>
          <Pill title={getRelationshipTooltip(relationshipType)} tone={RELATIONSHIP_TONE[relationshipType] || 'muted'} className="capitalize">
            {relationshipType}
          </Pill>
        </td>
        <td className={cn(TD, 'text-right')} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Reject merge"
            title="Reject merge"
            onClick={() => onReject(suggestion.id)}
            disabled={isRejecting || disabled}
            className="grid size-8 cursor-pointer place-items-center rounded-md text-loss outline-none hover:bg-loss/10 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isRejecting ? <Spinner label="Rejecting" className="size-4" /> : <Ban aria-hidden="true" className="size-4" />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="border-b border-border px-2">
            <div className="my-2 rounded-md bg-surface-subtle p-4">
              <div className="mb-4 flex gap-8">
                <div>
                  <p className="text-[11px] text-muted-foreground">Relationship</p>
                  <p className="text-sm font-medium capitalize">{relationshipType}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Suggested Name</p>
                  <p className="text-sm font-medium">{suggestion.suggested_name || suggestion.target_theme_name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(suggestion.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">LLM Reasoning</p>
              <div className="mt-1 rounded-md border border-border bg-surface p-3">
                <p className="text-sm whitespace-pre-wrap">{suggestion.reasoning || 'No reasoning provided'}</p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" size="sm" className="text-loss" onClick={() => onReject(suggestion.id)} disabled={isRejecting || disabled}>
                  {isRejecting ? <Spinner label="Rejecting" className="size-4" /> : <Ban aria-hidden="true" />}
                  Reject
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// History row component
function HistoryRow({ entry }) {
  return (
    <tr className="hover:bg-surface-subtle">
      <td className={cn(TD, 'text-sm')}>{entry.source_name}</td>
      <td className={cn(TD, 'text-sm')}>{entry.target_name}</td>
      <td className={TD}>
        <Pill tone={entry.merge_type === 'merged' ? 'gain' : 'muted'} className="capitalize">{entry.merge_type}</Pill>
      </td>
      <td className={cn(TD, 'text-sm text-muted-foreground')}>
        {new Date(entry.merged_at || entry.created_at).toLocaleString()}
      </td>
    </tr>
  );
}

const EMPTY_SUGGESTIONS = [];

export function ThemeMergeReviewContent({ onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isApprovingBatch, setIsApprovingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Consolidation mutation
  const consolidationMutation = useMutation({
    mutationFn: () => runThemeConsolidation(false),
    onMutate: () => {
      setIsConsolidating(true);
      setError(null);
      setSuccessMessage(null);
    },
    onSuccess: (data) => {
      setSuccessMessage(`Consolidation started (Task ID: ${data.task_id}). New suggestions will appear shortly.`);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['mergeSuggestions'] });
      }, 5000);
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to start consolidation');
    },
    onSettled: () => {
      setIsConsolidating(false);
    },
  });

  // Fetch pending suggestions
  const {
    data: pendingSuggestions,
    isLoading: isLoadingPending,
  } = useQuery({
    queryKey: ['mergeSuggestions', 'pending'],
    queryFn: () => getMergeSuggestions('pending', 100),
    enabled: activeTab === 0,
  });

  // Fetch merge history
  const {
    data: history,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ['mergeHistory'],
    queryFn: () => getMergeHistory(50),
    enabled: activeTab === 1,
  });

  // Auto-select all pending suggestions when they load
  const suggestionsList = useMemo(() => {
    if (Array.isArray(pendingSuggestions?.suggestions)) {
      return pendingSuggestions.suggestions;
    }
    if (Array.isArray(pendingSuggestions)) {
      return pendingSuggestions;
    }
    return EMPTY_SUGGESTIONS;
  }, [pendingSuggestions]);
  useEffect(() => {
    if (suggestionsList.length > 0) {
      setSelectedIds(new Set(suggestionsList.map((s) => s.id)));
    }
  }, [suggestionsList]);

  const handleToggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === suggestionsList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestionsList.map((s) => s.id)));
    }
  };

  const handleBatchApprove = async () => {
    const idsToApprove = Array.from(selectedIds);
    if (idsToApprove.length === 0) return;

    setIsApprovingBatch(true);
    setBatchProgress({ current: 0, total: idsToApprove.length });
    setError(null);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < idsToApprove.length; i++) {
      const id = idsToApprove[i];
      setBatchProgress({ current: i + 1, total: idsToApprove.length });

      try {
        const result = await approveMergeSuggestion(id);
        if (result.success) {
          successCount++;
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        } else {
          errorCount++;
          console.error(`Failed to approve suggestion ${id}:`, result.error);
        }
      } catch (err) {
        errorCount++;
        console.error(`Network error approving suggestion ${id}:`, err);
      }
    }

    setIsApprovingBatch(false);
    setBatchProgress({ current: 0, total: 0 });

    queryClient.invalidateQueries({ queryKey: ['mergeSuggestions'] });
    queryClient.invalidateQueries({ queryKey: ['mergeHistory'] });
    queryClient.refetchQueries({ queryKey: ['themeRankings'] });
    queryClient.refetchQueries({ queryKey: ['emergingThemes'] });

    if (errorCount > 0) {
      setError(`Approved ${successCount} merges, but ${errorCount} failed`);
    } else if (successCount > 0) {
      setSuccessMessage(`Successfully approved ${successCount} merge${successCount > 1 ? 's' : ''}`);
    }
  };

  const rejectMutation = useMutation({
    mutationFn: rejectMergeSuggestion,
    onMutate: (id) => {
      setActioningId(id);
      setActionType('reject');
    },
    onSuccess: (result) => {
      if (!result?.success) {
        setError(result?.error || 'Failed to reject suggestion');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['mergeSuggestions'] });
      queryClient.invalidateQueries({ queryKey: ['mergeHistory'] });
      setError(null);
    },
    onError: (err) => {
      setError(err.response?.data?.detail || err.message || 'Failed to reject suggestion');
    },
    onSettled: () => {
      setActioningId(null);
      setActionType(null);
    },
  });

  const handleReject = (suggestionId) => {
    rejectMutation.mutate(suggestionId);
  };

  const pendingCount = suggestionsList.length;
  const selectedCount = selectedIds.size;

  const empty = (title, body) => (
    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <p className="text-lg">{title}</p>
      <p className="text-sm">{body}</p>
    </div>
  );

  return (
    <div className="tw text-foreground">
      {/* Run Consolidation toolbar */}
      <div className="flex justify-end border-b border-border p-2">
        <Button
          variant="secondary"
          size="sm"
          title="Run theme consolidation to find new duplicate themes"
          onClick={() => consolidationMutation.mutate()}
          disabled={isConsolidating}
        >
          {isConsolidating ? <Spinner label="Running consolidation" className="size-4" /> : <Play aria-hidden="true" />}
          {isConsolidating ? 'Running...' : 'Run Consolidation'}
        </Button>
      </div>

      {error && (
        <Notice tone="error" className="m-4 mb-0" onDismiss={() => setError(null)}>
          {error}
        </Notice>
      )}
      {successMessage && (
        <Notice className="m-4 mb-0" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Notice>
      )}
      <Notice className="m-4 mb-0">
        <span>
          Decision guide: prioritize merges when <strong>Relationship=identical</strong> and <strong>Confidence is high</strong>.
          For <strong>subset/related</strong>, verify intent before approving.
        </span>
      </Notice>

      <TabBar
        label="Merge review"
        className="mt-2 px-2"
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: 0, label: 'Pending Review', count: pendingCount },
          { value: 1, label: 'History' },
          { value: 2, label: 'Reversible grouping' },
        ]}
      />

      {activeTab === 2 && <ThemeEquivalencePanel />}

      {/* Pending Tab */}
      {activeTab === 0 && (
        <div className="min-h-[400px]">
          {isLoadingPending ? (
            <div className="flex items-center justify-center p-8"><Spinner label="Loading suggestions" /></div>
          ) : pendingCount === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <CircleCheck aria-hidden="true" className="mb-4 size-12 text-gain" />
              <p className="text-lg text-muted-foreground">No pending merge suggestions</p>
              <p className="text-sm text-muted-foreground">All theme merge suggestions have been reviewed</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th scope="col" className={cn(TH, 'w-10')}>
                      <input
                        type="checkbox"
                        aria-label="Select all suggestions"
                        checked={selectedIds.size === suggestionsList.length && suggestionsList.length > 0}
                        ref={(node) => { if (node) node.indeterminate = selectedIds.size > 0 && selectedIds.size < suggestionsList.length; }}
                        onChange={handleToggleAll}
                        disabled={isApprovingBatch}
                        className={CHECK}
                      />
                    </th>
                    <th scope="col" className={cn(TH, 'w-10')}><span className="sr-only">Details</span></th>
                    <th scope="col" className={cn(TH, 'text-left')}>Source Theme</th>
                    <th scope="col" className={cn(TH, 'text-left')}>Target Theme</th>
                    <th scope="col" className={cn(TH, 'w-20 text-center')}>Similarity</th>
                    <th scope="col" className={cn(TH, 'w-20 text-center')}>Confidence</th>
                    <th scope="col" className={cn(TH, 'w-24 text-center')}>Relationship</th>
                    <th scope="col" className={cn(TH, 'w-20 text-right')}>Reject</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestionsList.map((suggestion) => (
                    <SuggestionRow
                      key={suggestion.id}
                      suggestion={suggestion}
                      onReject={handleReject}
                      isRejecting={actioningId === suggestion.id && actionType === 'reject'}
                      checked={selectedIds.has(suggestion.id)}
                      onToggle={handleToggleSelection}
                      disabled={isApprovingBatch}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 1 && (
        <div className="min-h-[400px]">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center p-8"><Spinner label="Loading history" /></div>
          ) : (history?.history?.length || history?.length || 0) === 0 ? (
            empty('No merge history yet', 'Approved merges will appear here')
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th scope="col" className={cn(TH, 'text-left')}>Source Theme</th>
                    <th scope="col" className={cn(TH, 'text-left')}>Target Theme</th>
                    <th scope="col" className={cn(TH, 'w-24 text-left')}>Action</th>
                    <th scope="col" className={cn(TH, 'w-44 text-left')}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(history?.history || history || []).map((entry, index) => (
                    <HistoryRow key={entry.id || index} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex justify-between border-t border-border p-4">
        <div>
          {activeTab === 0 && pendingCount > 0 && (
            <Button size="sm" onClick={handleBatchApprove} disabled={selectedCount === 0 || isApprovingBatch}>
              {isApprovingBatch ? <Spinner label="Approving" className="size-4" /> : <CircleCheck aria-hidden="true" />}
              {isApprovingBatch
                ? `Approving ${batchProgress.current}/${batchProgress.total}...`
                : `Approve Selected (${selectedCount})`}
            </Button>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isApprovingBatch}>Close</Button>
        )}
      </div>
    </div>
  );
}

function ThemeMergeReviewModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title="Review Theme Merge Suggestions" size="lg" bodyClassName="p-0">
        <ThemeMergeReviewContent onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

export default ThemeMergeReviewModal;
