const Vault = artifacts.require("Vault");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");

const REN_CRV_VAULT = '0x59aAbBC33311fD0961F17E684584c0A090034d5F';
const REN_VAULT = '0xa0FDab08eCa6E53652Cb79C6eF6Fc562e04D0822';
const REN_STRATEGY = '0xCE59Cb24902028Ab1302Aafd28e8ea7652d7f30D';
const VAULT_IMPL = '0x1133D93cd74B1c159F8ce85216Bf3951f5Fe51B2';
const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';

module.exports = async function (callback) {
    try {
        const tempVault = await Vault.new({from: DEPLOYER});
        const renCrvVaultProxy = await AdminUpgradeabilityProxy.at(REN_CRV_VAULT);
        await renCrvVaultProxy.changeImplementation(tempVault.address, {from: DEPLOYER});
        console.log('Vault implementation updated.');

        const renCrvVault = await Vault.at(REN_CRV_VAULT);
        await renCrvVault.clearRewards(REN_STRATEGY, {from: DEPLOYER});
        console.log('Reward cleared.');

        await renCrvVaultProxy.changeImplementation(VAULT_IMPL, {from: DEPLOYER});
        console.log('Vault implementation recovered.');

        const renVault = await Vault.at(REN_VAULT);
        await renVault.setActiveStrategy('0x0000000000000000000000000000000000000000', {from: DEPLOYER});

        callback();
    } catch (e) {
        callback(e);
    }
}