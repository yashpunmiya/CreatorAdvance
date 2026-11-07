# CreatorAdvance demo script (target: 3 minutes)

**Status (2026-11-07):** the live invoice-to-funding path completed on Whitechain Sepolia. A successful 4.8 organizer-USDT payout and CAR claim mint are confirmed in the [README evidence](../README.md#live-financing-evidence). Repayment/default are not part of this recorded lifecycle. Explorer source verification remains pending.

## Before recording

- Use the Android phone to run the app, but mirror it by USB to a computer with scrcpy and record the computer capture in OBS. ETHGlobal's Mumbai video guidance says not to record the submission on a mobile phone.
- Use separate, labeled brand, creator, and investor wallets; keep admin separate. Rehearse wallet switching and confirm app statuses after each receipt.
- Turn on Do Not Disturb, record live human narration, and keep the display at native portrait proportions. Do not expose seed phrases or private keys.
- Do not invent a state or transaction. Keep the real approvals, receipt screens, and Explorer receipt visible; trim only idle waits.

## Timed flow and narration

| Time | Show | Narration |
| --- | --- | --- |
| 0:00–0:18 | Welcome, then creator dashboard | “The work is done, but the invoice is still waiting to be paid. CreatorAdvance lets a creator finance a brand-approved receivable with an investor's offer, settled in USDT on Whitechain.” |
| 0:18–0:38 | Brand Alpha, active status, and collateral | “This is Brand Alpha. Its business review happens offchain, while collateral and invoice state are enforced by the contract. Private documents stay offchain; their fingerprints anchor the onchain invoice.” |
| 0:38–0:58 | Creator selects the active brand and shows the submitted invoice | “The creator submits completed-work evidence and a five-USDT invoice. It begins pending approval; it is not financeable just because it appears in the app.” |
| 0:58–1:20 | Switch to brand wallet; show signer approval and confirmed status | “The brand's authorized signer approves the invoice details. The contract checks the signer, invoice state, approval deadline, and available collateral. After confirmation, the invoice becomes financeable.” |
| 1:20–1:42 | Switch to investor wallet; show allowlisted access, USDT approval, and offer | “This separate investor is allowlisted. They approve the organizer's USDT and escrow a discounted offer. The offer stays in the contract until the creator accepts or it is cancelled.” |
| 1:42–2:08 | Switch to creator; accept offer and show Funded | “The creator chooses the offer. Acceptance marks the invoice funded, releases the escrowed USDT to the creator, and mints the receivable claim to the investor in the same transaction.” |
| 2:08–2:30 | Open the successful funding transaction on Whitechain Explorer | “This receipt shows the organizer's exact USDT contract transferring 4.8 USDT to the creator and the CAR claim minting to the investor. This is testnet USDT, not a project-minted substitute.” |
| 2:30–2:48 | Show contract's investor checks / transfer hook in source | “The claim is not a generic NFT: the contract checks investor eligibility and blocks transfers to an ineligible wallet. Repayment follows the claim's current owner. Business verification and legal enforceability remain offchain assumptions.” |
| 2:48–3:00 | Return to Funded app state, then repo/README | “CreatorAdvance finances invoices rather than simply collecting payments. Whitechain makes the USDT settlement and claim ownership update together, with an inspectable receipt. This is a testnet demo; these tokens have no monetary value.” |

## Live receipts to show

- Investor offer escrow (4.8 organizer USDT): [Explorer transaction](https://explorer.testnet.whitechain.io/tx/0xe2f9e13345f0303bb11d18335280f3fca33a819a7ecbf44e23ffeb9b0975663c)
- Creator acceptance and settlement (4.8 organizer USDT payout plus CAR claim mint): [Explorer transaction](https://explorer.testnet.whitechain.io/tx/0xd5f2fec51f9f480f4d15f2e8b90126df15c29fa87b8f5650c973e5b118032d7d)
- Contract: [Whitechain Sepolia Explorer](https://explorer.testnet.whitechain.io/address/0x598c4fb5aeb0f2965782a73c40972ecb8056e7fa)

**Do not describe source verification, repayment, maturity, or default as complete until each has been verified live.**
