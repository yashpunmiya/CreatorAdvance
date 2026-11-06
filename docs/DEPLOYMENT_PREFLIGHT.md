# Whitechain Sepolia deployment preflight

Checked: 2026-11-06 (Asia/Kolkata). No deployment transaction has been sent.

## Target

- Network: Whitechain Sepolia, chain ID `1874` (`0x752`), RPC `https://rpc.testnet.whitechain.io`.
- Contract: `CreatorAdvance`, built with Solidity 0.8.30, optimizer (200 runs), `via_ir`, Prague EVM target.
- USDT: `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`; live RPC confirms deployed bytecode, `USDT`, six decimals.
- Deployer: test wallet `0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1`.
- Constructor: `(usdt, feeRecipient, admin)` = `(0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7, 0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1, 0x93bcA2E3811331Fb6e1D39B14166dC065BFCDcA1)`.
- Admin roles granted at deployment: `DEFAULT_ADMIN_ROLE` (two-day transfer delay), `VERIFIER_ROLE`, `INVESTOR_ADMIN_ROLE`, and `PAUSER_ROLE`. Using one address for the hackathon test wallet is a centralization tradeoff; use only test funds and do not treat this as production governance.

## Estimate and wallet balances

- RPC `eth_estimateGas` for the compiled deployment initcode and constructor args: `4,256,291` gas.
- Sampled gas price: `5,001,000,000` wei; estimated fee: `0.021285711291 WBT`. Gas price changes over time.
- Current RPC balances: `2 WBT`, `0 USDT`. The wallet can cover this estimate, but sponsor USDT is required for the qualifying financing lifecycle.
- No signing, broadcast, deployment, token approval, or transfer was performed for this estimate.

## After an approved deployment

1. Save and verify the deployment transaction and contract address on Whitechain Sepolia.
2. Verify source against the same compiler settings and constructor arguments.
3. Set `EXPO_PUBLIC_CONTRACT_ADDRESS` for mobile and the matching API contract configuration; configure the intended `PLATFORM_ADMIN_WALLETS` and durable `DATABASE_URL`.
4. Rebuild/reinstall the Android app, then test with test USDT and separately approved wallet signatures.

## External gates

- Deployment requires the user's explicit approval after reviewing the parameters above.
- Sponsor USDT needs to be funded at the test wallet before financing can be exercised. Never fund it with mainnet assets.
- The public ETHGlobal event page confirms the event runs November 5–7, 2026, but does not expose the authenticated submission cutoff. The November 7, 09:00 IST time in the project handout remains unconfirmed against the dashboard.
