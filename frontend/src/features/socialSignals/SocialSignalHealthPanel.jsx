import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';
import {
  createSocialSource, decideEconomicSocialAssociation, decideSocialAssociation, getSocialAdminHealth,
  getSocialAdminRuntime, getSocialAdminSources, getSocialAnalysis,
  getSocialAssociations, getSocialCompanyIdentities, getSocialRuns,
  getSocialValidation, refreshSocialSignals, renameSocialSource,
  retrySocialAnalysis, testSocialSource, transitionSocialSource,
  updateSocialAdminRuntime, updateSocialCompanyIdentities,
} from '../../api/socialSignals';

const money = (value) => `US$${value ?? '—'}`;
const errorCode = (error) => error?.response?.data?.detail?.code
  || error?.response?.data?.detail || error?.message || 'Request failed';

const TONE = { success: 'info', info: 'info', warning: 'warning', error: 'error' };
const H3 = 'font-bold';
const PILL = 'inline-flex h-6 items-center rounded-full border border-border px-2 text-[11px] whitespace-nowrap';
const INPUT = 'h-11 w-full rounded-md border border-border bg-surface px-2.5 font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8';
const SELECT = 'h-11 cursor-pointer rounded-md border border-border bg-surface px-2 font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8';
const TD = 'border-b border-border px-2 py-1.5 align-top';

function Field({ label, ...props }) {
  return (
    <label className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input className={INPUT} {...props} />
    </label>
  );
}

