const argv = require('yargs').option('vault', {type: 'string'}).argv;
const Vault = artifacts.require("Vault");
const StrategyCurveRenCrv = artifacts.require("StrategyCurveRenCrv");

/**
 * Script to set strategy for renCrv vault.
 * Comand:
 * truffle exec script/deploy_renCrv_strategy.js --vault=<vault address> [--network main]
 */
module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        console.log('Account: ' + accounts[0]);
        const vault = await Vault.at(argv.vault);

        const renCrvStrategy = await StrategyCurveRenCrv.new(vault.address);
        console.log('renCrv strategy: ' + renCrvStrategy.address);
        // Approves renCrvStrategy in vault
        await vault.setStrategy(renCrvStrategy.address, true);
        // Set renCrvStrategy as active strategy in renCrv vault
        await vault.setActiveStrategy(renCrvStrategy.address);

        callback();
    } catch (e) {
        callback(e);
    }
}