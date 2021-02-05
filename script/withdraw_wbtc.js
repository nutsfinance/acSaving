const argv = require('yargs').option('token', {type: 'string'}).argv;
const Vault = artifacts.require("Vault");
const SavingApplication = artifacts.require("SavingApplication");
const IERC20Upgradeable = artifacts.require("IERC20Upgradeable");

const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const WBTC_VAULT = '0xeE0604af128EA18cBE24e408fD3eFCb822ffe8d8';
const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';
const ACCOUNT = '0xccfc9b62d2b15f69e5b9eb2ba5db3416b73066c0';
const SAVING_APPLICATION = '0x278dc0E78a6514bfD3282c54D92734880C02e902';

/**
 * Command:
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * truffle exec script/withdraw_wbtc.js
 */
module.exports = async function (callback) {
    try {
        // const wbtc = await IERC20Upgradeable.at(WBTC);
        // const balanceBefore = (await wbtc.balanceOf(ACCOUNT)).toString();

        // const savingApplication = await SavingApplication.at(SAVING_APPLICATION);
        // await savingApplication.withdraw(ACCOUNT, 6, 50000, true, {from: DEPLOYER});

        // const balanceAfter = (await wbtc.balanceOf(ACCOUNT)).toString();
        // console.log("Balance before: " + balanceBefore);
        // console.log("Balance after: " + balanceAfter);

        const wbtcVault = await Vault.at(WBTC_VAULT);
        await wbtcVault.setActiveStrategy('0x0000000000000000000000000000000000000000', {from: DEPLOYER});

        callback();
    } catch (e) {
        callback(e);
    }
}