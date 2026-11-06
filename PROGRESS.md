# CreatorAdvance progress

Updated: 2026-11-06 (Asia/Kolkata)

## Current milestone

Milestone 4+: API chain-event synchronization/reorg reconciliation and mobile contract transaction flows are implemented. Finance lifecycle is not end-to-end complete because no approved contract is deployed/configured and sponsor USDT has not been funded.

## Completed locally

- Whitechain Sepolia chain ID and sponsor USDT contract metadata verified: chain `0x752`, USDT six decimals.
- Solidity contract core implements brand collateral, signer approvals, investor eligibility, offers, escrow, invoice ownership, repayment, default, and recovery.
- Fastify API supports Whitechain SIWE sessions, `/me`, public active-brand search, creator/investor self-enrollment, creator profile updates, pending brand applications, and allowlisted platform-admin brand activation.
- Brand onboarding now validates business registration number, contact email and PDF evidence; the PDF stays private and platform admins can retrieve it through an authenticated endpoint. The Android admin screen now opens a cached preview with sharing fallback.
- Android CMake/Ninja path failure fixed with short pnpm/CMake paths and object-path hashing. Clean `:app:assembleDebug` passed; APK installed and home screen loaded on the connected Android phone.
- Reopened the installed app on the connected phone after restarting Metro; home screen now loads. Screenshot saved under `docs/screenshots/android-home.png`. Wallet connection still needs a manual approval on the phone.
- Reown/AppKit wallet chooser opens and lists installed providers; connection approval and a balance read remain manual.
- Mobile supports SIWE wallet sign-in, creator/investor role enrollment, creator profile editing, searchable/selectable active brands, private PDF invoice intake, contract invoice creation, EIP-712 brand approval/rejection, offer/funding, allowlisting, brand registration/activation, collateral deposit, repayment, default settlement/recovery, and offer cancellation. Contract actions are disabled unless `EXPO_PUBLIC_CONTRACT_ADDRESS` is configured.
- API now verifies finalized Whitechain receipts for brand/invoice/offer lifecycle events, validates brand/profile and invoice event payloads, reads EIP-712 approval data from the contract nonce, rebuilds offers from chain events, and reconciles stored events against canonical block hashes.
- Backend also rebuilds brand status from its own chain events and canonical `DefaultProcessed` invoice events, including reorg rollback of collateral freezes.
- Prisma migration `0002_brand_chain_events` is applied to the isolated PostgreSQL 18 database. The API is currently running against that temporary database on port 4000; it is not a durable development database.
- Expo DocumentPicker, FileSystem and Sharing SDK 58 modules handle private invoice and registration PDFs. `.env.local` includes local-only API URL; it is ignored by Git.
- Latest Android debug APK build succeeded and was installed on the connected Android device. ADB USB reverse is configured for ports 4000 and 8081. Device foreground wallet signing has not been manually performed.
- Isolated Whitechain Sepolia wallet created. Public address: `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1`; key is Windows DPAPI encrypted outside the repo. Decryption/address match verified. Latest RPC balances: 2 WBT and 0 sponsor USDT.

## Automated verification

- API Vitest: 26 passing tests; PostgreSQL integration test passes against isolated PostgreSQL 18. API typecheck, lint, and build pass.
- Mobile Jest: 4 tests pass. Mobile/API lint and TypeScript checks pass; Expo Android export bundles 3,517 modules.
- Prisma schema validation, client generation, and migrations `0001` and `0002` pass against the isolated PostgreSQL instance.
- Foundry `forge fmt --check` and `forge test -vv`: 7 tests pass, including brand collateral isolation, escrow cancellation/refund, and blocked transfer to an ineligible investor.
- Android Gradle `assembleDebug` passes (428 tasks; 43 executed) and the latest APK installation completed. No app launch was performed during the latest install.

## Remaining P0

- Approve and deploy CreatorAdvance to Whitechain Sepolia; configure the resulting address in the API and mobile local environments and verify source code.
- Fund test wallet with sponsor USDT and use separate test wallets for brand, creator, investor, and platform administration.
- Complete the physical-device wallet SIWE, app switching, transaction signatures, six-decimal USDT approvals, financing, NFT, repayment/default, restart/reconnect, and explorer-recipient checks.
- Configure a persistent API PostgreSQL URL for normal development; current API runs on the isolated local PostgreSQL 18 cluster.
- Confirm the submission deadline, publish the repository, record the demo, and finish submission artifacts.

## Current blockers

- Test wallet `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1` has 2 WBT but 0 sponsor USDT; live financing needs sponsor USDT.
- No persistent PostgreSQL `DATABASE_URL`; API currently runs only against the temporary isolated database.
- No configured or deployed Whitechain contract address. No live chain transaction or end-to-end lifecycle has been performed.
- Physical phone is available and APK installed, but wallet connection/signature/transaction approval has not been completed.

## Git and release

- Latest verified commit: `1523d37 feat: wire mobile roles and canonical chain sync`; newer transaction-flow, evidence-upload and reorg work has passed checks but remains uncommitted.
- Changes remain uncommitted; no remote push or public release has occurred.
