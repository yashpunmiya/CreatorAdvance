import { isAddress, type Address } from 'viem';

const configuredAddress = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS?.trim();
export const creatorAdvanceAddress: Address | undefined = configuredAddress && isAddress(configuredAddress)
  ? configuredAddress as Address
  : undefined;

export const erc20ApprovalAbi = [{
  type: 'function', name: 'approve', stateMutability: 'nonpayable',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const;

export const creatorAdvanceAbi = [
  { type: 'function', name: 'registerBrand', stateMutability: 'nonpayable', inputs: [{ name: 'brandId', type: 'bytes32' }, { name: 'businessProfileHash', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'setBrandStatus', stateMutability: 'nonpayable', inputs: [{ name: 'brandId', type: 'bytes32' }, { name: 'status', type: 'uint8' }], outputs: [] },
  { type: 'function', name: 'setAuthorizedSigner', stateMutability: 'nonpayable', inputs: [{ name: 'brandId', type: 'bytes32' }, { name: 'signer', type: 'address' }, { name: 'allowed', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'setInvestorEligibility', stateMutability: 'nonpayable', inputs: [{ name: 'investor', type: 'address' }, { name: 'allowed', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'depositCollateral', stateMutability: 'nonpayable', inputs: [{ name: 'brandId', type: 'bytes32' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'createInvoice', stateMutability: 'nonpayable', inputs: [
    { name: 'brandId', type: 'bytes32' }, { name: 'invoiceNumberHash', type: 'bytes32' }, { name: 'faceValue', type: 'uint256' },
    { name: 'dueDate', type: 'uint64' }, { name: 'listingExpiry', type: 'uint64' }, { name: 'pdfHash', type: 'bytes32' },
    { name: 'deliveryHash', type: 'bytes32' }, { name: 'campaignHash', type: 'bytes32' },
  ], outputs: [{ name: 'invoiceId', type: 'bytes32' }] },
  { type: 'function', name: 'confirmInvoice', stateMutability: 'nonpayable', inputs: [{ name: 'invoiceId', type: 'bytes32' }, { name: 'deadline', type: 'uint64' }, { name: 'signature', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'rejectInvoice', stateMutability: 'nonpayable', inputs: [{ name: 'invoiceId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'submitOffer', stateMutability: 'nonpayable', inputs: [{ name: 'invoiceId', type: 'bytes32' }, { name: 'price', type: 'uint256' }, { name: 'expiry', type: 'uint64' }], outputs: [{ name: 'offerId', type: 'uint256' }] },
  { type: 'function', name: 'acceptOffer', stateMutability: 'nonpayable', inputs: [{ name: 'invoiceId', type: 'bytes32' }, { name: 'offerId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'cancelOffer', stateMutability: 'nonpayable', inputs: [{ name: 'offerId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'repay', stateMutability: 'nonpayable', inputs: [{ name: 'invoiceId', type: 'bytes32' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'settleDefault', stateMutability: 'nonpayable', inputs: [{ name: 'invoiceId', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'recoverDefault', stateMutability: 'nonpayable', inputs: [{ name: 'invoiceId', type: 'bytes32' }, { name: 'amount', type: 'uint256' }], outputs: [] },
] as const;
