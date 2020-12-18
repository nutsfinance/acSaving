// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../interfaces/IController.sol";
import "../interfaces/IAccount.sol";
import "../interfaces/IVault.sol";

contract SavingApplication is Initializable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event GovernanceUpdated(address indexed oldGovernance, address indexed newGovernance);
    event StrategistUpdated(address indexed oldStrategist, address indexed newStrategist);
    event ControllerUpdated(address indexed oldController, address indexed newController);
    event AutoAllocationUpdated(address indexed account, address indexed token, bool indexed allowed);
    event Staked(address indexed account, uint256 indexed vaultId, address token, uint256 amount);
    event Unstaked(address indexed account, uint256 indexed vaultId, address token, uint256 amount);
    event Claimed(address indexed account, uint256 indexed vaultId, address token, uint256 amount);
    event Exited(address indexed account, uint256 indexed vaultId);

    // Account ==> Token ==> Auto allocation 
    mapping(address => mapping(address => bool)) public autoAllocation;
    address public controller;
    address public governance;
    address public strategist;

    uint256[50] private __gap;

    function initialize(address _controller) public initializer {
        require(_controller != address(0x0), "controller not set");
        controller = _controller;
        governance = msg.sender;
        strategist = msg.sender;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "not governance");
        _;
    }

    modifier onlyStrategist() {
        require(msg.sender == governance || msg.sender == strategist, "not strategist");
        _;
    }

    /**
     * @dev Updates the govenance address.
     * Only governance can set a new governance. The governance can be renounced
     * by setting a zero address.
     */
    function setGovernance(address _governance) public onlyGovernance {
        address oldGovernance = governance;
        governance = _governance;
        emit GovernanceUpdated(oldGovernance, _governance);
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
     * @dev Updates the controller address.
     * Only governance can set a new controller.
     */
    function setController(address _controller) public onlyGovernance {
        require(_controller != address(0x0), "controller not set");
        address oldController = address(controller);
        controller = _controller;
        emit ControllerUpdated(oldController, _controller);
    }

    function setAutoAllocation(address _token, bool _allowed) public {
        autoAllocation[msg.sender][_token] = _allowed;
        emit AutoAllocationUpdated(msg.sender, _token, _allowed);
    }

    function _validateAccount(IAccount _account) internal view {
        require(_account.owner() == msg.sender, "not owner");
        require(_account.isOperator(address(this)), "not operator");
    }

    /**
     * @dev Stake token into rewarded vault.
     * @param _account The account address used to stake.
     * @param _vaultId ID of the vault to stake.
     * @param _amount Amount of token to stake.
     * @param _claimRewards Whether to claim rewards at the same time.
     */
    function stake(address _account, uint256 _vaultId, uint256 _amount, bool _claimRewards) external {
        IVault vault = IVault(IController(controller).vaults(_vaultId));
        require(address(vault) != address(0x0), "no vault");
        require(_amount > 0, "zero amount");

        IAccount account = IAccount(_account);
        _validateAccount(account);
        address token = vault.want();
        account.approveToken(token, address(vault), _amount);

        bytes memory methodData = abi.encodeWithSignature("deposit(uint256)", _amount);
        account.invoke(address(vault), 0, methodData);

        emit Staked(_account, _vaultId, token, _amount);

        if (_claimRewards) {
            claimRewards(_account, _vaultId);
        }
    }

    /**
     * @dev Unstake token out of RewardedVault.
     * @param _account The account address used to unstake.
     * @param _vaultId ID of the vault to unstake.
     * @param _amount Amount of token to unstake.
     * @param _claimRewards Whether to claim rewards at the same time.
     */
    function unstake(address _account, uint256 _vaultId, uint256 _amount, bool _claimRewards) external {
        IVault vault = IVault(IController(controller).vaults(_vaultId));
        require(address(vault) != address(0x0), "no vault");
        require(_amount > 0, "zero amount");

        IAccount account = IAccount(_account);
        _validateAccount(account);
        address token = IVault(vault).want();

        // Important: Need to convert token amount to vault share!
        uint256 totalBalance = vault.balance();
        uint256 totalSupply = IERC20Upgradeable(address(vault)).totalSupply();
        uint256 shares = _amount.mul(totalSupply).div(totalBalance);
        bytes memory methodData = abi.encodeWithSignature("withdraw(uint256)", shares);
        account.invoke(address(vault), 0, methodData);

        emit Unstaked(_account, _vaultId, token, _amount);

        if (_claimRewards) {
            claimRewards(_account, _vaultId);
        }
    }

    /**
     * @dev Exit the vault and claims all rewards.
     * @param _account The account address used to exit.
     * @param _vaultId ID of the vault to unstake.
     */
    function exit(address _account, uint256 _vaultId) external {
        IVault vault = IVault(IController(controller).vaults(_vaultId));
        require(address(vault) != address(0x0), "no vault");

        IAccount account = IAccount(_account);
        _validateAccount(account);

        bytes memory methodData = abi.encodeWithSignature("exit()");
        account.invoke(address(vault), 0, methodData);

        emit Exited(_account, _vaultId);
    }

    /**
     * @dev Claims rewards from RewardedVault.
     * @param _account The account address used to claim rewards.
     * @param _vaultId ID of the vault to unstake.
     */
    function claimRewards(address _account, uint256 _vaultId) public {
        IVault vault = IVault(IController(controller).vaults(_vaultId));
        require(address(vault) != address(0x0), "no vault");

        IAccount account = IAccount(_account);
        _validateAccount(account);
        address rewardToken = IController(controller).rewardToken();
        bytes memory methodData = abi.encodeWithSignature("claimReward()");
        bytes memory methodResult = account.invoke(address(vault), 0, methodData);
        uint256 claimAmount = abi.decode(methodResult, (uint256));

        emit Claimed(_account, _vaultId, rewardToken, claimAmount);
    }

    function autoStake(address[] memory _accounts, uint256 _vaultId) public onlyStrategist {
        IVault vault = IVault(IController(controller).vaults(_vaultId));
        require(address(vault) != address(0x0), "no vault");
        address token = vault.want();

        for (uint256 i = 0; i < _accounts.length; i++) {
            IAccount account = IAccount(_accounts[i]);
            require(account.isOperator(address(this)), "not operator");
            require(autoAllocation[_accounts[i]][token], "not allowed");

            uint256 amount = IERC20Upgradeable(token).balanceOf(_accounts[i]);
            account.approveToken(token, address(vault), amount);

            bytes memory methodData = abi.encodeWithSignature("deposit(uint256)", amount);
            account.invoke(address(vault), 0, methodData);

            emit Staked(_accounts[i], _vaultId, token, amount);

        }
    }
}