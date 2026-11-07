# Security baseline and current review status

CreatorAdvance handles testnet USDT, offer escrow, brand collateral, claim ownership, and private invoice evidence. The contract and backend are prototypes; they have not received an independent audit. Never use mainnet or customer funds.

## Contract controls

- OpenZeppelin 5.6.1 ERC-721, SafeERC20, EIP-712, AccessControlDefaultAdminRules, Pausable, and ReentrancyGuard.
- A two-day default-admin transfer delay. The constructor also gives its admin verifier, investor-admin, and pauser roles; this is intentionally convenient for a test deployment but concentrates power in one wallet.
- EIP-712 signatures bind the brand, creator, invoice number, face value, due date, evidence hashes, listing expiry, nonce, chain, and contract.
- Brand collateral is separately accounted and reserved per brand. Full face value is reserved before financing; the reservation is released after full repayment or default processing.
- Offer USDT is escrowed; acceptance pays the creator and mints the claim in one transaction. Cancel/withdraw returns escrow to its original investor.
- Only eligible investors can offer, accept a claim, or receive a claim through ERC-721 transfers.
- Repayments follow current ownership and apply the bounded fee. Default is permissionlessly processed after maturity plus a seven-day grace period, applies available collateral, freezes the brand, and records any remaining shortfall.
- Incoming token transfers are required to increase contract balance by exactly the requested amount. This deliberately rejects fee-on-transfer behavior; Foundry's equality lint is suppressed with an inline rationale.

## Backend and document controls

- SIWE nonce and one-time consumption tie API sessions to wallet signatures; sessions expire after 24 hours and tokens are stored hashed.
- Brand and invoice evidence PDFs are validated for type/size, stored under random generated object keys in a private filesystem directory, and served only through authenticated, role-restricted routes. They are not uploaded to a public bucket or placed onchain.
- Chain sync checks Whitechain chain ID, contract event contents, confirmation depth, and canonical block hashes. Reconciliation removes events from reorged blocks and rebuilds local projections.
- The local platform admin is controlled by `PLATFORM_ADMIN_WALLETS` in an ignored development `.env`; never use a customer wallet for that setting in a deployed environment.

## Verification and remaining risks

- Foundry unit suite: 8 tests. Repayment fuzz test: 1,000 runs. No dedicated invariant handler, malicious-token suite, formal verification, or independent audit has been performed.
- `forge lint --severity high --severity med` passes after documenting the intentional exact-transfer comparison. Low/info warnings remain for timestamp comparisons, post-interaction event emission under reentrancy guards, and an investor-eligibility event false positive; review them before production use.
- Slither is not installed. `forge build --sizes` previously reported 17,929 runtime bytes, under the 24,576-byte EVM limit; re-check after contract changes.
- CreatorAdvance is deployed and an invoice-to-funding flow has completed on Whitechain Sepolia with the organizer's USDT. The explorer still reports source as unverified; live repayment/default, production security, and independent audit have not been established. Testnet receipts do not prove production security.
- Business verification, invoice authenticity, investor suitability, legal assignment, and offchain debt recovery remain trust assumptions.
