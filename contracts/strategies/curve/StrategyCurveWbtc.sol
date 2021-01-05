// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../StrategyBase.sol";
import "../../interfaces/IVault.sol";
import "../../interfaces/IController.sol";
import "../../interfaces/curve/ICurveFi.sol";
import "../../interfaces/curve/ICurveGauge.sol";

/**
 * @dev Strategy for WBTC on Curve.
 */
abstract contract StrategyCurveWbtc is StrategyBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event SlippageUpdated(uint256 oldSlippage, uint256 newSlippage);

    // Pool parameters
    address public lpVault;
    address public curve;
    uint256 public slippage = 100;  // 1% max slippage

    constructor(address _vault, address _lpVault, address _curve) StrategyBase(_vault) public {
        require(_lpVault != address(0x0), "LP vault not set");
        require(_curve != address(0x0), "curve not set");
        lpVault = _lpVault;
        curve = _curve;
    }

    function deposit() public override {
        IERC20Upgradeable want = IERC20Upgradeable(token());
        uint256 _want = want.balanceOf(address(this));
        if (_want > 0) {
            want.safeApprove(curve, 0);
            want.safeApprove(curve, _want);
            uint256 v = _want.mul(1e30).div(ICurveFi(curve).get_virtual_price());
            ICurveFi(curve).add_liquidity([0, _want], v.mul(PERCENT_MAX.sub(slippage)).div(PERCENT_MAX));
        }

        IERC20Upgradeable lp = IERC20Upgradeable(IVault(lpVault).token());
        uint256 _lp = lp.balanceOf(address(this));
        if (_lp > 0) {
            lp.safeApprove(lpVault, 0);
            lp.safeApprove(lpVault, _lp);
            IVault(lpVault).deposit(_lp);
        }
    }

    /**
     * @dev Withdraw partial funds, normally used with a vault withdrawal
     */
    function withdraw(uint256 _amount) public override {
        require(msg.sender == vault, "not vault");
        IERC20Upgradeable want = IERC20Upgradeable(token());
        uint256 _balance = want.balanceOf(address(this));
        if (_balance < _amount) {
            _amount = _withdrawSome(_amount.sub(_balance));
            _amount = _amount.add(_balance);
        }
        if (withdrawalFee > 0) {
            uint256 _feeAmount = _amount.mul(withdrawalFee).div(PERCENT_MAX);
            want.safeTransfer(IController(controller()).treasury(), _feeAmount);
            _amount = _amount.sub(_feeAmount);
        }

        want.safeTransfer(vault, _amount);
    }

    function _withdrawSome(uint256 _amount) internal returns (uint256) {
        IERC20Upgradeable lp = IERC20Upgradeable(IVault(lpVault).token());
        uint256 _lp = _amount.mul(1e30).div(ICurveFi(curve).get_virtual_price());
        uint256 _lpVault = _lp.mul(1e18).div(IVault(lpVault).getPricePerFullShare());
        uint256 _lpBefore = lp.balanceOf(address(this));
        IVault(lpVault).withdraw(_lpVault);
        uint256 _lpAfter = lp.balanceOf(address(this));
        return _withdrawOne(_lpAfter.sub(_lpBefore));
    }

    function _withdrawOne(uint256 _lp) internal returns (uint256) {
        IERC20Upgradeable want = IERC20Upgradeable(token());
        uint256 _before = want.balanceOf(address(this));

        IERC20Upgradeable lp = IERC20Upgradeable(IVault(lpVault).token());
        lp.safeApprove(curve, 0);
        lp.safeApprove(curve, _lp);
        ICurveFi(curve).remove_liquidity_one_coin(_lp, 1, _lp.mul(PERCENT_MAX.sub(slippage)).div(PERCENT_MAX).div(1e12));
        uint256 _after = want.balanceOf(address(this));

        return _after.sub(_before);
    }

    /**
     * @dev Withdraw all funds, normally used when migrating strategies
     * No withdrawal fee is charged when withdrawing all assets.
     */
    function withdrawAll() public override returns (uint256 balance) {
        require(msg.sender == vault, "not vault");

        uint256 _lpVault = IERC20Upgradeable(lpVault).balanceOf(address(this));
        if (_lpVault > 0) {
            IVault(lpVault).withdraw(_lpVault);
            _withdrawOne(IERC20Upgradeable(IVault(lpVault).token()).balanceOf(address(this)));
        }
    }

    function balanceOfWant() public view returns (uint256) {
        return IERC20Upgradeable(token()).balanceOf(address(this));
    }

    function balanceOfLp() public view returns (uint256) {
        return IERC20Upgradeable(IVault(lpVault).token()).balanceOf(address(this));
    }

    function balanceOfLpInWant() public view returns (uint256) {
        return balanceOfLp().mul(ICurveFi(curve).get_virtual_price()).div(1e30);
    }

    function balanceOfLpVault() public view returns (uint256) {
        return IERC20Upgradeable(lpVault).balanceOf(address(this));
    }

    function balanceOfLpVaultInLp() public view returns (uint256) {
        return balanceOfLpVault().mul(IVault(lpVault).getPricePerFullShare()).div(1e18);
    }

    function balanceOfLpVaultInWant() public view returns (uint256) {
        return balanceOfLpVaultInLp().mul(ICurveFi(curve).get_virtual_price()).div(1e30);
    }

    function balanceOf() public view override returns (uint256) {
        return balanceOfWant().add(balanceOfLpVaultInWant());
    }

    function setSlippage(uint256 _slippage) public onlyStrategist {
        require(_slippage <= PERCENT_MAX, "overflow");
        uint256 oldSlippage = slippage;
        slippage = _slippage;

        emit SlippageUpdated(oldSlippage, _slippage);
    }
}