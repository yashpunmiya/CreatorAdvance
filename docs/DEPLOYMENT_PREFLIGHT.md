# Whitechain Sepolia deployment record

Verified: 2026-11-06 (Asia/Kolkata). This deployment used Whitechain Sepolia only.

## Deployed contract

- Network: Whitechain Sepolia, chain ID `1874` (`0x752`), RPC `https://rpc.testnet.whitechain.io`.
- Contract: `0x598c4fb5aeb0f2965782a73c40972ecb8056e7fa`.
- Transaction: `0x40bbda02613989298422d4517aa5987204549254e3806e8e1dc0490501f06384`.
- Receipt: status `0x1`, block `0xbce161`; the app waited for five confirmations and verified deployed runtime bytecode (17,929 bytes).
- Compiler: Solidity 0.8.30, optimizer (200 runs), `via_ir`, Prague EVM target.
- Organizer USDT: `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`, with deployed code and six decimals.

## Wallet and constructor verification

- Selected MetaMask wallet: `0xBFAbb5a94b91E6B32e81ea17b7CEE198cB67c02e`.
- Whitechain Sepolia RPC balance before deployment: `100 USDT`, `2 WBT`.
- Constructor arguments: `(USDT, selected MetaMask wallet, selected MetaMask wallet)` for `(usdt, feeRecipient, admin)`.
- Onchain getters return the exact sponsor USDT and selected wallet as fee recipient.
- `hasRole` checks confirm the selected wallet has `DEFAULT_ADMIN_ROLE`, `VERIFIER_ROLE`, `INVESTOR_ADMIN_ROLE`, and `PAUSER_ROLE`.
- The Reown provider returned `eth_chainId` as a number (`1874`), not a hex string. The previous guard accepted only strings, falsely rejecting the valid Sepolia session. The guard now accepts numeric, hex, and decimal-string results.
- No mainnet transaction or mainnet asset was used.

## Local configuration

- `apps/mobile/.env.local` now sets `EXPO_PUBLIC_CONTRACT_ADDRESS` to the deployed contract.
- `apps/api/.env` now sets `CREATORADVANCE_CONTRACT_ADDRESS` and allowlists the selected wallet as platform admin. Restart the API process to apply changed environment values.
- Reload Metro after changing the mobile environment. Both files are ignored by Git and contain no mnemonic or private key.

## Remaining validation

- Verify and publish the contract source on the Whitechain Sepolia explorer with the exact compiler settings and constructor arguments.
- Test brand registration/activation, creator invoice approval, investor offer/funding, restricted claim ownership, repayment/default, and API event synchronization on the deployed address.
- This is a hackathon testnet deployment. The same wallet has administrative and fee-recipient roles; use separate test wallets for lifecycle role testing where available.
