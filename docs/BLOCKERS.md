# Blockers and manual gates

Updated: 2026-11-07.

## Current blockers

1. **Remaining lifecycle coverage:** invoice issuance, brand approval, investor offer, and creator funding have completed live. Repayment, maturity/default recovery, and related event synchronization still need live validation.
2. **Source verification:** publish verified source and constructor arguments on the Whitechain Sepolia explorer. Its API currently reports the deployed address as unverified.
3. **Database startup:** migrations 0001/0002 and integration pass against isolated PostgreSQL 18. Start the cluster under `%LOCALAPPDATA%\CreatorAdvance\pg-integration` after machine restarts; restart the API to apply the current contract/admin environment.
4. **Role separation:** the live invoice funding flow used distinct brand, creator, and investor wallets. Keep the deployment/admin wallet separate from those roles.
5. **Submission:** record the demo video. The [GitHub repository](https://github.com/yashpunmiya/CreatorAdvance) is public for the Whitechain Tokenize track. Review AI eligibility and describe human contributions accurately.

## Verified deployment

- Chain ID `0x752` (1874); no mainnet transaction or asset was used.
- Contract: `0x598c4fb5aeb0f2965782a73c40972ecb8056e7fa`.
- Deployment transaction: `0x40bbda02613989298422d4517aa5987204549254e3806e8e1dc0490501f06384`; successful receipt, five confirmations, runtime code present.
- Onchain token, fee-recipient, and admin role checks match the selected MetaMask wallet and sponsor USDT.
- Live `submitOffer` escrow: [`0xe2f9e13345f0303bb11d18335280f3fca33a819a7ecbf44e23ffeb9b0975663c`](https://explorer.testnet.whitechain.io/tx/0xe2f9e13345f0303bb11d18335280f3fca33a819a7ecbf44e23ffeb9b0975663c), 4.8 organizer USDT.
- Live `acceptOffer`: [`0xd5f2fec51f9f480f4d15f2e8b90126df15c29fa87b8f5650c973e5b118032d7d`](https://explorer.testnet.whitechain.io/tx/0xd5f2fec51f9f480f4d15f2e8b90126df15c29fa87b8f5650c973e5b118032d7d), successful 4.8 USDT payout to creator plus CAR claim mint to investor.
- Ignored mobile/API environment files reference this deployment; the API must be restarted to load the updated values.

## Needed to complete live validation

- Restart local API and Metro after environment changes; verify authenticated API access on the phone.
- Verify contract source, then test repayment/default and event receipt synchronization.
- Record the demo and finish sponsor submission materials.
