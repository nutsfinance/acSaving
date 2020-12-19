// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

import "../interfaces/IVault.sol";
import "../interfaces/IStrategy.sol";

/**
 * @notice Base contract of Strategy.
 * 
 * This contact defines common properties and functions shared by all strategies.
 * One strategy is bound to one vault and cannot be changed.
 */
abstract contract StrategyBase is IStrategy, Initializable {

    event PerformanceFeeUpdated(uint256 oldPerformanceFee, uint256 newPerformanceFee);
    event WithdrawalFeeUpdated(uint256 oldWithdrawFee, uint256 newWithdrawFee);

    address public override vault;
    uint256 public override performanceFee;
    uint256 public override withdrawalFee;
    uint256 public constant FEE_MAX = 10000;    // 0.01%

    function __StrategyBase__init(address _vault) internal initializer {
        require(_vault != address(0x0), "vault not set");

        vault = _vault;
    }

    /**
     * @dev Returns the token that the vault pools to seek yield.
     * Should be the same as Vault.want().
     */
    function want() public override view returns (address) {
        return IVault(vault).want();
    }

    /**
     * @dev Returns the Controller that manages the vault.
     * Should be the same as Vault.controler().
     */
    function controller() public override view returns (address) {
        return IVault(vault).controller();
    }

    /**
     * @dev Returns the governance of the Strategy.
     * Controller and its underlying vaults and strategies should share the same governance.
     */
    function governance() public override view returns (address) {
        return IVault(vault).governance();
    }

    /**
     * @dev Return the strategist which performs daily permissioned operations.
     * Vault and its underlying strategies should share the same strategist.
     */
    function strategist() public override view returns (address) {
        return IVault(vault).strategist();
    }

    modifier onlyGovernance() {
        require(msg.sender == governance(), "not governance");
        _;
    }

    modifier onlyStrategist() {
        require(msg.sender == governance() || msg.sender == strategist(), "not strategist");
        _;
    }

    /**
     * @dev Updates the performance fee. Only governance can update the performance fee.
     */
    function setPerformanceFee(uint256 _performanceFee) public onlyGovernance {
        require(_performanceFee <= FEE_MAX, "overflow");
        uint256 oldPerformanceFee = performanceFee;
        performanceFee = _performanceFee;

        emit PerformanceFeeUpdated(oldPerformanceFee, _performanceFee);
    }

    /**
     * @dev Updates the withdrawal fee. Only governance can update the withdrawal fee.
     */
    function setWithdrawalFee(uint256 _withdrawalFee) public onlyGovernance {
        require(_withdrawalFee <= FEE_MAX, "overflow");
        uint256 oldWithdrawalFee = withdrawalFee;
        withdrawalFee = _withdrawalFee;

        emit WithdrawalFeeUpdated(oldWithdrawalFee, _withdrawalFee);
    }
}