import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

// One column on phones, two from md up, in CSS (no JS media query). `gap` is
// in the old 8px spacing units.
function GroupChartsLayout({ children, gap = 1, className, style, ...props }) {
  return (
    <div
      {...props}
      className={cn('tw grid grid-cols-1 md:grid-cols-2', className)}
      style={{ display: 'grid', gap: gap * 8, ...style }}
    >
      {children}
    </div>
  );
}

export const GroupChartCell = forwardRef(function GroupChartCell({ style, ...props }, ref) {
  return <div ref={ref} {...props} style={{ minWidth: 0, ...style }} />;
});

export default GroupChartsLayout;
