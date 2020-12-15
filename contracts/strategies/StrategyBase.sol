// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

import "../interfaces/IVault.sol";
import "../interfaces/IStrategy.sol";

/**
 * @notice Base contract of Strategy.
 * 
 * This contact defines common properties and functions shared by all strategies.
 */
abstract contract StrategyBase is IStrategy, Initializable {

    address public override vault;
    address public override controller;

    function __StrategyBase__init(address _controller, address _vault) internal initializer {
        require(_vault != address(0x0), "vault not set");
        require(_controller != address(0x0), "controller not set");

        vault = _vault;
        controller = _controller;
    }

    /**
     * @dev Returns the token that the vault pools to seek yield.
     * Should be the same as Vault.want().
     */
    function want() public override view returns (address) {
        return IVault(vault).want();
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
}