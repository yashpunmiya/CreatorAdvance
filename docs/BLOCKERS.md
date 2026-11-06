# Blockers and manual gates

Updated: 2026-11-06.

## Current blockers

1. **End-to-end lifecycle:** API receipt validation and reorg reconciliation are implemented; mobile SIWE, creator, brand, investor views, and PDF intake are wired. Onchain brand administration, invoice signer approval, offer/acceptance, repayment actions, and their phone transaction UX still need completion against a deployed contract.
2. **Test wallet funding:** `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1` currently has 2 WBT and 0 sponsor USDT. Sponsor USDT is needed to exercise financing.
3. **Database:** migrations 0001/0002 and an integration test pass against isolated PostgreSQL 18. The running API uses a temporary DB; a durable development `DATABASE_URL` is not configured.
4. **Deployment:** no contract address, testnet deployment, or verified source. Deploying needs explicit review and authorization.
5. **Phone validation:** APK installed; wallet connection and signature remain unapproved manual actions. ADB reverse ports 4000/8081 are configured.
6. **Submission:** confirm the ETHGlobal dashboard deadline, publish repository, record demo, and complete sponsor requirements.

## Verified environment

- Node.js 22.20.0, pnpm 10.30.0, Java 17, Android SDK, adb, WSL2.
- Whitechain Sepolia RPC chain ID `0x752`; sponsor USDT has bytecode, six decimals, symbol USDT.
- Android debug build passes and APK is installed on the connected phone.
- Wallet address and DPAPI protected key details are in `docs/TEST_WALLET.md`.

## Needed to continue live validation

- Sponsor USDT at the test wallet address.
- Persistent PostgreSQL `DATABASE_URL` for normal API development.
- User wallet connection/signature and explicit deployment authorization before any testnet contract deployment.
