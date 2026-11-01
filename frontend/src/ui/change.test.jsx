import { render, screen } from '@testing-library/react';

import { Change } from './change';

describe('Change', () => {
  it('writes the sign so direction does not rely on color', () => {
    render(<Change value={0.0123} />);
    expect(screen.getByText(/\+1[.,]23/)).toBeInTheDocument();
  });

  it('shows a dash when the value is missing', () => {
    render(<Change value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
