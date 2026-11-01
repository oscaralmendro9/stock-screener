import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SectionTabs } from './SectionTabs';

const runtimeState = { features: {} };
vi.mock('../../contexts/RuntimeContext', () => ({
  useRuntime: () => runtimeState,
}));

const renderAt = (path, section) => render(
  <MemoryRouter initialEntries={[path]}>
    <SectionTabs section={section} />
  </MemoryRouter>,
);

describe('SectionTabs', () => {
  beforeEach(() => {
    runtimeState.features = {};
  });

  it('links a section’s sub-pages and marks the open one', () => {
    renderAt('/validation', 'screener');

    const nav = screen.getByRole('navigation', { name: 'Section' });
    expect(nav).toHaveTextContent('ScreenerBacktest');
    expect(screen.getByRole('link', { name: 'Backtest' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Screener' })).toHaveAttribute('href', '/scan');
  });

  it('drops feature-gated sub-pages, and the whole bar when one page is left', () => {
    renderAt('/groups', 'groups');
    expect(screen.queryByRole('navigation', { name: 'Section' })).not.toBeInTheDocument();

    runtimeState.features = { themes: true };
    renderAt('/groups', 'groups');
    expect(screen.getByRole('link', { name: 'Themes' })).toHaveAttribute('href', '/themes');
  });
});
