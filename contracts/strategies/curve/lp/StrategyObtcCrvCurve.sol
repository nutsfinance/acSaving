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
import "../../../interfaces/curve/ICurveGauge.sol";
import "../../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Earning strategy that accepts obtcCrv, earns CRV and converts CRV back to obtcCrv as yield.
 */
contract StrategyObtcCrvCurve is StrategyLpCurveBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    // Pool parameters
    address public constant OBTCCRV_GAUGE = address(0x11137B10C210b579405c21A07489e28F3c040AB1); // obtcCrv gauge
    address public constant OBTC_DEPOSIT = address(0xd5BCf53e2C81e1991570f33Fa881c49EEa570C8D); // OBTC deposit
    
    address public constant bor = address(0x3c9d6c1C73b31c837832c72E04D3152f051fc1A9); 

    /**
     * @dev Initializes the strategy.
     */
    function initialize(address _vault) public initializer {
        __StrategyLpCurveBase__init(_vault, OBTCCRV_GAUGE, OBTC_DEPOSIT);
    }
    
    /**
     * @dev Claims CRV from Curve and convert it back to renCRV. Only vault, governance and strategist can harvest.
     */
    function harvest() public override authorized {
        uint256 sharePriceBefore = IVault(vault).getPricePerFullShare();
        // Step 1: Claims CRV from Curve
        ICurveMinter(mintr).mint(gauge);
        uint256 _crv = IERC20Upgradeable(crv).balanceOf(address(this));

        // Step 2: Sushiswap CRV --> WETH --> WBTC
        if (_crv > 0) {
            IERC20Upgradeable(crv).safeApprove(sushiswap, 0);
            IERC20Upgradeable(crv).safeApprove(sushiswap, _crv);

            address[] memory path = new address[](3);
            path[0] = crv;
            path[1] = weth;
            path[2] = wbtc;

            IUniswapRouter(sushiswap).swapExactTokensForTokens(_crv, uint256(0), path, address(this), now.add(1800));
        }

        // Step 3: Claims BOR rewards
        ICurveGauge(gauge).claim_rewards();
        uint256 _bor = IERC20Upgradeable(bor).balanceOf(address(this));

        // Step 4: Sushiswap BOR --> WETH --> WBTC
        if (_bor > 0) {
            IERC20Upgradeable(bor).safeApprove(sushiswap, 0);
            IERC20Upgradeable(bor).safeApprove(sushiswap, _bor);

            address[] memory path = new address[](3);
            path[0] = bor;
            path[1] = weth;
            path[2] = wbtc;

            IUniswapRouter(sushiswap).swapExactTokensForTokens(_bor, uint256(0), path, address(this), now.add(1800));
        }

        // Step 5: Curve WBTC --> obtcCrv
        uint256 _wbtc = IERC20Upgradeable(wbtc).balanceOf(address(this));
        if (_wbtc > 0) {
            IERC20Upgradeable(wbtc).safeApprove(curve, 0);
            IERC20Upgradeable(wbtc).safeApprove(curve, _wbtc);
            ICurveFi(curve).add_liquidity([0, 0, _wbtc, 0], 0);
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