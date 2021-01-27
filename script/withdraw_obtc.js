const argv = require('yargs').option('token', {type: 'string'}).argv;
const Vault = artifacts.require("Vault");
const SavingApplication = artifacts.require("SavingApplication");
const IERC20Upgradeable = artifacts.require("IERC20Upgradeable");

const OBTC = '0x8064d9Ae6cDf087b1bcd5BDf3531bD5d8C537a68';
const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';
const ACCOUNT = '0xccfc9b62d2b15f69e5b9eb2ba5db3416b73066c0';
const SAVING_APPLICATION = '0x278dc0E78a6514bfD3282c54D92734880C02e902';

module.exports = async function (callback) {
    try {
        const obtc = await IERC20Upgradeable.at(OBTC);
        const balanceBefore = (await obtc.balanceOf(ACCOUNT)).toString();

        const savingApplication = await SavingApplication.at(SAVING_APPLICATION);
        await savingApplication.withdraw(ACCOUNT, 9, 50000, true, {from: DEPLOYER});

        const balanceAfter = (await obtc.balanceOf(ACCOUNT)).toString();
        console.log("Balance before: " + balanceBefore);
        console.log("Balance after: " + balanceAfter);

        callback();
    } catch (e) {
        callback(e);
    }
}