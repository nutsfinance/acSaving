const argv = require('yargs').option('vault', {type: 'string'}).argv;
const Vault = artifacts.require("Vault");
const StrategyCurveObtcCrv = artifacts.require("StrategyCurveObtcCrv");

/**
 * Script to set strategy for hbtcCrv vault.
 * Comand:
 * truffle exec script/deploy_obtcCrv_strategy.js --vault=<vault address> [--network main]
 */
module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        console.log('Account: ' + accounts[0]);
        const vault = await Vault.at(argv.vault);
        console.log('Vault: ' + argv.vault);

        const obtcCrvStrategy = await StrategyCurveObtcCrv.new(vault.address);
        console.log('obtcCrv strategy: ' + obtcCrvStrategy.address);
        // Approves obtcCrvStrategy in vault
        await vault.setStrategy(obtcCrvStrategy.address, true);
        // Set obtcCrvStrategy as active strategy in hbtcCrv vault
        await vault.setActiveStrategy(obtcCrvStrategy.address);

        callback();
    } catch (e) {
        callback(e);
    }
}