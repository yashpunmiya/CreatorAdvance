# Verification status and remaining test plan

Last updated: 2026-11-06.

## Verified locally

- Mobile Jest: 4 tests pass.
- API Vitest: 13 tests pass. One opt-in PostgreSQL integration test also passes when run against the isolated PostgreSQL 18 test database.
- API/mobile lint and TypeScript checks pass.
- `pnpm build` passes, including the Expo Android JS export and API TypeScript build. The output is a JS export, not a signed APK.
- Prisma schema validation/client generation and `0001_init` migration application pass.
- Foundry formatting check and 7 Solidity tests pass.
- Android `:app:assembleDebug` passed from the primary Windows workspace; APK was installed and the app home screen observed on the connected phone in the preceding verified milestone.
- Current phone smoke check: restarted Expo with `--dev-client --localhost --clear`, restored USB reverse on 8081, relaunched the installed app, and observed the home screen. Screenshot: `docs/screenshots/android-home.png`.
- The test wallet decrypts to the documented public address. Whitechain Sepolia chain ID is `0x752`; latest RPC balances are 2 WBT and 0 sponsor USDT.

## Not verified yet

- Real user/wallet session on the Android phone and wallet signing.
- Onchain brand and investor registration, signer approval/rejection, offer escrow, financing settlement, restricted NFT ownership, repayment, default, and explorer verification.
- Event indexing and reorg reconciliation. The API must not mark an invoice financeable without finalized chain evidence.
- Persistent API database configuration outside the isolated integration database.
- Complete creator, brand, investor, and administrator mobile workflows.
- Deployed/verified contracts, public repository readiness, and 2–4 minute demo submission.
- ETHGlobal submission cutoff from the authenticated dashboard; the public prize page confirms qualification criteria but did not expose the cutoff.

Never use Anvil time travel as proof of live network maturity/default behavior. Mainnet is out of scope.
