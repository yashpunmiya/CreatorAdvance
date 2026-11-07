export function prepareBid(input: string, faceValue: string, listingExpiry: string | undefined, now = Date.now()) {
  const text = input.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(text)) throw new Error('Enter a USDT amount with up to 6 decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  if (amount <= 0n || amount > BigInt(faceValue)) throw new Error('Your offer must be greater than zero and no more than the invoice value.');
  const closesAt = listingExpiry ? Date.parse(listingExpiry) : NaN;
  if (!Number.isFinite(closesAt) || closesAt <= now) throw new Error('This listing is closed or its expiry is unavailable. Refresh before bidding.');
  const expiry = Math.min(Math.floor(now / 1000) + 7 * 86400, Math.floor(closesAt / 1000));
  if (expiry <= Math.floor(now / 1000)) throw new Error('This listing has closed.');
  return { amount, expiry };
}
