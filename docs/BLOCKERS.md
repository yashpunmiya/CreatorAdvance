# Blockers and manual gates

Updated: 2026-11-06.

## Current blockers

1. **End-to-end lifecycle:** API supports wallet sessions, self-service roles, creator profiles, pending brand applications, admin review, private PDF intake, and role-scoped invoice lists. Brand signer decisions, offers, repayment actions, and onchain event indexing/reconciliation remain incomplete.
2. **Test wallet funding:** `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1` is encrypted locally and currently has 0 WBT. Fund with Whitechain Sepolia test WBT and sponsor USDT to exercise live transactions.
3. **Database:** migration and a real PostgreSQL integration test pass against an isolated local PostgreSQL 18 instance. No persistent API `DATABASE_URL` is configured for normal app runs.
4. **Deployment:** no contracts deployed or verified. Deployment requires a separate review and user authorization.
5. **Submission:** confirm the ETHGlobal dashboard deadline, publish repository, record demo, and complete sponsor requirements.

## Verified environment

- Node.js 22.20.0, pnpm 10.30.0, Java 17, Android SDK, adb, WSL2.
- Whitechain Sepolia RPC chain ID `0x752`; sponsor USDT has bytecode, six decimals, symbol USDT.
- Android debug build passes; installed app screen loaded on the connected phone.
- Wallet address and DPAPI protected key details are in `docs/TEST_WALLET.md`.

## Needed to continue live validation

- Test WBT and sponsor USDT at the test wallet address.
- A persistent PostgreSQL `DATABASE_URL` for normal API development and integration runs.
- Explicit authorization before contract deployment.
