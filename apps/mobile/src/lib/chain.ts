import { defineChain } from 'viem';

export function parseEip155ChainId(value: unknown): number | undefined {
  let chainId: number;
  if (typeof value === 'number') {
    chainId = value;
  } else if (typeof value === 'string' && /^0x[\da-f]+$/i.test(value)) {
    chainId = Number.parseInt(value, 16);
  } else if (typeof value === 'string' && /^\d+$/.test(value)) {
    chainId = Number.parseInt(value, 10);
  } else {
    return undefined;
  }
  return Number.isSafeInteger(chainId) && chainId > 0 ? chainId : undefined;
}

export const whitechainSepolia = defineChain({
  id: 1874,
  name: 'Whitechain Sepolia',
  nativeCurrency: { name: 'Whitechain Testnet WBT', symbol: 'WBT', decimals: 18 },
  rpcUrls: { default: { http: [process.env.EXPO_PUBLIC_WHITECHAIN_RPC_URL?.trim() || 'https://rpc.testnet.whitechain.io'] } },
  blockExplorers: {
    default: { name: 'Whitechain Explorer', url: 'https://explorer.testnet.whitechain.io' },
  },
  testnet: true,
});

export const sponsorUsdt = {
  address: '0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7' as const,
  decimals: 6,
  symbol: 'USDT',
} as const;

export const erc20BalanceAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const erc20DecimalsAbi = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;
