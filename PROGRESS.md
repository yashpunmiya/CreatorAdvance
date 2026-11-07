# CreatorAdvance progress

Updated: 2026-11-07 (Asia/Kolkata)

## Current milestone

Milestone 5: CreatorAdvance is deployed on Whitechain Sepolia and the invoice-to-funding lifecycle completed live with separate brand, creator, and investor wallets. The exact organizer-USDT payout and CAR claim mint are linked in the root README. The GitHub repository is public. Explorer source verification, repayment/default validation, and the demo recording remain incomplete.

## Completed locally

- Whitechain Sepolia chain ID and sponsor USDT contract metadata verified: chain `0x752`, USDT six decimals.
- Solidity contract core implements brand collateral, signer approvals, investor eligibility, offers, escrow, invoice ownership, repayment, default, and recovery.
- Fastify API supports Whitechain SIWE sessions, `/me`, public active-brand search, creator/investor self-enrollment, creator profile updates, pending brand applications, and allowlisted platform-admin brand activation.
- Brand onboarding now validates business registration number, contact email and PDF evidence; the PDF stays private and platform admins can retrieve it through an authenticated endpoint. The Android admin screen now opens a cached preview with sharing fallback.
- Android CMake/Ninja path failure fixed with short pnpm/CMake paths and object-path hashing. Clean `:app:assembleDebug` passed; APK installed and home screen loaded on the connected Android phone.
- Reopened the installed app on the connected phone after restarting Metro; home screen loads. Wallet connected and Sepolia balances were read in the app.
- Reown/AppKit wallet chooser opens and lists installed providers; connected MetaMask to Whitechain Sepolia.
- Added a guarded testnet deployment screen for the user's MetaMask wallet. It checks chain ID 1874 and exact sponsor USDT bytecode/6 decimals, estimates gas, uses the connected wallet as fee recipient/admin, confirms the receipt, verifies deployed code, and saves the deployed address per wallet to prevent accidental redeploy.
- Fixed the wallet chain guard: Reown returns `eth_chainId` as a number on this connector, so treating it only as a hex string falsely rejected the Sepolia session. The parser now accepts numeric, hex, and decimal-string forms; typecheck, lint, Jest, and Expo export pass.
- Deployed `CreatorAdvance` on Whitechain Sepolia. Receipt status is success at block `0xbce161`; five confirmations and runtime bytecode were verified. Contract: `0x598c4fb5aeb0f2965782a73c40972ecb8056e7fa`; transaction: `0x40bbda02613989298422d4517aa5987204549254e3806e8e1dc0490501f06384`.
- Onchain getters confirm organizer USDT `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`, and the selected MetaMask wallet `0xBFAbb5a94b91E6B32e81ea17b7CEE198cB67c02e` as fee recipient with `DEFAULT_ADMIN_ROLE`, `VERIFIER_ROLE`, `INVESTOR_ADMIN_ROLE`, and `PAUSER_ROLE`. No mainnet transaction or asset was used.
- Mobile supports SIWE wallet sign-in, creator/investor role enrollment, creator profile editing, searchable/selectable active brands, private PDF invoice intake, contract invoice creation, EIP-712 brand approval/rejection, offer/funding, allowlisting, brand registration/activation, collateral deposit, repayment, default settlement/recovery, and offer cancellation. Contract actions are disabled unless `EXPO_PUBLIC_CONTRACT_ADDRESS` is configured.
- API now verifies finalized Whitechain receipts for brand/invoice/offer lifecycle events, validates brand/profile and invoice event payloads, reads EIP-712 approval data from the contract nonce, rebuilds offers from chain events, and reconciles stored events against canonical block hashes.
- Backend also rebuilds brand status from its own chain events and canonical `DefaultProcessed` invoice events, including reorg rollback of collateral freezes.
- Prisma migration `0002_brand_chain_events` is applied to the isolated PostgreSQL 18 database. `apps/api/.env` (ignored by Git) configures the local database URL, API origin, private document directory, and selected MetaMask address as platform admin. Restart the existing API process to apply this allowlist change. PostgreSQL data lives under `%LOCALAPPDATA%\CreatorAdvance\pg-integration`; the cluster must be running for the API to start.
- Expo DocumentPicker, FileSystem and Sharing SDK 58 modules handle private invoice and registration PDFs. `.env.local` includes local-only API URL; it is ignored by Git.
- The Android app loaded the connected MetaMask wallet and displayed 100 sponsor USDT and 2 WBT from Whitechain Sepolia. The deployment transaction was submitted through the app and verified at the resulting contract address.
- Local ignored mobile/API environment files now point to the deployed contract and selected MetaMask wallet. Restart the API after environment changes and reload Metro to apply the mobile contract address.
- Submission materials include setup/current status, architecture, AI usage disclosure, Whitechain feedback, screenshots, and the live financing receipts. The demo video is not recorded; source verification and repayment/default validation remain incomplete.

## Automated verification

- API Vitest: 26 passing tests; PostgreSQL integration test passes against isolated PostgreSQL 18. API typecheck, lint, and build pass.
- Mobile Jest: 8 tests pass. Mobile/API lint and TypeScript checks pass; Expo Android export bundles 3,517 modules.
- Prisma schema validation, client generation, and migrations `0001` and `0002` pass against the isolated PostgreSQL instance.
- Foundry `forge fmt --check` and `forge test -vv`: 8 tests pass. A new fuzz test passed 1,000 split-repayment cases covering debt totals, fee rounding, investor net payouts, and collateral reservation.
- Android Gradle `assembleDebug` passes (428 tasks; 43 executed) and the latest APK installation completed. No app launch was performed during the latest install.

