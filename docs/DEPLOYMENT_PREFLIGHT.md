# Whitechain Sepolia deployment preflight

Checked: 2026-11-06 (Asia/Kolkata). No deployment transaction has been sent.

## Target and safeguards

- Network: Whitechain Sepolia, chain ID `1874` (`0x752`), RPC `https://rpc.testnet.whitechain.io`.
- Contract: `CreatorAdvance`, Solidity 0.8.30, optimizer (200 runs), `via_ir`, Prague EVM target.
- Organizer USDT: `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`; RPC confirms deployed bytecode, symbol `USDT`, six decimals.
- Deployment signer: the user's connected MetaMask wallet only: `0xBFAbb5a94b91E6B32e81ea17b7CEE198cB67c02e`. The app read 100 sponsor USDT and 2 WBT from Whitechain Sepolia.
- Constructor: `(usdt, feeRecipient, admin)` = `(organizer USDT, connected MetaMask address, connected MetaMask address)`.
- Deployment UI and Foundry script both enforce chain ID 1874 and the exact sponsor USDT. WalletConnect/MetaMask must approve the transaction. No mnemonic or private key is used in app code or shell commands.
- The same test wallet receives fee-recipient and admin roles for this hackathon deployment. This is centralized and for testnet demonstration only.

## Estimate and simulation

- RPC `eth_estimateGas` for compiled initcode and constructor args: `4,256,291` gas at sampled `5,001,000,000` wei, approximately `0.0213 WBT`.
- Foundry simulation reported up to `5,488,104` gas at a conservative `10 gwei`, approximately `0.0549 WBT`. Gas prices vary; review MetaMask's actual fee before approval.
- The Foundry script completed in simulation against chain 1874, confirming the USDT code and decimals. It was not broadcast. Neither estimate sent a transaction.
- The app's transaction connector reports chain ID `1` while the app expects `1874`; no deployment was submitted. MetaMask must authorize Whitechain Sepolia for the CreatorAdvance connection before signing can proceed. The displayed Sepolia balances are read-only RPC results and do not prove that the wallet connection can sign on that chain.

## After the user-approved deployment

1. Verify the transaction, deployed address, and constructor roles on Whitechain Sepolia explorer.
2. Verify source using the same compiler settings and constructor arguments.
3. Configure the deployed address in ignored mobile/API local environments; use the connected wallet address for the local platform admin if appropriate.
4. Rebuild/reinstall the Android app and validate flows with sponsor test USDT and separately approved wallets where available.

Never use mainnet assets or mainnet deployments for this hackathon flow.

## External gates

- Wallet connection and transaction approval must happen in MetaMask on the Android device.
- Sponsor USDT is required to exercise the financing lifecycle; the connected wallet's current USDT balance is unverified.
- The [official ETHGlobal Mumbai submission information](https://ethglobal.com/events/mumbai/info/details) confirms the deadline is Saturday, November 7, 2026 at 09:00 IST. AI attribution and meaningful human contributions must be represented accurately.
