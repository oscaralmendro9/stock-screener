import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { matchRangePreset } from './filterGridConfig';

const ANY = '';
const CUSTOM = '__custom__';

// 16px on phones keeps iOS Safari from zooming in; 44px rows meet touch targets.
const CONTROL = 'h-11 w-full min-w-0 cursor-pointer rounded-md border bg-surface-subtle px-2 text-base text-foreground outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7 md:text-xs';
// A set filter stands out, as in Finviz, so the active ones read at a glance.
const controlTone = (active) => (active ? 'border-accent bg-accent/10 font-medium' : 'border-border');

const toNumber = (text) => {
  if (text === '' || text == null) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

function CustomRangeInputs({ label, value, onChange, minOnly, prefix, suffix }) {
  const [minText, setMinText] = useState(value?.min ?? '');
  const [maxText, setMaxText] = useState(value?.max ?? '');

  // Follow outside changes (reset, preset load) without clobbering typing.
  useEffect(() => { setMinText(value?.min ?? ''); }, [value?.min]);
  useEffect(() => { setMaxText(value?.max ?? ''); }, [value?.max]);

  const commit = () => {
    const next = { min: toNumber(minText), max: minOnly ? null : toNumber(maxText) };
    if (next.min !== (value?.min ?? null) || next.max !== (value?.max ?? null)) onChange(next);
  };
  const onKeyDown = (event) => {
    if (event.key === 'Enter') commit();
  };
  const unit = [prefix, suffix].filter(Boolean).join(' ');
  const input = (text, setText, bound) => (
    <input
      type="number"
      inputMode="decimal"
      aria-label={`${label} ${bound}${unit ? ` (${unit})` : ''}`}
      placeholder={bound}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className={cn(CONTROL, controlTone(false), 'cursor-text tabular-nums')}
    />
  );
  return (
    <div className="mt-1 flex items-center gap-1">
      {input(minText, setMinText, 'Min')}
      {!minOnly && (
        <>
          <span aria-hidden="true" className="text-xs text-muted-foreground">–</span>
          {input(maxText, setMaxText, 'Max')}
        </>
      )}
      {unit ? <span className="shrink-0 text-xs text-muted-foreground">{unit}</span> : null}
    </div>
  );
}

/** Preset buckets for a {min, max} range, plus "Custom…" for typed bounds. */
export function RangePresetSelect({ id, label, value, onChange, presets, minOnly = false, prefix, suffix }) {
  const matched = matchRangePreset(presets, value);
  const hasValue = value?.min != null || value?.max != null;
  const [customOpen, setCustomOpen] = useState(hasValue && !matched);
  const hadValue = useRef(hasValue);
  useEffect(() => {
    // A value no preset matches (saved preset, typed range) shows as custom;
    // a value cleared from outside (Reset) closes the custom inputs.
    if (hasValue && !matched) setCustomOpen(true);
    else if (!hasValue && hadValue.current) setCustomOpen(false);
    hadValue.current = hasValue;
  }, [hasValue, matched]);

  const selected = customOpen ? CUSTOM : matched ? String(presets.indexOf(matched)) : ANY;
  const handleSelect = (next) => {
    if (next === CUSTOM) {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    onChange(next === ANY ? { min: null, max: null } : { ...presets[Number(next)].value });
  };

  return (
    <div className="min-w-0">
      <select
        id={id}
        value={selected}
        onChange={(event) => handleSelect(event.target.value)}
        className={cn(CONTROL, controlTone(hasValue))}
      >
        <option value={ANY}>Any</option>
        {presets.map((preset, index) => <option key={preset.label} value={String(index)}>{preset.label}</option>)}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {customOpen && (
        <CustomRangeInputs label={label} value={value} onChange={onChange} minOnly={minOnly} prefix={prefix} suffix={suffix} />
      )}
    </div>
  );
}

/** One choice from a fixed list; "Any" clears it (null). */
export function ChoiceSelect({ id, value, onChange, options }) {
  const index = options.findIndex((option) => option.value === value);
  return (
    <select
      id={id}
      value={index < 0 ? ANY : String(index)}
      onChange={(event) => onChange(event.target.value === ANY ? null : options[Number(event.target.value)].value)}
      className={cn(CONTROL, controlTone(index >= 0))}
    >
      <option value={ANY}>Any</option>
      {options.map((option, i) => <option key={String(option.value)} value={String(i)}>{option.label}</option>)}
    </select>
  );
}

/** Tri-state flag: Any (null), Yes (true), No (false). */
export function BoolSelect({ id, value, onChange }) {
  return (
    <select
      id={id}
      value={value == null ? ANY : String(value)}
      onChange={(event) => onChange(event.target.value === ANY ? null : event.target.value === 'true')}
      className={cn(CONTROL, controlTone(value != null))}
    >
      <option value={ANY}>Any</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

export function TextFilter({ id, value, onChange, placeholder }) {
  return (
    <input
      id={id}
      type="search"
      value={value || ''}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(CONTROL, controlTone(Boolean(value)), 'cursor-text')}
    />
  );
}
