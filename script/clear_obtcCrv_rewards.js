const Vault = artifacts.require("Vault");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");

const OBTC_CRV_VAULT = '0xa73b91094304cd7bd1e67a839f63e287B29c0f65';
const OBTC_VAULT = '0x3fb7F1353E88a934a4c913fA5e8261b54c0560c6';
const OBTC_STRATEGY = '0xC72b966fb496ae927446ae4217AED61b76EE3707';
const WBTC_VAULT = '0xeE0604af128EA18cBE24e408fD3eFCb822ffe8d8';
const WBTC_STRATEGY = '0x3dC1CD519b05AAF501327D812a5Ebf439b7C3fCf';
const VAULT_IMPL = '0x1133D93cd74B1c159F8ce85216Bf3951f5Fe51B2';
const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';

module.exports = async function (callback) {
    try {
        const tempVault = await Vault.new({from: DEPLOYER});
        const obtcCrvVaultProxy = await AdminUpgradeabilityProxy.at(OBTC_CRV_VAULT);
        await obtcCrvVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});
        console.log('Vault implementation updated.');

        const obtcCrvVault = await Vault.at(OBTC_CRV_VAULT);
        await obtcCrvVault.clearRewards(OBTC_STRATEGY, {from: DEPLOYER});
        await obtcCrvVault.clearRewards(WBTC_STRATEGY, {from: DEPLOYER});
        console.log('Reward cleared.');

        await obtcCrvVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});
        console.log('Vault implementation recovered.');

        const obtcVault = await Vault.at(OBTC_VAULT);
        await obtcVault.setActiveStrategy('0x0000000000000000000000000000000000000000', {from: DEPLOYER});
        const wbtcVault = await Vault.at(WBTC_VAULT);
        await wbtcVault.setActiveStrategy('0x0000000000000000000000000000000000000000', {from: DEPLOYER});

        callback();
    } catch (e) {
        callback(e);
    }
}