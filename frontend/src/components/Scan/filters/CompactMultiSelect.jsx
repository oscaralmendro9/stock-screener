import { useId, useMemo, useState } from 'react';
import { Check, ChevronDown, Minus, Plus, X } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { cn } from '@/lib/cn';

/**
 * Compact multi-select for Industry/Sector filters: picked values show as
 * removable chips, and a popover lists the options with a search box
 * (arrow keys move, Enter toggles). Supports an include/exclude mode toggle.
 */
function CompactMultiSelect({
  label,
  values,
  options,
  onChange,
  placeholder = 'Select...',
  mode = 'include',
  onModeChange,
  showModeToggle = false,
  maxValues = null,
  // Inline: the caller labels it (e.g. the screener grid's <label htmlFor=id>),
  // so the caption row goes and the mode toggle sits beside the input.
  inline = false,
  id,
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const isExcludeMode = mode === 'exclude';
  const selectedValues = values || [];
  const hasSelectionLimit = Number.isInteger(maxValues) && maxValues > 0;
  const selectionLimitReached = hasSelectionLimit && selectedValues.length >= maxValues;
  const showSelectionLimit = hasSelectionLimit && (
    (options?.length ?? 0) > maxValues || selectionLimitReached
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = options || [];
    return needle ? all.filter((option) => String(option).toLowerCase().includes(needle)) : all;
  }, [options, query]);

  const isDisabled = (option) => selectionLimitReached && !selectedValues.includes(option);

  const toggle = (option) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((value) => value !== option));
    } else if (!isDisabled(option)) {
      const next = [...selectedValues, option];
      onChange(hasSelectionLimit ? next.slice(0, maxValues) : next);
    }
  };

  const handleOpenChange = (next) => {
    setOpen(next);
    if (next) {
      setQuery('');
      setActive(0);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!filtered.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + filtered.length) % filtered.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filtered[active] !== undefined) toggle(filtered[active]);
    }
  };

  const modeToggle = showModeToggle ? (
    <button
      type="button"
      aria-label={isExcludeMode ? `${label}: excluding selected` : `${label}: including selected`}
      title={isExcludeMode ? 'Excluding selected (click to include)' : 'Including selected (click to exclude)'}
      onClick={(event) => {
        event.stopPropagation();
        onModeChange?.(isExcludeMode ? 'include' : 'exclude');
      }}
      className={cn(
        'grid size-5 shrink-0 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
        inline ? 'mr-1' : 'ml-1',
        isExcludeMode ? 'bg-loss text-loss-foreground' : 'bg-accent text-accent-foreground',
      )}
    >
      {isExcludeMode ? <Minus aria-hidden="true" className="size-3.5" /> : <Plus aria-hidden="true" className="size-3.5" />}
    </button>
  ) : null;

  const activeId = filtered[active] !== undefined ? `${listId}-${active}` : undefined;

  return (
    <div className={cn('tw text-foreground', inline ? 'flex min-w-0 flex-wrap items-center' : 'min-w-36')}>
      {inline ? modeToggle : (
        <div className="mb-1 flex items-center">
          <span className="grow text-[11px] text-muted-foreground">{label}</span>
          {modeToggle}
        </div>
      )}
      <div
        className={cn(
          'flex min-h-11 min-w-0 flex-wrap items-center gap-0.5 rounded-md border bg-surface p-0.5 md:min-h-7',
          inline && 'flex-1',
          isExcludeMode && selectedValues.length > 0 ? 'border-loss/60' : 'border-border',
        )}
      >
        {selectedValues.map((value) => (
          <span
            key={value}
            className={cn(
              'inline-flex h-6 max-w-full items-center gap-0.5 rounded-full pr-0.5 pl-2 text-[11px] md:h-5',
              isExcludeMode ? 'bg-loss/15 text-loss' : 'bg-surface-subtle',
            )}
          >
            <span className="truncate">{value}</span>
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(selectedValues.filter((item) => item !== value))}
              className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:size-4"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        ))}
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            id={id}
            role="combobox"
            aria-label={inline ? undefined : label}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            className="flex h-10 min-w-6 flex-1 cursor-pointer items-center justify-between gap-1 rounded-sm px-1.5 text-left text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-6"
          >
            <span className="truncate">{selectedValues.length ? '' : placeholder}</span>
            <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 max-w-[calc(100vw-1rem)] p-1">
            <input
              autoFocus
              type="text"
              role="combobox"
              aria-label={`Search ${label}`}
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={activeId}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search…"
              className="mb-1 h-9 w-full rounded-sm font-[inherit] border border-border bg-surface px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <ul id={listId} role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-64 overflow-y-auto">
              {filtered.map((option, index) => {
                const selected = selectedValues.includes(option);
                const disabled = isDisabled(option);
                return (
                  <li
                    key={option}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={disabled ? 'true' : undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => toggle(option)}
                    className={cn(
                      'flex min-h-9 cursor-pointer items-center gap-2 rounded-sm px-2 text-xs',
                      index === active && 'bg-surface-subtle',
                      disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Check aria-hidden="true" className={cn('size-3.5 shrink-0 text-accent', !selected && 'invisible')} />
                    <span className="min-w-0 break-words">{option}</span>
                  </li>
                );
              })}
              {!filtered.length && <li className="px-2 py-2 text-xs text-muted-foreground">No matches</li>}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
      {showSelectionLimit && (!inline || selectionLimitReached) && (
        <span className={cn('mt-0.5 block basis-full text-[11px]', selectionLimitReached ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          Up to {maxValues} values
        </span>
      )}
    </div>
  );
}

export default CompactMultiSelect;
