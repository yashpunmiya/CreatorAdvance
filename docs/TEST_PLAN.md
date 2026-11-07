# Verification status and remaining test plan

Last updated: 2026-11-06.

## Verified locally

- Mobile Jest: 8 tests pass; mobile TypeScript and lint pass.
- API Vitest: 26 tests pass; PostgreSQL integration passes against the isolated PostgreSQL 18 test database.
- Latest Expo Android JS export passes. Native debug APK and device home-screen smoke test passed earlier; no native code changed for the deployment guard.
- Prisma schema validation/client generation and migrations `0001_init` and `0002_brand_chain_events` pass.
- Foundry formatting and 8 Solidity tests pass; repayment-accounting fuzz test passes 1,000 runs.
- Brand onboarding validates registration data and private PDF evidence; authenticated admin access and mobile preview/share fallback are implemented.

## Verified live on Whitechain Sepolia

- Android app connected to the selected MetaMask wallet and read 100 sponsor USDT and 2 WBT from the Sepolia RPC.
- CreatorAdvance deployed at `0x598c4fb5aeb0f2965782a73c40972ecb8056e7fa`; transaction `0x40bbda02613989298422d4517aa5987204549254e3806e8e1dc0490501f06384` succeeded at block `0xbce161`.
- Five confirmations and 17,929-byte runtime code were verified.
- Onchain `usdt()` and `feeRecipient()` values match the sponsor token and selected wallet. `hasRole` checks pass for default admin, verifier, investor admin, and pauser roles.
- App now accepts Reown's numeric `eth_chainId` response as well as hex and decimal strings. This was the cause of the false chain mismatch.
- Local ignored API/mobile environment files point to the deployment and selected wallet. Restart API and Metro after environment changes.

## Still to test

- Source verification on the Whitechain Sepolia explorer with the exact compiler settings and constructor arguments.
- Authenticated API role access after restarting the API with the updated allowlist and contract address.
- Brand registration and activation, creator invoice approval, investor offer/funding, restricted claim ownership, repayment/default, and event synchronization/reorg handling on the deployed contract.
- Repeat the full flow with separate test wallets where available; capture a 2–4 minute demo.
- Repository stays private per the user's instruction. Review ETHGlobal AI attribution/eligibility rules before submitting.

Never use Anvil time travel as proof of live network maturity/default behavior. Mainnet is out of scope.
