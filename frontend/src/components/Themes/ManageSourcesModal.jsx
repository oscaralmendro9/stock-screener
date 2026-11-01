import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Dialog, DialogContent } from '@/ui/dialog';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';
import { Pill, Spinner } from '../../features/themes/themeUi';
import { tdClass, thClass } from '../../features/themes/themeClasses';
import {
  getContentSources,
  addContentSource,
  updateContentSource,
  deleteContentSource,
} from '../../api/themes';

const SOURCE_TYPES = [
  { value: 'substack', label: 'Substack' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'news', label: 'News' },
  { value: 'reddit', label: 'Reddit' },
];

const PIPELINES = [
  { value: 'technical', label: 'Technical' },
  { value: 'fundamental', label: 'Fundamental' },
];

const EMPTY_SOURCE = {
  name: '',
  source_type: 'substack',
  url: '',
  priority: 50,
  fetch_interval_minutes: 60,
  is_active: true,
  pipelines: ['technical', 'fundamental'],
};

export function ManageSourcesContent() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSourceData, setNewSourceData] = useState(EMPTY_SOURCE);
  const [error, setError] = useState(null);

  const { data: sources, isLoading } = useQuery({
    queryKey: ['contentSources'],
    queryFn: () => getContentSources(false),
  });

  const addMutation = useMutation({
    mutationFn: addContentSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentSources'] });
      setIsAddingNew(false);
      setNewSourceData(EMPTY_SOURCE);
      setError(null);
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to add source');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateContentSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentSources'] });
      setEditingId(null);
      setEditFormData({});
      setError(null);
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to update source');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContentSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentSources'] });
      queryClient.refetchQueries({ queryKey: ['contentSources'] });
      setError(null);
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to deactivate source');
    },
  });

  const handleStartEdit = (source) => {
    setEditingId(source.id);
    setEditFormData({
      name: source.name,
      source_type: source.source_type,
      url: source.url,
      priority: source.priority,
      fetch_interval_minutes: source.fetch_interval_minutes,
      is_active: source.is_active,
      pipelines: source.pipelines || ['technical', 'fundamental'],
    });
  };

  const handleEditPipelineToggle = (pipeline) => {
    const currentPipelines = editFormData.pipelines || [];
    if (currentPipelines.includes(pipeline)) {
      if (currentPipelines.length <= 1) return;
      setEditFormData({
        ...editFormData,
        pipelines: currentPipelines.filter((p) => p !== pipeline),
      });
    } else {
      setEditFormData({
        ...editFormData,
        pipelines: [...currentPipelines, pipeline],
      });
    }
  };

  const handleNewPipelineToggle = (pipeline) => {
    const currentPipelines = newSourceData.pipelines || [];
    if (currentPipelines.includes(pipeline)) {
      if (currentPipelines.length <= 1) return;
      setNewSourceData({
        ...newSourceData,
        pipelines: currentPipelines.filter((p) => p !== pipeline),
      });
    } else {
      setNewSourceData({
        ...newSourceData,
        pipelines: [...currentPipelines, pipeline],
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({ id: editingId, data: editFormData });
  };

  const handleAddNew = () => {
    addMutation.mutate(newSourceData);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewSourceData(EMPTY_SOURCE);
  };

  const handleDelete = (sourceId) => {
    if (window.confirm('Are you sure you want to deactivate this source?')) {
      deleteMutation.mutate(sourceId);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const cellInput = 'h-8 w-full rounded-md border border-border bg-surface px-2 font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const numberInput = 'h-8 w-16 rounded-md border border-border bg-surface px-1 text-center font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const iconButton = 'grid size-8 cursor-pointer place-items-center rounded-md outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40';

  // The editable cells shared by the new-source row and an edited row.
  const editorCells = (form, setForm, togglePipeline) => (
    <>
      <td className={tdClass}>
        <input aria-label="Source name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Source name" className={cellInput} />
      </td>
      <td className={tdClass}>
        <select aria-label="Source type" value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} className={cellInput}>
          {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </td>
      <td className={tdClass}>
        <input aria-label="Source URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL" className={cellInput} />
      </td>
      <td className={tdClass}>
        <span className="flex gap-3">
          {PIPELINES.map((p) => (
            <label key={p.value} className="flex cursor-pointer items-center gap-1 text-[11px]">
              <input type="checkbox" checked={form.pipelines?.includes(p.value)} onChange={() => togglePipeline(p.value)} className="size-4 cursor-pointer accent-accent" />
              {p.label}
            </label>
          ))}
        </span>
      </td>
      <td className={cn(tdClass, 'text-center')}>
        <input aria-label="Priority" type="number" min={1} max={100} value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 50 })} className={numberInput} />
      </td>
      <td className={cn(tdClass, 'text-center')}>
        <input aria-label="Fetch interval in minutes" type="number" min={1} value={form.fetch_interval_minutes} onChange={(e) => setForm({ ...form, fetch_interval_minutes: parseInt(e.target.value) || 60 })} className={numberInput} />
      </td>
      <td className={cn(tdClass, 'text-center')}>
        <input aria-label="Active" type="checkbox" role="switch" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-4 cursor-pointer accent-accent" />
      </td>
    </>
  );

  return (
    <div className="tw text-foreground">
      {error && (
        <Notice tone="error" className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </Notice>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner label="Loading sources" /></div>
      ) : (
        <>
          {!isAddingNew && (
            <Button size="sm" className="mb-4" onClick={() => setIsAddingNew(true)}>
              <Plus aria-hidden="true" />
              Add New Source
            </Button>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th scope="col" className={cn(thClass(), 'min-w-[100px]')}>Actions</th>
                  <th scope="col" className={cn(thClass(), 'min-w-[150px]')}>Name</th>
                  <th scope="col" className={cn(thClass(), 'min-w-[100px]')}>Type</th>
                  <th scope="col" className={cn(thClass(), 'min-w-[200px]')}>URL</th>
                  <th scope="col" className={cn(thClass(), 'min-w-[150px]')}>Pipelines</th>
                  <th scope="col" className={cn(thClass('center'), 'min-w-20')}>Priority</th>
                  <th scope="col" className={cn(thClass('center'), 'min-w-[100px]')}>Interval (min)</th>
                  <th scope="col" className={cn(thClass('center'), 'min-w-20')}>Active</th>
                  <th scope="col" className={cn(thClass(), 'min-w-40')}>Last Success</th>
                  <th scope="col" className={cn(thClass('right'), 'min-w-20')}>Items</th>
                </tr>
              </thead>
              <tbody>
                {isAddingNew && (
                  <tr className="bg-surface-subtle">
                    <td className={tdClass}>
                      <span className="flex gap-1">
                        <button type="button" aria-label="Save new source" onClick={handleAddNew} disabled={addMutation.isPending} className={cn(iconButton, 'text-accent')}>
                          <Save aria-hidden="true" className="size-4" />
                        </button>
                        <button type="button" aria-label="Cancel new source" onClick={handleCancelAdd} className={iconButton}>
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </span>
                    </td>
                    {editorCells(newSourceData, setNewSourceData, handleNewPipelineToggle)}
                    <td className={tdClass}>-</td>
                    <td className={cn(tdClass, 'text-right')}>-</td>
                  </tr>
                )}

                {sources?.map((source) => {
                  const editing = editingId === source.id;
                  return (
                    <tr key={source.id} className={cn(!source.is_active && 'opacity-60', editing && 'bg-surface-subtle')}>
                      <td className={tdClass}>
                        {source.social_managed ? (
                          <Pill>Managed in Operations → Social Sources</Pill>
                        ) : editing ? (
                          <span className="flex gap-1">
                            <button type="button" aria-label="Save source" onClick={handleSaveEdit} disabled={updateMutation.isPending} className={cn(iconButton, 'text-accent')}>
                              <Save aria-hidden="true" className="size-4" />
                            </button>
                            <button type="button" aria-label="Cancel edit" onClick={handleCancelEdit} className={iconButton}>
                              <X aria-hidden="true" className="size-4" />
                            </button>
                          </span>
                        ) : (
                          <span className="flex gap-1">
                            <button type="button" aria-label="Edit" title="Edit" onClick={() => handleStartEdit(source)} className={iconButton}>
                              <Pencil aria-hidden="true" className="size-4" />
                            </button>
                            {source.is_active && (
                              <button type="button" aria-label="Deactivate" title="Deactivate" onClick={() => handleDelete(source.id)} className={cn(iconButton, 'text-loss')}>
                                <Trash2 aria-hidden="true" className="size-4" />
                              </button>
                            )}
                          </span>
                        )}
                      </td>

                      {editing ? editorCells(editFormData, setEditFormData, handleEditPipelineToggle) : (
                        <>
                          <td className={cn(tdClass, 'font-medium')}>{source.name}</td>
                          <td className={tdClass}><Pill tone="muted">{source.source_type}</Pill></td>
                          <td className={tdClass}><span className="block max-w-[200px] truncate" title={source.url}>{source.url}</span></td>
                          <td className={tdClass}>
                            <span className="flex gap-1">
                              {(source.pipelines || ['technical', 'fundamental']).map((p) => (
                                <Pill key={p} tone="muted" className="h-5">{p === 'technical' ? 'Tech' : 'Fund'}</Pill>
                              ))}
                            </span>
                          </td>
                          <td className={cn(tdClass, 'text-center tabular-nums')}>{source.priority}</td>
                          <td className={cn(tdClass, 'text-center tabular-nums')}>{`${source.fetch_interval_minutes}`}</td>
                          <td className={cn(tdClass, 'text-center')}>
                            <Pill tone={source.is_active ? 'gain' : 'muted'}>{source.is_active ? 'Active' : 'Inactive'}</Pill>
                          </td>
                        </>
                      )}

                      <td className={tdClass}>
                        <span className="flex flex-col items-start gap-1">
                          <span className="text-[11px] text-muted-foreground">{formatDate(source.last_success_at)}</span>
                          {source.consecutive_failures > 0 && (
                            <Pill
                              tone="loss"
                              title={`${source.last_error} (${formatDate(source.last_error_at)})`}
                              aria-label={`${source.last_error} (${formatDate(source.last_error_at)})`}
                            >
                              {`Failed ${source.consecutive_failures}× in a row`}
                            </Pill>
                          )}
                        </span>
                      </td>

                      <td className={cn(tdClass, 'text-right tabular-nums')}>{source.total_items_fetched}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ManageSourcesModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title="Manage Content Sources" size="xl">
        <ManageSourcesContent />
      </DialogContent>
    </Dialog>
  );
}

export default ManageSourcesModal;
