# Whitechain Sepolia test wallet

- Address: `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1`
- Network: Whitechain Sepolia, chain ID `1874` (`0x752`)
- Purpose: isolated test wallet for balance checks. It was not used for deployment or the demonstrated financing lifecycle.
- The live financing lifecycle used separate brand, creator, and investor wallets and the organizer's USDT contract. See the transaction links in the root README.
- The private key is encrypted with Windows DPAPI for the current Windows user and stored outside this repository at `%LOCALAPPDATA%\CreatorAdvance\whitechain-sepolia-wallet.dpapi`. The wallet address is stored next to it. No private key or seed phrase is in source control, app configuration, or chat.
- Do not fund this address with mainnet assets. Do not use the wallet for real funds.

This wallet is not required to reproduce the documented deployment or financing transactions. Verify its current testnet balances before using it for any new transaction.
