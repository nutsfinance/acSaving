// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @notice Interface for Curve.fi's REN pool.
 * Note that we are using array of 2 as Curve's REN pool contains only WBTC and renBTC.
 */
interface ICurveFi {
    function get_virtual_price() external view returns (uint256);

    // ren pool/hbtc pool
    function add_liquidity(
        uint256[2] calldata amounts,
        uint256 min_mint_amount
    ) external;

    function remove_liquidity_imbalance(uint256[2] calldata amounts, uint256 max_burn_amount) external;

    function remove_liquidity(uint256 _amount, uint256[2] calldata amounts) external;

    // obtc pool
    function add_liquidity(
        uint256[4] calldata amounts,
        uint256 min_mint_amount
    ) external;

    function remove_liquidity_imbalance(uint256[4] calldata amounts, uint256 max_burn_amount) external;

    function remove_liquidity(uint256 _amount, uint256[4] calldata amounts) external;

    function exchange(
        int128 from,
        int128 to,
        uint256 _from_amount,
        uint256 _min_to_amount
    ) external;
}