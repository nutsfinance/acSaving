const Vault = artifacts.require("Vault");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");

const HBTC_CRV_VAULT = '0x68A8aaf01892107E635d5DE1564b0D0a3FE39406';
const HBTC_VAULT = '0x5E4D682ea9c1d7bE32977b04E5d8AD7A1FD9b054';
const HBTC_STRATEGY = '0xd874c1219A4B1923A53baF2167D4eF9B0A086cAF';
const VAULT_IMPL = '0x1133D93cd74B1c159F8ce85216Bf3951f5Fe51B2';
const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';

module.exports = async function (callback) {
    try {
        const tempVault = await Vault.new({from: DEPLOYER});
        const hbtcCrvVaultProxy = await AdminUpgradeabilityProxy.at(HBTC_CRV_VAULT);
        await hbtcCrvVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});
        console.log('Vault implementation updated.');

        const hbtcCrvVault = await Vault.at(HBTC_CRV_VAULT);
        await hbtcCrvVault.clearRewards(HBTC_STRATEGY, {from: DEPLOYER});
        console.log('Reward cleared.');

        await hbtcCrvVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});
        console.log('Vault implementation recovered.');

        const hbtcVault = await Vault.at(HBTC_VAULT);
        await hbtcCrvVault.setActiveStrategy('0x0000000000000000000000000000000000000000', {from: DEPLOYER});

        callback();
    } catch (e) {
        callback(e);
    }
}