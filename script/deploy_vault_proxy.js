const argv = require('yargs').argv;
const Vault = artifacts.require("Vault");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");

module.exports = async function (callback) {
    try {
        const vault = (await Vault.deployed()).address;
        console.log('Vault address: ' + vault);
        
        const vaultProxy = await AdminUpgradeabilityProxy.new(vault, argv.account);
        const proxiedVault = await Vault.at(vaultProxy.address);

        await proxiedVault.initialize(argv.token, argv.controller, '', '');

        callback();
    } catch (e) {
        callback(e);
    }
}