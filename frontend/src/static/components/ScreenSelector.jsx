import { cn } from '@/lib/cn';

const chipClass = (isActive) => cn(
  'inline-flex h-11 shrink-0 cursor-pointer items-center rounded-full border px-2.5 text-[11px] whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-6',
  isActive ? 'border-accent bg-accent font-semibold text-accent-foreground' : 'border-border bg-surface text-foreground hover:bg-surface-subtle',
);

function ScreenSelector({ screens, activeScreenId, onSelectScreen, matchCounts }) {
  if (!screens?.length) return null;

  const tier1 = screens.filter((s) => s.tier === 1);
  const tier2 = screens.filter((s) => s.tier !== 1);

  const renderChip = (screen) => {
    const isActive = activeScreenId === screen.id;
    const count = matchCounts?.[screen.id];
    const label = count != null ? `${screen.short_name} (${count})` : screen.short_name;

    return (
      <button
        key={screen.id}
        type="button"
        aria-pressed={isActive}
        title={`${screen.name} — ${screen.description}`}
        onClick={() => onSelectScreen(isActive ? null : screen.id)}
        className={chipClass(isActive)}
      >
        {label}
      </button>
    );
  };

  return (
    <div role="group" aria-label="Screens" className="tw mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
      <button
        type="button"
        aria-pressed={activeScreenId == null}
        onClick={() => onSelectScreen(null)}
        className={chipClass(activeScreenId == null)}
      >
        All Stocks
      </button>
      {tier1.map(renderChip)}
      {tier2.length > 0 && <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-border" />}
      {tier2.map(renderChip)}
    </div>
  );
}

export default ScreenSelector;
