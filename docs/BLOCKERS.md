# Blockers and manual gates

Updated 2026-11-06.

## Current blockers

1. **Android native build:** Expo Android bundle and prebuild work, but the Gradle wrapper repeatedly timed out downloading Gradle 9.4.1. No APK or emulator startup exists yet.
2. **Wallet connection:** Reown code is configured, but `EXPO_PUBLIC_REOWN_PROJECT_ID` is empty. A project ID from https://dashboard.reown.com and an Android development build are required for device verification.
3. **Whitechain funding:** sponsor USDT bytecode, decimals, and symbol are verified. Wallet balance, token approval/transfer, and gas have not been checked. A separate test wallet needs test WBT and sponsor USDT; never share a seed phrase or private key in chat.
4. **PostgreSQL:** Prisma schema validates and migration SQL is generated, but no database service/URL is configured and migration has not been applied.
5. **Event deadline:** `build.md` states Nov 7, 2026 09:00 IST. Public ETHGlobal pages did not expose this cutoff; confirm it in the authenticated Hacker Dashboard.

## Verified environment

- Node.js 22.20.0, pnpm 10.30.0, Java 17, Android SDK, adb, WSL2.
- Foundry 1.9.0 installed in WSL and release attestation checked.
- Whitechain Sepolia RPC returns chain ID `0x752`.
- Organizer USDT at `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7` has code; `decimals() = 6`, `symbol() = USDT`.
- Local Expo Android JS export, API tests, contract tests and schema validation pass.

## Still needed later

- PostgreSQL development instance and `DATABASE_URL` in `apps/api/.env`.
- Reown project ID in `apps/mobile/.env.local`.
- Android emulator/device for wallet and screen verification.
- Funded test wallet and explicit user approval before any deployment.
- Public repository settings, demo recording, and sponsor feedback artifact before submission.
