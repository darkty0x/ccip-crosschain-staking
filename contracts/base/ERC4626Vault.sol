// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
// to avoid problems with ownership functions in derived contracts OwnerIsCreator from contracts-ccip is used
import {OwnerIsCreator} from "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";

/// @title ERC4626 Vault
/// @notice This contract is a Vault according to the ERC4626 standard
/// @dev This contract inherits from ERC4626 and ERC20 (OpenZeppelin)
/// @dev ERC4626 vault with entry/exit fees expressed in https://en.wikipedia.org/wiki/Basis_point[basis point (bp)].
contract ERC4626Vault is ERC4626, OwnerIsCreator {
    using Math for uint256;
    // State variables for fees and recipients
    uint256 private constant _BASIS_POINT_SCALE = 1e4;
    uint256 private _entryFeeBasisPoints;
    uint256 private _exitFeeBasisPoints;
    address private _entryFeeRecipient;
    address private _exitFeeRecipient;

    /// @param _asset The underlying asset of the vault
    constructor(
        IERC20 _asset
    ) ERC4626(_asset) ERC20("Vault Stake Across", "vSTA") {
        _entryFeeBasisPoints = 0;
        _exitFeeBasisPoints = 0;
        _entryFeeRecipient = address(0);
        _exitFeeRecipient = address(0);
    }

    // === Overrides ===

    /// @dev Preview taking an entry fee on deposit. See {IERC4626-previewDeposit}.
    function previewDeposit(
        uint256 assets
    ) public view virtual override returns (uint256) {
        uint256 fee = _feeOnTotal(assets, _entryFeeBasisPoints);
        return super.previewDeposit(assets - fee);
    }

    /// @dev Preview adding an entry fee on mint. See {IERC4626-previewMint}.
    function previewMint(
        uint256 shares
    ) public view virtual override returns (uint256) {
        uint256 assets = super.previewMint(shares);
        return assets + _feeOnRaw(assets, _entryFeeBasisPoints);
    }

    /// @dev Preview adding an exit fee on withdraw. See {IERC4626-previewWithdraw}.
    function previewWithdraw(
        uint256 assets
    ) public view virtual override returns (uint256) {
        uint256 fee = _feeOnRaw(assets, _exitFeeBasisPoints);
        return super.previewWithdraw(assets + fee);
    }

    /// @dev Preview taking an exit fee on redeem. See {IERC4626-previewRedeem}.
    function previewRedeem(
        uint256 shares
    ) public view virtual override returns (uint256) {
        uint256 assets = super.previewRedeem(shares);
        return assets - _feeOnTotal(assets, _exitFeeBasisPoints);
    }

    /**
     * @dev Internal conversion function (from assets to shares) with support for rounding direction.
     * If totalSupply is 0, then minting will be done at a 1:1 ratio
     * In this override, when calulating the shares, the totalAssets is reduced by the assets
     * that is becaused the assets are already in the vault.
     * Assets are transferred to the vault through the CCIP transaction and the deposit function is called
     */
    function _convertToShares(
        uint256 assets,
        Math.Rounding rounding
    ) internal view virtual override returns (uint256 shares) {
        uint256 totalSupply = totalSupply();
        return
            (assets == 0 || totalSupply == 0)
                ? _initialConvertToShares(assets, rounding)
                : assets.mulDiv(
                    totalSupply,
                    (totalAssets() - assets),
                    rounding
                );
    }

    /**
     * @dev Send entry fee to {_entryFeeRecipient}. See {IERC4626-_deposit}.
     * The `safeTransferFrom` from `_asset` to this contract,
     * which is performed in `super._deposit`, does not need to be done
     * since the `_asset` is already transferred to the vault through
     * the CCIP transaction.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        uint256 fee = _feeOnTotal(assets, _entryFeeBasisPoints);
        address recipient = _entryFeeRecipient;

        _mint(receiver, shares);

        if (fee > 0 && recipient != address(this)) {
            SafeERC20.safeTransfer(IERC20(asset()), recipient, fee);
        }

        _afterDeposit(assets);

        emit Deposit(caller, receiver, assets, shares);
    }

    /// @dev Send exit fee to {_exitFeeRecipient}. See {IERC4626-_deposit}.
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        uint256 fee = _feeOnRaw(assets, _exitFeeBasisPoints);
        address recipient = _exitFeeRecipient;

        _beforeWithdraw(assets);

        _burn(owner, shares);

        if (fee > 0 && recipient != address(this)) {
            SafeERC20.safeTransfer(IERC20(asset()), recipient, fee);
        }

        emit Withdraw(caller, receiver, owner, assets, shares);
    }

    // === Fee configuration ===

    // Getter functions
    function entryFeeBasisPoints() public view virtual returns (uint256) {
        return _entryFeeBasisPoints;
    }

    function exitFeeBasisPoints() public view virtual returns (uint256) {
        return _exitFeeBasisPoints;
    }

    function entryFeeRecipient() public view virtual returns (address) {
        return _entryFeeRecipient;
    }

    function exitFeeRecipient() public view virtual returns (address) {
        return _exitFeeRecipient;
    }

    // Setter functions with onlyOwner modifier
    function setEntryFeeBasisPoints(
        uint256 feeBasisPoints
    ) public virtual onlyOwner {
        _entryFeeBasisPoints = feeBasisPoints;
    }

    function setExitFeeBasisPoints(
        uint256 feeBasisPoints
    ) public virtual onlyOwner {
        _exitFeeBasisPoints = feeBasisPoints;
    }

    function setEntryFeeRecipient(address recipient) public virtual onlyOwner {
        _entryFeeRecipient = recipient;
    }

    function setExitFeeRecipient(address recipient) public virtual onlyOwner {
        _exitFeeRecipient = recipient;
    }

    // === Fee operations ===

    /// @dev Calculates the fees that should be added to an amount `assets` that does not already include fees.
    /// Used in {IERC4626-mint} and {IERC4626-withdraw} operations.
    function _feeOnRaw(
        uint256 assets,
        uint256 feeBasisPoints
    ) private pure returns (uint256) {
        return
            assets.mulDiv(feeBasisPoints, _BASIS_POINT_SCALE, Math.Rounding.Up);
    }

    /// @dev Calculates the fee part of an amount `assets` that already includes fees.
    /// Used in {IERC4626-deposit} and {IERC4626-redeem} operations.
    function _feeOnTotal(
        uint256 assets,
        uint256 feeBasisPoints
    ) private pure returns (uint256) {
        return
            assets.mulDiv(
                feeBasisPoints,
                feeBasisPoints + _BASIS_POINT_SCALE,
                Math.Rounding.Up
            );
    }

    // === Strategy logic ===

    // This hooks are called by the vault after the deposit/withdraw operations
    // This is where the strategy logic could be implemented

    /// @param assets the amount of assets deposited
    function _afterDeposit(uint256 assets) internal virtual {}

    /// @param assets the amount of assets withdrawn
    function _beforeWithdraw(uint256 assets) internal virtual {}
}
