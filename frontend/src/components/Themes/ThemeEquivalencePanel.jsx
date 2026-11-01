import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';
import { searchThemeEquivalence, previewThemeEquivalence, applyThemeEquivalence, getThemeEquivalenceHistory, undoThemeEquivalence } from '../../api/themes';
import { Field, Select } from '../../features/themes/themeUi';

// Server-searched theme picker: typing searches, picking an option selects it.
function ThemePicker({ label, value, onChange, options, loading, onSearch, disabled }) {
  const listId = useId();
  const [text, setText] = useState(value?.name || '');
  const [open, setOpen] = useState(false);
  const shown = (value && text === value.name) ? text : text;
  return (
    <div className="relative">
      <Field
        label={label}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        value={shown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(event) => { setText(event.target.value); onSearch(event.target.value); setOpen(true); if (value) onChange(null); }}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-surface p-1 shadow-md">
          {loading ? <li className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</li> : null}
          {!loading && !options.length ? <li className="px-2 py-1.5 text-xs text-muted-foreground">No themes</li> : null}
          {options.map((option) => (
            <li
              key={option.id}
              role="option"
              aria-selected={value?.id === option.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onChange(option); setText(option.name); setOpen(false); }}
              className="cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-surface-subtle"
            >
              {option.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ThemeEquivalencePanel() {
  const client = useQueryClient();
  const [pipeline, setPipeline] = useState('technical');
  const [source, setSource] = useState(null);
  const [target, setTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [actor, setActor] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [pickerGeneration, setPickerGeneration] = useState(0);
  const choices = useQuery({ queryKey: ['themeEquivalenceSearch', pipeline, search], queryFn: () => searchThemeEquivalence(pipeline, search) });
  const history = useQuery({ queryKey: ['themeEquivalenceHistory', pipeline], queryFn: () => getThemeEquivalenceHistory(pipeline) });
  const mutation = useMutation({
    mutationFn: async ({ action, id }) => {
      if (action === 'preview') return { preview: await previewThemeEquivalence(source.id, target.id) };
      const body = { reason: reason.trim() };
      if (action === 'undo') return undoThemeEquivalence(id, body, adminKey, actor.trim());
      return applyThemeEquivalence({ ...body, source_id: source.id, target_id: target.id,
        expected_version: preview.version, operation_key: preview.operationKey }, adminKey, actor.trim());
    },
    onSuccess: (data, variables) => {
      if (data.preview) { setPreview({ ...data.preview, operationKey: crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) => v.toString(16).padStart(2, '0')).join('') }); return; }
      setPreview(null); setSource(null); setTarget(null); setPickerGeneration((value) => value + 1);
      const action = variables.action === 'undo' ? 'Grouping undone' : 'Grouping saved';
      setMessage(data.refresh_status === 'complete' ? `${action}. Current results refreshed.` : `${action}. Current results are awaiting a refresh.`);
      client.invalidateQueries();
    },
  });
  const error = mutation.error || choices.error || history.error;
  const canReview = adminKey && actor.trim() && reason.trim() && !mutation.isPending;
  return <div className="tw flex flex-col gap-4 p-4 text-foreground">
    <Notice>Group only equivalent investment exposures. Keep broader and narrower themes, such as Memory and HBM, separate. Original names and evidence are preserved; grouping can be undone.</Notice>
    {error && <Notice tone="error">{error.response?.data?.detail || error.message || 'Unable to load grouping'}</Notice>}
    {message && <Notice>{message}</Notice>}
    <Select disabled={mutation.isPending} label="Pipeline" value={pipeline} onChange={(value) => { setPipeline(value); setSource(null); setTarget(null); setPreview(null); setPickerGeneration((n) => n + 1); }}>
      <option value="technical">Technical</option><option value="fundamental">Fundamental</option>
    </Select>
    {[['Theme to group', source, setSource], ['Display under theme', target, setTarget]].map(([label, value, setter]) =>
      <ThemePicker key={`${label}-${pickerGeneration}`} label={label} value={value} disabled={mutation.isPending}
        options={choices.data?.themes || []} loading={choices.isLoading} onSearch={setSearch}
        onChange={(next) => { setter(next); setPreview(null); }} />)}
    <Button variant="secondary" size="sm" className="self-start" disabled={!source || !target || source.id === target.id || mutation.isPending} onClick={() => mutation.mutate({ action: 'preview' })}>Preview grouping</Button>
    {preview && <Notice>{preview.aliases.map((a) => a.name).join(' + ')}: {preview.parent_posts} distinct source posts. Display under {target?.name}.</Notice>}
    <Field label="Reviewer" value={actor} onChange={(e) => setActor(e.target.value)} maxLength={120} />
    <Field label="Admin key" type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
    <Field label="Reason for grouping or undo" value={reason} onChange={(e) => setReason(e.target.value)} multiline maxLength={2000} />
    <Button size="sm" className="self-start" disabled={!preview || !canReview} onClick={() => mutation.mutate({ action: 'apply' })}>Apply reviewed grouping</Button>
    <h3 className="text-lg font-semibold">Grouping history</h3>
    {!history.isLoading && !history.data?.operations.length && <p>No reviewed groups yet.</p>}
    {history.data?.operations.map((op) => <div key={op.id} className="border-t border-border pt-2">
      <p>{op.aliases.map((a) => a.name).join(' + ')} — {op.active ? 'Active' : 'Undone'}</p>
      <p className="text-sm">{op.actor}: {op.reason}</p>
      {op.refresh_pending && <p className="text-sm">Current rankings are awaiting refresh.</p>}
      {!op.active && <p className="text-sm">Undo by {op.undone_by || 'unknown reviewer'}: {op.undo_reason}</p>}
      {op.active && <Button variant="ghost" size="sm" disabled={!canReview} onClick={() => mutation.mutate({ action: 'undo', id: op.id })}>Undo grouping {op.id}</Button>}
    </div>)}
  </div>;
}
