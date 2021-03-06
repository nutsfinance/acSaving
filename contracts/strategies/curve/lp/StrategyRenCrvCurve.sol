// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../StrategyLpCurveBase.sol";
import "../../../interfaces/IVault.sol";
import "../../../interfaces/curve/ICurveFi.sol";
import "../../../interfaces/curve/ICurveMinter.sol";
import "../../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Earning strategy that accepts renCRV, earns CRV and converts CRV back to renCRV as yield.
 */
contract StrategyRenCrvCurve is StrategyLpCurveBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    // Pool parameters
    address public constant RENCRV_GAUGE = address(0xB1F2cdeC61db658F091671F5f199635aEF202CAC); // renCrv gauge
    address public constant REN_SWAP = address(0x93054188d876f558f4a66B2EF1d97d16eDf0895B); // REN swap

    /**
     * @dev Initializes the strategy.
     */
    function initialize(address _vault) public initializer {
        __StrategyLpCurveBase__init(_vault, RENCRV_GAUGE, REN_SWAP);
    }
    
    /**
     * @dev Claims CRV from Curve and convert it back to renCRV. Only vault, governance and strategist can harvest.
     */
    function harvest() public override authorized {
        uint256 sharePriceBefore = IVault(vault).getPricePerFullShare();
        // Claims CRV from Curve
        ICurveMinter(mintr).mint(gauge);
        uint256 _crv = IERC20Upgradeable(crv).balanceOf(address(this));

        // Uniswap: CRV --> WETH --> WBTC
        if (_crv > 0) {
            IERC20Upgradeable(crv).safeApprove(uniswap, 0);
            IERC20Upgradeable(crv).safeApprove(uniswap, _crv);

            address[] memory path = new address[](3);
            path[0] = crv;
            path[1] = weth;
            path[2] = wbtc;

            IUniswapRouter(uniswap).swapExactTokensForTokens(_crv, uint256(0), path, address(this), now.add(1800));
        }
        // Curve: WBTC --> renCRV
        uint256 _wbtc = IERC20Upgradeable(wbtc).balanceOf(address(this));
        if (_wbtc > 0) {
            IERC20Upgradeable(wbtc).safeApprove(curve, 0);
            IERC20Upgradeable(wbtc).safeApprove(curve, _wbtc);
            ICurveFi(curve).add_liquidity([0, _wbtc], 0);
        }
        IERC20Upgradeable want = IERC20Upgradeable(token());
        uint256 _want = want.balanceOf(address(this));
        if (_want == 0) {
            return;
        }
        uint256 _feeAmount = 0;
        if (performanceFee > 0) {
            _feeAmount = _want.mul(performanceFee).div(PERCENT_MAX);
            want.safeTransfer(IController(controller()).treasury(), _feeAmount);
        }
        deposit();

        uint256 sharePriceAfter = IVault(vault).getPricePerFullShare();
        emit Harvested(address(want), _want, _feeAmount, sharePriceBefore, sharePriceAfter);
    }
}