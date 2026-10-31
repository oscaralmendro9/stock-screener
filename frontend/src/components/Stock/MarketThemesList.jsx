import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/cn';

const CHIP = 'inline-flex items-center rounded-sm border border-accent/40 px-1.5 text-accent';

function WrapVariant({ themes, emptyText }) {
  if (!themes?.length) {
    return <span className="text-xs text-muted-foreground">{emptyText}</span>;
  }
  return (
    <div className="tw flex flex-wrap gap-1.5">
      {themes.map((theme, i) => (
        // Long labels wrap rather than being clipped.
        <span
          key={`${theme}-${i}`}
          className={cn(CHIP, 'py-0.5 text-xs leading-snug')}
          style={{ whiteSpace: 'normal' }}
        >
          {theme}
        </span>
      ))}
    </div>
  );
}

function CompactVariant({ themes, maxInlineChips }) {
  if (!themes?.length) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const inline = themes.slice(0, maxInlineChips);
  const overflow = themes.length - inline.length;

  // Visible chips have no click handler, so clicks still bubble to the row
  // (open chart on row click). Only the +N trigger and the popover stop
  // propagation. No portal: this sits inside MUI tables and modals too.
  return (
    <span className="tw inline-flex max-w-full items-center gap-1" title={themes.join(' · ')}>
      {inline.map((theme, i) => (
        <span key={`${theme}-${i}`} className={cn(CHIP, 'h-5 max-w-[110px] truncate text-[11px]')}>
          {theme}
        </span>
      ))}
      {overflow > 0 && (
        <PopoverPrimitive.Root>
          <PopoverPrimitive.Trigger
            aria-label={`Show all ${themes.length} market themes`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-5 cursor-pointer items-center rounded-sm border border-border px-1.5 text-[11px] text-muted-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
          >
            {`+${overflow}`}
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            collisionPadding={8}
            onClick={(event) => event.stopPropagation()}
            className="tw z-toast max-w-xs rounded-md border border-border bg-surface p-2.5 text-foreground shadow-lg outline-none"
          >
            <p className="mb-1.5 text-xs text-muted-foreground">Market Themes ({themes.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((theme, i) => (
                <span key={`${theme}-${i}`} className={cn(CHIP, 'py-0.5 text-xs leading-snug whitespace-normal')}>
                  {theme}
                </span>
              ))}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Root>
      )}
    </span>
  );
}

export default function MarketThemesList({
  themes,
  variant = 'wrap',
  maxInlineChips = 1,
  emptyText = 'No market taxonomy themes are available for this symbol.',
}) {
  if (variant === 'compact') {
    return <CompactVariant themes={themes} maxInlineChips={maxInlineChips} />;
  }
  return <WrapVariant themes={themes} emptyText={emptyText} />;
}
