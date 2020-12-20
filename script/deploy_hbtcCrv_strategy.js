const argv = require('yargs').option('vault', {type: 'string'}).argv;
const Vault = artifacts.require("Vault");
const StrategyCurveHbtcCrv = artifacts.require("StrategyCurveHbtcCrv");

/**
 * Script to set strategy for hbtcCrv vault.
 * Comand:
 * truffle exec script/deploy_hbtcCrv_strategy.js --vault=<vault address> [--network main]
 */
module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        console.log('Account: ' + accounts[0]);
        const vault = await Vault.at(argv.vault);
        console.log('Vault: ' + argv.vault);

        const hbtcCrvStrategy = await StrategyCurveHbtcCrv.new(vault.address);
        console.log('hbtcCrv strategy: ' + hbtcCrvStrategy.address);
        // Approves hbtcCrvStrategy in vault
        await vault.setStrategy(hbtcCrvStrategy.address, true);
        // Set hbtcCrvStrategy as active strategy in hbtcCrv vault
        await vault.setActiveStrategy(hbtcCrvStrategy.address);

        callback();
    } catch (e) {
        callback(e);
    }
}