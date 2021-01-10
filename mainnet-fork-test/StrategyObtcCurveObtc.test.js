const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const StrategyObtcCurveObtc = artifacts.require("StrategyObtcCurveObtc");
const ERC20 = artifacts.require("ERC20Upgradeable");
const Vault = artifacts.require("Vault");
const Controller = artifacts.require("Controller");
const MockToken = artifacts.require("MockToken");

const OBTC = '0x8064d9Ae6cDf087b1bcd5BDf3531bD5d8C537a68';
const OBTC_HOLDER = '0x1ca2bc2e401eae4320c17528b91b078b3d16d39d';

async function timeIncreaseTo (seconds) {
    const delay = 10 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}

/**
 * Start Mainnet fork node:
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u 0x1ca2bc2e401eae4320c17528b91b078b3d16d39d
 * 
 * Run test:
 * truffle test mainnet-fork-test/StrategyObtcCurveObtc.test.js
 */
contract("StrategyObtcCurveObtc", async ([owner, user, user2, treasury]) => {
    let obtc;
    let obtcVault;
    let strategy;
    let startTime;

    beforeEach(async () => {
        await web3.eth.sendTransaction({from: owner, to: OBTC_HOLDER, value: web3.utils.toWei('1')});
        const token = await MockToken.new();
        await token.initialize("ACoconut", "AC", 18);
        const controller = await Controller.new();
        await controller.initialize(token.address, treasury);

        obtc = await ERC20.at(OBTC);
        obtcVault = await Vault.new();
        await obtcVault.initialize(OBTC, controller.address, "", "");

        strategy = await StrategyObtcCurveObtc.new(obtcVault.address);
        await obtcVault.approveStrategy(strategy.address, true);
        await obtcVault.setActiveStrategy(strategy.address);

        startTime = (await time.latest()).addn(10);
    });
    it("should harvest oBTC", async () => {
        await obtc.approve(obtcVault.address, '10000000000', {from: OBTC_HOLDER});
        await obtcVault.deposit('10000000000', {from: OBTC_HOLDER});

        await obtcVault.earn();

        await timeIncreaseTo(startTime.add(time.duration.weeks(1)));
        await obtcVault.harvest();
    });
});