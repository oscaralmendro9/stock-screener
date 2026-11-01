import { useMemo, useState } from 'react';
import { Eye, RotateCcw, Save, Upload } from 'lucide-react';
import { Button } from '@/ui/button';
import { Dialog, DialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';
import { Field, Pill } from '../../features/themes/themeUi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getThemePolicyConfig,
  promoteStagedThemePolicy,
  revertThemePolicy,
  updateThemePolicy,
} from '../../api/themes';

const MATCHER_FIELDS = [
  ['match_default_threshold', 'Match Default Threshold'],
  ['fuzzy_attach_threshold', 'Fuzzy Attach Threshold'],
  ['fuzzy_review_threshold', 'Fuzzy Review Threshold'],
  ['fuzzy_ambiguity_margin', 'Fuzzy Ambiguity Margin'],
  ['embedding_attach_threshold', 'Embedding Attach Threshold'],
  ['embedding_review_threshold', 'Embedding Review Threshold'],
  ['embedding_ambiguity_margin', 'Embedding Ambiguity Margin'],
];

const LIFECYCLE_FIELDS = [
  ['promotion_min_mentions_7d', 'Promotion Min Mentions (7D)'],
  ['promotion_min_source_diversity_7d', 'Promotion Min Source Diversity (7D)'],
  ['promotion_min_avg_confidence_30d', 'Promotion Min Avg Confidence (30D)'],
  ['promotion_min_persistence_days', 'Promotion Min Persistence Days'],
  ['dormancy_inactivity_days', 'Dormancy Inactivity Days'],
  ['dormancy_min_mentions_30d', 'Dormancy Min Mentions (30D)'],
  ['dormancy_min_silence_days', 'Dormancy Min Silence Days'],
  ['reactivation_min_mentions_7d', 'Reactivation Min Mentions (7D)'],
  ['reactivation_min_source_diversity_7d', 'Reactivation Min Source Diversity (7D)'],
  ['reactivation_min_avg_confidence_30d', 'Reactivation Min Avg Confidence (30D)'],
];

