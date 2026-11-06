# Verification status and remaining test plan

Last updated: 2026-11-06.

## Verified locally

- Mobile Jest: 4 tests pass.
- API Vitest: 26 tests pass; the PostgreSQL integration test also passes against the isolated PostgreSQL 18 test database.
- API/mobile lint and TypeScript checks pass.
- `pnpm build` passes, including the Expo Android JS export and API TypeScript build. The output is a JS export, not a signed APK.
- Prisma schema validation/client generation and migrations `0001_init` and `0002_brand_chain_events` pass.
- Foundry formatting check and 8 Solidity tests pass; the repayment accounting fuzz test passes 1,000 runs.
- Android `:app:assembleDebug` passed from the primary Windows workspace; updated APK installed on the connected phone. Expo Android export bundled successfully.
- Latest full root verification: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass; PostgreSQL integration passes separately; Foundry 8 tests, 1,000 repayment fuzz runs, and `forge fmt --check` pass.
- Brand onboarding now requires a registration number, contact email, and private PDF evidence. Platform admins can access the document through an authenticated endpoint; the mobile client caches and opens it with native preview/share fallback.
- Root README, MIT license, architecture diagram, AI usage disclosure, Whitechain feedback, and timed demo outline are present. GitHub reports the repository is private; no release push has been made.
- Current phone smoke check: earlier Expo dev-client launch showed the home screen and wallet chooser. The phone is currently disconnected, so the user's MetaMask address and balances are unverified.
- Added a guarded in-app deployment path: chain ID 1874 only, exact sponsor USDT code and six-decimal checks, connected wallet as fee recipient/admin, MetaMask transaction signature, receipt confirmation, and per-wallet saved address to prevent accidental redeployment.
- Foundry deployment script simulation succeeded on chain 1874 with the sponsor token checks; it was not broadcast. No real deployment or wallet signature has occurred.

## Not verified yet

- Reconnect the Android phone, connect the user's MetaMask wallet, verify its public address and testnet WBT/USDT balances, and deploy only after reviewing the in-app transaction prompt.
- Onchain brand and investor registration, signer approval/rejection, offer escrow, financing settlement, restricted NFT ownership, repayment, default, and explorer verification.
- Live event indexing and reorg reconciliation against a deployed contract. Unit tests pass; no contract exists on Whitechain yet.
- Verify brand onchain registration/status/collateral, typed invoice approval, investor offer/fund, repayment/default recovery, and receipt synchronization on a deployed contract.
- Manually sign in with the connected wallet and exercise role flows on the physical device. Wallet choice/signature and transaction approvals have not been performed.
- The API uses an isolated local PostgreSQL cluster configured in ignored `apps/api/.env`; it requires manual startup after a machine restart. No chain contract is configured.
- Deployed/verified contracts, repository release readiness, and 2–4 minute demo submission. The user explicitly chose to keep the repository private; keep it private unless they later change that instruction.
- ETHGlobal submission cutoff is confirmed by the official event information: Saturday, November 7, 2026 at 09:00 IST. Verify the Hacker Dashboard before submission.
- Confirm eligibility under ETHGlobal's AI policy: attribution is required and AI must assist rather than create the entire project. The code history begins on Nov 6, 2026; include the user-authored specification and describe the developer's actual contributions accurately.
- Verify the private registration PDF preview on Android after the latest native build.

Never use Anvil time travel as proof of live network maturity/default behavior. Mainnet is out of scope.
