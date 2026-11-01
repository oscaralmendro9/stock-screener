// Stand-in for the MUI Grid these sections were laid out with: a wrapping
// flex row whose items take xs/sm/md widths in twelfths (fractional spans
// such as md={1.5} work), with `spacing` in 8px units as padding.
const pct = (span) => (span == null ? undefined : `${(span / 12) * 100}%`);

export default function Grid({ container, item, spacing = 0, xs = 12, sm, md, children }) {
  if (container) {
    return (
      <div className="flex flex-wrap" style={{ '--grid-gap': `${spacing * 8}px`, margin: `calc(var(--grid-gap) / -2)` }}>
        {children}
      </div>
    );
  }
  if (!item) return children;
  const xsWidth = pct(xs);
  const smWidth = pct(sm) ?? xsWidth;
  const mdWidth = pct(md) ?? smWidth;
  return (
    <div
      data-filter-cell=""
      className="min-w-0 shrink-0 basis-[var(--cell-xs)] p-[calc(var(--grid-gap)/2)] sm:basis-[var(--cell-sm)] md:basis-[var(--cell-md)]"
      style={{ '--cell-xs': xsWidth, '--cell-sm': smWidth, '--cell-md': mdWidth }}
    >
      {children}
    </div>
  );
}
