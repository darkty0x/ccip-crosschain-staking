// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./base/CrossChainReceiver.sol";
import "./base/ERC4626Vault.sol";

/// @title StakeAcrossVaultProtocol
/// @notice This contract is used to stake tokens on one chain and receive them on another chain.
/// @dev This contract inherits from CrossChainReceiver and ERC4626Vault

contract StakeAcrossVaultProtocol is CrossChainReceiver, ERC4626Vault {
    /// @dev Initializes the StakeAcrossVaultProtocol contract
    /// @param _router  the  CCIP router address
    /// @param _link the address of the LINK token
    /// @param _asset  the token that is deposited into the vault
    constructor(
        address _router,
        address _link,
        IERC20 _asset
    ) CrossChainReceiver(_router, _link) ERC4626Vault(_asset) {
        // Additional initializations if necessary
    }

    /// @dev The function receives the message from the CCIP router and executes the deposit logic.
    /// @dev Overrides _ccipReceive() from CrossChainReceiver contract
    /// @param any2EvmMessage  the message received from the CCIP router
    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    ) internal override {
        address depositor = abi.decode(any2EvmMessage.data, (address)); // abi-decoding of the depositor's address
        uint256 amount = any2EvmMessage.destTokenAmounts[0].amount;
        // First, execute the original logic from StakeAcrossProtocol's _ccipReceive()
        super._ccipReceive(any2EvmMessage);
        // Then, execute the deposit logic from Vault contract (deposit(receivedAmount, receiver) function)
        // The function calculates and sends an equivalent amount of shares based on the deposited assets
        deposit(amount, depositor);
    }

    /// @dev The function calculates and returns the equivalent amount of assets based on the burned shares.
    /// @param shares  the amount of shares to be burned
    /// @param destinationChain  the chain where the assets will be sent
    /// @param receiver  the address that will receive the assets
    function ccipRedeem(
        uint256 shares,
        uint64 destinationChain,
        address receiver
    ) public {
        // redeem shares for assets. Burn the shares
        uint256 assets = redeem(shares, receiver, _msgSender());
        // transfer assets back to the user in the sender chain (Fuji)
        sendMessage(destinationChain, receiver, asset(), assets);
    }

    /// @dev The function calculates and returns the equivalent amount of assets based on the withdrawn assets.
    /// @param assets  the amount of assets to be withdrawn
    /// @param destinationChain  the chain where the assets will be sent
    /// @param receiver  the address that will receive the assets
    function ccipWithdraw(
        uint256 assets,
        uint64 destinationChain,
        address receiver
    ) public {
        // withdraw assets from the vault. Calculate shares to be burned
        withdraw(assets, receiver, _msgSender());
        // transfer assets back to the user in the sender chain (Fuji)
        sendMessage(destinationChain, receiver, asset(), assets);
    }

    // === Strategy logic Override ===

    /// @dev Simulates the profit obtained from a strategy. Adds 10% interest to deposited assets.
    /// @param assets the amount of assets deposited
    function _afterDeposit(uint256 assets) internal override {
        // calculate 10% interest from assets
        uint256 interest = (assets * 10) / 100;
        // check allowance of this contract to transfer interest amount of _asset from owner
        require(
            IERC20(asset()).allowance(owner(), address(this)) >= interest,
            "ERC4626Vault: Not enough allowance"
        );
        // transfer interest amout of _asset to this contract from owner
        SafeERC20.safeTransferFrom(
            IERC20(asset()),
            owner(),
            address(this),
            interest
        );
    }
}
