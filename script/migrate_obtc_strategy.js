const Vault = artifacts.require("Vault");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");
const StrategyObtcCurveObtc = artifacts.require("StrategyObtcCurveObtc");

const OBTC_VAULT = '0x3fb7F1353E88a934a4c913fA5e8261b54c0560c6';
const OBTC_CRV_VAULT = '0xa73b91094304cd7bd1e67a839f63e287B29c0f65';
const VAULT_IMPL = '0x1133D93cd74B1c159F8ce85216Bf3951f5Fe51B2';
const OBTC_STRATEGY = '0x9170af62dEdC40a29D60F252a1b8978c5f6033e5';

const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';

/**
 * Script to migrate OBTC strategy.
 */
module.exports = async function (callback) {
    try {
        const obtcVault = await Vault.at(OBTC_VAULT);
        const balanceBefore = (await obtcVault.balance()).toString();
        const sharePriceBefore = (await obtcVault.getPricePerFullShare()).toString();

        // Deploy new OBTC strategy
        const obtcStrategyImpl = await StrategyObtcCurveObtc.new({from: DEPLOYER});
        const obtcStrategyProxy = await AdminUpgradeabilityProxy.new(obtcStrategyImpl.address, DEPLOYER, {from: DEPLOYER});
        const obtcStrategy = await StrategyObtcCurveObtc.at(obtcStrategyProxy.address, {from: DEPLOYER});
        await obtcStrategy.initialize(OBTC_VAULT, {from: DEPLOYER});
        console.log('New OBTC strategy: ' + obtcStrategy.address);

        // Deploy temp Vault
        const tempVault = await Vault.new({from: DEPLOYER});

        // Change OBTC vault implementation to temp vault
        const obtcVaultProxy = await AdminUpgradeabilityProxy.at(OBTC_VAULT);
        await obtcVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});

        // Set new active strategy
        await obtcVault.setActiveStrategy(obtcStrategy.address, {from: DEPLOYER});

        // Change obtcCrv vault implementation to temp vault
        const obtcCrvVaultProxy = await AdminUpgradeabilityProxy.at(OBTC_CRV_VAULT);
        await obtcCrvVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});
        const obtcCrvVault = await Vault.at(OBTC_CRV_VAULT);

        // Migrate OBTC strategy balance
        await obtcCrvVault.migrate(OBTC_STRATEGY, obtcStrategy.address, {from: DEPLOYER});

        // Reset OBTC vault implementaion
        await obtcVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});

        // Reset obtcCrv vault implementation
        await obtcCrvVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});

        const balanceAfter = (await obtcVault.balance()).toString();
        const sharePriceAfter = (await obtcVault.getPricePerFullShare()).toString();

        console.log("Balance before: " + balanceBefore);
        console.log("Balance after: " + balanceAfter);
        console.log("Share price before: " + sharePriceBefore);
        console.log("Share price after: " + sharePriceAfter);

        callback();
    } catch (e) {
        callback(e);
    }
}