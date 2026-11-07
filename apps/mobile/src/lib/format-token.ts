import { formatUnits } from 'viem';

export function parseUsdtAmount(value: string) {
  const normalized = value.trim().replace(/,/g, '');
  if (!/^(?:\d+)(?:\.\d{1,6})?$/.test(normalized)) throw new Error('Enter a positive USDT amount with up to 6 decimal places.');
  const [whole, fraction = ''] = normalized.split('.');
  const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  if (amount <= 0n) throw new Error('Enter a positive USDT amount.');
  return amount;
}

export function formatToken(value: bigint, decimals: number, displayDecimals: number) {
  if (decimals < 0 || displayDecimals < 0 || displayDecimals > decimals) {
    throw new RangeError('Token decimal precision is invalid.');
  }
  const raw = formatUnits(value, decimals);
  const [integer = '0', fraction = ''] = raw.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${fraction.padEnd(displayDecimals, '0').slice(0, displayDecimals)}`;
}
