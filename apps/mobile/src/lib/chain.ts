import { defineChain } from 'viem';

export const whitechainSepolia = defineChain({
  id: 1874,
  name: 'Whitechain Sepolia',
  nativeCurrency: { name: 'Whitechain Testnet WBT', symbol: 'WBT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.whitechain.io'] } },
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
