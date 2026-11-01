import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';

import {
  getOptionsCommandCenter,
  getOptionsRefreshStatus,
  refreshOptionsAnalytics,
} from '../api/optionsAnalytics';
import OptionsCommandCenterView from '../features/options/OptionsCommandCenterView';
import { optionsCommandCenterQueryKey } from '../features/options/optionsContract';

const commandKey = optionsCommandCenterQueryKey({ mode: 'live', runId: 'published' });

function CommandCenterSkeleton() {
  const block = 'rounded-md bg-surface-subtle motion-safe:animate-pulse';
  return (
    <div className="tw flex flex-col gap-3" aria-busy="true" aria-label="Loading options analytics">
      <div className={`${block} h-8 w-72 max-w-full`} />
      <div className={`${block} h-4 w-96 max-w-full`} />
      <div className={`${block} mt-2 h-10`} />
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`${block} h-9`} />)}
    </div>
  );
}

export default function OptionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accepted, setAccepted] = useState(null);
  const [refreshOutcome, setRefreshOutcome] = useState(null);
  const commandQuery = useQuery({
    queryKey: commandKey,
    queryFn: getOptionsCommandCenter,
    refetchInterval: accepted ? 5000 : false,
    retry: (failureCount, error) => error?.response?.status !== 404 && failureCount < 2,
  });
  const taskQuery = useQuery({
    queryKey: ['options-analytics', 'refresh-task', accepted?.taskId ?? null],
    queryFn: () => getOptionsRefreshStatus(accepted.taskId),
    enabled: Boolean(accepted?.taskId),
    retry: false,
    refetchInterval: (query) => (
      ['completed', 'failed', 'cancelled'].includes(query.state.data?.status) ? false : 2000
    ),
  });
  const refreshMutation = useMutation({
    mutationFn: () => refreshOptionsAnalytics({
      sourceRunId: null,
      force: true,
    }),
    onMutate: () => setRefreshOutcome(null),
    onSuccess: (result) => {
      setAccepted({
        taskId: result.task_id,
        baselineRunId: commandQuery.data?.run_id ?? null,
      });
    },
  });

  useEffect(() => {
    if (!accepted || !commandQuery.data || commandQuery.data.run_id === accepted.baselineRunId) return;
    setAccepted(null);
    queryClient.invalidateQueries({ queryKey: ['options-analytics', 'symbol', 'live'] });
  }, [accepted, commandQuery.data, queryClient]);

  useEffect(() => {
    if (!accepted) return;
    if (taskQuery.isError) {
      setRefreshOutcome('Could not confirm refresh status. You can try again.');
      setAccepted(null);
      return;
    }
    const task = taskQuery.data;
    if (!task) return;
    const taskStatus = String(task.status || '').toLowerCase();
    const resultStatus = String(task.result?.status || '').toLowerCase();
    if (taskStatus === 'failed') {
      setRefreshOutcome(`Refresh failed${task.error ? `: ${task.error}` : '.'}`);
      setAccepted(null);
      return;
    }
    if (taskStatus === 'cancelled') {
      setRefreshOutcome('Refresh was cancelled.');
      setAccepted(null);
      return;
    }
    if (taskStatus !== 'completed') return;
    if (resultStatus === 'published') {
      queryClient.invalidateQueries({ queryKey: commandKey });
      return;
    }
    const displayStatus = (resultStatus || 'without publication').replaceAll('_', ' ');
    const reasons = task.result?.reason_codes?.join(', ');
    setRefreshOutcome(
      `Refresh ended as ${displayStatus}${reasons ? ` (${reasons})` : ''}. The published snapshot was not changed.`,
    );
    setAccepted(null);
  }, [accepted, queryClient, taskQuery.data, taskQuery.isError]);

  if (commandQuery.isLoading) {
    return <CommandCenterSkeleton />;
  }
  const notFound = commandQuery.error?.response?.status === 404;
  return (
    <div className="tw flex flex-col gap-2">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          aria-label="Refresh options analytics"
          disabled={refreshMutation.isPending || Boolean(accepted)}
          onClick={() => refreshMutation.mutate()}
        >
          <RefreshCw aria-hidden="true" className={accepted ? 'motion-safe:animate-spin' : undefined} />
          Refresh
        </Button>
      </div>
      {accepted && (
        <Notice tone="info">
          Accepted as task {accepted.taskId}. The published view will update only after the new run passes quality checks.
        </Notice>
      )}
      {refreshMutation.isError && (
        <Notice tone="error">Refresh could not be queued.</Notice>
      )}
      {refreshOutcome && (
        <Notice tone="error">{refreshOutcome}</Notice>
      )}
      {commandQuery.isError ? (
        <Notice tone={notFound ? 'info' : 'error'}>
          {notFound
            ? 'No published options snapshot yet. Refresh to create one.'
            : 'Could not load the published options snapshot.'}
        </Notice>
      ) : commandQuery.data.items.length === 0 ? (
        <p className="text-sm">No current Candidates or Leaders have published options analytics.</p>
      ) : (
        <OptionsCommandCenterView
          data={commandQuery.data}
          onOpenSymbol={(symbol) => navigate(`/options/${encodeURIComponent(symbol)}`)}
        />
      )}
    </div>
  );
}
