import { describe, expect, it } from 'vitest';

import { formatFuturesPrice, formatNetOfOpenInterest, formatOrdinal, sortContracts } from './format';

describe('futures formatting', () => {
  it('scales price precision to the quote', () => {
    expect(formatFuturesPrice(5123.25)).toMatch(/5.?123[.,]25/);
    expect(formatFuturesPrice(1.08421)).toMatch(/1[.,]0842/);
    expect(formatFuturesPrice(0.0065123)).toMatch(/0[.,]006512/);
    expect(formatFuturesPrice(null)).toBe('—');
  });

  it('signs COT net share of open interest', () => {
    expect(formatNetOfOpenInterest(5.46)).toBe('+5.5% OI');
    expect(formatNetOfOpenInterest(-12)).toBe('−12.0% OI');
  });

  it.each([[1, '1st'], [2, '2nd'], [3, '3rd'], [11, '11th'], [12.4, '12th'], [22, '22nd'], [82.6, '83rd'], [100, '100th']])(
    'writes percentile %s as %s',
    (value, expected) => expect(formatOrdinal(value)).toBe(expected),
  );

  it('sorts highest first and keeps contracts without the metric last', () => {
    const contracts = [
      { root: 'A', metrics: { change_1d: 0.01 } },
      { root: 'B', metrics: null },
      { root: 'C', metrics: { change_1d: 0.03 } },
      { root: 'D', metrics: { change_1d: null } },
    ];
    expect(sortContracts(contracts, 'change_1d').map((c) => c.root)).toEqual(['C', 'A', 'B', 'D']);
    expect(sortContracts(contracts, 'default')).toBe(contracts);
  });
});
