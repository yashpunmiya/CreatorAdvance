# CreatorAdvance progress

Updated: 2026-11-06 (Asia/Kolkata)

## Current milestone

Milestone 4+: API chain-event synchronization and reorg reconciliation are implemented; mobile role workspaces and private PDF intake are wired. Finance lifecycle is not end-to-end complete because the contract is not deployed/configured and sponsor USDT has not been funded.

## Completed locally

- Whitechain Sepolia chain ID and sponsor USDT contract metadata verified: chain `0x752`, USDT six decimals.
- Solidity contract core implements brand collateral, signer approvals, investor eligibility, offers, escrow, invoice ownership, repayment, default, and recovery.
- Fastify API supports Whitechain SIWE sessions, `/me`, public active-brand search, creator/investor self-enrollment, creator profile updates, pending brand applications, and allowlisted platform-admin brand activation.
- Android CMake/Ninja path failure fixed with short pnpm/CMake paths and object-path hashing. Clean `:app:assembleDebug` passed; APK installed and home screen loaded on the connected Android phone.
- Reopened the installed app on the connected phone after restarting Metro; home screen now loads. Screenshot saved under `docs/screenshots/android-home.png`. Wallet connection still needs a manual approval on the phone.
- Reown/AppKit wallet chooser opens and lists installed providers; connection approval and a balance read remain manual.
- Mobile now supports SIWE wallet sign-in, creator/investor role enrollment, creator profile editing, active-brand discovery, pending brand applications, PDF invoice submission to private API storage, and role-scoped invoice/offer views. Testnet signing and live contract actions still require deployed contract configuration and user approval.
- API now verifies finalized Whitechain receipts for brand/invoice/offer lifecycle events, validates brand/profile and invoice event payloads, reads EIP-712 approval data from the contract nonce, rebuilds offers from chain events, and reconciles stored events against canonical block hashes.
- Prisma migration `0002_brand_chain_events` is applied to the isolated PostgreSQL 18 database. The API is currently running against that temporary database on port 4000; it is not a durable development database.
- `expo-document-picker` and Expo FileSystem SDK 58 modules added for selecting and reading payable PDFs on device. `.env.local` now includes `EXPO_PUBLIC_API_URL`; the value is local-only and ignored by Git.
- Latest Android debug APK build succeeded and was installed on the connected Android device. ADB USB reverse is configured for ports 4000 and 8081. Device foreground wallet signing has not been manually performed.
- Isolated Whitechain Sepolia wallet created. Public address: `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1`; key is Windows DPAPI encrypted outside the repo. Decryption/address match verified. Latest RPC balances: 2 WBT and 0 sponsor USDT.

## Automated verification

- API Vitest: 21 passing tests; one PostgreSQL integration test passes against isolated PostgreSQL 18. API typecheck and lint pass.
- Mobile Jest: 4 tests pass. Mobile/API lint, TypeScript checks, Expo Android JS export, and API build pass.
- Prisma schema validation, client generation, and migrations `0001` and `0002` pass against the isolated PostgreSQL instance.
- Foundry `forge fmt --check` and `forge test -vv`: 7 tests pass, including brand collateral isolation, escrow cancellation/refund, and blocked transfer to an ineligible investor.
- Android Gradle `assembleDebug` passes (428 tasks; 42 executed) and APK installation completed. Expo Android export bundles 3,512 modules successfully.

## Remaining P0

- Add mobile brand onchain registration/status/collateral actions, EIP-712 invoice approval and investor offer/funding transaction screens; connect the app to configured deployed contract actions.
- Add API and mobile flows for administrator review and brand signer decisions, and complete transactions/receipt sync from the phone.
- Configure a persistent API PostgreSQL URL for normal development; current API and migrations use an isolated local PostgreSQL 18 cluster.
- Fund test wallet with sponsor USDT; verify wallet session, balances, brand activation, collateral, approval, funding, restricted NFT, repayment, and explorer receipts.
- Add contract isolation, collateral, offer, transfer, token-failure, timing, and invariant tests.
- Review and authorize any testnet deployment; verify deployed contracts and transaction hashes.
- Confirm event deadline, publish the repository, record demo, and finish submission artifacts.

## Current blockers

- Test wallet `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1` has 2 WBT but 0 sponsor USDT; live financing needs sponsor USDT.
- No persistent PostgreSQL `DATABASE_URL`; API currently runs only against the temporary isolated database.
- No configured or deployed Whitechain contract address. No live chain transaction or end-to-end lifecycle has been performed.
- Physical phone is available, but wallet connection/signature/transaction approval has not been completed; ADB may show the user’s other app in the foreground.

## Git and release

- Latest commit: `459f0e4 docs: record mobile wallet chooser smoke test` (prior work includes commits `c1dd1d2` and `4032054`).
- Changes remain uncommitted; no remote push or public release has occurred.
