import { cn } from '@/lib/cn';

// Placeholders shaped like the content that is loading, so the page has its
// final layout immediately and nothing jumps when data arrives. Each is a
// status region with visually hidden text, so screen readers can announce
// what is loading (an aria-label alone isn't announced on insertion).

const LoadingText = ({ children }) => <span className="sr-only">{children}</span>;

function Bone({ className, style }) {
  return <span data-skeleton="" className={cn('block rounded-sm bg-surface-subtle motion-safe:animate-pulse', className)} style={style} />;
}

/** `bare` drops the outlined card for use inside an existing card. */
export function TableSkeleton({ label = 'Loading', rows = 8, columns = 6, title = true, bare = false }) {
  return (
    <div
      role="status"
      data-card={bare ? undefined : ''}
      className={cn('tw', !bare && 'rounded-lg border border-border bg-surface p-3')}
    >
      <LoadingText>{label}</LoadingText>
      {title ? <Bone className="mb-2 h-4 w-[180px]" /> : null}
      <Bone className="mb-2 h-7 rounded-md" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="grid gap-3"
            style={{ gridTemplateColumns: `2fr repeat(${Math.max(columns - 1, 1)}, 1fr)` }}
          >
            {Array.from({ length: columns }, (_, col) => <Bone key={col} className="h-3.5" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ label = 'Loading page' }) {
  return (
    <div role="status" className="tw py-2">
      <LoadingText>{label}</LoadingText>
      <Bone className="mb-2 h-7 w-[260px]" />
      <Bone className="mb-4 h-4 w-[180px]" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Bone key={i} className="h-24 rounded-md" />)}
      </div>
      <Bone className="h-80 rounded-md" />
    </div>
  );
}
