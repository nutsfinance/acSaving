// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @notice Interface of Strategy contract.
 * 
 * One strategy can only and always serve one vault. It shares the same
 * governance and strategist with the vault which manages this strategy.
 */
interface IStrategy {

    function vault() external view returns (address);

    function controller() external view returns (address);

    function want() external view returns (address);

    function governance() external view returns (address);

    function strategist() external view returns (address);

    function balanceOf() external view returns (uint256);

    function deposit() external;

    function withdraw(uint256 _shares) external;

    function withdrawAll() external;

    function harvest() external;
}
