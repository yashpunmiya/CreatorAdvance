# Security baseline

## Assets and threats

Assets are deposited USDT, offer escrow, brand collateral reservations, claim ownership, private invoices/evidence, and privileged registry controls. Threats include duplicate financing, cross-brand authorization, signature replay/expiry, malicious token behavior, unauthorized transfer or payout, double counting of partial repayments, collateral withdrawal while encumbered, compromised signer/admin, privacy leakage, stale event indexing, and denial of service.

## Onchain controls required before deployment

- Role separation, least privilege, two-step/delayed admin transfer where appropriate; no unrestricted long-term development key.
- EIP-712 domain separation and signer checks in contract; bind every material invoice field and nonce/expiry.
- Unique invoice identifier and one-time state transition; reject funding after expiry/cancel/default/previous funding.
- SafeERC20; check token address and expected 6 decimals at deployment/setup. Do not assume permit, EIP-3009, or fee-free token semantics without live tests.
- Effects before external interactions where compatible with atomic rollback; reentrancy guard around token transfers and callbacks.
- Explicit collateral and escrow liabilities; withdrawals cannot consume another brand’s funds or reserved amounts.
- Investor eligibility checked at offer creation, acceptance, mint, and every NFT transfer destination.
- ERC-721 restriction in `_update`, including safe transfers; no alternate bypass path.
- Permissionless late/default trigger after exact maturity + grace period. No claim of autonomous execution.
- Pause emergency-sensitive operations without enabling confiscation of existing funds. Specify what remains callable while paused.
- Explicit fee, payout, rounding, partial/default recovery, and event accounting; test invariant/fuzz cases.

## Offchain controls

- Authenticated sessions tied to wallet signatures; server checks role and entity scope on each request.
- Private object storage and short-lived access URLs for invoice evidence; store hashes in workflow records.
- Admin approvals and suspensions are audited with actor, action, target, timestamp, reason, and resulting tx hash if onchain.
- Indexer is not authoritative for writes; use chain reads/receipt confirmation and reconciliation.

## Implemented controls and remaining review

The current contract uses OpenZeppelin 5.6.1, delayed default-admin rules, role separation, EIP-712 signatures, nonce/deadline checks, SafeERC20, exact incoming token delta checks, reentrancy guards, collateral reservations, and `_update` investor gating. Local tests cover typed approval, approval namespace release, atomic funding, repayment, transfer after a partial repayment, investor rejection, and default collateral allocation.

`forge build --sizes` reports 17,929 runtime bytes for `CreatorAdvance`, below the EVM 24,576-byte limit. Foundry lint warnings remain for timestamp comparisons, event ordering around guarded external token calls, a false positive on the investor eligibility event, and strict exact-transfer equality. `forge lint` is a static linter, not Slither. Slither is not installed. No independent audit, fuzz invariant suite, malicious-token suite, testnet deployment, or wallet-held transaction has run.

The API has SIWE nonce/session primitives and a PostgreSQL schema. It does not yet enforce role/entity scope on business write routes because those routes do not exist. The migration has not been applied to PostgreSQL. Do not treat this code as production-ready or deploy it with real funds.