function toNumberOrNull(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ThemePolicySettingsContent({ pipeline = 'technical' }) {
  const queryClient = useQueryClient();
  const [adminKey, setAdminKey] = useState('');
  const [adminActor, setAdminActor] = useState('themes_ui');
  const [note, setNote] = useState('');
  const [matcherDraft, setMatcherDraft] = useState({});
  const [lifecycleDraft, setLifecycleDraft] = useState({});
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info');

  const { data, isLoading, error } = useQuery({
    queryKey: ['themePolicyConfig', pipeline, adminKey],
    queryFn: () => getThemePolicyConfig(pipeline, adminKey || null),
    enabled: !!adminKey.trim(),
  });

  const effective = data?.effective || { matcher: {}, lifecycle: {} };
  const activeVersion = data?.active_version_id || 'none';

  const buildPayload = (mode) => {
    const matcher = {};
    const lifecycle = {};
    Object.entries(matcherDraft).forEach(([key, value]) => {
      const num = toNumberOrNull(value);
      if (num !== null) matcher[key] = num;
    });
    Object.entries(lifecycleDraft).forEach(([key, value]) => {
      const num = toNumberOrNull(value);
      if (num !== null) lifecycle[key] = Number.isInteger(effective.lifecycle?.[key]) ? Math.round(num) : num;
    });
    return {
      pipeline,
      mode,
      note: note || null,
      matcher,
      lifecycle,
    };
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['themePolicyConfig', pipeline, adminKey] });
  };

  const updateMutation = useMutation({
    mutationFn: (mode) => updateThemePolicy(buildPayload(mode), adminKey || null, adminActor || null),
    onSuccess: (result) => {
      setMessageType('success');
      setMessage(`${result.status.toUpperCase()}: ${result.diff_keys?.length || 0} policy fields changed`);
      if (result.mode !== 'preview') {
        setMatcherDraft({});
        setLifecycleDraft({});
      }
      refresh();
    },
    onError: (err) => {
      setMessageType('error');
      setMessage(err?.response?.data?.detail || err.message || 'Policy update failed');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: () => promoteStagedThemePolicy(pipeline, note || null, adminKey || null, adminActor || null),
    onSuccess: () => {
      setMessageType('success');
      setMessage('Staged policy promoted to active');
      refresh();
    },
    onError: (err) => {
      setMessageType('error');
      setMessage(err?.response?.data?.detail || err.message || 'Failed to promote staged policy');
    },
  });

  const revertMutation = useMutation({
    mutationFn: (versionId) => revertThemePolicy(
      { pipeline, version_id: versionId, note: note || null },
      adminKey || null,
      adminActor || null,
    ),
    onSuccess: () => {
      setMessageType('success');
      setMessage('Policy reverted successfully');
      refresh();
    },
    onError: (err) => {
      setMessageType('error');
      setMessage(err?.response?.data?.detail || err.message || 'Failed to revert policy');
    },
  });

  const historyRows = useMemo(() => data?.history || [], [data?.history]);

  return (
    <div className="tw text-foreground">
      {!adminKey.trim() && (
        <Notice className="mb-4">Enter admin key to load policy settings.</Notice>
      )}
      {(message || error) && (
        <Notice tone={message ? (messageType === 'error' ? 'error' : 'info') : 'error'} className="mb-4">
          {message || error?.message || 'Failed to load policy config'}
        </Notice>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Admin Key" type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
        <Field label="Actor" value={adminActor} onChange={(e) => setAdminActor(e.target.value)} />
        <Field label="Change Note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Pill tone="accent">{`Pipeline: ${pipeline}`}</Pill>
        <Pill tone="muted">{`Active Version: ${activeVersion}`}</Pill>
        {data?.staged?.version_id && <Pill tone="warning">{`Staged: ${data.staged.version_id}`}</Pill>}
      </div>

      <hr className="mb-4 border-border" />

      {isLoading ? (
        <p className="text-muted-foreground">Loading policy config...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Matcher Thresholds</h3>
          <div className="flex flex-wrap gap-2">
            {MATCHER_FIELDS.map(([key, label]) => (
              <Field
                key={key}
                type="number"
                label={label}
                value={matcherDraft[key] ?? ''}
                onChange={(e) => setMatcherDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={String(effective.matcher?.[key] ?? '')}
                className="w-full md:w-[230px]"
              />
            ))}
          </div>

          <h3 className="text-sm font-semibold">Lifecycle Thresholds</h3>
          <div className="flex flex-wrap gap-2">
            {LIFECYCLE_FIELDS.map(([key, label]) => (
              <Field
                key={key}
                type="number"
                label={label}
                value={lifecycleDraft[key] ?? ''}
                onChange={(e) => setLifecycleDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={String(effective.lifecycle?.[key] ?? '')}
                className="w-full md:w-[250px]"
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" title="Preview changes without writing to storage" onClick={() => updateMutation.mutate('preview')} disabled={updateMutation.isPending}>
              <Eye aria-hidden="true" />
              Preview
            </Button>
            <Button variant="secondary" size="sm" title="Stage changes for later promotion" onClick={() => updateMutation.mutate('stage')} disabled={updateMutation.isPending}>
              <Save aria-hidden="true" />
              Stage
            </Button>
            <Button size="sm" title="Apply immediately and create a versioned audit record" onClick={() => updateMutation.mutate('apply')} disabled={updateMutation.isPending}>
              <Upload aria-hidden="true" />
              Apply
            </Button>
            <Button variant="secondary" size="sm" onClick={() => promoteMutation.mutate()} disabled={!data?.staged?.version_id || promoteMutation.isPending}>
              <Upload aria-hidden="true" />
              Promote Staged
            </Button>
          </div>

          <hr className="border-border" />
          <h3 className="text-sm font-semibold">Version History (Revert)</h3>
          <div className="flex flex-col gap-2">
            {historyRows.slice(0, 10).map((row) => (
              <div key={row.version_id} className="flex items-center justify-between rounded-md border border-border p-2">
                <div>
                  <p className="font-mono text-sm">{row.version_id}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.updated_at} by {row.updated_by}{row.note ? ` - ${row.note}` : ''}
                  </p>
                </div>
                <Button variant="secondary" size="sm" className="text-loss" onClick={() => revertMutation.mutate(row.version_id)} disabled={revertMutation.isPending}>
                  <RotateCcw aria-hidden="true" />
                  Revert
                </Button>
              </div>
            ))}
            {!historyRows.length && (
              <p className="text-sm text-muted-foreground">No policy history yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemePolicySettingsModal({ open, onClose, pipeline = 'technical' }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title="Theme Policy Controls" size="lg">
        <p className="mb-4 text-sm text-muted-foreground">
          Safe-by-default controls with preview, staged rollout, and versioned audit history.
        </p>
        <ThemePolicySettingsContent pipeline={pipeline} />
      </DialogContent>
    </Dialog>
  );
}

export default ThemePolicySettingsModal;