## Current remaining work (2026-11-07)

- Whitechain Explorer reports the deployed CreatorAdvance source as unverified. Verify with the recorded compiler and constructor settings.
- The live `createInvoice` → `confirmInvoice` → `submitOffer` → `acceptOffer` sequence completed. Acceptance paid 4.8 organizer USDT to the creator and minted the CAR claim to the investor. See the README explorer links.
- Repayment, maturity/default recovery, and their live API state synchronization still need validation; do not imply those were demonstrated.
- Verify contract source on the explorer, validate repayment/default, and record the demo video.
- Local API startup depends on the PostgreSQL cluster under `%LOCALAPPDATA%\CreatorAdvance\pg-integration` after machine restarts; restart the API after environment changes.
- Review AI eligibility and accurately describe meaningful human contributions.

## Git and release

- Public repository: https://github.com/yashpunmiya/CreatorAdvance. Submission update: commit `3afd370` (`Prepare CreatorAdvance Whitechain submission`). Generated local artifacts and ignored environment files were excluded.

## UI restructure — 2026-11-06

- Added a dedicated welcome and role-selection route; existing contract actions are preserved in `apps/mobile/app/workspace.tsx`.
- Added role-specific overview pages and guided creator-profile, brand-registration and invoice forms.
- Fixed disconnected wallet session labels and sign-in visibility after wallet changes. Invoice and offer display amounts now use USDT units.
- Mobile TypeScript, lint and 8 existing utility tests pass. Release build and installation passed; role-selection layout was inspected on the connected phone and a visible newline bug was corrected.
- This is an initial restructuring pass, not a production-readiness sign-off. Authenticated dashboard usability, per-invoice bidding, motion/accessibility, full testnet financing, and multiple-device behavior remain to be completed and verified.

## Bidding verification follow-up

- Bid amounts are now kept separately per invoice and entered in ordinary USDT units with exact six-decimal conversion.
- Bid validation checks zero, precision, face-value limits and listing expiry before requesting token approval. Missing expiry fails closed.
- Mobile tests: 18 pass across 3 suites. Added bid boundary/expiry cases; no live funding transaction is implied by these tests.
- Corrected the wallet modal wrapper to allow touches to underlying controls outside the modal. Device verification is still required.
- Latest release containing per-invoice bidding validation and modal touch correction built and installed successfully. TypeScript/lint passed. Production API `/health` returned status ok. Further phone navigation checks were inconclusive while a call overlay was present; the incidental call screenshot was deleted.

## Account continuity changes

- Saved workspace preference skips repeat role selection on launch.
- Session tokens are stored using Expo SecureStore with expiry; `/me` restores server-owned profile/role data and checks wallet identity.
- Workspace data loads after authentication and role changes; obsolete request results are ignored after wallet/role changes.
- Added API request timeouts, expired-session handling for user actions, and per-wallet pending transaction receipt/sync recovery.
- Added session persistence boundary tests. This is not a sign-off on all audit items; full device restart/signature recovery and the broader feature/UI backlog remain open.
- Final account continuity release: TypeScript/lint and 22 tests passed; Gradle release build passed, APK installed. Physical-device test selected Creator, force-stopped app and reopened it: returned directly to wallet sign-in in the saved workspace without onboarding/role selection. Wallet picker opens. Authenticated restore test awaits completion of MetaMask connection/sign-in; no live funding transaction was sent.
- Authenticated physical-device restart verified: signed-in Creator dashboard returned after force-stop/relaunch without another signature. Opened Creator profile and observed saved `test_creatoradvance` handle restored from `/me`. Automatic startup restoration briefly showed sign-in during API load; added a restoring-account status to avoid presenting that action before validation completes.

## Role-focused dashboard update — 2026-11-07

- Removed the role selector from the main workspace. Account contains enabled workspace switching plus explicit setup for additional roles. Admin workspace restoration checks server-issued permissions.
- Moved the full wallet card into Account after authentication. Main dashboards now prioritize role-specific actions and live counts.
- Added dashboard hero illustration (labelled as illustration), status metrics, empty guidance, and reduced-motion-aware fade-in.
- Creator bid cards sort offers by price; expired offers do not expose Accept. Existing exact amount/expiry validation tests remain passing.
- TypeScript/lint and 22 mobile tests passed. Android build and physical-device UI checks are pending. Phone was absent from ADB inventory at the latest check; reconnect requested.
- Dashboard release build succeeded (1m 10s). Latest ADB inventory still contains no phone, so this APK has not been installed or visually verified on device yet.

## Device follow-up and wallet storage isolation

- Dashboard build installed on the phone. Initial launch showed no remembered role or wallet; cause of that missing state was not established.
- Found wallet adapter enumerating all AsyncStorage keys. Extracted a dedicated namespaced adapter so wallet enumeration/removal cannot expose or remove app preferences/pending transactions.
- TypeScript/lint, 24 tests across 5 suites, and release build passed. Installed the updated APK; Creator workspace preference survived this update and wallet reconnected on chain 1874.
- Authenticated dashboard and Account switcher device checks remain pending completion of wallet sign-in. No live bidding/funding transaction was performed in this follow-up.
