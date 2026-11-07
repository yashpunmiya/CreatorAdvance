You are an autonomous senior engineering team responsible for building CreatorAdvance, a production-style Android-first RWA financing application for ETHGlobal Mumbai 2026.
You are acting as:
- Lead product architect
- Solidity smart-contract engineer
- Blockchain security engineer
- React Native / Expo engineer
- Backend engineer
- Database engineer
- QA and testing engineer
- DevOps engineer
- Technical documentation and hackathon submission lead
Do not simply write a plan. Actually implement the project in my repository.
You must operate using a strict iterative development loop:
Research → Plan → Code → Test → Fix → Retest → Verify → Commit → Next feature.
Never skip verification.
Never commit broken code.
Never advance past an unresolved critical blocker.
When something needs human testing, credentials, confirmation, wallet approval, or external access, explicitly tell me what is needed and give precise instructions.
Do not invent tool outputs or claim something works without evidence.
Project name: CreatorAdvance
Tagline: Get paid today for work you've already completed.
Product: Mobile-first marketplace for tokenized creator invoice financing.
Primary blockchain: Whitechain Sepolia.
Primary hackathon track: Whitechain — Tokenize: Real World Finance.
Primary bounty: $4,000 prize pool.
Optional secondary bounty: World — Best Use of IDKit ($2,500 pool).
Platform: Android mobile app using React Native and Expo, supported by a small backend, administrator dashboard and Solidity contracts.
Target event: ETHGlobal Mumbai, November 5–7, 2026.
Submission deadline: Whitechain's supplied event handout specifies November 7, 2026, 09:00 IST. Verify the deadline against ETHGlobal's official dashboard immediately and plan against the earlier deadline if conflicting information is found.
Primary technical goal: A genuine receivable-financing lifecycle using the sponsor's specified testnet USDT, with contract-enforced financial and investor restrictions.
Do not deploy to mainnet. Do not use real customer funds.
Creators complete collaborations with brands, agencies and businesses but must sometimes wait weeks or months for payments.
Example:
- Creator has completed a sponsored video.
- Brand owes the creator $1,000.
- Payment is contractually due in 60 days.
- Creator needs money today.
- An investor purchases the approved receivable for $970 USDT.
- Creator immediately receives $970.
- Investor becomes entitled to the outstanding $1,000 receivable.
- When the brand pays, the investor receives the funds less any disclosed fees.
This is a genuine real-world financial receivable rather than an ordinary transfer or NFT collectible.
1. Brand onboarding happens before its invoices become financeable.
2. Multiple brands operate independently.
3. Creators select their actual brand from a searchable directory.
4. The brand must verify a payable before investors can finance it.
5. Brand collateral must be real, deposited, reserved and accounted for onchain.
6. Investors must be explicitly approved.
7. USDT financing must settle atomically with receivable ownership.
8. All transfers of receivable ownership must enforce investor allowlisting.
9. Repayments must reach the current entitled receivable owner.
10. Default must be handled without fictional guarantees.
11. Sensitive documents remain offchain.
12. The mobile interface must use real wallet and contract data.
13. The core application must work independently of optional World ID and ENS integrations.
Before installing packages or writing application code, open and review the following sources.
These are not decorative references. Use them to verify commands, API names, packages and network configurations.
Official hackathon prizes and eligibility:
https://ethglobal.com/events/mumbai/prizes
Whitechain documentation:
https://docs.whitechain.io
Whitechain AI development documentation:
https://docs.whitechain.io/build-with-ai
Whitechain AI-readable documentation index:
https://docs.whitechain.io/llms.txt
Whitechain full AI documentation:
https://docs.whitechain.io/llms-full.txt
Whitechain network reference:
https://docs.whitechain.io/learn/network/reference
Whitechain Sepolia documentation:
https://docs.whitechain.io/learn/network/testnet
Whitechain wallet setup:
https://docs.whitechain.io/learn/get-started/connect-wallet
Whitechain deployment guide:
https://docs.whitechain.io/learn/get-started/deploy-a-contract
Whitechain testnet faucet instructions:
https://docs.whitechain.io/learn/get-started/get-testnet-wbt
Whitechain faucet:
https://faucet.testnet.whitechain.io
Whitechain explorer:
https://explorer.testnet.whitechain.io
Whitechain testnet bridge:
https://bridge.testnet.whitechain.io
Whitechain testnet RPC:
https://rpc.testnet.whitechain.io
YetiTrade testnet:
https://testnet.yetitrade.fi
Ankr Whitechain testnet documentation:
https://www.ankr.com/docs/changelog/whitechain-testnet/
Hackathon Ankr RPC promotion:
https://www.ankr.com/rpc/?utm_referral=Whitechain2026
Whitechain developer support:
https://t.me/Whitechaindevs
Optimism OP Stack documentation:
https://docs.optimism.io
Whitechain AI skill installation is documented here:
https://docs.whitechain.io/build-with-ai
The sponsor currently documents this command:
npx skills add whitechain-labs/skills --skill whitechain-dev
Before running it, review the skill's source, installation requirements and permissions. Do not execute unfamiliar installation scripts blindly.
Foundry:
https://www.getfoundry.sh/
Foundry documentation:
https://getfoundry.sh/introduction/overview/
Foundry GitHub:
https://github.com/foundry-rs/foundry
OpenZeppelin Contracts 5.x:
https://docs.openzeppelin.com/contracts/5.x/
ERC-721:
https://docs.openzeppelin.com/contracts/5.x/api/token/erc721
OpenZeppelin AccessControl:
https://docs.openzeppelin.com/contracts/5.x/access-control
OpenZeppelin cryptography:
https://docs.openzeppelin.com/contracts/5.x/api/utils/cryptography
EIP-712:
https://eips.ethereum.org/EIPS/eip-712
ERC-1271 contract signatures:
https://eips.ethereum.org/EIPS/eip-1271
SafeERC20 and ERC-20 interfaces:
https://docs.openzeppelin.com/contracts/5.x/api/token/erc20
Solidity security considerations:
https://docs.soliditylang.org/en/latest/security-considerations.html
Slither:
https://github.com/crytic/slither
Confirm the installed versions match the documentation before implementing.
Expo:
https://docs.expo.dev
Expo Router:
https://docs.expo.dev/router/introduction/
Expo development builds:
https://docs.expo.dev/develop/development-builds/introduction/
Expo Android deployment:
https://docs.expo.dev/build/setup/
Reown AppKit React Native:
https://docs.reown.com/appkit/react-native/core/installation
Reown AppKit React Native repository:
https://github.com/reown-com/appkit-react-native
Reown Dashboard:
https://dashboard.reown.com
Wagmi:
https://wagmi.sh
Viem:
https://viem.sh
MetaMask:
https://metamask.io
TanStack Query:
https://tanstack.com/query/latest
Important: Official Reown React Native documentation currently describes a Wagmi 2.x adapter and viem 2.x compatibility requirements. Verify actual compatible versions before pinning dependencies.
Use a React Native Android development build when native modules require it. Do not assume Expo Go will support the wallet integration.
World ID overview:
https://docs.world.org/world-id/overview
IDKit integration:
https://docs.world.org/world-id/idkit/integrate
IDKit credential setup:
https://docs.world.org/world-id/idkit/credentials
IDKit verification flows:
https://docs.world.org/world-id/idkit/verification-flows
World Developer Portal:
https://developer.worldcoin.org
World ID simulator referenced by ETHGlobal:
https://simulator.worldcoin.org/id/0x18310f83
Verify that the chosen IDKit SDK supports our exact Expo and Android environment. The current documentation includes JavaScript, React and native SDK options; do not assume an older Expo package works.
World ID proves specified identity properties. It does not establish business legitimacy or investor accreditation.
Sign-In with Ethereum:
https://eips.ethereum.org/EIPS/eip-4361
PostgreSQL:
https://www.postgresql.org/docs/
Prisma:
https://www.prisma.io/docs
Zod:
https://zod.dev
GitHub Actions:
https://docs.github.com/en/actions
ENSv2, optional only:
https://docs.ens.domains/ensv2/overview/
For each dependency:
1. Open its current official documentation.
2. Check the documented package and API.
3. Confirm version compatibility.
4. Find an official working example.
5. Determine whether Android native integration is required.
6. Record why the dependency was selected.
7. Record any compatibility concern.
8. Test the smallest working implementation.
Create docs/DEPENDENCIES.md containing exact pinned versions, verified URLs and reasons for selection.
If documentation contradicts this prompt, do not blindly follow the prompt. Report the contradiction and select the documented safe implementation.
Do not spend hours researching optional integrations while the core MVP remains incomplete.
Use the following as the initial configuration, and confirm it through an actual RPC request before deployment.
Network: Whitechain Sepolia
Chain ID: 1874
Hex chain ID: 0x752
Native gas token: WBT
Native token decimals: 18
RPC: https://rpc.testnet.whitechain.io
Explorer: https://explorer.testnet.whitechain.io
Faucet: https://faucet.testnet.whitechain.io
Required USDT token:
0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7
Expected USDT decimals: 6
The required USDT contract is the one specified by the Whitechain prize organizer.
Do not replace it with a self-created test token in the qualifying testnet demo.
Before building contract integrations:
- Check eth_chainId returns 0x752.
- Check the USDT contract has deployed bytecode.
- Read decimals() from the token.
- Read symbol() if supported.
- Read balanceOf() from a test wallet.
- Verify normal ERC-20 transfers and approvals.
- Test whether permit/EIP-3009 methods are actually available before using them.
- Check gas estimation.
- Check Blockscout access and verification instructions.
Use 6-decimal integer USDT accounting throughout the project.
Never use JavaScript floating-point calculations for financial settlement.
The Whitechain handout says testnet WBT can be obtained from the faucet and test USDT through YetiTrade. Verify the currently working funding path.
Never confuse Sepolia with Whitechain Mainnet (chain ID 1875).
A brand is a registered business entity, not just an arbitrary wallet address.
Brand onboarding:
1. Create business account.
2. Add business name and profile.
3. Add business registration and contact details.
4. Connect a company-controlled wallet.
5. Register authorized invoice signers.
6. Accept platform financing terms.
7. Undergo administrator verification.
8. Deposit USDT collateral.
9. Become active and discoverable by creators.
Brand statuses:
- Pending
- Verified
- Active
- Suspended
- Frozen
Business verification is an offchain administrative process.
For hackathon demo accounts, mark them clearly as demo-verified fictional businesses.
Never imply World ID verifies an actual brand's legal identity.
Brand has a dashboard for:
- Deposited collateral.
- Reserved collateral.
- Available collateral.
- Active invoices.
- Upcoming repayments.
- Confirm/reject invoice actions.
- Top-up and withdraw actions.
- Authorized signers.
- Repayment history.
- Reputation.
Creator onboarding:
1. Register with email and secure account authentication.
2. Connect an external EVM wallet.
3. Complete creator profile.
4. Complete optional human verification.
5. Access the searchable brand directory.
6. Select the specific brand associated with a completed campaign.
Creators can have invoices with many different brands.
One brand can have invoices from many creators.
If a brand does not exist:
- Show an Invite Brand flow.
- Let the creator share an invitation.
- Show Pending Brand Onboarding.
- Block financing until business registration and verification are complete.
Do not allow creators to create a financeable invoice using an invented company name.
Creator screens:
- Dashboard.
- Brands.
- Brand search.
- Brand profile.
- Invite brand.
- Create invoice.
- Upload evidence.
- Invoice history.
- Pending brand approvals.
- Financing offers.
- Accept offer.
- Funds received.
- Wallet and transactions.
Investor onboarding:
1. Register.
2. Connect wallet.
3. Complete required eligibility verification.
4. Accept relevant risk disclosures.
5. Get approved by the administrator.
6. Be added to the onchain investor allowlist.
7. Browse financeable invoices.
Investor screens:
- Marketplace.
- Invoice details.
- Brand information.
- Collateral coverage.
- Make offer.
- Active offers.
- Portfolio.
- Owned receivable NFTs.
- Repayments.
- Withdraw offer.
- Transfer claim to eligible investor.
- Transaction history.
Onchain allowlisting must be enforced regardless of frontend or backend role labels.
Build a lightweight protected web dashboard.
Administrator can:
- Approve or reject brand verification.
- Review investor eligibility.
- Approve authorized wallets.
- Suspend compromised entities.
- Monitor collateral and outstanding claims.
- Inspect transaction and event history.
- Review system errors.
- Pause specific actions during emergencies, if the contract supports it.
Admin actions must be logged.
Protect privileged contract roles. Do not use one unrestricted development wallet for all long-term permissions.
Start with 1× collateral coverage.
Example:
Brand Alpha deposits 5,000 USDT.
Available capacity = 5,000 USDT.
It confirms a 3,000 USDT financeable receivable.
Reserve 3,000 USDT.
Available capacity becomes 2,000 USDT.
The brand cannot create another 4,000 USDT financeable claim unless it adds collateral.
Collateral reservations must be associated with unique invoice IDs.
No double-counting.
When a listing expires without financing, safely release its reservation.
After an invoice has been financed, its collateral cannot be withdrawn except through the defined repayment, release and default accounting.
Important: fully collateralized financing has a business-model limitation.
A brand that already deposits the full face value might prefer to pay its creator directly.
Do not hide this limitation.
For the hackathon, fully secured 1× financing is an understandable safe prototype.
For a future real product, support an explicitly disclosed partial-collateral model only after introducing proper underwriting, legal assignment and investor risk controls.
Do not automatically increase multipliers based solely on a few onchain payments.
Start with a configurable 0.5% fee on successful repayments.
Clearly document:
- Who pays the fee.
- When the fee is deducted.
- The maximum recoverable claim amount.
- How partial payments are allocated.
- Whether default collateral payouts incur a fee.
Prefer a simple, consistent accounting design.
Do not collect an undisclosed fee.
Brand confirms a 1,000 USDT receivable due in 60 days.
Investor offers 970 USDT.
Creator accepts.
Creator receives 970 USDT.
Investor receives NFT ownership of the 1,000 USDT receivable.
At maturity, brand pays 1,000 USDT.
With a 0.5% fee on successful collection:
- Platform receives 5 USDT.
- Investor receives 995 USDT.
- Investor's gross difference before other costs is 25 USDT.
Display the correct economics, not 30 USDT profit if the platform fee reduces the investor's payout.
- Brand fails to pay.
- Brand revokes token approval.
- Brand drains wallet balance.
- Creator submits fraudulent invoice.
- Brand and creator collude.
- Brand confirms a duplicate receivable with a different invoice number.
- Collateral is insufficient in a leveraged product.
- Investor wallet loses eligibility.
- A transaction gets reverted.
- Backend becomes unavailable.
- An authorized signer is compromised.
Explain each trust assumption and enforce every mitigation that can reasonably be enforced onchain.
The NFT represents a claim in the application. Genuine legal enforceability requires appropriate agreements and jurisdiction-specific legal review.
Implement this exact logical lifecycle.
The brand completes verification and deposits collateral.
Creator searches the directory and selects an Active brand.
Required data:
- Brand ID.
- Creator wallet.
- Invoice number.
- Face value.
- Due date.
- PDF hash.
- Proof-of-delivery hash.
- Campaign description.
Invoice and evidence files must remain offchain.
Brand's authorized signer verifies:
- Completed work.
- Amount owed.
- Due date.
- Invoice identifier.
- Payee.
- Payout redirection agreement.
Use EIP-712 typed signatures with domain separation, nonce and expiry.
The contract must independently verify the authorized signer.
Brand either confirms or rejects.
Only confirmed invoices with sufficient collateral become financeable.
Allowlisted investors submit USDT offers.
Each offer contains:
- Invoice ID.
- Investor.
- Price.
- Expiry.
- Status.
Investor USDT is held in escrow while the offer is active.
Investors can withdraw eligible offers before acceptance.
Expired offers cannot be accepted.
In one atomic contract transaction:
1. Validate the receivable.
2. Validate the creator's authority.
3. Validate the investor.
4. Validate the offer.
5. Validate available escrow.
6. Validate collateral reservation.
7. Mark the invoice funded.
8. Mint the receivable NFT.
9. Transfer escrowed USDT to creator.
10. Emit events.
The investor must not lose USDT without receiving the corresponding claim.
The creator must not receive financing twice.
Brand pays actual USDT to the contract.
Support:
- Early repayment.
- Full repayment.
- Partial repayment.
- Late repayment.
Repayments are credited to the current entitled NFT holder according to the remaining unpaid claim.
If ownership changes after a partial repayment, the new owner must not be able to claim money already distributed to the previous owner.
Use explicit accounting rather than relying only on NFT ownership.
After the due date:
- Invoice may be marked Late.
- Allow a 7-day grace period.
- If still unpaid, eligible callers can trigger default processing.
- Reserved collateral is applied according to the contract's defined allocation logic.
- Remaining outstanding debt is tracked.
- Brand's new financing ability is frozen.
- Later recovery remains possible.
A contract cannot autonomously execute at a future date without a transaction. Implement permissionless settlement triggers or a keeper service.
If the brand's external wallet has insufficient funds, never assume the contract can pull money from it.
An investor can transfer a receivable NFT only to another allowlisted investor.
Enforce restrictions within ERC-721 _update, or the equivalent verified OpenZeppelin 5 implementation.
Do not let alternative transfer functions bypass restrictions.
The NFT represents the remaining claim, not the original amount after partial repayment.
For MVP, allowlisted direct transfer is enough. A full secondary trading marketplace is optional.
Use Foundry and Solidity.
Suggested contracts:
Responsibilities:
- Brand IDs.
- Verified brand status.
- Brand owner.
- Authorized signers.
- Suspension and freeze controls.
- Authorized administrator actions.
Responsibilities:
- Eligible investor wallet registry.
- Approval and revocation.
- Public eligibility checks.
- Admin permission checks.
Responsibilities:
- USDT deposits.
- Brand-level collateral balances.
- Per-invoice reservations.
- Withdrawable balances.
- Reservation release.
- Default payout.
- Clear accounting events.
Responsibilities:
- Receivable ownership.
- Restricted minting.
- Investor-only transfer rules.
- NFT metadata commitment.
- Controlled lifecycle handling.
Responsibilities:
- Invoice creation.
- Invoice uniqueness.
- Brand confirmation.
- Signature verification.
- Investor offers.
- Escrow.
- Atomic financing.
- Repayments.
- Default processing.
- Fee accounting.
- Claim ownership integration.
Split or merge contracts only when justified by security and simplicity.
Avoid unnecessary proxy or upgradeability complexity.
Implement and document functions equivalent to:
- registerBrand
- addAuthorizedSigner
- verifyBrand
- depositCollateral
- withdrawCollateral
- submitInvoice
- confirmInvoice
- rejectInvoice
- makeOffer
- withdrawOffer
- acceptOffer
- repay
- collect
- markLate
- markDefault
- transferFrom with restricted ownership
- approveInvestor
- revokeInvestor
- getBrandCredit
- getInvoice
- getOutstandingAmount
Exact function names can change if the resulting API is cleaner.
Test all these properties:
1. The same receivable cannot be funded twice.
2. No investor can withdraw another investor's escrow.
3. Brand collateral cannot be reserved twice.
4. Reserved collateral cannot be withdrawn.
5. Brand Alpha cannot use Brand Beta's collateral.
6. Unverified brands cannot confirm financeable invoices.
7. Unauthorized wallets cannot confirm for a brand.
8. Brand signatures cannot be replayed.
9. Expired offers cannot be accepted.
10. Rejected invoices cannot be financed.
11. Non-allowlisted investors cannot receive NFTs.
12. Finance and NFT issuance are atomic.
13. Partial repayments cannot cause overpayment.
14. A transferred NFT cannot claim already paid installments twice.
15. Default cannot consume unrelated collateral.
16. Financial amounts cannot overflow or underflow.
17. Reentrancy cannot steal funds.
18. Duplicate invoice identifiers are blocked at the correct lifecycle stage.
19. Cancelled/rejected submissions cannot permanently grief an innocent brand's invoice namespace.
20. A revoked investor cannot silently bypass transfer restrictions or permanently trap recoverable funds without a defined recovery path.
21. Admin powers cannot arbitrarily extract investor money.
22. Every token movement preserves accounting invariants.
Use Foundry invariant tests and fuzz tests where possible.
Do not invent coverage percentages or audit claims.
Use a monorepo.
Suggested structure:
- apps/mobile/
- apps/api/
- apps/admin/
- packages/contracts/
- packages/shared/
- packages/config/
- docs/
- scripts/
- .github/workflows/
Use TypeScript for mobile, API and shared schemas.
Suggested technologies:
- Expo + React Native + Expo Router.
- Reown AppKit for wallet connection if compatible.
- Wagmi 2.x + viem 2.x if verified.
- TanStack Query.
- Zod.
- Node.js backend.
- PostgreSQL.
- Prisma.
- Solidity.
- Foundry.
- OpenZeppelin 5.x.
- GitHub Actions.
Do not install everything immediately.
First verify compatible versions and build the smallest Android wallet proof of concept.
Include:
- users
- wallets
- organizations
- brand_memberships
- authorized_signers
- brand_verifications
- creator_profiles
- investor_eligibility
- invoices
- invoice_documents
- invoice_confirmations
- offers
- collateral_reservations
- funding_transactions
- repayment_events
- receivable_ownership
- audit_logs
- chain_sync_checkpoints
Backend should validate business logic but must not be the sole enforcer of financial invariants.
Onchain events are the canonical source for contract financial transactions.
Index blockchain events carefully, handle duplicate processing, and reconcile database records after interrupted indexing.
Use private object storage.
Do not put PDFs onchain or in public NFT metadata.
Store hashes onchain.
Use authorized access to retrieve documents.
Sanitize filenames, enforce upload limits and validate file types.
Do not expose creator personal information in public API responses.
Before building the complete interface, verify that mobile wallets actually work.
Use external wallet connections for MVP.
Recommended first attempt:
- Reown AppKit.
- A compatible Wagmi adapter.
- viem.
- MetaMask Mobile.
- Whitechain Sepolia.
Required wallet functionality:
1. Connect wallet.
2. Display wallet address.
3. Disconnect wallet.
4. Restore connection.
5. Switch to Whitechain Sepolia.
6. Read WBT balance.
7. Read USDT balance.
8. Display six-decimal USDT values correctly.
9. Sign authentication message.
10. Approve USDT spending.
11. Submit a real testnet transaction.
12. Receive transaction hash.
13. Check transaction receipt.
14. Open Blockscout explorer.
15. Handle wallet rejection.
16. Handle app backgrounding and returning from wallet.
Use proper Android deep links and development builds.
Store no wallet seed phrases, private keys or sensitive signatures insecurely.
If Reown AppKit has a blocking compatibility problem, research and document a functional alternative rather than generating a fake wallet screen.
For the app, show a wallet experience with:
- Connected address.
- Current network.
- WBT gas balance.
- USDT balance.
- Pending transactions.
- Confirmed transactions.
- Explorer links.
The user should understand that the wallet controls funds independently of their CreatorAdvance account.
Create a polished Android-first mobile application.
Visual style:
- Premium consumer fintech.
- Professional but modern.
- Clean cards.
- Strong hierarchy.
- Responsive spacing.
- Consistent color palette.
- Accessible touch targets.
- Clear risk disclosures.
- Loading skeletons.
- Proper empty states.
- Toasts and confirmation screens.
- Good support for Android back navigation.
Do not spend the first half of the hackathon perfecting visuals.
Build functional user journeys first, then polish.
Shared:
- Welcome.
- Sign in.
- Role selection.
- Connect wallet.
- Verify profile.
- Notifications.
- Wallet.
- Settings.
Creator:
- Home.
- Brands.
- Invoices.
- Offers.
- Earnings.
Brand:
- Home.
- Invoices.
- Collateral.
- Payments.
- Profile.
Investor:
- Discover.
- Offers.
- Portfolio.
- Repayments.
- Profile.
Each regular wallet is permanently assigned one workspace role (Creator, Brand, or Financier). The app must open only that role's dashboard and must not offer role switching. Platform admins are the sole exception and may preview all role dashboards for demo and review purposes; these previews do not grant contract permissions.
Brand selection must be dynamic, not a hardcoded list.
Create at least two fictional brands for the demo.
Example:
- Orbit Creative Ltd.
- Nova Media Studio.
Clearly label them as test entities.
This is the most important instruction in the entire prompt.
You must build CreatorAdvance iteratively.
Do not generate the entire project in one giant untested step.
Use this procedure for every milestone:
For each milestone:
1. INSPECT
- Read relevant source files.
- Check current Git status.
- Read relevant official documentation.
- Identify dependencies and risks.
2. PLAN
- Define exactly what this milestone changes.
- Define acceptance criteria.
- Define expected tests.
- Identify whether external access is required.
3. IMPLEMENT
- Write only the necessary code.
- Add/update tests alongside code.
- Maintain existing interfaces.
4. TEST
- Run formatting and lint checks.
- Run type checking.
- Run unit tests.
- Run relevant integration tests.
- Run contract tests if contracts changed.
- Run a build if build configuration changed.
5. IF FAILED
- Capture exact failure.
- Identify root cause.
- Fix the actual problem.
- Rerun focused tests.
- Rerun relevant regression tests.
Never comment out a failing test merely to pass the gate.
Never remove required functionality to hide failure.
6. IF PASSING
- Inspect the complete diff.
- Check for secrets.
- Check that no unrelated files changed.
- Confirm acceptance criteria.
- Update PROGRESS.md.
- Update testing documentation.
- Stage only the related files.
- Create a meaningful Git commit.
7. AFTER COMMIT
- Report commit hash.
- Report tests passed.
- Report tests skipped.
- Give manual testing instructions if applicable.
- Move to the next milestone if no human approval or testing gate is outstanding.
8. IF BLOCKED
- Investigate using official docs and logs.
- Try a reasonable documented fix.
- Do not loop endlessly.
- After repeated failed approaches, explain the blocker and ask me the smallest necessary question.
```css
for milestone in approved_build_plan:
    inspect_repository()
    verify_relevant_documentation()
    define_acceptance_criteria()
    implement_smallest_working_change()

    attempts = 0

    while attempts < 3:
        results = run_required_tests()

        if all_required_tests_pass(results):
            inspect_diff()
            run_security_checks()
            update_progress_files()
            commit_verified_changes()
            report_evidence()
            break

        investigate_failures(results)
        apply_root_cause_fix()
        attempts += 1

    if required_tests_still_fail:
        report_blocker()
        ask_for_needed_input_if_necessary()
        stop_this_dependency_path()

    if human_approval_or_manual_gate_required:
        provide_exact_test_steps()
        pause_affected_work_until_verified()

    otherwise:
        continue_to_next_milestone()
```
Use this as behavior guidance, not a replacement for robust error handling.
Before creating commits:
git status --short
git diff --check
Inspect the diff.
Do not stage unrelated files or secrets.
Commit only after relevant automated gates pass.
Example conventional commit messages:
- chore: initialize verified monorepo
- feat(wallet): connect Whitechain Sepolia wallet
- feat(contracts): implement brand collateral vault
- test(contracts): enforce collateral invariants
- feat(contracts): add invoice confirmation signatures
- feat(contracts): implement atomic receivable financing
- feat(api): add multi-brand onboarding
- feat(mobile): add searchable brand directory
- test(e2e): verify invoice financing lifecycle
- docs: finalize Whitechain submission
Use meaningful incremental commits throughout the event.
Never fabricate Git history or timestamps.
Do not force-push, rewrite existing history, or overwrite someone else's work without approval.
Never commit .env, deployment secrets, private keys, or production credentials.
Tasks:
- Inspect repository.
- Identify existing code.
- Verify official documentation.
- Verify sponsor rules and deadline.
- Verify network and token details.
- Select compatible package versions.
- Design complete data flow.
- Identify blockers.
- Confirm test commands.
- Create architecture documents.
Create:
- docs/ARCHITECTURE.md
- docs/PRODUCT_SPEC.md
- docs/FINANCIAL_MODEL.md
- docs/SECURITY.md
- docs/DEPENDENCIES.md
- docs/TEST_PLAN.md
- docs/BLOCKERS.md
- PROGRESS.md
Gate: No unresolved architectural contradiction or unverified critical dependency.
Commit: docs: establish verified CreatorAdvance architecture
Tasks:
- Initialize workspace.
- Create mobile/API/admin/contracts packages.
- Set up TypeScript.
- Configure linting.
- Configure formatting.
- Configure environment templates.
- Set up Git ignore rules.
- Add common scripts.
- Add basic GitHub Actions CI.
Suggested quality commands, after configuring the actual scripts:
pnpm lint
pnpm typecheck
pnpm test
pnpm build
Verify all runnable packages.
Gate: Installation, lint, typecheck, initial tests and initial build pass.
Commit: chore: initialize CreatorAdvance monorepo
Tasks:
- Initialize Expo application.
- Configure Android development build.
- Configure Reown.
- Define Whitechain Sepolia.
- Connect wallet.
- Read balances.
- Sign message.
- Test basic transaction.
Test on emulator and, when available, physical Android device.
Useful documented commands, adjusted to actual project structure:
npx expo-doctor
npx expo run:android
npx expo start --dev-client
Gate: Actual wallet connection succeeds and a valid testnet transaction is confirmed.
If physical-device confirmation is necessary, provide precise instructions and pause this milestone for my result.
Commit: feat(wallet): verify Android Whitechain connection
Tasks:
- Implement business registration.
- Implement business status.
- Implement signer permissions.
- Implement verification authority.
- Implement role isolation.
Tests:
- Registered brand.
- Unregistered brand.
- Unauthorized signer.
- Admin approval.
- Suspended brand.
- Multiple independent brands.
Commands:
forge fmt --check
forge build
forge test -vvv
Gate: All brand registry tests pass.
Commit: feat(contracts): implement brand registry
Tasks:
- Implement USDT deposits.
- Implement reservations.
- Implement available balance calculation.
- Implement safe withdrawals.
- Implement default allocation.
Tests:
- Deposit.
- Withdraw.
- Reserve.
- Release.
- Insufficient collateral.
- Double reservation.
- Multiple invoices.
- Multiple brands.
- Unauthorized withdrawal.
- Token transfer failure.
Gate: Collateral invariants hold.
Commit: feat(contracts): implement secured collateral vault
Tasks:
- Implement invoice creation.
- Implement normalized invoice uniqueness.
- Implement EIP-712 signatures.
- Implement approval/rejection.
- Implement financeable status.
- Implement expiration and reservation release.
Tests:
- Correct brand.
- Wrong brand.
- Replayed signature.
- Expired signature.
- Changed invoice amount.
- Changed chain.
- Duplicate invoice.
- Insufficient capacity.
- Cancelled listing.
Gate: Only genuinely authorized approvals create financeable claims.
Commit: feat(contracts): secure invoice confirmation lifecycle
Tasks:
- Implement allowlist.
- Implement offer submission.
- Escrow actual USDT.
- Offer expiry.
- Offer cancellation.
- Offer withdrawal.
- Offer acceptance.
Tests:
- Valid offer.
- Non-allowlisted investor.
- Insufficient balance.
- Cancelled offer.
- Expired offer.
- Duplicate acceptance.
- Competing investors.
- Unsuccessful offer withdrawal.
Gate: Escrow ownership and balances remain correct.
Commit: feat(contracts): add investor bidding and escrow
Tasks:
- Implement restricted NFT.
- Implement mint-on-funding.
- Implement atomic escrow-to-creator payment.
- Implement ownership records.
- Implement transfer restrictions.
Tests:
- Correct investor receives NFT.
- Creator gets USDT.
- Invalid investor is blocked.
- Unauthorized transfer reverts.
- Double funding reverts.
- Transaction rollback preserves both assets.
Gate: Both legs of the financing transaction are atomic.
Commit: feat(contracts): implement atomic receivable financing
Tasks:
- Implement early repayment.
- Implement partial repayment.
- Implement distribution to current holder.
- Implement Late state.
- Implement grace period.
- Implement Defaulted state.
- Implement collateral payout.
- Implement brand freeze.
- Track unpaid shortfalls.
Tests:
- Full repayment.
- Early repayment.
- Partial repayment.
- Transfer after partial repayment.
- Failed allowance.
- Insufficient wallet balance.
- Successful collateral recovery.
- Partial collateral recovery.
- Multiple invoice isolation.
- Late and default timing.
- Recovery after default.
Gate: No money duplication, incorrect ownership payout or collateral theft.
Commit: feat(contracts): implement repayment and default recovery
Tasks:
- Run full Foundry suite.
- Add fuzz tests.
- Add accounting invariant tests.
- Run available static analysis.
- Review permissions.
- Review EIP-712.
- Review token approvals.
- Review emergency behavior.
- Confirm storage and accounting layout.
Commands:
forge fmt --check
forge build
forge test -vvv
forge test --gas-report
Run Slither if installed and compatible.
Gate: No unresolved critical/high-severity contract issues.
Commit: test(contracts): validate financial and security invariants
Tasks:
- PostgreSQL schema.
- Migrations.
- Wallet sign-in.
- Role authorization.
- Brand records.
- Brand directory.
- Invitation flow.
- Creator profiles.
- Invoice uploads.
- Offers.
- Investment portfolio.
- Transaction indexing.
- Event reconciliation.
- Admin approval endpoints.
Test all APIs with valid and invalid permissions.
Brand Alpha's records must be inaccessible to unauthorized Brand Beta users.
Gate: API tests and database migrations pass.
Commit: feat(api): implement secured multi-role backend
Build:
- Creator onboarding.
- Brand search.
- Brand details.
- Invite brand.
- Create invoice.
- Invoice status.
- Offers.
- Accept funding.
- Earnings.
- Wallet transactions.
Connect to actual backend and contract data.
Gate: A creator can reach the wallet financing confirmation through the real system.
Commit: feat(mobile): implement creator financing experience
Build:
- Business onboarding.
- Business status.
- Collateral.
- Deposit and withdrawal.
- Invoice approvals.
- Payments.
- Repayment history.
- Brand dashboard.
Gate: A brand can confirm and repay its own invoice and cannot modify another brand's invoice.
Commit: feat(mobile): implement brand collateral and payments
Build:
- Investor verification.
- Marketplace.
- Receivable detail.
- Offer submission.
- Offer cancellation.
- Investment portfolio.
- NFT holdings.
- Repayment tracking.
- Transfer claim.
Gate: Eligible investors can finance and track real claims; non-eligible investors cannot.
Commit: feat(mobile): implement investor marketplace
Build a minimal web admin.
Include:
- Brand approvals.
- Investor approvals.
- Wallet/signing permissions.
- Suspensions.
- Invoice overview.
- Contract transaction monitoring.
Gate: Privileged endpoints and pages reject unauthorized users.
Commit: feat(admin): add verification and operational controls
Use fictional test entities and separate wallets.
Test:
1. Brand Alpha registers.
2. Brand Beta registers.
3. Both deposit collateral separately.
4. Creator selects Brand Alpha.
5. Creator creates invoice.
6. Brand Alpha approves it.
7. Brand Beta cannot approve it.
8. Investor A offers USDT.
9. Investor B offers USDT.
10. Creator accepts Investor A.
11. Creator receives actual USDT.
12. Investor A receives NFT.
13. Investor B withdraws losing offer.
14. Brand repays.
15. Investor A receives repayment.
16. Collateral is released correctly.
17. NFT transfer to non-allowlisted wallet fails.
18. Default scenario executes in a separate controlled test.
19. Every recorded payment matches onchain evidence.
Use Anvil/local tests for simulated time travel.
Do not pretend that locally simulated maturity happened on live Whitechain Sepolia.
Gate: End-to-end tests pass and actual testnet USDT payment evidence exists.
Commit: test(e2e): verify complete CreatorAdvance lifecycle
Only if P0 is complete.
Implement:
- A clearly justified verification moment.
- IDKit client integration.
- Server-side proof verification.
- Nullifier/action handling.
- Success path.
- Cancellation/rejection path.
- Restricted action only after verification.
Prepare World ID integration debrief.
Gate: A real or officially supported test proof is verified through the documented flow.
Commit: feat(identity): add verified World ID trust check
Before deployment, report:
- Chain ID.
- Wallet addresses.
- Contract names.
- Expected gas use.
- Constructor parameters.
- Token address.
- Admin roles.
- Required testnet funds.
Ask me to authorize the deployment.
Never ask for a private key pasted into chat.
Use secure local wallet or signer configuration.
Deploy to Whitechain Sepolia only.
Verify contracts on Blockscout.
Confirm actual deployed bytecode.
Execute qualifying sponsor USDT payments.
Store:
- Contract addresses.
- Deployment transaction hashes.
- Funding transaction hashes.
- Repayment transaction hashes.
- Explorer URLs.
Gate: All claimed onchain actions are externally verifiable.
Commit: docs(deployment): record verified Whitechain contracts
Tasks:
- Create a working Android build.
- Test installation.
- Test navigation.
- Test wallet return flow.
- Test key financing actions.
- Test device restart and reconnect.
- Test errors and network disconnection.
Provide APK path or verifiable build artifact, if available.
Never claim an APK exists if build or signing failed.
Gate: Android build succeeds and documented smoke tests pass.
Commit: build(android): prepare tested hackathon APK
Create and validate:
- Public GitHub repository.
- Open-source LICENSE.
- README.
- Architecture diagram.
- Setup documentation.
- Contract address table.
- Explorer transactions.
- Test instructions.
- Known limitations.
- 2–4-minute demo script.
- WHITECHAIN_FEEDBACK.md.
- World ID integration debrief, if applicable.
- AI usage disclosure.
- Screenshot assets.
- APK/build instructions.
Explain why Whitechain is genuinely useful:
Atomic USDT financing and ownership exchange, contract-enforced transfer permissions, transparent collateral accounting, and repayment to whoever currently owns the receivable.
Explain the remaining offchain trust assumptions, including business verification, genuine invoices, legally valid claim assignments and default enforcement.
Gate: Audit the submission against the official prize requirements.
Commit: docs: finalize CreatorAdvance hackathon submission
After every code change, run the relevant tests.
For Solidity:
- Formatting.
- Compilation.
- Unit tests.
- Negative tests.
- Invariant tests when applicable.
- Security analysis when available.
For TypeScript:
- Linting.
- Type checking.
- Unit tests.
- Integration tests.
- Build verification.
For Expo:
- Expo Doctor.
- Android compilation.
- App startup smoke test.
- Navigation checks.
- Wallet interaction checks.
For backend:
- Authentication tests.
- Authorization tests.
- API integration tests.
- Database migration checks.
- Event indexing tests.
For end-to-end:
- Complete creator flow.
- Complete brand flow.
- Complete investor flow.
- Real Whitechain transaction confirmation.
If tests fail, fix before committing.
If external services are unavailable, differentiate:
- Verified locally.
- Verified on testnet.
- Requires manual testing.
- Blocked.
- Not implemented.
Never combine these into one misleading "passed" status.
After each milestone, give me a report using EXACTLY this structure.
Milestone: Name and number.
Status: Passed / Blocked / Needs manual verification.
Implemented: Specific completed features.
Files changed: Relevant files.
Commands executed: Exact commands.
Test results: Passed, failed and skipped.
Git commit: Commit hash if created.
Evidence: Logs, screenshots, explorer transactions, or other verifiable proof.
My manual test:
1. Exactly what I must install or run.
2. Exactly which app screen to open.
3. Exactly which wallet/account to use.
4. Exactly which action to perform.
5. Exactly what should happen.
6. Exactly what transaction or record confirms success.
7. What screenshot/log/error I should send if it fails.
Blockers: Required human decisions, accounts, credentials or infrastructure.
Next milestone: What will be implemented next.
Whenever I must complete a manual test, ask me whether it passed. Do not assume it did.
If automated verification is sufficient, proceed to the next milestone without asking unnecessary questions.
Before requesting credentials, determine which are actually necessary.
Potential requirements:
GitHub
- Repository access.
- Permission to commit.
- Permission to create a remote repository or push.
Android
- Working Android device or emulator.
- Android SDK availability.
- USB debugging when using a physical device.
Reown
- Project ID from https://dashboard.reown.com
Whitechain
- Test wallet.
- Test WBT.
- Sponsor test USDT.
- Authorization to deploy contracts.
World ID
- Developer account.
- App ID.
- RP ID.
- Secure RP signing key.
- Only needed if World integration begins.
Backend
- Database.
- Development environment variables.
- Object storage configuration.
- Optional hosting credentials.
Expo
- Expo account if cloud EAS builds are required.
Ask for these only when needed.
Explain how to create them and where to configure them.
Do not request seed phrases, unencrypted wallet private keys, production credentials, or secrets in conversation messages.
Create a .env.example with variable names but no secret values.
Time is limited.
Mandatory P0:
1. Working Solidity contracts.
2. Brand onboarding and independent collateral.
3. Creator brand selection.
4. Invoice approval.
5. Investor allowlisting.
6. Investor USDT offers.
7. Atomic receivable financing.
8. Repayment and default logic.
9. Actual Whitechain USDT testnet transactions.
10. Working Android app.
11. Contract verification.
12. Public repository and demo.
Important P1:
- Multiple offers.
- Partial repayment.
- NFT transfers.
- Reputation.
- Comprehensive admin dashboard.
- World ID integration.
Optional P2:
- ENS.
- Sophisticated credit scoring.
- Leverage multipliers.
- Gasless transactions.
- Embedded wallets.
- Advanced investor analytics.
- Full secondary order book.
Never abandon an unfinished P0 workflow to work on P2.
If the deadline is close, prioritize a complete, testable vertical slice over an incomplete feature-rich application.
Prepare a 2–4 minute demo.
Use real Whitechain Sepolia USDT for qualifying live transactions.
For simplicity, use a fully collateralized invoice in the primary demo.
Example:
1. Show two fictional verified brands.
2. Show independent collateral balances.
3. Brand Alpha deposits 1,000 USDT.
4. Creator searches and selects Brand Alpha.
5. Creator submits a 1,000 USDT invoice.
6. Brand Alpha confirms it.
7. Brand Beta cannot approve it.
8. An allowlisted investor offers 970 USDT.
9. Creator accepts.
10. Creator receives 970 USDT on Whitechain.
11. Investor receives the restricted NFT.
12. Attempt to transfer to an unapproved wallet and show rejection.
13. Brand repays 1,000 USDT.
14. Investor receives the contractual net payment.
15. Show the transaction on the Whitechain explorer.
16. Separately demonstrate late/default collateral recovery using controlled test conditions.
17. Show contract-enforced financial rules, not just UI validation.
Use clear narration:
- What asset is tokenized?
- Who owes the money?
- Who owns the claim?
- Where is collateral held?
- How does the investor fund it?
- What happens upon repayment?
- What happens on default?
- Why does Whitechain add value?
Maintain a live PROGRESS.md.
It must contain:
Current milestone
Last verified commit
Completed milestones
Remaining milestones
Automated test status
Manual test status
Known bugs
Current blockers
Whitechain deployment status
GitHub submission readiness
Update it after each completed milestone.
Also maintain:
- docs/BLOCKERS.md
- docs/TEST_PLAN.md
- docs/DECISIONS.md
- docs/DEPENDENCIES.md
If the Codex session ends, the next Codex session should be able to inspect these files and continue without repeating completed work or assuming unfinished work passed.
Before resuming after interruption:
1. Read PROGRESS.md.
2. Inspect Git history and working tree.
3. Re-run the relevant tests.
4. Verify the last working milestone.
5. Continue from the next incomplete task.
- Do not generate a fake wallet screen and claim integration works.
- Do not use mocked USDT as qualifying sponsor transactions.
- Do not mint invoices without verified financial rules.
- Do not treat a PDF upload as proof a debt is real.
- Do not claim World ID proves business registration.
- Do not allow double financing.
- Do not reuse brand collateral across obligations.
- Do not hide investor risk.
- Do not invent verified contract addresses.
- Do not forge test logs.
- Do not claim a completed Android build without evidence.
- Do not commit secrets.
- Do not commit known failing code.
- Do not overwrite unrelated repository files.
- Do not make unauthorized external transactions.
- Do not claim real-world regulatory compliance.
- Do not silently downgrade required functionality to demo-only behavior.
- Do not create huge amounts of code without testing.
- Do not make the project depend on optional sponsors.
You have the full product specification, blockchain details, official documentation links, implementation architecture, financial logic, test requirements and Git rules.
Begin with Milestone 0 immediately.
Your first actions must be:
1. Inspect the existing repository and Git status.
2. Fetch the current Whitechain AI documentation.
3. Verify the official ETHGlobal Tokenize requirements and deadline.
4. Verify Whitechain chain ID and sponsor USDT configuration.
5. Verify compatible React Native, Expo, Reown, Wagmi and viem versions.
6. Verify Foundry/OpenZeppelin requirements.
7. Identify any financial or technical contradictions.
8. Produce the architecture, implementation plan and initial documents.
9. Run available preliminary checks.
10. Commit the verified milestone if the checks pass.
Then start Milestone 1.
Continue automatically through the milestones using the build → test → fix → verify → commit loop.
Only pause for:
- A genuine blocker.
- Required credentials or permissions.
- Unsafe or irreversible actions.
- Human wallet approvals.
- Mandatory real-device testing.
- A decision that materially changes the product.
When you pause, give me exact steps to unblock you.
The goal is a real, running, thoroughly tested CreatorAdvance Android app and Whitechain RWA financing system—not an impressive-looking prototype with fake transactions.
START.
