const Vault = artifacts.require("Vault");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");
const StrategyRenBtcCurveRen = artifacts.require("StrategyRenBtcCurveRen");

const RENBTC_VAULT = '0xa0FDab08eCa6E53652Cb79C6eF6Fc562e04D0822';
const REN_CRV_VAULT = '0x59aAbBC33311fD0961F17E684584c0A090034d5F';
const VAULT_IMPL = '0x1133D93cd74B1c159F8ce85216Bf3951f5Fe51B2';
const RENBTC_STRATEGY = '0x1c3D50f251464C98D93881847807F3888086F04E';
const TEMP_VAULT_IMPL = '0x128E259C7203513a6844FeF25A36B020f37f38d4';

const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';

/**
 * Script to migrate RENBTC strategy.
 */
module.exports = async function (callback) {
    try {
        const renBtcVault = await Vault.at(RENBTC_VAULT);
        const balanceBefore = (await renBtcVault.balance()).toString();
        const sharePriceBefore = (await renBtcVault.getPricePerFullShare()).toString();

        // Deploy new RENBTC strategy
        const renBtcStrategyImpl = await StrategyRenBtcCurveRen.new({from: DEPLOYER});
        const renBtcStrategyProxy = await AdminUpgradeabilityProxy.new(renBtcStrategyImpl.address, DEPLOYER, {from: DEPLOYER});
        const renBtcStrategy = await StrategyRenBtcCurveRen.at(renBtcStrategyProxy.address, {from: DEPLOYER});
        await renBtcStrategy.initialize(RENBTC_VAULT, {from: DEPLOYER});
        console.log('New RENBTC strategy impl: ' + renBtcStrategyImpl.address);
        console.log('New RENBTC strategy: ' + renBtcStrategy.address);

        // Deploy temp Vault
        // const tempVault = await Vault.new({from: DEPLOYER});
        const tempVault = await Vault.at(TEMP_VAULT_IMPL);

        // Change RENBTC vault implementation to temp vault
        const renBtcVaultProxy = await AdminUpgradeabilityProxy.at(RENBTC_VAULT);
        await renBtcVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});

        // Set new active strategy
        await renBtcVault.setActiveStrategy(renBtcStrategy.address, {from: DEPLOYER});

        // Change renCrv vault implementation to temp vault
        const renCrvVaultProxy = await AdminUpgradeabilityProxy.at(REN_CRV_VAULT);
        await renCrvVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});
        const renCrvVault = await Vault.at(REN_CRV_VAULT);

        // Migrate RENBTC strategy balance
        await renCrvVault.migrate(RENBTC_STRATEGY, renBtcStrategy.address, {from: DEPLOYER});

        // Reset RENBTC vault implementaion
        await renBtcVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});

        // Reset renCrv vault implementation
        await renCrvVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});

        const balanceAfter = (await renBtcVault.balance()).toString();
        const sharePriceAfter = (await renBtcVault.getPricePerFullShare()).toString();

        console.log("Balance before: " + balanceBefore);
        console.log("Balance after: " + balanceAfter);
        console.log("Share price before: " + sharePriceBefore);
        console.log("Share price after: " + sharePriceAfter);

        callback();
    } catch (e) {
        callback(e);
    }
}