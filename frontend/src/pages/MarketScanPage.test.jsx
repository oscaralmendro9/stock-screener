import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MarketScanPage from './MarketScanPage';

const runtimeState = {
  features: {
    themes: false,
    social_signals: false,
  },
};

vi.mock('../contexts/RuntimeContext', () => ({
  useRuntime: () => runtimeState,
}));

vi.mock('../components/MarketScan/DailyMarketSnapshotTab', () => ({
  default: ({ showSocialSignals, onOpenSocialSignals }) => <div>
    daily-snapshot-tab
    {showSocialSignals ? <button type="button" onClick={onOpenSocialSignals}>daily-social-card</button> : null}
  </div>,
}));

vi.mock('../features/socialSignals/SocialSignalsTab', () => ({
  default: () => <div>social-signals-tab</div>,
}));

const renderPage = () => render(
  <ThemeProvider theme={createTheme()}>
    <MarketScanPage />
  </ThemeProvider>,
);

describe('MarketScanPage (Home)', () => {
  beforeEach(() => {
    runtimeState.features = { themes: false, social_signals: false };
  });

  it('shows the snapshot alone, without a tab rail, when Social Signals is off', () => {
    runtimeState.features = { themes: true, social_signals: false };
    renderPage();

    expect(screen.getByText('daily-snapshot-tab')).toBeInTheDocument();
    // Key Markets, COT, Themes, Watchlists and Stockbee moved out of Home.
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('shows Social Signals beside the snapshot only when enabled', async () => {
    runtimeState.features = { themes: false, social_signals: true };
    renderPage();

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Daily Snapshot', 'Social Signals']);
    fireEvent.click(screen.getByRole('button', { name: 'daily-social-card' }));
    expect(await screen.findByText('social-signals-tab')).toBeInTheDocument();
  });
});
