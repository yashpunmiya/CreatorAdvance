import { formatToken } from '../format-token';

describe('formatToken', () => {
  it('formats six-decimal USDT without floating point arithmetic', () => {
    expect(formatToken(1234567890n, 6, 2)).toBe('1,234.56');
  });

  it('pads small token balances to the requested display precision', () => {
    expect(formatToken(42n, 6, 2)).toBe('0.00');
  });

  it('formats eighteen-decimal WBT balances', () => {
    expect(formatToken(1234567890000000000n, 18, 4)).toBe('1.2345');
  });

  it('rejects display precision greater than the token decimals', () => {
    expect(() => formatToken(1n, 6, 7)).toThrow(RangeError);
  });
});
