const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const StrategyRenBtcCurveRen = artifacts.require("StrategyRenBtcCurveRen");
const ERC20 = artifacts.require("ERC20Upgradeable");
const Vault = artifacts.require("Vault");
const Controller = artifacts.require("Controller");
const MockToken = artifacts.require("MockToken");

const RENBTC = '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D';
const RENBTC_HOLDER = '0x53463cd0b074E5FDafc55DcE7B1C82ADF1a43B2E';

async function timeIncreaseTo (seconds) {
    const delay = 10 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}

/**
 * Start Mainnet fork node:
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0x53463cd0b074E5FDafc55DcE7B1C82ADF1a43B2E"
 * 
 * Run test:
 * truffle test mainnet-fork-test/StrategyRenbtcCurveRen.test.js
 */
contract("StrategyRenBtcCurveRen", async ([owner, user, user2, treasury]) => {
    let renBtc;
    let renBtcVault;
    let strategy;
    let startTime;

    beforeEach(async () => {
        await web3.eth.sendTransaction({from: owner, to: RENBTC_HOLDER, value: web3.utils.toWei('1')});
        const token = await MockToken.new();
        await token.initialize("ACoconut", "AC", 18);
        const controller = await Controller.new();
        await controller.initialize(token.address, treasury);

        renBtc = await ERC20.at(RENBTC);
        renBtcVault = await Vault.new();
        await renBtcVault.initialize(RENBTC, controller.address, "", "");

        strategy = await StrategyRenBtcCurveRen.new(renBtcVault.address);
        await renBtcVault.approveStrategy(strategy.address, true);
        await renBtcVault.setActiveStrategy(strategy.address);

        startTime = (await time.latest()).addn(10);
    });
    it("should harvest renBTC", async () => {
        await renBtc.approve(renBtcVault.address, '16000000000', {from: RENBTC_HOLDER});
        await renBtcVault.deposit('16000000000', {from: RENBTC_HOLDER});

        console.log((await renBtc.decimals()).toString());
        console.log((await renBtc.totalSupply()).toString());
        await renBtcVault.earn();

        await timeIncreaseTo(startTime.add(time.duration.weeks(1)));
        await renBtcVault.harvest();

        const MAX = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
        await renBtcVault.withdraw(MAX, {from: RENBTC_HOLDER});
    });
});