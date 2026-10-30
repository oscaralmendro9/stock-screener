export const PER_PAGE_OPTIONS = [20, 50, 100];

// Page numbers with ellipses: 1 … 4 5 6 … 503 (the current page ±2, plus ends).
export function pageItems(page, pageCount) {
  const pages = new Set([1, pageCount]);
  for (let p = page - 2; p <= page + 2; p += 1) {
    if (p >= 1 && p <= pageCount) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, index) => (index > 0 && p - sorted[index - 1] > 1 ? ['gap', p] : [p]));
}
