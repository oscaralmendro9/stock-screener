import { useContext, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { ChartLine, Ellipsis, Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/ui/sheet';
import { ColorModeContext } from '../../contexts/ColorModeContext';

const isActive = (item, pathname) => (
  item.matchPrefix ? pathname.startsWith(item.path) : pathname === item.path
);

// Hover, keyboard focus or a touch says a link is about to be followed; the
// live shell passes `onIntent` to prefetch the page, the static shell does not.
const intentHandlers = (onIntent, path) => (onIntent ? {
  onMouseEnter: () => onIntent(path),
  onFocus: () => onIntent(path),
  onTouchStart: () => onIntent(path),
} : {});

const iconButtonClass = 'tw grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:size-9 [&_svg]:size-[18px]';

export function BrandMark({ label }) {
  return (
    <div className="tw flex shrink-0 items-center gap-2">
      <span aria-hidden="true" className="grid size-7 place-items-center rounded-md bg-accent text-accent-foreground">
        <ChartLine className="size-[18px]" />
      </span>
      {label && <span className="text-[15px] font-bold whitespace-nowrap text-foreground">{label}</span>}
    </div>
  );
}

export function ColorModeButton() {
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  const Icon = mode === 'dark' ? Sun : Moon;
  return (
    <button type="button" onClick={toggleColorMode} title={label} aria-label={label} className={iconButtonClass}>
      <Icon aria-hidden="true" />
    </button>
  );
}

// A row in the mobile "More" sheet: an app link (`to`), an external link
// (`href`), a button (`onClick`), or plain text.
export function SheetItem({ to, href, icon, label, description, selected = false, onClick, disabled, ...props }) {
  const className = cn(
    'flex min-h-12 w-full cursor-pointer items-center gap-4 px-4 text-left text-sm outline-none transition-colors duration-150 ease-out hover:bg-surface-subtle focus-visible:bg-surface-subtle disabled:cursor-default disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
    selected && 'bg-accent/10 font-semibold [&_svg]:text-accent',
  );
  const body = (
    <>
      {icon}
      <span className="min-w-0 py-2">
        <span className="block">{label}</span>
        {description && <span className="block text-xs text-pretty text-muted-foreground">{description}</span>}
      </span>
    </>
  );
  return (
    <li>
      {to ? (
        <RouterLink to={to} onClick={onClick} aria-current={selected ? 'page' : undefined} className={className} {...props}>{body}</RouterLink>
      ) : href ? (
        <a href={href} onClick={onClick} className={className} {...props}>{body}</a>
      ) : onClick ? (
        <button type="button" onClick={onClick} disabled={disabled} className={className} {...props}>{body}</button>
      ) : (
        <div className={cn(className, 'cursor-default hover:bg-transparent')} {...props}>{body}</div>
      )}
    </li>
  );
}

export function SheetDivider() {
  return <li role="separator" className="my-1 border-t border-border" />;
}

export function ColorModeListItem({ onDone }) {
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  const Icon = mode === 'dark' ? Sun : Moon;
  return (
    <SheetItem
      icon={<Icon aria-hidden="true" />}
      label={mode === 'dark' ? 'Light mode' : 'Dark mode'}
      onClick={() => { toggleColorMode(); onDone?.(); }}
    />
  );
}

export function DesktopNav({ items, onIntent }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main" className="tw flex self-stretch">
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <RouterLink
            key={item.path}
            to={item.path}
            {...intentHandlers(onIntent, item.path)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center border-b-2 px-3 text-[13px] whitespace-nowrap outline-none transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-foreground focus-visible:bg-surface-subtle',
              active ? 'border-accent font-semibold text-foreground' : 'border-transparent font-medium text-muted-foreground',
            )}
          >
            {item.label}
          </RouterLink>
        );
      })}
    </nav>
  );
}

const tabClass = (active) => cn(
  'flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] outline-none focus-visible:bg-surface-subtle [&_svg]:size-[22px]',
  active ? 'font-semibold text-accent' : 'font-medium text-muted-foreground',
);

// The first four items sit in the bar; the rest, plus `extras(close)`, go in the "More" sheet.
export function MobileBottomNav({ items, extras, onIntent }) {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const close = () => setMoreOpen(false);
  const primary = items.slice(0, 4);
  const overflow = items.slice(4);
  const activePrimary = primary.find((item) => isActive(item, pathname));
  const moreActive = !activePrimary && overflow.some((item) => isActive(item, pathname));

  return (
    <>
      <nav
        aria-label="Main"
        className="tw fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
      >
        <div className="flex h-14">
          {primary.map((item) => (
            <RouterLink
              key={item.path}
              to={item.path}
              {...intentHandlers(onIntent, item.path)}
              aria-current={item === activePrimary ? 'page' : undefined}
              className={tabClass(item === activePrimary)}
            >
              {item.icon}
              <span className="max-w-full truncate px-1">{item.label}</span>
            </RouterLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            data-active={moreActive || undefined}
            className={tabClass(moreActive)}
          >
            <Ellipsis aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" aria-describedby={undefined}>
          <SheetTitle className="sr-only">More</SheetTitle>
          <SheetDescription className="sr-only">More pages and settings</SheetDescription>
          <ul aria-label="More" className="py-2">
            {overflow.map((item) => (
              <SheetItem
                key={item.path}
                to={item.path}
                {...intentHandlers(onIntent, item.path)}
                icon={item.icon}
                label={item.label}
                selected={isActive(item, pathname)}
                onClick={close}
              />
            ))}
            {overflow.length > 0 && extras && <SheetDivider />}
            {extras?.(close)}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
