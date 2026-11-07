# Verification status and remaining test plan

Last updated: 2026-11-07.

## Verified locally

- Mobile Jest: 8 tests pass; mobile TypeScript and lint pass.
- API Vitest: 26 tests pass; PostgreSQL integration passes against the isolated PostgreSQL 18 test database.
- Latest Expo Android JS export passes. Native debug APK and device home-screen smoke test passed earlier; no native code changed for the deployment guard.
- Prisma schema validation/client generation and migrations `0001_init` and `0002_brand_chain_events` pass.
- Foundry formatting and 8 Solidity tests pass; repayment-accounting fuzz test passes 1,000 runs.
- Brand onboarding validates registration data and private PDF evidence; authenticated admin access and mobile preview/share fallback are implemented.

## Verified live on Whitechain Sepolia

- During initial deployment setup, the Android app connected to MetaMask and read sponsor-USDT and WBT balances from the Sepolia RPC; those balances are historical and may have changed.
- CreatorAdvance deployed at `0x598c4fb5aeb0f2965782a73c40972ecb8056e7fa`; transaction `0x40bbda02613989298422d4517aa5987204549254e3806e8e1dc0490501f06384` succeeded at block `0xbce161`.
- Five confirmations and 17,929-byte runtime code were verified.
- Onchain `usdt()` and `feeRecipient()` values match the sponsor token and selected wallet. `hasRole` checks pass for default admin, verifier, investor admin, and pauser roles.
- Live invoice financing completed with separate wallets. `submitOffer` escrowed 4.8 organizer USDT in [`0xe2f9e13345f0303bb11d18335280f3fca33a819a7ecbf44e23ffeb9b0975663c`](https://explorer.testnet.whitechain.io/tx/0xe2f9e13345f0303bb11d18335280f3fca33a819a7ecbf44e23ffeb9b0975663c). `acceptOffer` in [`0xd5f2fec51f9f480f4d15f2e8b90126df15c29fa87b8f5650c973e5b118032d7d`](https://explorer.testnet.whitechain.io/tx/0xd5f2fec51f9f480f4d15f2e8b90126df15c29fa87b8f5650c973e5b118032d7d) transferred 4.8 of the exact organizer USDT to the creator and minted the CAR claim to the investor.
- App now accepts Reown's numeric `eth_chainId` response as well as hex and decimal strings. This was the cause of the false chain mismatch.
- Local ignored API/mobile environment files point to the deployment and selected wallet. Restart API and Metro after environment changes.

## Still to test

- Whitechain Explorer currently reports source as unverified; verify with the exact compiler settings and constructor arguments.
- Authenticated API role access after restarting the API with the updated allowlist and contract address.
- Repayment/default and event synchronization/reorg handling on the deployed contract; issuance, approval, offer, and funding have already completed live.
- Capture a 2–4 minute demo and ensure the Explorer payment link stays in README.
- GitHub currently reports the repository as private, while this track requires public access. Review ETHGlobal AI attribution/eligibility rules before submitting.

Never use Anvil time travel as proof of live network maturity/default behavior. Mainnet is out of scope.
