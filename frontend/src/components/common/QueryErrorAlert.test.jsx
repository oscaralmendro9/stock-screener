import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import QueryErrorAlert from './QueryErrorAlert';
import { describeRequestError } from '../../utils/requestErrors';

const http = (status, detail) => Object.assign(new Error(`Request failed with status code ${status}`), {
  response: { status, data: detail ? { detail } : {} },
});

describe('describeRequestError', () => {
  it.each([
    [http(404), /nothing has been published yet/],
    [http(503), /server had a problem/],
    [http(401), /session has ended/],
    [http(422, 'Unknown market XX'), /^Unknown market XX$/],
    [Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }), /can't be reached/],
    [http(418), /^the request failed$/],
    [new Error('HK rankings unavailable'), /^HK rankings unavailable$/],
  ])('describes %s', (error, expected) => {
    expect(describeRequestError(error)).toMatch(expected);
  });
});

describe('QueryErrorAlert', () => {
  it('names what failed, never the raw transport error, and retries', () => {
    const onRetry = vi.fn();
    render(<QueryErrorAlert title="Error loading rankings" error={http(404)} onRetry={onRetry} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Error loading rankings: nothing has been published yet');
    expect(alert).not.toHaveTextContent('status code');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
