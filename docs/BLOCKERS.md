# Blockers and manual gates

Updated: 2026-11-06.

## Current blockers

1. **Live end-to-end lifecycle:** CreatorAdvance is deployed and verified on Whitechain Sepolia. Brand, creator, and investor transactions still need to be exercised against it.
2. **Source verification:** publish verified source and constructor arguments on the Whitechain Sepolia explorer.
3. **Database startup:** migrations 0001/0002 and integration pass against isolated PostgreSQL 18. Start the cluster under `%LOCALAPPDATA%\CreatorAdvance\pg-integration` after machine restarts; restart the API to apply the current contract/admin environment.
4. **Role separation:** selected MetaMask wallet has 100 sponsor USDT and 2 WBT and holds platform/deployment admin roles. Use separate test wallets for the brand, creator, and investor flows when available.
5. **Submission:** deadline is Saturday, Nov 7, 2026 at 09:00 IST. The user chose to keep the GitHub repository private; do not make it public or push. Record the demo and complete sponsor requirements if possible. Review ETHGlobal's AI eligibility rule and describe human work accurately.

## Verified deployment

- Chain ID `0x752` (1874); no mainnet transaction or asset was used.
- Contract: `0x598c4fb5aeb0f2965782a73c40972ecb8056e7fa`.
- Deployment transaction: `0x40bbda02613989298422d4517aa5987204549254e3806e8e1dc0490501f06384`; successful receipt, five confirmations, runtime code present.
- Onchain token, fee-recipient, and admin role checks match the selected MetaMask wallet and sponsor USDT.
- Ignored mobile/API environment files reference this deployment; the API must be restarted to load the updated values.

## Needed to complete live validation

- Restart local API and Metro after environment changes; verify authenticated API access on the phone.
- Verify contract source, then test brand registration/activation, invoice approval, offer/funding, restricted NFT ownership, repayment/default, and event receipt synchronization.
- Record the demo and finish sponsor submission materials. The repository remains private per the user's instruction.
