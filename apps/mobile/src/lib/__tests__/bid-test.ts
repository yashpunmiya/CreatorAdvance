import { prepareBid } from '../bid';

const now = Date.parse('2026-11-06T00:00:00Z');
const closes = '2026-11-08T00:00:00Z';
test('converts a bid exactly and caps expiry at the listing deadline', () => {
  expect(prepareBid('97.000001', '100000000', closes, now)).toEqual({ amount: 97000001n, expiry: Date.parse(closes) / 1000 });
});
test.each(['0', '-1', '101', '1.0000001', '1e2', 'NaN'])('rejects invalid bid %s before approval', input => {
  expect(() => prepareBid(input, '100000000', closes, now)).toThrow();
});
test.each([undefined, 'invalid', '2026-11-05T00:00:00Z'])('rejects unavailable or closed listings', expiry => {
  expect(() => prepareBid('50', '100000000', expiry, now)).toThrow();
});
