const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const StrategyWbtcCurveRen = artifacts.require("StrategyWbtcCurveRen");
const ERC20 = artifacts.require("ERC20Upgradeable");
const Vault = artifacts.require("Vault");
const Controller = artifacts.require("Controller");
const MockToken = artifacts.require("MockToken");

const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const WBTC_HOLDER = '0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2';

async function timeIncreaseTo (seconds) {
    const delay = 10 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}

/**
 * Start Mainnet fork node:
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2"
 * 
 * Run test:
 * truffle test mainnet-fork-test/StrategyWbtcCurveRen.test.js
 */
contract("StrategyWbtcCurveRen", async ([owner, user, user2, treasury]) => {
    let wbtc;
    let wbtcVault;
    let strategy;
    let startTime;

    beforeEach(async () => {
        await web3.eth.sendTransaction({from: owner, to: WBTC_HOLDER, value: web3.utils.toWei('1')});
        const token = await MockToken.new();
        await token.initialize("ACoconut", "AC", 18);
        const controller = await Controller.new();
        await controller.initialize(token.address, treasury);

        wbtc = await ERC20.at(WBTC);
        wbtcVault = await Vault.new();
        await wbtcVault.initialize(WBTC, controller.address, "", "");

        strategy = await StrategyWbtcCurveRen.new(wbtcVault.address);
        await wbtcVault.approveStrategy(strategy.address, true);
        await wbtcVault.setActiveStrategy(strategy.address);

        startTime = (await time.latest()).addn(10);
    });
    it("should harvest WBTC", async () => {
        await wbtc.approve(wbtcVault.address, '1600000000', {from: WBTC_HOLDER});
        await wbtcVault.deposit('1600000000', {from: WBTC_HOLDER});

        console.log((await wbtc.decimals()).toString());
        console.log((await wbtc.totalSupply()).toString());
        await wbtcVault.earn();

        await timeIncreaseTo(startTime.add(time.duration.weeks(1)));
        await wbtcVault.harvest();

        const MAX = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
        await wbtcVault.withdraw(MAX, {from: WBTC_HOLDER});
    });
});