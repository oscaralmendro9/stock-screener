import { cn } from '@/lib/cn';

// Class names shared by the Themes tables and links.
export const linkClass = 'text-accent no-underline hover:underline';
const TH_BASE = 'sticky top-0 z-[1] border-b border-border bg-surface px-2 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground';
export const thClass = (align = 'left') => cn(TH_BASE, align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left');
export const tdClass = 'border-b border-border px-2 py-1.5';
