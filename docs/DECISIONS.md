# Decision log

## 2026-11-06 — Baseline from `build.md`

- Focus on a real receivable-financing lifecycle using Whitechain Sepolia sponsor USDT; no mainnet or real customer funds.
- Keep invoice files offchain; put only settlement fields, signer authorization, and evidence hashes onchain.
- Use separate brand and investor eligibility state, 1x face collateral, actual USDT escrow and atomic financing, restricted ERC-721 ownership, explicit repayment/default accounting, and permissionless maturity triggers.
- Defer optional World ID and ENS until core P0 is complete.
- Treat API as private workflow/indexing service, never as financial authority.

## 2026-11-06 — Live network read

- Official Whitechain RPC returned chain ID `0x752`.
- Sponsor token address returned runtime bytecode, 6 decimals, and symbol `USDT`.
- Test wallet balance, transfer/approval behavior, and gas estimation remain open; no wallet was provided/configured.

## 2026-11-06 — Candidate mobile wallet versions

- Candidate pins: Expo 58.0.23, React Native 0.88.1, React 19.3.0, Reown RN adapter packages 2.0.6, Wagmi 2.19.5, viem 2.57.16, TanStack Query 5.106.1.
- npm registry peer metadata fits the documented React Native adapter requirements. Whitechain’s Wagmi 3.7.6 example is web-specific; it is not a package-level mobile conflict.
- Android dev build and app home screen are verified. A connected Reown wallet session and wallet signing on device remain unverified.

## 2026-11-06 — Submission deadline

- `build.md` supplies Nov 7, 2026 09:00 IST. Public ETHGlobal pages retrieved for this pass did not show the submission cutoff; check the authenticated Hacker Dashboard before relying on it.

## 2026-11-06 — Git baseline

- The repository baseline is commit `797090e`; `origin` points to `https://github.com/yashpunmiya/CreatorAdvance.git`. No commit/push was made during this work; preserve `build.md` as user-provided input.

## 2026-11-06 — Whitechain prize qualification

- ETHGlobal's public Mumbai prize page requires Whitechain Sepolia chain ID 1874, a real payment using the sponsor USDT contract `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`, verified contracts, a public repository, and a 2–4 minute demo for the Tokenize prize.
- The public prize page did not display the submission cutoff; the authenticated Hacker Dashboard remains authoritative for the exact deadline.
