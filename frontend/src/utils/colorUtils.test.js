import { describe, expect, it } from 'vitest';
import { getStageColor } from './colorUtils';

describe('getStageColor', () => {
  it('maps stages to theme tones, unknown stages to neutral grey', () => {
    expect([1, 2, 3, 4, null].map(getStageColor))
      .toEqual(['grey.500', 'success.main', 'warning.main', 'error.main', 'grey.500']);
  });
});
