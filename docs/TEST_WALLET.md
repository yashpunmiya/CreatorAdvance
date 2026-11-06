# Whitechain Sepolia test wallet

- Address: `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1`
- Network: Whitechain Sepolia, chain ID `1874` (`0x752`)
- Purpose: isolated test wallet for balance checks and explicitly approved testnet transactions.
- Latest RPC balance check (2026-11-06): 2 WBT and 0 sponsor USDT. Gas funding is available; sponsor USDT is still needed for the qualifying financing flow.
- The private key is encrypted with Windows DPAPI for the current Windows user and stored outside this repository at `%LOCALAPPDATA%\CreatorAdvance\whitechain-sepolia-wallet.dpapi`. The wallet address is stored next to it. No private key or seed phrase is in source control, app configuration, or chat.
- Do not fund this address with mainnet assets. Do not use the wallet for real funds.

After funding, verify the address and both token balances before any transaction. Contract deployment still needs explicit review and authorization.
