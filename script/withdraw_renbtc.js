const argv = require('yargs').option('token', {type: 'string'}).argv;
const Vault = artifacts.require("Vault");
const SavingApplication = artifacts.require("SavingApplication");
const IERC20Upgradeable = artifacts.require("IERC20Upgradeable");

const RENBTC = '0xa0FDab08eCa6E53652Cb79C6eF6Fc562e04D0822';
const DEPLOYER = '0x2932516D9564CB799DDA2c16559caD5b8357a0D6';
const ACCOUNT = '0xccfc9b62d2b15f69e5b9eb2ba5db3416b73066c0';
const SAVING_APPLICATION = '0x278dc0E78a6514bfD3282c54D92734880C02e902';

module.exports = async function (callback) {
    try {
        const renBtc = await IERC20Upgradeable.at(RENBTC);
        const balanceBefore = (await renBtc.balanceOf(ACCOUNT)).toString();

        const savingApplication = await SavingApplication.at(SAVING_APPLICATION);
        await savingApplication.withdraw(ACCOUNT, 7, 50000, true, {from: DEPLOYER});

        const balanceAfter = (await renBtc.balanceOf(ACCOUNT)).toString();
        console.log("Balance before: " + balanceBefore);
        console.log("Balance after: " + balanceAfter);

        callback();
    } catch (e) {
        callback(e);
    }
}