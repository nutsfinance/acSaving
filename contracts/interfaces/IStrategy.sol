// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @notice Interface of Strategy contract.
 * 
 * One strategy can only and always serve one vault. It shares the same
 * governance and strategist with the vault which manages this strategy.
 */
interface IStrategy {

    /**
     * @dev Returns the vault that uses the strategy.
     */
    function vault() external view returns (address);

    /**
     * @dev Returns the Controller that manages the vault.
     * Should be the same as Vault.controler().
     */
    function controller() external view returns (address);

    /**
     * @dev Returns the token that the vault pools to seek yield.
     * Should be the same as Vault.want().
     */
    function want() external view returns (address);

    /**
     * @dev Returns the governance of the Strategy.
     * Controller and its underlying vaults and strategies should share the same governance.
     */
    function governance() external view returns (address);

    /**
     * @dev Return the strategist which performs daily permissioned operations.
     * Vault and its underlying strategies should share the same strategist.
     */
    function strategist() external view returns (address);

    function balanceOf() external view returns (uint256);

    function deposit() external;

    function withdraw(uint256 _shares) external;

    function withdrawAll() external;

    function harvest() external;
}
