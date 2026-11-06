// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {CreatorAdvance} from "../src/CreatorAdvance.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface VmDeploy {
    function envAddress(string calldata name) external returns (address);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Deploy CreatorAdvance only to the sponsor's Whitechain Sepolia testnet.
/// @dev No transaction is sent unless a caller explicitly runs this script with --broadcast.
contract DeployWhitechainSepolia {
    VmDeploy private constant vm = VmDeploy(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant WHITECHAIN_SEPOLIA_CHAIN_ID = 1874;
    address private constant ORGANIZER_USDT = 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7;

    error WrongChain(uint256 actualChainId);
    error WrongToken(address configuredToken);
    error InvalidAddress();
    error InvalidUsdtMetadata();

    function run() external returns (CreatorAdvance deployed) {
        if (block.chainid != WHITECHAIN_SEPOLIA_CHAIN_ID) revert WrongChain(block.chainid);

        address usdt = vm.envAddress("USDT_ADDRESS");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        address admin = vm.envAddress("ADMIN");
        if (usdt != ORGANIZER_USDT) revert WrongToken(usdt);
        if (feeRecipient == address(0) || admin == address(0)) revert InvalidAddress();
        if (usdt.code.length == 0) revert InvalidUsdtMetadata();

        (bool success, bytes memory result) = usdt.staticcall(abi.encodeWithSignature("decimals()"));
        if (!success || result.length < 32 || abi.decode(result, (uint8)) != 6) revert InvalidUsdtMetadata();

        vm.startBroadcast();
        deployed = new CreatorAdvance(IERC20(usdt), feeRecipient, admin);
        vm.stopBroadcast();

        if (address(deployed).code.length == 0) revert InvalidUsdtMetadata();
    }
}
