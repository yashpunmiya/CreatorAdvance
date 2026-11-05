# Verification status and remaining test plan

Last updated: 2026-11-06.

## Verified locally

- `pnpm lint`: mobile Expo lint and API ESLint.
- `pnpm typecheck`: mobile and API TypeScript checks.
- `pnpm test`: mobile Jest suite and API Vitest suite.
- `pnpm build`: Expo Android JS export and API TypeScript build.
- `npx expo-doctor`: 20/20 checks passed.
- Foundry `forge fmt --check`, `forge build --sizes`, and `forge test -vv`.
- `prisma validate` and `prisma generate` against the API schema.

The contract suite currently has five passing tests: typed brand approval and funding/repayment, default collateral application, partial repayment followed by investor transfer, invoice-number release after rejection, and non-allowlisted offer rejection. The API suite has four passing tests: public directory filtering, valid Whitechain SIWE session and replay rejection, malformed address handling, and `/me` authentication rejection.

## Not verified yet

- Full contract coverage: separate brand isolation, collateral edge cases, offer cancel/expiry/competing offers, unauthorized transfer, token failure modes, broader default boundaries, fuzzing, and accounting invariants.
- PostgreSQL migration application against a running server, API cross-role/entity authorization tests, object storage, event indexing/reorg reconciliation, and admin audit workflows.
- Android native Gradle build and emulator startup. Gradle distribution download timed out.
- Reown wallet connection, message signature, sponsor USDT balance/approval/transfer, and a confirmed Whitechain Sepolia transaction. Reown project ID and a funded test wallet are not configured.
- Contract deployment/verification and complete creator, brand, or investor flows.

Never treat Anvil time travel as a live testnet maturity/default check. Deployment requires separate explicit authorization after local review; mainnet is out of scope.
