import { formatUnits } from 'viem';

export function formatToken(value: bigint, decimals: number, displayDecimals: number) {
  if (decimals < 0 || displayDecimals < 0 || displayDecimals > decimals) {
    throw new RangeError('Token decimal precision is invalid.');
  }
  const raw = formatUnits(value, decimals);
  const [integer = '0', fraction = ''] = raw.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${fraction.padEnd(displayDecimals, '0').slice(0, displayDecimals)}`;
}
