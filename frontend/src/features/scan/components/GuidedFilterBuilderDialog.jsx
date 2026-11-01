import { useEffect, useMemo, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import {
  conditionLabel,
  newCondition,
  validateExpression,
} from '../filterExpressionBuilder';
import {
  BUILDER_FIELD_CATALOG,
  EXPRESSION_LIMITS,
  fieldMeta,
  fieldValueOptions,
  isOpportunityStateField,
} from '../scanFilterFields';
import CompactMultiSelect from '../../../components/Scan/filters/CompactMultiSelect';
import { Button } from '@/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/ui/dialog';
import { NativeSelect } from '@/ui/native-select';
import { Notice } from '@/ui/notice';
import { cn } from '@/lib/cn';

const groupId = () => `setup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function clone(value) {
  return structuredClone(value);
}

const INPUT = 'h-11 w-full rounded-md border border-border bg-surface px-2.5 font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8';

function TextInput({ label, className, ...props }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input className={INPUT} {...props} />
    </label>
  );
}

// Fields grouped by category, so the picker reads like the old two-line menu.
function FieldOptions({ fieldCatalog }) {
  const byCategory = new Map();
  fieldCatalog.forEach((item) => {
    const list = byCategory.get(item.category) || [];
    list.push(item);
    byCategory.set(item.category, list);
  });
  return [...byCategory].map(([category, items]) => (
    <optgroup key={category} label={category}>
      {items.map((item) => <option key={item.field} value={item.field}>{item.label}</option>)}
    </optgroup>
  ));
}

const ICON = 'grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:size-8';

function ConditionEditor({
  condition,
  fieldCatalog,
  onChange,
  onDelete,
  valueOptions = [],
}) {
  const meta = fieldMeta(condition.field, condition.kind);
  const categoricalValueCount = condition.values?.length ?? 0;
  const categoricalLimitExceeded = (
    categoricalValueCount > EXPRESSION_LIMITS.maxCategoricalValues
  );
  const rangeInputType = meta.value_type === 'date' ? 'date' : 'number';
  const rangeValue = (value) => (
    value === '' ? null : (rangeInputType === 'date' ? value : Number(value))
  );
  const handleFieldChange = (field) => onChange(newCondition(field));

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <NativeSelect label="Field" value={condition.field} onChange={handleFieldChange} className="md:w-52">
          <FieldOptions fieldCatalog={fieldCatalog} />
        </NativeSelect>

        {meta.type === 'range' && (
          <>
            <TextInput
              label="Minimum"
              type={rangeInputType}
              value={condition.min ?? ''}
              onChange={(event) => onChange({ ...condition, min: rangeValue(event.target.value) })}
              className="md:w-[135px]"
            />
            <TextInput
              label="Maximum"
              type={rangeInputType}
              value={condition.max ?? ''}
              onChange={(event) => onChange({ ...condition, max: rangeValue(event.target.value) })}
              className="md:w-[135px]"
            />
          </>
        )}

        {meta.type === 'categorical' && (
          <>
            <NativeSelect label="Mode" value={condition.mode} onChange={(mode) => onChange({ ...condition, mode })} className="md:w-28">
              <option value="include">Include</option>
              <option value="exclude">Exclude</option>
            </NativeSelect>
            <div className="min-w-0 flex-1 md:min-w-[260px]">
              <CompactMultiSelect
                label="Values"
                values={condition.values || []}
                options={valueOptions}
                onChange={(values) => onChange({
                  ...condition,
                  values: values.map((value) => String(value).trim()).filter(Boolean),
                })}
                placeholder={valueOptions.length ? 'Choose or type a value' : 'Type a value, then press Enter'}
                freeSolo
                error={categoricalLimitExceeded}
                helperText={`${categoricalValueCount}/${EXPRESSION_LIMITS.maxCategoricalValues} values`}
              />
            </div>
          </>
        )}

        {meta.type === 'boolean' && (
          <NativeSelect
            label="Value"
            value={condition.value ? 'yes' : 'no'}
            onChange={(value) => onChange({ ...condition, value: value === 'yes' })}
            className="md:w-32"
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </NativeSelect>
        )}

        {meta.type === 'text' && (
          <TextInput
            label="Contains"
            value={condition.pattern || ''}
            onChange={(event) => onChange({ ...condition, pattern: event.target.value })}
            className="flex-1"
          />
        )}

        <button type="button" onClick={onDelete} aria-label="Remove rule" title="Remove rule" className={ICON}>
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}

function SetupGroupCard({
  group,
  index,
  onChange,
  onDelete,
  onDuplicate,
  optionValues,
  defaultField,
  fieldCatalog,
}) {
  const updateCondition = (conditionIndex, condition) => {
    const conditions = [...group.conditions];
    conditions[conditionIndex] = condition;
    onChange({ ...group, conditions });
  };

  return (
    <div className={cn('rounded-lg border p-3', group.enabled ? 'border-accent/50' : 'border-border opacity-70')}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <TextInput
          label={`Setup ${index + 1} name`}
          value={group.name}
          maxLength={EXPRESSION_LIMITS.maxGroupNameLength}
          onChange={(event) => onChange({ ...group, name: event.target.value })}
          className="sm:w-60"
        />
        <NativeSelect label="Rules in this setup" value={group.match} onChange={(match) => onChange({ ...group, match })} className="sm:w-44">
          <option value="all">Match all rules</option>
          <option value="any">Match any rule</option>
        </NativeSelect>
        <label className="flex h-11 cursor-pointer items-center gap-2 text-sm sm:ml-auto md:h-8">
          <input
            type="checkbox"
            role="switch"
            checked={group.enabled}
            onChange={(event) => onChange({ ...group, enabled: event.target.checked })}
            className="size-4 cursor-pointer accent-accent"
          />
          {group.enabled ? 'Enabled' : 'Disabled'}
        </label>
        <span className="flex">
          <button type="button" onClick={onDuplicate} aria-label="Duplicate setup" title="Duplicate setup" className={ICON}>
            <Copy aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={onDelete} aria-label="Delete setup" title="Delete setup" className={cn(ICON, 'hover:text-loss')}>
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </span>
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {group.conditions.map((condition, conditionIndex) => (
          <ConditionEditor
            key={`${group.id}-${conditionIndex}`}
            condition={condition}
            fieldCatalog={fieldCatalog}
            onChange={(next) => updateCondition(conditionIndex, next)}
            onDelete={() => onChange({
              ...group,
              conditions: group.conditions.filter((_, itemIndex) => itemIndex !== conditionIndex),
            })}
            valueOptions={fieldValueOptions(condition.field, optionValues)}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2"
        disabled={!defaultField || group.conditions.length >= EXPRESSION_LIMITS.maxGroupConditions}
        onClick={() => onChange({
          ...group,
          conditions: [...group.conditions, newCondition(defaultField)],
        })}
      >
        <Plus aria-hidden="true" />
        Add rule
      </Button>

      {group.conditions.length > 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Reads as: {group.conditions.map((condition) => conditionLabel(condition)).join(group.match === 'all' ? ' AND ' : ' OR ')}
        </p>
      )}
    </div>
  );
}

export default function GuidedFilterBuilderDialog({
  open,
  expression,
  onClose,
  onApply,
  filterOptions = {},
  opportunityStateAvailable = false,
}) {
  const [draft, setDraft] = useState(() => clone(expression));
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(clone(expression));
      setShowErrors(false);
    }
  }, [expression, open]);

  const fieldCatalog = useMemo(
    () => (opportunityStateAvailable
      ? BUILDER_FIELD_CATALOG
      : BUILDER_FIELD_CATALOG.filter((item) => !isOpportunityStateField(item.field))),
    [opportunityStateAvailable],
  );
  const defaultField = fieldCatalog.some((item) => item.field === 'composite_score')
    ? 'composite_score'
    : fieldCatalog[0]?.field;
  const errors = useMemo(
    () => validateExpression(draft),
    [draft],
  );
  const updateGroup = (index, group) => {
    const groups = [...draft.groups];
    groups[index] = group;
    setDraft({ ...draft, groups });
  };

  const addGroup = () => {
    const number = draft.groups.length + 1;
    setDraft({
      ...draft,
      groups: [
        ...draft.groups,
        {
          id: groupId(),
          name: `Setup ${number}`,
          match: 'all',
          enabled: true,
          conditions: [newCondition(defaultField)],
        },
      ],
    });
  };

  const handleApply = () => {
    setShowErrors(true);
    if (errors.length) return;
    onApply(draft);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        title="Build scan logic"
        size="lg"
        footer={(
          <>
            <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleApply}>Apply logic</Button>
          </>
        )}
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Keep non-negotiable rules in “Always require,” then describe alternate named setups.
          This makes the result list explainable without exposing raw boolean syntax.
        </p>

        <div className="mb-4 rounded-lg border border-border bg-surface-subtle p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Always require</h3>
            <span className="inline-flex h-5 items-center rounded-full border border-border px-2 text-[11px] tabular-nums">{`${draft.required.conditions.length} rules`}</span>
            <span className="text-[11px] text-muted-foreground">
              Managed by the quick filters on the results page. Every matching stock must pass these rules.
            </span>
          </div>
          {draft.required.conditions.length > 0 && (
            <p className="mt-2 text-[11px]">
              {draft.required.conditions
                .map((condition) => conditionLabel(condition))
                .join(' AND ')}
            </p>
          )}
        </div>

        <fieldset className="mb-4">
          <legend className="text-sm font-semibold">How should named setups combine?</legend>
          <div className="flex flex-wrap gap-x-6">
            {[['any', 'Match any setup (broader)'], ['all', 'Match all setups (narrower)']].map(([value, label]) => (
              <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm md:min-h-9">
                <input
                  type="radio"
                  name="group-join"
                  value={value}
                  checked={draft.group_join === value}
                  onChange={() => setDraft({ ...draft, group_join: value })}
                  className="size-4 cursor-pointer accent-accent"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <hr className="mb-4 border-border" />
        <div className="flex flex-col gap-3">
          {draft.groups.map((group, index) => (
            <SetupGroupCard
              key={group.id}
              group={group}
              index={index}
              onChange={(next) => updateGroup(index, next)}
              onDelete={() => setDraft({
                ...draft,
                groups: draft.groups.filter((_, itemIndex) => itemIndex !== index),
              })}
              onDuplicate={() => {
                if (draft.groups.length >= EXPRESSION_LIMITS.maxGroups) return;
                const duplicate = clone(group);
                duplicate.id = groupId();
                duplicate.name = `${group.name} copy`.slice(
                  0,
                  EXPRESSION_LIMITS.maxGroupNameLength,
                );
                setDraft({ ...draft, groups: [...draft.groups, duplicate] });
              }}
              optionValues={filterOptions.optionValues || {}}
              defaultField={defaultField}
              fieldCatalog={fieldCatalog}
            />
          ))}
        </div>

        {!draft.groups.length && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Add a named setup such as “Breakout ready” or “Pullback candidate.”
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={addGroup}
          disabled={!defaultField || draft.groups.length >= EXPRESSION_LIMITS.maxGroups}
        >
          <Plus aria-hidden="true" />
          Add named setup
        </Button>

        {showErrors && errors.length > 0 && (
          <Notice tone="warning" role="alert" className="mt-4">
            {errors.map((error) => <div key={error}>{error}</div>)}
          </Notice>
        )}
      </DialogContent>
    </Dialog>
  );
}
