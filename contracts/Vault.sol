// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "./interfaces/IVault.sol";
import "./interfaces/IController.sol";
import "./interfaces/IStrategy.sol";

/**
 * @notice Yearn style vault which earns yield for a specific token.
 *
 * Vaults are capital pools of one single token which seaks yield from the market.
 * A vault manages multiple strategies and at most one strategy is active at a time.
 */
contract Vault is ERC20Upgradeable, IVault {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    IERC20Upgradeable public override want;
    address public override controller;
    address public override strategist;
    mapping(address => bool) public override approvedStrategies;
    address public override activeStrategy;
    bool public override emergencyMode;
    /**
     * Add a lock to each address so that it could not perform deposit, withdraw, or transfer in the same block.
     * Borrows ideas from Badger Sett.
     * https://github.com/Badger-Finance/badger-system/blob/master/contracts/badger-sett/Sett.sol
     */
    mapping(address => uint256) public lockBlocks;

    uint256[50] private __gap;

    event StrategistUpdated(address indexed oldStrategist, address indexed newStrategist);
    event StrategyUpdated(address indexed strategy, bool indexed approved);
    event ActiveStrategyUpdated(address indexed oldStrategy, address indexed newStrategy);
    event EmergencyModeUpdated(bool indexed active);
    event Deposited(address indexed user, address indexed token, uint256 amount, uint256 shareAmount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount, uint256 shareAmount);

    /**
     * @dev Initializes the Vault contract. Can be called only once.
     * @param _want The token that the vault pools to seak return.
     * @param _controller The Controller contract that manages the vaults.
     * @param _nameOverride Provides a custom vault token name. Use default if empty.
     * @param _symbolOverride Provides a custom vault token symbol. Use default if empty.
     */
    function initialize(address _want, address _controller, string memory _nameOverride, string memory _symbolOverride) public initializer {
        require(_want != address(0x0), "want not set");
        require(_controller != address(0x0), "controller not set");

        want = IERC20Upgradeable(_want);
        controller = _controller;
        strategist = msg.sender;

        ERC20Upgradeable token = ERC20Upgradeable(_want);
        string memory name;
        string memory symbol;
        if (bytes(_nameOverride).length > 0) {
            name = _nameOverride;
        } else {
            name = string(abi.encodePacked("ACoconut ", token.name()));
        }
        if (bytes(_symbolOverride).length > 0) {
            symbol = _symbolOverride;
        } else {
            symbol = string(abi.encodePacked("ac", token.symbol()));
        }
        __ERC20_init(name, symbol);
        // The vault should have the same decimals as the want token.
        _setupDecimals(token.decimals());
    }

    /**
     * @dev Returns the governance of the vault.
     * Note that Controller and all vaults share the same governance, so this is
     * a shortcut to return Controller.governance().
     */
    function governance() public view override returns (address) {
        return IController(controller).governance();
    }

    modifier onlyGovernance() {
        require(msg.sender == governance(), "not governance");
        _;
    }

    modifier onlyStrategist() {
        require(msg.sender == governance() || msg.sender == strategist, "not strategist");
        _;
    }

    modifier notEmergencyMode() {
        require(!emergencyMode, "emergency mode");
        _;
    }

    /**
     * @dev Checks whether the current block is locked for this address.
     * A block is locked for an address if it performs deposit, withdraw or transfer in this block.
     */
    modifier blockUnlocked() {
        require(lockBlocks[msg.sender] < block.number, "block locked");
        _;
    }

    function _updateLockBlock() internal {
        lockBlocks[msg.sender] = block.number;
    }

    /**
     * @dev Returns the total balance in both vault and strategy.
     */
    function balance() public view returns (uint256) {
        return activeStrategy == address(0x0) ? want.balanceOf(address(this)) :
            want.balanceOf(address(this)).add(IStrategy(activeStrategy).balanceOf());
    }

    /**
     * @dev Updates the strategist address. Only governance can update strategist.
     * Each vault has its own strategist to perform daily permissioned opertions.
     * Vault and its strategies managed share the same strategist.
     */
    function setStrategist(address _strategist) public onlyGovernance {
        address oldStrategist = strategist;
        strategist = _strategist;
        emit StrategistUpdated(oldStrategist, _strategist);
    }

    /**
     * @dev Updates the emergency mode. Only governance or strategist can update emergency mode.
     */
    function setEmergencyMode(bool _active) public onlyGovernance {
        emergencyMode = _active;
        emit EmergencyModeUpdated(_active);
    }

    /**
     * @dev Approves or revokes strategy. Only governance can approve or revoke strategies.
     * Note that this does not affect the current active strategy and it takes effect only
     * on the next time an active strategy is selected.
     * @param _strategy Strategy to approve or revoke.
     * @param _approved If true, the strategy can be selected as active strategy.
     */
    function setStrategy(address _strategy, bool _approved) public onlyGovernance {
        approvedStrategies[_strategy] = _approved;
        emit StrategyUpdated(_strategy, _approved);
    }

    /**
     * @dev Updates the active strategy of the vault. Only strategist can update the active strategy.
     * Only approved strategy can be selected as active strategy.
     * No new strategy is accepted in emergency mode.
     */
    function setActiveStrategy(address _strategy) public onlyStrategist notEmergencyMode {
        // The new active strategy can be zero address, which means withhold all assets in the vault.
        // Otherwise, the new strategy must be approved by governance before hand.
        require(_strategy == address(0x0) || approvedStrategies[_strategy], "strategy not approved");
        address oldStrategy = activeStrategy;
        require(oldStrategy != _strategy, "same strategy");

        // If the vault has an existing strategy, withdraw all assets from it.
        if (oldStrategy != address(0x0)) {
            IStrategy(oldStrategy).withdrawAll();
        }

        activeStrategy = _strategy;
        // Starts earning once a new strategy is set.
        earn();
        emit ActiveStrategyUpdated(oldStrategy, _strategy);
    }

    /**
     * @dev Starts earning and deposits all current balance into strategy.
     * Only strategist or governance can call this function.
     */
    function earn() public onlyStrategist notEmergencyMode {
        if (activeStrategy == address(0x0)) return;
        uint256 _bal = want.balanceOf(address(this));
        want.safeTransfer(activeStrategy, _bal);
        IStrategy(activeStrategy).deposit();
    }

    /**
     * @dev Harvest yield from the strategy if set.
     * Only strategist or governance can call this function.
     */
    function harvest() public onlyStrategist {
        require(activeStrategy != address(0x0), "no strategy");
        IStrategy(activeStrategy).harvest();
    }

    /**
     * @dev Deposit some balance to the vault.
     */
    function deposit(uint256 _amount) public virtual notEmergencyMode blockUnlocked {
        require(_amount > 0, "zero amount");
        // If MAX is provided, deposits all balance.
        if (_amount == uint256(-1)) {
            _amount = want.balanceOf(msg.sender);
        }

        uint256 _pool = balance();
        uint256 _before = want.balanceOf(address(this));
        want.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _after = want.balanceOf(address(this));
        _amount = _after.sub(_before); // Additional check for deflationary tokens
        uint256 shares = 0;
        if (totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount.mul(totalSupply())).div(_pool);
        }
        _mint(msg.sender, shares);
        _updateLockBlock();

        emit Deposited(msg.sender, address(want), _amount, shares);
    }

    /**
     * @dev Withdraws some balance out of the vault.
     */
    function withdraw(uint256 _shares) public virtual blockUnlocked {
        require(_shares > 0, "zero amount");
        // If MAX is provided, withdraws all shares.
        if (_shares == uint256(-1)) {
            _shares = balanceOf(msg.sender);
        }
        uint256 r = (balance().mul(_shares)).div(totalSupply());
        _burn(msg.sender, _shares);

        // Check balance
        uint256 b = want.balanceOf(address(this));
        if (b < r) {
            uint256 _withdraw = r.sub(b);
            // Ideally this should not happen. Put here for extra safety.
            require(activeStrategy != address(0x0), "no strategy");
            IStrategy(activeStrategy).withdraw(_withdraw);
            uint256 _after = want.balanceOf(address(this));
            uint256 _diff = _after.sub(b);
            if (_diff < _withdraw) {
                r = b.add(_diff);
            }
        }

        want.safeTransfer(msg.sender, r);
        _updateLockBlock();
        emit Withdrawn(msg.sender, address(want), r, _shares);
    }

    /**
     * @dev Add lock to transfer so that it can not happen in the same block as deposit and withdraw.
     */
    function transfer(address recipient, uint256 amount) public virtual override blockUnlocked returns (bool) {
        _updateLockBlock();
        return super.transfer(recipient, amount);
    }

    /**
     * @dev Add lock to transfer so that it can not happen in the same block as deposit and withdraw.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override blockUnlocked returns (bool) {
        _updateLockBlock();
        return super.transferFrom(sender, recipient, amount);
    }

    /**
     * @dev Used to salvage any ETH deposited into the vault by mistake.
     */
    function salvage() public onlyStrategist {
        uint256 amount = address(this).balance;
        address payable target = payable(governance());
        target.transfer(amount);
    }

    /**
     * @dev Used to salvage any token deposited into the vault by mistake.
     * @param _tokenAddress Token address to salvage.
     */
    function salvageToken(address _tokenAddress) public onlyStrategist {
        require(_tokenAddress != address(want), "cannot salvage");

        IERC20Upgradeable token = IERC20Upgradeable(_tokenAddress);
        token.safeTransfer(governance(), token.balanceOf(address(this)));
    }

    /**
     * @dev Returns the number of vault token per share is worth.
     */
    function getPricePerFullShare() public view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return balance().mul(1e18).div(totalSupply());
    }

    function notifyRewardAmount(uint256 _rewardAmount) public virtual override {}
}
