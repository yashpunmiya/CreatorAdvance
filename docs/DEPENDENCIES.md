# Dependency and source verification

Research and package lock review: **2026-11-06**. Exact versions below are pinned in the workspace lockfile. Platform builds and runtime integration are listed separately from package installation.

| Area | Pinned versions | Verification and decision |
|---|---|---|
| Workspace | Node 22.20.0, pnpm 10.30.0 | Installed locally. Expo 58 and Prisma 7 package metadata/docs were reviewed before setup. |
| Android app | Expo 58.0.23, Expo Router 58.0.30, React Native 0.88.1, React 19.3.0 | Expo SDK 58 template; `expo-doctor` passed 20/20 and Android JS export passed. Native Gradle build has not completed. |
| Wallet | `@reown/appkit-react-native` 2.0.6, `@reown/appkit-wagmi-react-native` 2.0.6, Wagmi 2.19.5, viem 2.57.16, TanStack Query 5.106.1 | Reown React Native docs use Wagmi 2 / viem 2; npm peer metadata checked. `@walletconnect/keyvaluestorage` still reports a stale AsyncStorage 1.x peer while this app uses 2.2.0. Needs native build and device verification. |
| Contracts | Solidity 0.8.30, OpenZeppelin Contracts 5.6.1, Foundry 1.9.0 | Compiled with native solc in WSL, Prague EVM target, optimizer and IR enabled. Foundry release passed its published attestation check. Contract size is 17,929 runtime bytes. |
| API | Fastify 5.12.8, Prisma CLI/client/adapter-pg 7.10.1, PostgreSQL driver pg 8.23.1, SIWE 3.0.0, viem 2.57.16, Zod 4.6.7 | Prisma 8 was marked release candidate by current docs; stable Prisma 7 selected. Schema validates and client generates. API unit tests pass. No PostgreSQL server was available, so migrations have not been applied to a live database. |
| API tooling | TypeScript 5.9.3, Vitest 4.0.18, ESLint 9.39.5, typescript-eslint 8.72.1 | Typecheck, tests and lint pass for API. Workspace scripts also run Expo lint/typecheck/test/export. |
| Whitechain Sepolia | Chain ID 1874 / `0x752`, RPC `https://rpc.testnet.whitechain.io`, gas token WBT | [Network reference](https://docs.whitechain.io/learn/network/reference). Live RPC `eth_chainId` read returned `0x752`. |
| Organizer USDT | `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`, 6 decimals | [ETHGlobal prizes](https://ethglobal.com/events/mumbai/prizes). Official RPC returned code, `decimals() = 6`, `symbol() = USDT`. No funded wallet balance, approval, transfer or gas estimate has been verified. |

## Official implementation references

- [Expo SDK version matrix](https://docs.expo.dev/versions/latest/) and [development builds](https://docs.expo.dev/develop/development-builds/introduction/).
- [Reown React Native installation](https://docs.reown.com/appkit/react-native/core/installation).
- [Foundry](https://getfoundry.sh/) and [OpenZeppelin Contracts 5.x](https://docs.openzeppelin.com/contracts/5.x/).
- [Prisma ORM](https://www.prisma.io/docs/orm), [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/), and [SIWE backend guidance](https://docs.login.xyz/sign-in-with-ethereum/quickstart-guide/implement-the-backend).
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712).

## Known install/runtime warnings

- pnpm reports an upstream peer range mismatch: WalletConnect key-value storage requests AsyncStorage `1.x`, but Reown's current RN install uses AsyncStorage 2.2.0. Reown's peer compatibility does not establish native runtime success; Android build is still required.
- Expo Metro reports deep-import/export warnings from transitive `@noble/hashes`, `uint8arrays`, and `multiformats` packages.
- pnpm ignores package build scripts by default in this environment. Prisma's CLI/schema engine still ran; the API uses the PostgreSQL driver adapter. No native Prisma query engine is required by this setup.
