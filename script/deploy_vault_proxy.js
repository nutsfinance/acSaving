const argv = require('yargs').argv;
const Vault = artifacts.require("Vault");
const ControllerProxy = artifacts.require("ControllerProxy");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");

/**
 * Script to deploy a new proxied vault.
 * Comand:
 * truffle exec script/deploy_vault_proxy.js --token=<vault token address> [--network main]
 */
module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        console.log('Account: ' + accounts[0]);
        const vault = (await Vault.deployed()).address;
        console.log('Vault address: ' + vault);
        const controller = (await ControllerProxy.deployed()).address;
        console.log('Controller address: ' + controller);
        
        const vaultProxy = await AdminUpgradeabilityProxy.new(vault, accounts[0]);
        const proxiedVault = await Vault.at(vaultProxy.address);

        await proxiedVault.initialize(argv.token, controller, '', '');  // No token name and symbol override

        callback();
    } catch (e) {
        callback(e);
    }
}