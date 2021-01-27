const Vault = artifacts.require("Vault");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");
const StrategyWbtcCurveHbtc = artifacts.require("StrategyWbtcCurveHbtc");
const StrategyWbtcCurveObtc = artifacts.require("StrategyWbtcCurveObtc");
const StrategyWbtcCurveRen = artifacts.require("StrategyWbtcCurveRen");

const WBTC_VAULT = '0xeE0604af128EA18cBE24e408fD3eFCb822ffe8d8';
const OBTC_CRV_VAULT = '0xa73b91094304cd7bd1e67a839f63e287B29c0f65';
const VAULT_IMPL = '0x1133D93cd74B1c159F8ce85216Bf3951f5Fe51B2';
const HBTC_STRATEGY = '0xEc8Dc267CF17E6948072431018CdA6767065D32d';
const OBTC_STRATEGY = '0x668434279A7380E4Da683897BB02D8a77B6caE0A';
const REN_STRATEGY = '0xc4fabd307bbc102c6ec86a58e8f201dc7440f871';

const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';

/**
 * Script to migrate WBTC strategy.
 */
module.exports = async function (callback) {
    try {
        const wbtcVault = await Vault.at(WBTC_VAULT);
        const balanceBefore = (await wbtcVault.balance()).toString();
        const sharePriceBefore = (await wbtcVault.getPricePerFullShare()).toString();

        // Deploy new HBTC strategy
        const hbtcStrategyImpl = await StrategyWbtcCurveHbtc.new({from: DEPLOYER});
        const hbtcStrategyProxy = await AdminUpgradeabilityProxy.new(hbtcStrategyImpl.address, DEPLOYER, {from: DEPLOYER});
        const hbtcStrategy = await StrategyWbtcCurveHbtc.at(hbtcStrategyProxy.address, {from: DEPLOYER});
        await hbtcStrategy.initialize(WBTC_VAULT, {from: DEPLOYER});
        console.log('New HBTC strategy: ' + hbtcStrategy.address);

        // Deploy new OBTC strategy
        const obtcStrategyImpl = await StrategyWbtcCurveObtc.new({from: DEPLOYER});
        const obtcStrategyProxy = await AdminUpgradeabilityProxy.new(obtcStrategyImpl.address, DEPLOYER, {from: DEPLOYER});
        const obtcStrategy = await StrategyWbtcCurveObtc.at(obtcStrategyProxy.address, {from: DEPLOYER});
        await obtcStrategy.initialize(WBTC_VAULT, {from: DEPLOYER});
        console.log('New oBTC strategy: ' + obtcStrategy.address);

        // Deploy new REN strategy
        const renStrategyImpl = await StrategyWbtcCurveRen.new({from: DEPLOYER});
        const renStrategyProxy = await AdminUpgradeabilityProxy.new(renStrategyImpl.address, DEPLOYER, {from: DEPLOYER});
        const renStrategy = await StrategyWbtcCurveRen.at(renStrategyProxy.address, {from: DEPLOYER});
        await renStrategy.initialize(WBTC_VAULT, {from: DEPLOYER});
        console.log('New REN strategy: ' + renStrategy.address);

        // Deploy temp Vault
        const tempVault = await Vault.new({from: DEPLOYER});

        // Change WBTC vault implementation to temp vault
        const wbtcVaultProxy = await AdminUpgradeabilityProxy.at(WBTC_VAULT);
        await wbtcVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});

        // Revoke all old strategies
        await wbtcVault.approveStrategy(HBTC_STRATEGY, false, {from: DEPLOYER});
        // await wbtcVault.approveStrategy(OBTC_STRATEGY, false, {from: DEPLOYER}); // This will be revoked in setActiveStrategy()
        await wbtcVault.approveStrategy(REN_STRATEGY, false, {from: DEPLOYER});

        // Approve all new strategies
        await wbtcVault.approveStrategy(hbtcStrategy.address, true, {from: DEPLOYER});
        // await wbtcVault.approveStrategy(obtcStrategy.address, true, {from: DEPLOYER}); // This will be approved in setActiveStrategy()
        await wbtcVault.approveStrategy(renStrategy.address, true, {from: DEPLOYER});

        // Set new active strategy
        await wbtcVault.setActiveStrategy(obtcStrategy.address, {from: DEPLOYER});

        // Change obtcCrv vault implementation to temp vault
        const obtcCrvVaultProxy = await AdminUpgradeabilityProxy.at(OBTC_CRV_VAULT);
        await obtcCrvVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});
        const obtcCrvVault = await Vault.at(OBTC_CRV_VAULT);

        // Migrate WBTC strategy balance
        await obtcCrvVault.migrate(OBTC_STRATEGY, obtcStrategy.address, {from: DEPLOYER});

        // Reset WBTC vault implementaion
        await wbtcVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});

        // Reset obtcCrv vault implementation
        await obtcCrvVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});

        const balanceAfter = (await wbtcVault.balance()).toString();
        const sharePriceAfter = (await wbtcVault.getPricePerFullShare()).toString();

        console.log("Balance before: " + balanceBefore);
        console.log("Balance after: " + balanceAfter);
        console.log("Share price before: " + sharePriceBefore);
        console.log("Share price after: " + sharePriceAfter);

        callback();
    } catch (e) {
        callback(e);
    }
}