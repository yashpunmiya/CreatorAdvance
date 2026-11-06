# Blockers and manual gates

Updated: 2026-11-06.

## Current blockers

1. **Live end-to-end lifecycle:** API receipt validation and reorg reconciliation are implemented, and the mobile transaction flows are wired. They still need a reviewed deployed contract and physical-wallet verification on Whitechain Sepolia.
2. **Selected wallet verification/funding:** the user's connected MetaMask wallet is the only wallet authorized for deployment. The Android phone is disconnected, so its public address and Whitechain Sepolia WBT/USDT balances have not been verified. Sponsor USDT is needed to exercise financing.
3. **Database startup:** migrations 0001/0002 and integration pass against isolated PostgreSQL 18. `apps/api/.env` configures its local URL; start the cluster under `%LOCALAPPDATA%\CreatorAdvance\pg-integration` after machine restarts.
4. **Deployment:** guarded mobile deployment screen and Foundry script are prepared; simulation passed on chain 1874 without broadcast. No contract address or verified source exists. MetaMask connection and user approval on the Android phone are still required.
5. **Phone validation:** APK installed, but the phone is currently disconnected. Wallet connection, SIWE signature, app switching, and chain transactions remain unperformed manual checks.
6. **Submission:** deadline is confirmed as Saturday, Nov 7, 2026 at 09:00 IST. The user chose to keep the GitHub repository private; do not make it public or push. Record the demo and complete sponsor requirements if possible. Review ETHGlobal's AI eligibility rule and describe human work accurately. README, license, feedback note, AI disclosure, architecture diagram, and demo outline are prepared.

## Verified environment

- Node.js 22.20.0, pnpm 10.30.0, Java 17, Android SDK, adb, WSL2.
- Whitechain Sepolia RPC chain ID `0x752`; sponsor USDT has bytecode, six decimals, symbol USDT.
- Android debug build passes and APK is installed on the connected phone. Updated JS export includes the transaction screens.
- Local API runs at `127.0.0.1:4000`; the test wallet is configured as a local platform-admin address. SIWE must still be signed in the app before the API grants its role.
- An earlier local test wallet exists in `docs/TEST_WALLET.md`; it is not to be used for the user's deployment. The connected MetaMask wallet is the selected wallet.

## Needed to continue live validation

- Reconnect the Android phone and verify the selected MetaMask wallet on chain 1874; confirm sufficient WBT for gas and sponsor USDT for lifecycle tests.
- Start the isolated local PostgreSQL cluster after machine restarts; its URL is configured in the ignored API `.env`.
- MetaMask connection and transaction approval on the user's phone before any testnet deployment.
