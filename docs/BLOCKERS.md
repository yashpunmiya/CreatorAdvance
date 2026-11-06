# Blockers and manual gates

Updated: 2026-11-06.

## Current blockers

1. **Live end-to-end lifecycle:** API receipt validation and reorg reconciliation are implemented, and the mobile transaction flows are wired. They still need a reviewed deployed contract and physical-wallet verification on Whitechain Sepolia.
2. **Test wallet funding:** `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1` currently has 2 WBT and 0 sponsor USDT. Sponsor USDT is needed to exercise financing.
3. **Database startup:** migrations 0001/0002 and integration pass against isolated PostgreSQL 18. `apps/api/.env` configures its local URL; start the cluster under `%LOCALAPPDATA%\CreatorAdvance\pg-integration` after machine restarts.
4. **Deployment:** no contract address, testnet deployment, or verified source. Deploying needs explicit review and authorization.
5. **Phone validation:** APK installed; wallet connection, SIWE signature, app switching, and chain transactions remain unperformed manual checks. ADB reverse ports 4000/8081 are configured.
6. **Submission:** deadline is confirmed as Saturday, Nov 7, 2026 at 09:00 IST. Make the private repository public and push reviewed commits, record the demo, and complete sponsor requirements. Review ETHGlobal's AI eligibility rule: AI may assist but must not create the entire project; clearly document human work. README, license, feedback note, AI disclosure, architecture diagram, and demo outline are prepared.

## Verified environment

- Node.js 22.20.0, pnpm 10.30.0, Java 17, Android SDK, adb, WSL2.
- Whitechain Sepolia RPC chain ID `0x752`; sponsor USDT has bytecode, six decimals, symbol USDT.
- Android debug build passes and APK is installed on the connected phone. Updated JS export includes the transaction screens.
- Local API runs at `127.0.0.1:4000`; the test wallet is configured as a local platform-admin address. SIWE must still be signed in the app before the API grants its role.
- Wallet address and DPAPI protected key details are in `docs/TEST_WALLET.md`.

## Needed to continue live validation

- Sponsor USDT at the test wallet address.
- Start the isolated local PostgreSQL cluster after machine restarts; its URL is configured in the ignored API `.env`.
- User wallet connection/signature and explicit deployment authorization before any testnet contract deployment.
