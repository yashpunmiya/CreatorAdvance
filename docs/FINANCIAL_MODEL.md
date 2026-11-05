# Financial model

All USDT values are integer base units with **6 decimals**. Never use binary floating point for amounts. Frontends parse and format amounts with decimal-safe utilities.

## Financing example

- Face claim: 1,000 USDT (1,000,000,000 base units).
- Investor offer: 970 USDT (970,000,000 base units).
- Creator receives 970 USDT atomically with claim minting.
- Investor owns the outstanding receivable claim, capped at 1,000 USDT gross.

## Repayment fee

The contract sets a configurable 50 basis point fee on collected repayment amounts, capped at 50 bps. The brand pays it as part of repayment; the fee is withheld before distributing net funds to the current claim owner. A single full 1,000 USDT repayment charges 5 USDT and pays 995 USDT to the investor. At this fee, gross investor gain is 25 USDT on a 970 USDT purchase before other costs.

Amounts above outstanding claim revert. No interest accrues. The contract tracks `paidGross` and `outstanding`; each payment reduces outstanding once and distributes to the NFT owner at collection time. A test covers partial repayment followed by an allowlisted transfer: the first owner keeps the first payout and the new holder receives the later payout.

## Collateral and default

Each financeable invoice reserves its full face value from that brand's deposited USDT. Capacity is isolated by brand and reservations cannot be withdrawn. Unfunded canceled/expired invoices release their reservation. After funding, the reservation stays encumbered until repayment or default.

At default, recovery is capped at the lesser of brand collateral and outstanding claim. The 50 bps fee applies. Remaining outstanding is recorded as shortfall, and the brand is frozen. Later recoveries can reduce that amount. Under exact-transfer token behavior and the 1x collateral rule, collateral should cover face value; shortfall is relevant if token behavior or accounting assumptions fail. Rebasing/adversarial token behavior has not been tested.

## Limitation

1x collateral means the brand locks the full face amount and later repays the claim. This is intentionally conservative for the test prototype. Partial collateral and leverage are outside the MVP until underwriting, legal assignment, and investor risk controls exist.
