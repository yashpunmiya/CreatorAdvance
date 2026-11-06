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
- Latest verification: API typecheck/lint/build and 26 unit tests pass; PostgreSQL integration passes; mobile typecheck/lint and 4 Jest tests pass; Expo Android JS export passes; Foundry 7 tests and `forge fmt --check` pass.
- Brand onboarding now requires a registration number, contact email, and private PDF evidence. Platform admins can access the document through an authenticated endpoint; the mobile client caches and opens it with native preview/share fallback.
- Current phone smoke check: restarted Expo with `--dev-client --localhost --clear`, restored USB reverse on 8081, relaunched the installed app, and observed the home screen. Screenshot: `docs/screenshots/android-home.png`.
- Opened the Reown/AppKit wallet chooser; MetaMask, Trust Wallet, Binance Wallet, SafePal, and other wallet options appeared. No wallet connection or transaction was approved.
- The test wallet decrypts to the documented public address. Whitechain Sepolia chain ID is `0x752`; latest RPC balances are 2 WBT and 0 sponsor USDT.

## Not verified yet

- Real user/wallet session on the Android phone and wallet signing.
- Onchain brand and investor registration, signer approval/rejection, offer escrow, financing settlement, restricted NFT ownership, repayment, default, and explorer verification.
- Event indexing and reorg reconciliation. The API must not mark an invoice financeable without finalized chain evidence.
- Persistent API database configuration outside the isolated integration database.
- Verify brand onchain registration/status/collateral, typed invoice approval, investor offer/fund, repayment/default recovery, and receipt synchronization on a deployed contract.
- Manually sign in with the connected wallet and exercise role flows on the physical device. Wallet choice/signature and transaction approvals have not been performed.
- Configure persistent API PostgreSQL and deployed contract address; current API uses the isolated temporary DB and no chain contract is configured.
- Deployed/verified contracts, public repository readiness, and 2–4 minute demo submission.
- ETHGlobal submission cutoff from the authenticated dashboard; the public prize page confirms qualification criteria but did not expose the cutoff.
- Verify the private registration PDF preview on Android after the latest native build.

Never use Anvil time travel as proof of live network maturity/default behavior. Mainnet is out of scope.