export default function SocialSignalHealthPanel() {
  const queryClient = useQueryClient();
  const [keyDraft, setKeyDraft] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [keyGeneration, setKeyGeneration] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRef, setNewRef] = useState('');
  const [renameDrafts, setRenameDrafts] = useState({});
  const [reasons, setReasons] = useState({});
  const [message, setMessage] = useState(null);
  const [identityDraft, setIdentityDraft] = useState('');
  const [validation, setValidation] = useState(null);
  const [modeDraft, setModeDraft] = useState(null);
  const [providerDraft, setProviderDraft] = useState(null);
  const enabled = Boolean(adminKey);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['socialAdmin'] });

  const runtime = useQuery({
    queryKey: ['socialAdmin', 'runtime', keyGeneration],
    queryFn: () => getSocialAdminRuntime(adminKey), enabled,
  });
  const health = useQuery({
    queryKey: ['socialAdmin', 'health', keyGeneration],
    queryFn: () => getSocialAdminHealth(adminKey), enabled,
  });
  const sources = useQuery({
    queryKey: ['socialAdmin', 'sources', keyGeneration, showArchived],
    queryFn: () => getSocialAdminSources(adminKey, showArchived), enabled,
    refetchInterval: (query) => (query.state.data || []).some(
      (source) => ['queued', 'running'].includes(source.test_progress)
    ) ? 5_000 : 30_000,
  });
  const analysis = useQuery({
    queryKey: ['socialAdmin', 'analysis', keyGeneration],
    queryFn: () => getSocialAnalysis(adminKey), enabled,
  });
  const associations = useQuery({
    queryKey: ['socialAdmin', 'associations', keyGeneration],
    queryFn: () => getSocialAssociations(adminKey), enabled,
  });
  const identities = useQuery({
    queryKey: ['socialAdmin', 'identities', keyGeneration],
    queryFn: () => getSocialCompanyIdentities(adminKey), enabled,
  });
  const runs = useQuery({
    queryKey: ['socialAdmin', 'runs', keyGeneration],
    queryFn: () => getSocialRuns(adminKey), enabled,
  });
  const mutation = useMutation({
    mutationFn: async (work) => work(),
    onSuccess: () => { setMessage({ severity: 'success', text: 'Social administration updated.' }); refresh(); },
    onError: async (error) => {
      if (errorCode(error) === 'version_conflict') {
        setModeDraft(null);
        setProviderDraft(null);
        setRenameDrafts({});
        await Promise.all([runtime.refetch(), sources.refetch()]);
        setMessage({ severity: 'error', text: 'This record changed elsewhere. Reloaded the latest version.' });
        return;
      }
      refresh();
      setMessage({ severity: 'error', text: String(errorCode(error)) });
    },
  });
  const identityMutation = useMutation({
    mutationFn: (payload) => updateSocialCompanyIdentities(adminKey, payload),
    onSuccess: () => {
      setMessage({ severity: 'success', text: 'Social administration updated.' });
      refresh();
    },
    onError: async (error) => {
      if (errorCode(error) === 'version_conflict') {
        const latest = await identities.refetch();
        if (latest.data) {
          setIdentityDraft(JSON.stringify(latest.data.entries || [], null, 2));
        }
        setMessage({ severity: 'error', text: 'This record changed elsewhere. Reloaded the latest version.' });
        return;
      }
      setMessage({ severity: 'error', text: String(errorCode(error)) });
    },
  });
  const runtimeDraft = useMemo(() => runtime.data || { mode: 'off', provider: 'disabled' }, [runtime.data]);
  useEffect(() => {
    if (identities.data) {
      setIdentityDraft((current) => current || JSON.stringify(identities.data.entries || [], null, 2));
    }
  }, [identities.data]);

  const doRefresh = async () => {
    try {
      await refreshSocialSignals(adminKey);
      setMessage({ severity: 'success', text: 'Social refresh queued.' });
      refresh();
    } catch (error) {
      if (error?.response?.status === 429) {
        setMessage({ severity: 'warning', text: `Refresh is cooling down. Try again in ${error.response.headers?.['retry-after'] || 'a few'} seconds.` });
      } else setMessage({ severity: 'error', text: String(errorCode(error)) });
    }
  };

  const loadValidation = async (runId) => {
    try { setValidation(await getSocialValidation(adminKey, runId)); }
    catch (error) { setMessage({ severity: 'error', text: String(errorCode(error)) }); }
  };

  const saveIdentities = () => {
    try {
      const entries = JSON.parse(identityDraft || '[]');
      identityMutation.mutate({
        expected_version: identities.data.registry_version, entries,
      });
    } catch {
      setMessage({ severity: 'error', text: 'Identity entries must be a valid JSON list.' });
    }
  };

  return (
    <section className="tw mt-6 rounded-lg border border-border bg-surface p-4 text-foreground">
      <h2 className="text-lg font-semibold">Social Signals administration</h2>
      <p className="text-sm text-muted-foreground">
        Shared provider, source, analysis budget, and published-run health. The key stays in this page only.
      </p>
      <div className="my-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Social admin key" type="password" value={keyDraft}
          onChange={(event) => setKeyDraft(event.target.value)} />
        <Button size="sm" disabled={!keyDraft.trim()}
          onClick={() => {
            setIdentityDraft(''); setAdminKey(keyDraft.trim());
            setKeyGeneration((value) => value + 1); setMessage(null);
          }}>
          Load Social administration
        </Button>
      </div>
      {!enabled ? <Notice>Enter the admin key to load Social health and controls.</Notice> : null}
      {message ? <Notice tone={TONE[message.severity]} className="mb-4">{message.text}</Notice> : null}
      {enabled && [runtime, health, sources].some((query) => query.isError) ? (
        <Notice tone="error">Admin key rejected or Social administration could not be loaded.</Notice>
      ) : null}
      {enabled && (
        <div>
          {health.data ? <HealthSummary health={health.data} /> : null}
          <hr className="my-4 border-border" />
          <h3 className={H3}>Runtime</h3>
          <Notice tone="warning" className="my-2">
            Validation can read X and spend the shared LLM allowance, but cannot publish. Live can publish after every safety check passes.
          </Notice>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Social mode" value={modeDraft ?? runtimeDraft.mode}
              onChange={(event) => setModeDraft(event.target.value)} className={SELECT}>
              {['off', 'validation', 'live'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select aria-label="Social provider" value={providerDraft ?? runtimeDraft.provider}
              onChange={(event) => setProviderDraft(event.target.value)} className={SELECT}>
              {['disabled', 'official', 'xui'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <Button variant="ghost" size="sm" onClick={() => mutation.mutate(
              () => updateSocialAdminRuntime(adminKey, {
                mode: modeDraft ?? runtimeDraft.mode, provider: providerDraft ?? runtimeDraft.provider,
                expected_version: runtimeDraft.version,
              }),
              { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appCapabilities'] }) },
            )}>Save runtime</Button>
            <Button variant="secondary" size="sm" onClick={doRefresh}>Refresh Social Signals</Button>
          </div>
          <hr className="my-4 border-border" />
          <div className="flex items-center justify-between">
            <h3 className={H3}>Social Sources</h3>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" role="switch" checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)} className="size-4 cursor-pointer accent-accent" />
              Show archived
            </label>
          </div>
          <Notice className="mb-2">Test List reads at most five posts. A pending list cannot be enabled until the test passes.</Notice>
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <Field label="List name" value={newName} onChange={(event) => setNewName(event.target.value)} />
            <Field label="List ID or URL" value={newRef} onChange={(event) => setNewRef(event.target.value)} />
            <Button variant="ghost" size="sm" disabled={!newName.trim() || !newRef.trim()} onClick={() => mutation.mutate(() =>
              createSocialSource(adminKey, { name: newName.trim(), list_ref: newRef.trim() }))}>Add pending list</Button>
          </div>
          <SourceTable rows={sources.data || []} renameDrafts={renameDrafts} setRenameDrafts={setRenameDrafts}
            run={(work) => mutation.mutate(work)} adminKey={adminKey} />
          <hr className="my-4 border-border" />
          <h3 className={H3}>Saved analysis</h3>
          <p className="text-sm text-muted-foreground">
            Budget-paused work resumes after reset. Outside-window work is retained and only retried when you request it.
          </p>
          {(analysis.data || []).map((work) => (
            <div key={work.work_id} className="flex items-center gap-2">
              <p className="text-sm">
                Work {work.work_id} · {work.error_code === 'skipped:no_signal' ? 'skipped: repost, or no ticker or company' : work.state}
              </p>
              {['waiting_budget', 'failed_retryable', 'failed_terminal', 'outside_window'].includes(work.state) ? (
                <Button variant="ghost" size="sm" aria-label={`Retry work ${work.work_id}`}
                  onClick={() => mutation.mutate(() => retrySocialAnalysis(adminKey, work.work_id))}>Retry</Button>
              ) : null}
            </div>
          ))}
          <hr className="my-4 border-border" />
          <h3 className={H3}>Theme association review</h3>
          <Notice className="my-2">
            Social-linked Theme merges are not available in this version; ordinary legacy Theme merges are unchanged.
          </Notice>
          {(associations.data || []).map((row) => {
            // An economic row (economic authority) is decided by its economic id
            // and revision; a legacy row by its id and version (#515).
            const key = row.economic_association_id ?? row.association_id;
            const decide = (target) => (row.economic_association_id
              ? decideEconomicSocialAssociation(adminKey, row.economic_association_id, {
                target, reason: reasons[key].trim(), expected_revision: row.economic_revision,
              })
              : decideSocialAssociation(adminKey, row.association_id, {
                target, reason: reasons[key].trim(), expected_version: row.version,
              }));
            return (
              <div key={key} className="flex flex-wrap items-end gap-2">
                <p className="text-sm">{row.theme_name} · {row.market}:{row.canonical_symbol} · {row.state}</p>
                <Field label={`Decision reason ${key}`}
                  value={reasons[key] || ''}
                  onChange={(event) => setReasons((current) => ({ ...current, [key]: event.target.value }))} />
                {['accepted', 'rejected'].map((target) => (
                  <Button key={target} variant="ghost" size="sm"
                    aria-label={`${target === 'accepted' ? 'Accept' : 'Reject'} ${row.canonical_symbol}`}
                    disabled={!reasons[key]?.trim()}
                    onClick={() => mutation.mutate(() => decide(target))}>{target}</Button>
                ))}
              </div>
            );
          })}
          <hr className="my-4 border-border" />
          <h3 className={H3}>Verified company identities</h3>
          <Notice className="my-2">
            You supply and verify issuer links. The LLM and this editor do not verify them; unknown companies cannot satisfy automatic thresholds.
          </Notice>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Identity entries JSON</span>
            <textarea rows={3}
              placeholder='[{"symbol":"0700","company_id":"issuer-id","verification_reference":"...","verified_at":"...+00:00"}]'
              value={identityDraft} onChange={(event) => setIdentityDraft(event.target.value)}
              className="w-full resize-y rounded-md border border-border bg-surface p-2.5 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <Button variant="ghost" size="sm" className="mt-2" onClick={saveIdentities}>Save verified identities</Button>
          <hr className="my-4 border-border" />
          <h3 className={H3}>Validation previews</h3>
          {(runs.data || []).filter((run) => run.mode === 'validation').map((run) => (
            <Button key={run.run_id} variant="ghost" size="sm" onClick={() => loadValidation(run.run_id)}>
              Preview {run.run_id}
            </Button>
          ))}
          {validation ? (
            <p className="text-sm tabular-nums">
              {validation.candidates?.length || 0} staged candidates · {validation.associations?.length || 0} association proposals · not published
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function HealthSummary({ health }) {
  const budget = health.budget || {};
  const reauth = (health.reason_codes || []).includes('reauthentication_required');
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-1.5 tabular-nums">
        <span className={PILL}>{`${health.enabled_source_count ?? 0}/${health.source_count ?? 0} enabled sources`}</span>
        <span className={PILL}>{`${health.participating_source_count ?? 0}/${health.enabled_source_count ?? 0} source coverage`}</span>
        <span className={cn(PILL, health.social_fresh ? 'text-gain' : 'text-warning')}>{health.social_fresh ? 'Fresh' : 'Stale or degraded'}</span>
        <span className={PILL}>{`${health.collection_status || 'unknown'} collection`}</span>
        <span className={PILL}>{`${health.processing_status || 'unknown'} processing`}</span>
      </div>
      <p className="mt-2 text-sm tabular-nums">
        Budget: {money(budget.limit_usd || '2')} per day · {money(budget.remaining_usd)} remaining · {money(budget.spent_usd)} spent · {money(budget.reserved_usd)} reserved
      </p>
      <p className="text-[11px] text-muted-foreground">
        Reset {budget.next_reset_at ? new Date(budget.next_reset_at).toLocaleString() : '—'} · {budget.timezone || 'Asia/Singapore'} · pricing {budget.pricing_status || 'not configured'}{budget.pricing_version ? ` (${budget.pricing_version})` : ''}{budget.blocked_models?.length ? ` · blocked models: ${budget.blocked_models.join(', ')}` : ''}
      </p>
      <p className="text-sm tabular-nums">Backlog: {health.backlog?.waiting ?? 0} waiting · {health.backlog?.failed ?? 0} failed · {health.backlog?.outside_window ?? 0} outside window · {health.backlog?.no_signal ?? 0} skipped (repost, or no ticker or company)</p>
      <p className="text-sm">Last successful collection {health.last_collection_at ? new Date(health.last_collection_at).toLocaleString() : '—'}</p>
      {reauth ? (
        <Notice tone="error" className="mt-2">
          {health.provider === 'xui'
            ? 'Reauthenticate the private worker outside this app, then run Test List.'
            : 'Update the official X API credentials on the worker, then run Test List.'}
        </Notice>
      ) : null}
      {health.unknown_company_identity_count > 0 ? (
        <Notice tone="warning" className="mt-2">
          {health.unknown_company_identity_count} company links need administrator verification before they can count toward automatic Theme thresholds.
        </Notice>
      ) : null}
    </div>
  );
}

function SourceTable({ rows, renameDrafts, setRenameDrafts, run, adminKey }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {['Name', 'List', 'State', 'Test', 'Last success', 'Actions'].map((value) => (
              <th key={value} scope="col" className="border-b border-border px-2 py-2 text-left text-xs font-semibold text-muted-foreground">{value}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((source) => {
            const passed = source.test_outcome?.status === 'passed';
            const testState = source.test_progress || source.test_outcome?.status || 'untested';
            const testDetail = source.test_outcome
              ? `${source.test_outcome.provider} ${testState} · ${source.test_outcome.sample_count}/5${source.test_outcome.tested_at ? ` · ${new Date(source.test_outcome.tested_at).toLocaleString()}` : ''}`
              : testState;
            return (
              <tr key={source.source_id}>
                <td className={TD}>
                  <input aria-label={`Rename ${source.name}`}
                    value={renameDrafts[source.source_id] ?? source.name}
                    onChange={(event) => setRenameDrafts((current) => ({ ...current, [source.source_id]: event.target.value }))}
                    className={INPUT} />
                </td>
                <td className={TD}>
                  <p className="text-sm">{source.list_id}</p>
                  <p className="text-[11px] text-muted-foreground">{source.canonical_url}</p>
                </td>
                <td className={TD}><span className={PILL}>{source.lifecycle}</span></td>
                <td className={TD}>{testDetail}</td>
                <td className={TD}>{source.collected_at ? new Date(source.collected_at).toLocaleString() : 'Never'}</td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-1">
                    <Button variant="ghost" size="sm" disabled={(renameDrafts[source.source_id] ?? source.name) === source.name}
                      onClick={() => run(() => renameSocialSource(adminKey, source.source_id,
                        renameDrafts[source.source_id], source.version))}>Rename</Button>
                    {source.lifecycle !== 'archived' ? (
                      <Button variant="ghost" size="sm" aria-label={`Test ${source.name}`}
                        onClick={() => run(() => testSocialSource(adminKey, source.source_id, source.version))}>Test</Button>
                    ) : null}
                    {source.lifecycle !== 'enabled' && source.lifecycle !== 'archived' && passed ? (
                      <Button variant="ghost" size="sm" aria-label={`Enable ${source.name}`} onClick={() => run(() => transitionSocialSource(
                        adminKey, source.source_id, 'enabled', source.version))}>Enable</Button>
                    ) : null}
                    {source.lifecycle === 'enabled' ? (
                      <Button variant="ghost" size="sm" onClick={() => run(() => transitionSocialSource(
                        adminKey, source.source_id, 'disabled', source.version))}>Disable</Button>
                    ) : null}
                    {source.lifecycle !== 'archived' ? (
                      <Button variant="ghost" size="sm" className="text-warning" onClick={() => {
                        if (window.confirm(`Archive ${source.name}? Its audit history will be retained.`)) run(() => transitionSocialSource(
                          adminKey, source.source_id, 'archived', source.version));
                      }}>Archive</Button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {(source.audit || []).map((event) => `${event.action} · ${event.occurred_at}`).join(' | ')}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
