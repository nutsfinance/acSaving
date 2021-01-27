const Vault = artifacts.require("Vault");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");
const StrategyHbtcCurveHbtc = artifacts.require("StrategyHbtcCurveHbtc");

const HBTC_VAULT = '0x5E4D682ea9c1d7bE32977b04E5d8AD7A1FD9b054';
const HBTC_CRV_VAULT = '0x68A8aaf01892107E635d5DE1564b0D0a3FE39406';
const VAULT_IMPL = '0x1133D93cd74B1c159F8ce85216Bf3951f5Fe51B2';
const HBTC_STRATEGY = '0x7f369afD772Fd5e74C81bc7A913369d2243D07cd';

const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';

/**
 * Script to migrate HBTC strategy.
 */
module.exports = async function (callback) {
    try {
        const hbtcVault = await Vault.at(HBTC_VAULT);
        const balanceBefore = (await hbtcVault.balance()).toString();
        const sharePriceBefore = (await hbtcVault.getPricePerFullShare()).toString();

        // Deploy new HBTC strategy
        const hbtcStrategyImpl = await StrategyHbtcCurveHbtc.new({from: DEPLOYER});
        const hbtcStrategyProxy = await AdminUpgradeabilityProxy.new(hbtcStrategyImpl.address, DEPLOYER, {from: DEPLOYER});
        const hbtcStrategy = await StrategyHbtcCurveHbtc.at(hbtcStrategyProxy.address, {from: DEPLOYER});
        await hbtcStrategy.initialize(HBTC_VAULT, {from: DEPLOYER});
        console.log('New HBTC strategy: ' + hbtcStrategy.address);

        // Deploy temp Vault
        const tempVault = await Vault.new({from: DEPLOYER});

        // Change HBTC vault implementation to temp vault
        const hbtcVaultProxy = await AdminUpgradeabilityProxy.at(HBTC_VAULT);
        await hbtcVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});

        // Set new active strategy
        await hbtcVault.setActiveStrategy(hbtcStrategy.address, {from: DEPLOYER});

        // Change hbtcCrv vault implementation to temp vault
        const hbtcCrvVaultProxy = await AdminUpgradeabilityProxy.at(HBTC_CRV_VAULT);
        await hbtcCrvVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});
        const hbtcCrvVault = await Vault.at(HBTC_CRV_VAULT);

        // Migrate HBTC strategy balance
        await hbtcCrvVault.migrate(HBTC_STRATEGY, hbtcStrategy.address, {from: DEPLOYER});

        // Reset HBTC vault implementaion
        await hbtcVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});

        // Reset hbtcCrv vault implementation
        await hbtcCrvVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});

        const balanceAfter = (await hbtcVault.balance()).toString();
        const sharePriceAfter = (await hbtcVault.getPricePerFullShare()).toString();

        console.log("Balance before: " + balanceBefore);
        console.log("Balance after: " + balanceAfter);
        console.log("Share price before: " + sharePriceBefore);
        console.log("Share price after: " + sharePriceAfter);

        callback();
    } catch (e) {
        callback(e);
    }
}