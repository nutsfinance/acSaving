// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @notice Interface of Vault contract.
 * 
 * Vaults are capital pools of one single token which seaks yield from the market.
 * A vault manages multiple strategies and at most one strategy is active at a time.
 */
interface IVault {

    function want() external view returns (address);

    function notifyRewardAmount(uint256 _rewardAmount) external;
}