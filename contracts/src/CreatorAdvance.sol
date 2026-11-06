// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Testnet prototype for collateralized creator receivable financing.
/// @dev Business verification and legal assignment remain offchain trust assumptions.
contract CreatorAdvance is ERC721, EIP712, AccessControlDefaultAdminRules, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant INVESTOR_ADMIN_ROLE = keccak256("INVESTOR_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant BPS = 10_000;
    uint16 public constant MAX_FEE_BPS = 50;
    uint64 public constant GRACE_PERIOD = 7 days;

    bytes32 private constant INVOICE_APPROVAL_TYPEHASH = keccak256(
        "InvoiceApproval(bytes32 brandId,bytes32 invoiceId,address creator,bytes32 invoiceNumberHash,uint256 faceValue,uint64 dueDate,bytes32 pdfHash,bytes32 deliveryHash,bytes32 campaignHash,uint64 listingExpiry,uint256 nonce,uint64 deadline)"
    );

    enum BrandStatus {
        Unregistered,
        Pending,
        Verified,
        Active,
        Suspended,
        Frozen
    }

    enum InvoiceStatus {
        None,
        Pending,
        Financeable,
        Funded,
        Repaid,
        Defaulted,
        Rejected,
        Expired
    }

    enum OfferStatus {
        None,
        Active,
        Accepted,
        Withdrawn
    }

    struct Brand {
        address owner;
        bytes32 businessProfileHash;
        BrandStatus status;
        uint256 collateral;
        uint256 reservedCollateral;
    }

    struct Invoice {
        bytes32 brandId;
        address creator;
        bytes32 invoiceNumberHash;
        bytes32 pdfHash;
        bytes32 deliveryHash;
        bytes32 campaignHash;
        uint256 faceValue;
        uint256 paidGross;
        uint256 outstanding;
        uint64 dueDate;
        uint64 listingExpiry;
        InvoiceStatus status;
        uint256 tokenId;
        uint256 activeOffers;
    }

    struct Offer {
        bytes32 invoiceId;
        address investor;
        uint256 price;
        uint64 expiry;
        OfferStatus status;
    }

    IERC20 public immutable usdt;
    address public feeRecipient;
    uint16 public feeBps = 50;
    uint256 public nextOfferId = 1;

    mapping(bytes32 brandId => Brand) public brands;
    mapping(bytes32 brandId => mapping(address signer => bool)) public authorizedSigner;
    mapping(bytes32 brandId => uint256) public approvalNonce;
    mapping(bytes32 invoiceId => Invoice) public invoices;
    mapping(bytes32 brandId => mapping(bytes32 invoiceNumberHash => bytes32)) public invoiceByNumber;
    mapping(bytes32 brandId => mapping(bytes32 invoiceNumberHash => bool)) public usedInvoiceNumber;
    mapping(uint256 tokenId => bytes32 invoiceId) public tokenInvoice;
    mapping(uint256 offerId => Offer) public offers;
    mapping(address investor => bool) public isInvestor;

    error InvalidAddress();
    error InvalidAmount();
    error InvalidState();
    error Unauthorized();
    error InvalidInvoice();
    error InvalidSignature();
    error ApprovalExpired();
    error DuplicateInvoice();
    error InsufficientCollateral();
    error InvoiceNotExpired();
    error OfferNotExpired();
    error InexactTokenTransfer();
    error InvestorNotAllowed(address investor);
    error TransferPaused();
    error FeeTooHigh();

    event BrandRegistered(bytes32 indexed brandId, address indexed owner, bytes32 businessProfileHash);
    event BrandStatusChanged(bytes32 indexed brandId, BrandStatus status);
    event AuthorizedSignerChanged(bytes32 indexed brandId, address indexed signer, bool allowed);
    event InvestorEligibilityChanged(address indexed investor, bool allowed);
    event CollateralDeposited(bytes32 indexed brandId, address indexed owner, uint256 amount, uint256 total);
    event CollateralWithdrawn(bytes32 indexed brandId, address indexed owner, uint256 amount, uint256 remaining);
    event InvoiceCreated(
        bytes32 indexed invoiceId, bytes32 indexed brandId, address indexed creator, uint256 faceValue
    );
    event InvoiceConfirmed(bytes32 indexed invoiceId, address indexed signer, uint256 nonce);
    event InvoiceRejected(bytes32 indexed invoiceId, address indexed signer);
    event InvoiceCancelled(bytes32 indexed invoiceId);
    event InvoiceExpired(bytes32 indexed invoiceId);
    event OfferSubmitted(
        uint256 indexed offerId, bytes32 indexed invoiceId, address indexed investor, uint256 price, uint64 expiry
    );
    event OfferWithdrawn(uint256 indexed offerId, address indexed investor);
    event InvoiceFunded(
        bytes32 indexed invoiceId, uint256 indexed offerId, uint256 indexed tokenId, address investor, uint256 price
    );
    event Repayment(
        bytes32 indexed invoiceId,
        address indexed payer,
        address indexed recipient,
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount,
        uint256 outstanding
    );
    event DefaultProcessed(
        bytes32 indexed invoiceId, uint256 collateralApplied, uint256 fee, uint256 netRecovery, uint256 shortfall
    );
    event DefaultRecovery(
        bytes32 indexed invoiceId,
        address indexed payer,
        address indexed recipient,
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount,
        uint256 outstanding
    );
    event FeeTermsChanged(uint16 feeBps, address feeRecipient);

    constructor(IERC20 usdt_, address feeRecipient_, address admin)
        ERC721("CreatorAdvance Receivable", "CAR")
        EIP712("CreatorAdvance", "1")
        AccessControlDefaultAdminRules(2 days, admin)
    {
        if (address(usdt_) == address(0) || feeRecipient_ == address(0) || admin == address(0)) revert InvalidAddress();
        usdt = usdt_;
        feeRecipient = feeRecipient_;
        _grantRole(VERIFIER_ROLE, admin);
        _grantRole(INVESTOR_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function registerBrand(bytes32 brandId, bytes32 businessProfileHash) external whenNotPaused {
        if (brandId == bytes32(0) || businessProfileHash == bytes32(0) || msg.sender == address(0)) {
            revert InvalidAddress();
        }
        if (brands[brandId].status != BrandStatus.Unregistered) revert InvalidState();
        brands[brandId] = Brand({
            owner: msg.sender,
            businessProfileHash: businessProfileHash,
            status: BrandStatus.Pending,
            collateral: 0,
            reservedCollateral: 0
        });
        emit BrandRegistered(brandId, msg.sender, businessProfileHash);
    }

    function setBrandStatus(bytes32 brandId, BrandStatus status) external onlyRole(VERIFIER_ROLE) {
        Brand storage brand = brands[brandId];
        if (
            brand.status == BrandStatus.Unregistered || status == BrandStatus.Unregistered
                || status == BrandStatus.Pending
        ) {
            revert InvalidState();
        }
        brand.status = status;
        emit BrandStatusChanged(brandId, status);
    }

    function setAuthorizedSigner(bytes32 brandId, address signer, bool allowed) external {
        if (signer == address(0)) revert InvalidAddress();
        Brand storage brand = brands[brandId];
        if (msg.sender != brand.owner || brand.status == BrandStatus.Unregistered || brand.status == BrandStatus.Frozen)
        {
            revert Unauthorized();
        }
        authorizedSigner[brandId][signer] = allowed;
        emit AuthorizedSignerChanged(brandId, signer, allowed);
    }

    function setInvestorEligibility(address investor, bool allowed) external onlyRole(INVESTOR_ADMIN_ROLE) {
        if (investor == address(0)) revert InvalidAddress();
        isInvestor[investor] = allowed;
        emit InvestorEligibilityChanged(investor, allowed);
    }

    function setFeeTerms(uint16 newFeeBps, address newFeeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (newFeeRecipient == address(0)) revert InvalidAddress();
        feeBps = newFeeBps;
        feeRecipient = newFeeRecipient;
        emit FeeTermsChanged(newFeeBps, newFeeRecipient);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function depositCollateral(bytes32 brandId, uint256 amount) external nonReentrant whenNotPaused {
        Brand storage brand = brands[brandId];
        if (brand.owner != msg.sender || brand.status != BrandStatus.Active) revert Unauthorized();
        if (amount == 0) revert InvalidAmount();
        _pullExact(msg.sender, amount);
        brand.collateral += amount;
        emit CollateralDeposited(brandId, msg.sender, amount, brand.collateral);
    }

    function withdrawCollateral(bytes32 brandId, uint256 amount) external nonReentrant whenNotPaused {
        Brand storage brand = brands[brandId];
        if (brand.owner != msg.sender || brand.status != BrandStatus.Active) revert Unauthorized();
        if (amount == 0) revert InvalidAmount();
        uint256 available = brand.collateral - brand.reservedCollateral;
        if (amount > available) revert InsufficientCollateral();
        brand.collateral -= amount;
        usdt.safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(brandId, msg.sender, amount, brand.collateral);
    }

    function availableCollateral(bytes32 brandId) external view returns (uint256) {
        Brand storage brand = brands[brandId];
        return brand.collateral - brand.reservedCollateral;
    }

    function createInvoice(
        bytes32 brandId,
        bytes32 invoiceNumberHash,
        uint256 faceValue,
        uint64 dueDate,
        uint64 listingExpiry,
        bytes32 pdfHash,
        bytes32 deliveryHash,
        bytes32 campaignHash
    ) external whenNotPaused returns (bytes32 invoiceId) {
        Brand storage brand = brands[brandId];
        if (brand.status != BrandStatus.Active || brand.owner == address(0)) revert InvalidState();
        if (
            invoiceNumberHash == bytes32(0) || pdfHash == bytes32(0) || deliveryHash == bytes32(0)
                || campaignHash == bytes32(0)
        ) {
            revert InvalidInvoice();
        }
        if (
            faceValue == 0 || dueDate <= block.timestamp || listingExpiry <= block.timestamp || listingExpiry >= dueDate
        ) {
            revert InvalidInvoice();
        }
        if (usedInvoiceNumber[brandId][invoiceNumberHash] || invoiceByNumber[brandId][invoiceNumberHash] != bytes32(0))
        {
            revert DuplicateInvoice();
        }
        invoiceId = keccak256(abi.encode(brandId, invoiceNumberHash));
        invoiceByNumber[brandId][invoiceNumberHash] = invoiceId;
        invoices[invoiceId] = Invoice({
            brandId: brandId,
            creator: msg.sender,
            invoiceNumberHash: invoiceNumberHash,
            pdfHash: pdfHash,
            deliveryHash: deliveryHash,
            campaignHash: campaignHash,
            faceValue: faceValue,
            paidGross: 0,
            outstanding: faceValue,
            dueDate: dueDate,
            listingExpiry: listingExpiry,
            status: InvoiceStatus.Pending,
            tokenId: 0,
            activeOffers: 0
        });
        emit InvoiceCreated(invoiceId, brandId, msg.sender, faceValue);
    }

    function confirmInvoice(bytes32 invoiceId, uint64 deadline, bytes calldata signature) external whenNotPaused {
        Invoice storage invoice = invoices[invoiceId];
        Brand storage brand = brands[invoice.brandId];
        if (invoice.status != InvoiceStatus.Pending || brand.status != BrandStatus.Active) revert InvalidState();
        if (
            msg.sender != invoice.creator && msg.sender != brand.owner && !authorizedSigner[invoice.brandId][msg.sender]
        ) {
            revert Unauthorized();
        }
        if (block.timestamp > deadline) revert ApprovalExpired();

        uint256 nonce = approvalNonce[invoice.brandId];
        bytes32 structHash = keccak256(
            abi.encode(
                INVOICE_APPROVAL_TYPEHASH,
                invoice.brandId,
                invoiceId,
                invoice.creator,
                invoice.invoiceNumberHash,
                invoice.faceValue,
                invoice.dueDate,
                invoice.pdfHash,
                invoice.deliveryHash,
                invoice.campaignHash,
                invoice.listingExpiry,
                nonce,
                deadline
            )
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        if (!authorizedSigner[invoice.brandId][signer]) revert InvalidSignature();
        if (brand.collateral - brand.reservedCollateral < invoice.faceValue) revert InsufficientCollateral();

        approvalNonce[invoice.brandId] = nonce + 1;
        brand.reservedCollateral += invoice.faceValue;
        invoice.status = InvoiceStatus.Financeable;
        emit InvoiceConfirmed(invoiceId, signer, nonce);
    }

    function rejectInvoice(bytes32 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];
        Brand storage brand = brands[invoice.brandId];
        if (
            invoice.status != InvoiceStatus.Pending
                || (msg.sender != brand.owner && !authorizedSigner[invoice.brandId][msg.sender])
        ) {
            revert Unauthorized();
        }
        invoice.status = InvoiceStatus.Rejected;
        delete invoiceByNumber[invoice.brandId][invoice.invoiceNumberHash];
        emit InvoiceRejected(invoiceId, msg.sender);
    }

    function cancelInvoice(bytes32 invoiceId) external whenNotPaused {
        Invoice storage invoice = invoices[invoiceId];
        if (
            msg.sender != invoice.creator
                || (invoice.status != InvoiceStatus.Pending && invoice.status != InvoiceStatus.Financeable)
        ) {
            revert Unauthorized();
        }
        if (invoice.activeOffers != 0) revert InvalidState();
        if (invoice.status == InvoiceStatus.Financeable) {
            Brand storage brand = brands[invoice.brandId];
            brand.reservedCollateral -= invoice.faceValue;
        }
        invoice.status = InvoiceStatus.Expired;
        delete invoiceByNumber[invoice.brandId][invoice.invoiceNumberHash];
        emit InvoiceCancelled(invoiceId);
    }

    function expireListing(bytes32 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.status != InvoiceStatus.Financeable || block.timestamp <= invoice.listingExpiry) {
            revert InvoiceNotExpired();
        }
        Brand storage brand = brands[invoice.brandId];
        brand.reservedCollateral -= invoice.faceValue;
        invoice.status = InvoiceStatus.Expired;
        delete invoiceByNumber[invoice.brandId][invoice.invoiceNumberHash];
        emit InvoiceExpired(invoiceId);
    }

    function submitOffer(bytes32 invoiceId, uint256 price, uint64 expiry)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 offerId)
    {
        Invoice storage invoice = invoices[invoiceId];
        if (!isInvestor[msg.sender]) revert InvestorNotAllowed(msg.sender);
        if (invoice.status != InvoiceStatus.Financeable || block.timestamp > invoice.listingExpiry) {
            revert InvalidState();
        }
        if (price == 0 || price > invoice.faceValue || expiry <= block.timestamp || expiry > invoice.listingExpiry) {
            revert InvalidAmount();
        }
        _pullExact(msg.sender, price);
        offerId = nextOfferId++;
        offers[offerId] = Offer({
            invoiceId: invoiceId, investor: msg.sender, price: price, expiry: expiry, status: OfferStatus.Active
        });
        invoice.activeOffers += 1;
        emit OfferSubmitted(offerId, invoiceId, msg.sender, price, expiry);
    }

    function withdrawOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        if (offer.status != OfferStatus.Active || offer.investor != msg.sender) revert Unauthorized();
        if (block.timestamp <= offer.expiry && invoices[offer.invoiceId].status == InvoiceStatus.Financeable) {
            revert OfferNotExpired();
        }
        _withdrawOffer(offerId, offer);
    }

    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        if (offer.status != OfferStatus.Active || offer.investor != msg.sender) revert Unauthorized();
        _withdrawOffer(offerId, offer);
    }

    function acceptOffer(bytes32 invoiceId, uint256 offerId) external nonReentrant whenNotPaused {
        Invoice storage invoice = invoices[invoiceId];
        Offer storage offer = offers[offerId];
        if (msg.sender != invoice.creator) revert Unauthorized();
        if (
            invoice.status != InvoiceStatus.Financeable || offer.invoiceId != invoiceId
                || offer.status != OfferStatus.Active
        ) revert InvalidState();
        if (block.timestamp > offer.expiry || block.timestamp > invoice.listingExpiry) revert OfferNotExpired();
        if (!isInvestor[offer.investor]) revert InvestorNotAllowed(offer.investor);
        if (brands[invoice.brandId].reservedCollateral < invoice.faceValue) revert InsufficientCollateral();

        invoice.status = InvoiceStatus.Funded;
        usedInvoiceNumber[invoice.brandId][invoice.invoiceNumberHash] = true;
        invoice.tokenId = uint256(invoiceId);
        offer.status = OfferStatus.Accepted;
        invoice.activeOffers -= 1;
        tokenInvoice[invoice.tokenId] = invoiceId;

        _safeMint(offer.investor, invoice.tokenId);
        usdt.safeTransfer(invoice.creator, offer.price);
        emit InvoiceFunded(invoiceId, offerId, invoice.tokenId, offer.investor, offer.price);
    }

    function repay(bytes32 invoiceId, uint256 amount) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        Brand storage brand = brands[invoice.brandId];
        if (
            invoice.status != InvoiceStatus.Funded
                || (msg.sender != brand.owner && !authorizedSigner[invoice.brandId][msg.sender])
        ) {
            revert Unauthorized();
        }
        if (amount == 0 || amount > invoice.outstanding) revert InvalidAmount();
        _pullExact(msg.sender, amount);
        invoice.paidGross += amount;
        invoice.outstanding -= amount;
        address recipient = ownerOf(invoice.tokenId);
        uint256 fee = _fee(amount);
        uint256 netAmount = amount - fee;
        if (fee != 0) usdt.safeTransfer(feeRecipient, fee);
        if (netAmount != 0) usdt.safeTransfer(recipient, netAmount);
        if (invoice.outstanding == 0) {
            invoice.status = InvoiceStatus.Repaid;
            brand.reservedCollateral -= invoice.faceValue;
        }
        emit Repayment(invoiceId, msg.sender, recipient, amount, fee, netAmount, invoice.outstanding);
    }

    function settleDefault(bytes32 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.status != InvoiceStatus.Funded || block.timestamp <= uint256(invoice.dueDate) + GRACE_PERIOD) {
            revert InvalidState();
        }
        Brand storage brand = brands[invoice.brandId];
        uint256 collateralApplied = invoice.outstanding < invoice.faceValue ? invoice.outstanding : invoice.faceValue;
        if (collateralApplied > brand.collateral) collateralApplied = brand.collateral;
        brand.collateral -= collateralApplied;
        brand.reservedCollateral -= invoice.faceValue;
        brand.status = BrandStatus.Frozen;
        invoice.outstanding -= collateralApplied;
        invoice.status = InvoiceStatus.Defaulted;

        uint256 fee = _fee(collateralApplied);
        uint256 netAmount = collateralApplied - fee;
        address recipient = ownerOf(invoice.tokenId);
        if (fee != 0) usdt.safeTransfer(feeRecipient, fee);
        if (netAmount != 0) usdt.safeTransfer(recipient, netAmount);
        emit DefaultProcessed(invoiceId, collateralApplied, fee, netAmount, invoice.outstanding);
    }

    function recoverDefault(bytes32 invoiceId, uint256 amount) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        Brand storage brand = brands[invoice.brandId];
        if (
            invoice.status != InvoiceStatus.Defaulted
                || (msg.sender != brand.owner && !authorizedSigner[invoice.brandId][msg.sender])
        ) {
            revert Unauthorized();
        }
        if (amount == 0 || amount > invoice.outstanding) revert InvalidAmount();
        _pullExact(msg.sender, amount);
        invoice.paidGross += amount;
        invoice.outstanding -= amount;
        address recipient = ownerOf(invoice.tokenId);
        uint256 fee = _fee(amount);
        uint256 netAmount = amount - fee;
        if (fee != 0) usdt.safeTransfer(feeRecipient, fee);
        if (netAmount != 0) usdt.safeTransfer(recipient, netAmount);
        emit DefaultRecovery(invoiceId, msg.sender, recipient, amount, fee, netAmount, invoice.outstanding);
    }

    function isLate(bytes32 invoiceId) external view returns (bool) {
        Invoice storage invoice = invoices[invoiceId];
        return invoice.status == InvoiceStatus.Funded && block.timestamp > invoice.dueDate;
    }

    function _withdrawOffer(uint256 offerId, Offer storage offer) private {
        offer.status = OfferStatus.Withdrawn;
        invoices[offer.invoiceId].activeOffers -= 1;
        usdt.safeTransfer(offer.investor, offer.price);
        emit OfferWithdrawn(offerId, offer.investor);
    }

    function _pullExact(address from, uint256 amount) private {
        uint256 beforeBalance = usdt.balanceOf(address(this));
        usdt.safeTransferFrom(from, address(this), amount);
        // Reject fee-on-transfer/rebasing behavior; settlement accounting requires exact USDT units.
        // forge-lint: disable-next-line(incorrect-strict-equality)
        if (usdt.balanceOf(address(this)) - beforeBalance != amount) revert InexactTokenTransfer();
    }

    function _fee(uint256 amount) private view returns (uint256) {
        return amount * feeBps / BPS;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            if (paused()) revert TransferPaused();
            if (!isInvestor[to]) revert InvestorNotAllowed(to);
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControlDefaultAdminRules)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
