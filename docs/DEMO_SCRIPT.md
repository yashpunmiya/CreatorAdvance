# CreatorAdvance demo script (2–4 minutes)

**Status:** rehearsal outline only. Do not record as a completed end-to-end demo until the contract is deployed and verified, sponsor USDT is funded, and each onchain action has a real explorer receipt.

## Timed flow

| Time | Show | Narration |
| --- | --- | --- |
| 0:00–0:20 | Android app and Whitechain Sepolia wallet | “CreatorAdvance finances a verified creator receivable. This demo uses test wallets and organizer USDT only.” |
| 0:20–0:45 | Two fictional brands and their separate collateral balances | “Each brand has its own signer and collateral account; the platform verification is an offchain trust step.” |
| 0:45–1:15 | Creator searches for Brand Alpha, chooses it, submits invoice and private evidence | “The creator selects the real directory entry. Documents stay offchain; only the signed evidence hashes and settlement fields go onchain.” |
| 1:15–1:35 | Brand Alpha signer approves; show a Brand Beta approval attempt rejected | “The brand signer approves the invoice details. A different brand cannot confirm this payable.” |
| 1:35–2:10 | Investor allowlist and 970 USDT offer; creator accepts | “Only approved investors can offer. Acceptance settles USDT to the creator and mints the restricted claim atomically.” |
| 2:10–2:30 | Attempt transfer to a non-allowlisted address; show rejection | “Transfer restrictions are enforced by the contract, not just the screen.” |
| 2:30–2:50 | Show repayment to current claim owner and explorer receipt | “Repayment follows whoever currently owns the claim, after the disclosed fee.” |
| 2:50–3:15 | Explain separate default scenario or show a controlled local test | “Default applies the brand's reserved collateral and records any shortfall; it is not a guarantee of full recovery.” |
| 3:15–3:30 | Explorer and repository | “The explorer shows the deployed contract and real organizer-USDT transaction. The repo documents the trust assumptions and setup.” |

## Recording gates

- Replace this script's illustrative amounts with actual receipt amounts and explorer URLs.
- Use separate fictional brand, creator, investor, and admin wallets where feasible.
- Do not claim a live default test from local Anvil time travel.
- Include the contract address and at least one qualifying USDT explorer link in the public README.
- Confirm the authenticated ETHGlobal submission cutoff before final upload.
