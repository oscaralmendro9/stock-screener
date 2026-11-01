import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/ui/button';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';

import {
  getResearchJob, getResearchJobPreview, requestExposureResearch,
  researchJobKey, researchJobRefreshMs, researchPreviewKey,
} from '../../api/companyExposures';
import ExposureResearchPanel from './ExposureResearchPanel';

const isAuthError = (error) => [401, 403].includes(error?.response?.status);

const errorCode = (error) => error?.response?.data?.detail?.code
  || (typeof error?.response?.data?.detail === 'string' ? error.response.data.detail : null)
  || error?.message || 'Request failed';

// Live freshness and holds on a sealed preview: recheck once a minute.
export const PREVIEW_REFRESH_MS = 60_000;

const newIdempotencyKey = () => `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function ExposureResearchWorkspace() {
  const [keyDraft, setKeyDraft] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [symbol, setSymbol] = useState('');
  const [themeId, setThemeId] = useState('');
  const [kind, setKind] = useState('verify');
  const [jobId, setJobId] = useState(null);
  const [message, setMessage] = useState(null);

  const job = useQuery({
    queryKey: researchJobKey(jobId),
    queryFn: () => getResearchJob(adminKey, jobId),
    enabled: Boolean(adminKey && jobId),
    // Paused jobs keep a slow poll: an operator may resume them via the CLI.
    refetchInterval: (query) => researchJobRefreshMs(query.state.data),
  });
  const revisionId = job.data?.assessment_revision_id;
  const preview = useQuery({
    queryKey: researchPreviewKey(jobId, revisionId),
    queryFn: () => getResearchJobPreview(adminKey, jobId),
    enabled: Boolean(adminKey && jobId && revisionId),
    // Freshness and holds are evaluated when read and change without a new
    // revision (a deadline passes, a hold is recorded): refresh them.
    staleTime: PREVIEW_REFRESH_MS,
    refetchInterval: PREVIEW_REFRESH_MS,
  });

  // One idempotency key per submission: a retry after a lost response reuses
  // it (the server returns the same job); a confirmed response or changed
  // inputs start a new submission.
  const pendingSubmission = useRef(null);
  const submissionKey = (body) => {
    const signature = JSON.stringify(body);
    if (pendingSubmission.current?.signature !== signature) {
      pendingSubmission.current = { signature, key: newIdempotencyKey() };
    }
    return pendingSubmission.current.key;
  };

  const request = useMutation({
    mutationFn: () => {
      const body = {
        kind,
        symbol: symbol.trim().toUpperCase(),
        economicThemeId: themeId.trim(),
      };
      return requestExposureResearch(adminKey, {
        ...body,
        idempotencyKey: submissionKey(body),
      });
    },
    onSuccess: (data) => {
      pendingSubmission.current = null;
      setJobId(data.job_id);
      setMessage({
        severity: 'success',
        text: data.dispatch === 'not_dispatched'
          ? 'Research queued; the research worker has not picked it up yet.'
          : 'Research queued.',
      });
    },
    onError: (error) => {
      setMessage({ severity: 'error', text: errorCode(error) });
      // A rejected key is never kept: ask for it again.
      if (isAuthError(error)) setAdminKey('');
    },
  });
  const changeKey = () => { setAdminKey(''); setJobId(null); setMessage(null); };
  const jobAuthFailed = job.isError && isAuthError(job.error);
  const previewAuthFailed = preview.isError && isAuthError(preview.error);
  useEffect(() => {
    if (jobAuthFailed || previewAuthFailed) setAdminKey('');
  }, [jobAuthFailed, previewAuthFailed]);

  const canSubmit = Boolean(adminKey && symbol.trim() && themeId.trim()) && !request.isPending;

  return (
    <section className="tw mt-6 rounded-lg border border-border bg-surface p-4 text-foreground" data-testid="exposure-research-workspace">
      <h2 className="text-lg font-semibold">Company exposure research (shadow)</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Verify one US listing against one economic theme from primary filings. Results are
        previews for review and never change theme membership.
      </p>
      {!adminKey ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field
            label="Admin key"
            type="password"
            value={keyDraft}
            onChange={(event) => setKeyDraft(event.target.value)}
            autoComplete="off"
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={!keyDraft}
            onClick={() => { setAdminKey(keyDraft); setKeyDraft(''); }}
          >
            Unlock
          </Button>
        </div>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); if (canSubmit) request.mutate(); }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <Field label="US symbol" value={symbol} onChange={(event) => setSymbol(event.target.value)} />
            <Field
              label="Economic theme ID"
              value={themeId}
              onChange={(event) => setThemeId(event.target.value)}
              className="md:min-w-80"
            />
            <NativeSelect label="Kind" value={kind} onChange={setKind} className="md:w-32">
              <option value="verify">Verify</option>
              <option value="refresh">Refresh</option>
            </NativeSelect>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              Request research
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={changeKey}>
              Change key
            </Button>
          </div>
        </form>
      )}
      {message && <Notice tone={message.severity === 'error' ? 'error' : 'info'} className="mt-3">{message.text}</Notice>}
      {job.isError && <Notice tone="error" className="mt-3">{errorCode(job.error)}</Notice>}
      {job.data && (
        <div className="mt-4">
          <ExposureResearchPanel job={job.data} preview={preview.data} />
        </div>
      )}
    </section>
  );
}

function Field({ label, className, ...props }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        className="h-11 w-full rounded-md border border-border bg-surface px-2.5 font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8"
        {...props}
      />
    </label>
  );
}
