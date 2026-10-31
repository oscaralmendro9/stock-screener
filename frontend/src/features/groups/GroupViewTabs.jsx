import { cn } from '@/lib/cn';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';

import { RRG_SCOPE_LABELS } from '../../utils/rrgScopes';

const VIEW_LABELS = { table: 'Table', rrg: 'RRG', matrix: 'Matrix' };

// Tab list for the Groups views. The page renders the panel itself as
// `<div role="tabpanel" id="group-panel-{view}" aria-labelledby="group-tab-{view}">`.
export default function GroupViewTabs({ view, onView, scope, onScope, rrgAvailable, availableScopes = [], matrixAvailable = true, className }) {
  const views = ['table', ...(rrgAvailable ? ['rrg'] : []), ...(matrixAvailable ? ['matrix'] : [])];
  return (
    <div className={cn('tw flex flex-wrap items-center gap-2', className)}>
      <Tabs value={view} onValueChange={onView}>
        <TabsList aria-label="Group views">
          {views.map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              id={`group-tab-${value}`}
              aria-controls={`group-panel-${value}`}
            >
              {VIEW_LABELS[value]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {view === 'rrg' && availableScopes.length > 1 && (
        <div role="group" aria-label="RRG scope" className="inline-flex rounded-md border border-border p-0.5">
          {availableScopes.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === scope}
              onClick={() => { if (value !== scope) onScope(value); }}
              className={cn(
                'h-9 cursor-pointer rounded-sm px-3 text-xs font-semibold outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring md:h-7',
                value === scope ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground',
              )}
            >
              {RRG_SCOPE_LABELS[value]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
