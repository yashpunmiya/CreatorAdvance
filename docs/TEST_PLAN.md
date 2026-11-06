# Verification status and remaining test plan

Last updated: 2026-11-06.

## Verified locally

- Mobile Jest: 4 tests pass.
- API Vitest: 26 tests pass; the PostgreSQL integration test also passes against the isolated PostgreSQL 18 test database.
- API/mobile lint and TypeScript checks pass.
- `pnpm build` passes, including the Expo Android JS export and API TypeScript build. The output is a JS export, not a signed APK.
- Prisma schema validation/client generation and migrations `0001_init` and `0002_brand_chain_events` pass.
- Foundry formatting check and 7 Solidity tests pass.
- Android `:app:assembleDebug` passed from the primary Windows workspace; updated APK installed on the connected phone. Expo Android export bundled successfully.
- Latest full root verification: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass; PostgreSQL integration passes separately; Foundry 7 tests and `forge fmt --check` pass.
- Brand onboarding now requires a registration number, contact email, and private PDF evidence. Platform admins can access the document through an authenticated endpoint; the mobile client caches and opens it with native preview/share fallback.
- Root README, MIT license, architecture diagram, AI usage disclosure, Whitechain feedback, and timed demo outline are present. Repository visibility and publishing are not confirmed.
- Current phone smoke check: restarted Expo with `--dev-client --localhost --clear`, restored USB reverse on 8081, relaunched the installed app, and observed the home screen. Screenshot: `docs/screenshots/android-home.png`.
- Opened the Reown/AppKit wallet chooser; MetaMask, Trust Wallet, Binance Wallet, SafePal, and other wallet options appeared. No wallet connection or transaction was approved.
- The test wallet decrypts to the documented public address. Whitechain Sepolia chain ID is `0x752`; latest RPC balances are 2 WBT and 0 sponsor USDT.

## Not verified yet

- Real user/wallet session on the Android phone and wallet signing.
- Onchain brand and investor registration, signer approval/rejection, offer escrow, financing settlement, restricted NFT ownership, repayment, default, and explorer verification.
- Live event indexing and reorg reconciliation against a deployed contract. Unit tests pass; no contract exists on Whitechain yet.
- Verify brand onchain registration/status/collateral, typed invoice approval, investor offer/fund, repayment/default recovery, and receipt synchronization on a deployed contract.
- Manually sign in with the connected wallet and exercise role flows on the physical device. Wallet choice/signature and transaction approvals have not been performed.
- The API uses an isolated local PostgreSQL cluster configured in ignored `apps/api/.env`; it requires manual startup after a machine restart. No chain contract is configured.
- Deployed/verified contracts, public repository readiness, and 2–4 minute demo submission.
- ETHGlobal submission cutoff from the authenticated dashboard; the public prize page confirms qualification criteria but did not expose the cutoff.
- Verify the private registration PDF preview on Android after the latest native build.

Never use Anvil time travel as proof of live network maturity/default behavior. Mainnet is out of scope.
