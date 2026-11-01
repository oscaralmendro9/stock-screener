import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import GroupChartsLayout, { GroupChartCell } from './GroupChartsLayout';

describe('GroupChartsLayout', () => {
  it('provides the shared two-column desktop chart grid contract in CSS', () => {
    render(
      <GroupChartsLayout data-testid="shared-group-charts-layout" gap={2}>
        <GroupChartCell data-testid="shared-group-chart-cell">AAA</GroupChartCell>
        <GroupChartCell>BBB</GroupChartCell>
      </GroupChartsLayout>,
    );

    const layout = screen.getByTestId('shared-group-charts-layout');
    expect(layout).toHaveStyle({ display: 'grid', gap: '16px' });
    // One column by default, two from md up: Tailwind classes, no JS media query.
    expect(layout).toHaveClass('grid-cols-1', 'md:grid-cols-2');
    expect(screen.getByTestId('shared-group-chart-cell')).toHaveStyle({ minWidth: '0' });
  });
});
