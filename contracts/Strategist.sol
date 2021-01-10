// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "./interfaces/IController.sol";
import "./interfaces/IVault.sol";
import "./interfaces/ISavingApplication.sol";

/**
 * @notice Strategist that perform permissioned work.
 *
 * Both saving application and individual vault have permissioned routine work, e.g.
 * harvest for each vault. Currently these permissioned routine work is performed by a single
 * role strategist.
 * The purpose of this contract is to act as the strategist so that multiple admins can cooperate
 * to complete the work.
 */
contract Strategist is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    mapping(address => bool) public admins;
    address public savingApplication;

    function initialize(address _savingApplication) public initializer {
        require(_savingApplication != address(0x0), "saving application not set");
        __Ownable_init();

        savingApplication = _savingApplication;
    }

    function setAdmin(address account, bool allowed) public onlyOwner {
        admins[account] = allowed;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner() || admins[msg.sender], "not admin");
        _;
    }

    /**
     * @dev Deposits into vault on behalf of the accounts provided. This can be only called by strategist.
     * @param _accounts Accounts to deposit token from.
     * @param _vaultId ID of the target vault.
     */
    function depositForAccounts(address[] memory _accounts, uint256 _vaultId) public onlyAdmin {
        ISavingApplication(savingApplication).depositForAccounts(_accounts, _vaultId);
    }

    /**
     * @dev Starts earning and deposits all current balance of the specified vault to its strategy.
     * @param _vaultId ID of the vault to earn.
     */
    function earnForVault(uint256 _vaultId) public onlyAdmin {
        IController controller = IController(ISavingApplication(savingApplication).controller());
        address vault = controller.vaults(_vaultId);
        require(vault != address(0x0), "vault not exist");

        IVault(vault).earn();
    }

    /**
     * @dev Starts earning and deposits all current balance of the specified vaults to its strategy.
     * @param _vaultIds IDs of the vaults to earn.
     */
    function earnForVaults(uint256[] memory _vaultIds) public onlyAdmin {
        IController controller = IController(ISavingApplication(savingApplication).controller());
        for (uint256 i = 0; i < _vaultIds.length; i++) {
            address vault = controller.vaults(_vaultIds[i]);
            require(vault != address(0x0), "vault not exist");

            IVault(vault).earn();
        }
    }

    /**
     * @dev Harvest yield from the strategy for the specified vault.
     * @param _vaultId ID of the vault to harvest.
     */
    function harvestForVault(uint256 _vaultId) public onlyAdmin {
        IController controller = IController(ISavingApplication(savingApplication).controller());
        address vault = controller.vaults(_vaultId);
        require(vault != address(0x0), "vault not exist");

        IVault(vault).harvest();
    }

    /**
     * @dev Harvest yield from the strategy for the specified vaults.
     * @param _vaultIds IDs of the vaults to harvest.
     */
    function harvestForVaults(uint256[] memory _vaultIds) public onlyAdmin {
        IController controller = IController(ISavingApplication(savingApplication).controller());
        for (uint256 i = 0; i < _vaultIds.length; i++) {
            address vault = controller.vaults(_vaultIds[i]);
            require(vault != address(0x0), "vault not exist");

            IVault(vault).harvest();
        }
    }

    /**
     * @dev Updates the emergency mode. Only governance or strategist can update emergency mode.
     */
    function setEmergencyModeForVault(uint256 _vaultId, bool _active) public onlyAdmin {
        IController controller = IController(ISavingApplication(savingApplication).controller());
        address vault = controller.vaults(_vaultId);
        require(vault != address(0x0), "vault not exist");

        IVault(vault).setEmergencyMode(_active);
    }

    /**
     * @dev Updates the active strategy of the vault. Only governance or strategist can update the active strategy.
     * Only approved strategy can be selected as active strategy.
     * No new strategy is accepted in emergency mode.
     */
    function setActiveStrategyForVault(uint256 _vaultId, address _strategy) public onlyAdmin {
        IController controller = IController(ISavingApplication(savingApplication).controller());
        address vault = controller.vaults(_vaultId);
        require(vault != address(0x0), "vault not exist");

        IVault(vault).setActiveStrategy(_strategy);
    }

    /**
     * @dev Renounce the strategist role of SavingApplication to owner.
     */
    function renounceStrategist() public onlyOwner {
        ISavingApplication(savingApplication).setStrategist(owner());
    }

    /**
     * @dev Renounce the strategist role of a specific vault to owner.
     * @param _vaultId ID of the vault to renounce strategist role.
     */
    function renounceStrategistForVault(uint256 _vaultId) public onlyOwner {
        IController controller = IController(ISavingApplication(savingApplication).controller());
        address vault = controller.vaults(_vaultId);
        require(vault != address(0x0), "vault not exist");

        IVault(vault).setStrategist(owner());
    }
}