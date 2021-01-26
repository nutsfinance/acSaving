// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../strategies/StrategyBase.sol";
import "./MockToken.sol";

/**
 * @notice Mock Strategy.
 */
contract MockStrategy is StrategyBase {

    constructor(address _vault) public {
        vault = _vault;
    }

    /**
     * @dev Returns the total balance of want token in this Strategy.
     */
    function balanceOf() public override view returns (uint256) {
        return MockToken(token()).balanceOf(address(this));
    }

    /**
     * @dev Invests the free token balance in the strategy.
     */
    function deposit() public override {}

    /**
     * @dev Withdraws a portional amount of assets from the Strategy.
     */
    function withdraw(uint256 _amount) public override {
        MockToken(token()).transfer(vault, _amount);
    }

    /**
     * @dev Withdraws all assets out of the Strategy.  Usually used in strategy migration.
     */
    function withdrawAll() public override returns (uint256) {
        uint256 balance = balanceOf();
        MockToken(token()).transfer(vault, balance);

        return balance;
    }

    /**
     * @dev Harvest yield from the market.
     */
    function harvest() public override {
        // Mint 20% token to simulate 20% yield.
        MockToken(token()).mint(address(this), balanceOf() * 20 / 100);
    }

    /**
     * @dev Return the list of tokens that should not be salvaged.
     */
    function _getProtectedTokens() internal override view returns (address[] memory) {
        address[] memory protectedTokens = new address[](1);
        protectedTokens[0] = token();
        return protectedTokens;
    }
}