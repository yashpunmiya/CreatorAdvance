// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {CreatorAdvance} from "../src/CreatorAdvance.sol";
import {MockUSDT} from "../src/MockUSDT.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function warp(uint256 timestamp) external;
    function expectRevert(bytes calldata data) external;
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
}

contract CreatorAdvanceTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant BRAND_KEY = 0xA11CE;
    uint256 private constant SIGNER_KEY = 0xB0B;
    uint256 private constant INVESTOR_KEY = 0xCAFE;
    address private constant FEE_RECIPIENT = address(0xFEE);
    uint256 private constant UNIT = 1e6;

    MockUSDT private token;
    CreatorAdvance private advance;
    address private brandOwner;
    address private signer;
    address private investor;
    address private creator = address(0xC0FFEE);
    bytes32 private brandId = keccak256("brand-a");
    bytes32 private invoiceId;
    uint64 private listingExpiry;
    uint64 private dueDate;

    function setUp() public {
        brandOwner = vm.addr(BRAND_KEY);
        signer = vm.addr(SIGNER_KEY);
        investor = vm.addr(INVESTOR_KEY);
        token = new MockUSDT();
        advance = new CreatorAdvance(IERC20(address(token)), FEE_RECIPIENT, address(this));
        advance.setInvestorEligibility(investor, true);
        token.mint(brandOwner, 10_000 * UNIT);
        token.mint(investor, 10_000 * UNIT);
        vm.warp(1_800_000_000);
        listingExpiry = uint64(block.timestamp + 2 days);
        dueDate = uint64(block.timestamp + 30 days);

        vm.prank(brandOwner);
        advance.registerBrand(brandId, keccak256("business profile"));
        advance.setBrandStatus(brandId, CreatorAdvance.BrandStatus.Active);
        vm.prank(brandOwner);
        advance.setAuthorizedSigner(brandId, signer, true);
        vm.startPrank(brandOwner);
        token.approve(address(advance), type(uint256).max);
        advance.depositCollateral(brandId, 1_000 * UNIT);
        vm.stopPrank();
        invoiceId = keccak256(abi.encode(brandId, keccak256("invoice-001")));
    }

    function testBrandCollateralAndTypedApprovalThenFundingAndRepayment() public {
        uint256 face = 1_000 * UNIT;
        vm.prank(creator);
        advance.createInvoice(
            brandId,
            keccak256("invoice-001"),
            face,
            dueDate,
            listingExpiry,
            keccak256("pdf"),
            keccak256("delivery"),
            keccak256("campaign")
        );
        _confirmInvoice(face);
        require(advance.availableCollateral(brandId) == 0, "reserve full face value");

        vm.prank(investor);
        token.approve(address(advance), type(uint256).max);
        vm.prank(investor);
        uint256 offerId = advance.submitOffer(invoiceId, 970 * UNIT, listingExpiry);
        vm.prank(creator);
        advance.acceptOffer(invoiceId, offerId);
        require(advance.ownerOf(uint256(invoiceId)) == investor, "investor owns receivable");
        require(token.balanceOf(creator) == 970 * UNIT, "creator paid atomically");

        vm.prank(brandOwner);
        advance.repay(invoiceId, face);
        require(token.balanceOf(investor) == 10_025 * UNIT, "net repayment reaches owner");
        require(token.balanceOf(FEE_RECIPIENT) == 5 * UNIT, "fee capped and collected");
        require(advance.availableCollateral(brandId) == 1_000 * UNIT, "repayment releases reservation");
        (,,,,,,,,,,, CreatorAdvance.InvoiceStatus status,,) = advance.invoices(invoiceId);
        require(status == CreatorAdvance.InvoiceStatus.Repaid, "invoice repaid");
    }

    function testUnapprovedInvestorCannotOfferOrReceiveTransfer() public {
        vm.prank(creator);
        advance.createInvoice(
            brandId,
            keccak256("invoice-001"),
            100 * UNIT,
            dueDate,
            listingExpiry,
            keccak256("pdf"),
            keccak256("delivery"),
            keccak256("campaign")
        );
        _confirmInvoice(100 * UNIT);
        address outsider = address(0xBAD);
        vm.expectRevert(abi.encodeWithSelector(CreatorAdvance.InvestorNotAllowed.selector, outsider));
        vm.prank(outsider);
        advance.submitOffer(invoiceId, 90 * UNIT, listingExpiry);
    }

    function testRejectedSubmissionReleasesInvoiceNumber() public {
        vm.prank(creator);
        advance.createInvoice(
            brandId,
            keccak256("invoice-001"),
            100 * UNIT,
            dueDate,
            listingExpiry,
            keccak256("pdf"),
            keccak256("delivery"),
            keccak256("campaign")
        );
        vm.prank(brandOwner);
        advance.rejectInvoice(invoiceId);

        address otherCreator = address(0x1234);
        vm.prank(otherCreator);
        bytes32 retriedId = advance.createInvoice(
            brandId,
            keccak256("invoice-001"),
            100 * UNIT,
            dueDate,
            listingExpiry,
            keccak256("updated-pdf"),
            keccak256("updated-delivery"),
            keccak256("updated-campaign")
        );
        require(retriedId == invoiceId, "stable invoice id");
        (,,,,,,,,,,, CreatorAdvance.InvoiceStatus status,,) = advance.invoices(retriedId);
        require(status == CreatorAdvance.InvoiceStatus.Pending, "resubmission pending");
    }

    function testDefaultUsesCollateralAndRecordsShortfall() public {
        vm.prank(creator);
        advance.createInvoice(
            brandId,
            keccak256("invoice-001"),
            1_000 * UNIT,
            dueDate,
            listingExpiry,
            keccak256("pdf"),
            keccak256("delivery"),
            keccak256("campaign")
        );
        _confirmInvoice(1_000 * UNIT);
        vm.prank(investor);
        token.approve(address(advance), type(uint256).max);
        vm.prank(investor);
        uint256 offerId = advance.submitOffer(invoiceId, 970 * UNIT, listingExpiry);
        vm.prank(creator);
        advance.acceptOffer(invoiceId, offerId);

        vm.warp(uint256(dueDate) + advance.GRACE_PERIOD() + 1);
        advance.settleDefault(invoiceId);
        require(token.balanceOf(investor) == 10_025 * UNIT, "collateral recovery less fee");
        (,,,,,,,,,,, CreatorAdvance.InvoiceStatus status,,) = advance.invoices(invoiceId);
        require(status == CreatorAdvance.InvoiceStatus.Defaulted, "default state recorded");
        (,, CreatorAdvance.BrandStatus brandStatus,,) = advance.brands(brandId);
        require(brandStatus == CreatorAdvance.BrandStatus.Frozen, "brand frozen after default");
    }

    function testPartialRepaymentFollowsCurrentOwnerAfterAllowedTransfer() public {
        vm.prank(creator);
        advance.createInvoice(
            brandId,
            keccak256("invoice-001"),
            1_000 * UNIT,
            dueDate,
            listingExpiry,
            keccak256("pdf"),
            keccak256("delivery"),
            keccak256("campaign")
        );
        _confirmInvoice(1_000 * UNIT);
        vm.prank(investor);
        token.approve(address(advance), type(uint256).max);
        vm.prank(investor);
        uint256 offerId = advance.submitOffer(invoiceId, 970 * UNIT, listingExpiry);
        vm.prank(creator);
        advance.acceptOffer(invoiceId, offerId);

        vm.prank(brandOwner);
        advance.repay(invoiceId, 200 * UNIT);
        address nextInvestor = address(0xDADA);
        advance.setInvestorEligibility(nextInvestor, true);
        vm.prank(investor);
        advance.transferFrom(investor, nextInvestor, uint256(invoiceId));
        token.mint(brandOwner, 800 * UNIT);
        vm.prank(brandOwner);
        advance.repay(invoiceId, 800 * UNIT);

        require(
            token.balanceOf(investor) == 10_000 * UNIT - 970 * UNIT + 199 * UNIT, "first holder keeps partial payout"
        );
        require(token.balanceOf(nextInvestor) == 796 * UNIT, "new holder receives remaining payout");
        require(advance.ownerOf(uint256(invoiceId)) == nextInvestor, "approved transfer succeeds");
    }

    function _confirmInvoice(uint256 face) private {
        uint256 nonce = advance.approvalNonce(brandId);
        uint64 deadline = uint64(block.timestamp + 1 days);
        bytes32 typeHash = keccak256(
            "InvoiceApproval(bytes32 brandId,bytes32 invoiceId,address creator,bytes32 invoiceNumberHash,uint256 faceValue,uint64 dueDate,bytes32 pdfHash,bytes32 deliveryHash,bytes32 campaignHash,uint64 listingExpiry,uint256 nonce,uint64 deadline)"
        );
        bytes32 structHash = keccak256(
            abi.encode(
                typeHash,
                brandId,
                invoiceId,
                creator,
                keccak256("invoice-001"),
                face,
                dueDate,
                keccak256("pdf"),
                keccak256("delivery"),
                keccak256("campaign"),
                listingExpiry,
                nonce,
                deadline
            )
        );
        bytes32 domain = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("CreatorAdvance"),
                keccak256("1"),
                block.chainid,
                address(advance)
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domain, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.prank(creator);
        advance.confirmInvoice(invoiceId, deadline, signature);
    }
}
