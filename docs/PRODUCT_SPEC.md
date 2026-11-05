# Product specification (MVP baseline)

## Users

- **Creator:** chooses a verified/active brand, submits a completed-work receivable with private evidence, reviews funding terms, accepts one offer, and tracks proceeds/claim state.
- **Brand:** completes offchain business review, connects an authorized wallet, deposits and tracks its own collateral, approves/rejects invoices, and repays claims.
- **Investor:** completes offchain eligibility review, connects an approved wallet, funds offers in USDT, and tracks or transfers eligible claims.
- **Administrator:** verifies entities and wallets, suspends compromised entities, inspects events/errors, and records every privileged action.

## MVP acceptance criteria

1. Brand Alpha and Brand Beta are independent businesses with separate collateral accounting.
2. Creator can search and select an active directory brand. An unverified/invited business cannot create a financeable invoice.
3. Brand-authorized invoice approval is independently checked by the contract, is replay-protected and expires, and reserves enough face-value collateral.
4. Only eligible investors can create offers or own/receive claim NFTs. Offers escrow actual organizer test USDT and can be canceled/withdrawn while eligible.
5. Funding is atomic: validate invoice, creator/payee, offer, investor, and collateral; transfer escrowed USDT to creator; mint claim to investor; mark funded.
6. Brand repayment is actual USDT to the contract. Full/partial, early/late, default, collateral recovery, and shortfall state are testable locally.
7. Creator and brand experiences run on Android with an external wallet and actual Whitechain chain data. No fake wallet balances or qualifying mocked USDT.
8. Admin/API authorization prevents cross-brand access. Evidence files remain private offchain.

## Important disclosures

The NFT is not proof that the receivable is legally enforceable. Business validation, work completion, valid assignment, eligibility decisions, and offchain default collection remain assumptions. A 1x face-value collateral requirement immobilizes the brand’s full receivable amount; it is a conservative prototype, not an established financing business model. Test tokens have no monetary value.

## Deferred

World ID, ENS, leverage, gasless relaying, embedded wallets, advanced credit scoring, and a full secondary order book. None is allowed to delay the core P0 lifecycle.
