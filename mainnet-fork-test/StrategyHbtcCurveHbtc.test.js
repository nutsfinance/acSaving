const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const StrategyHbtcCurveHbtc = artifacts.require("StrategyHbtcCurveHbtc");
const ERC20 = artifacts.require("ERC20Upgradeable");
const Vault = artifacts.require("Vault");
const Controller = artifacts.require("Controller");
const MockToken = artifacts.require("MockToken");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");

const HBTC = '0x0316eb71485b0ab14103307bf65a021042c6d380';
const HBTC_HOLDER = '0x24d48513eac38449ec7c310a79584f87785f856f';

async function timeIncreaseTo (seconds) {
    const delay = 10 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}


/**
 * Start Mainnet fork node:
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0x24d48513eac38449ec7c310a79584f87785f856f"
 * 
 * Run test:
 * truffle test mainnet-fork-test/StrategyHbtcCurveHbtc.test.js
 */
contract("StrategyHbtcCurveHbtc", async ([owner, user, user2, treasury]) => {
    let hbtc;
    let hbtcVault;
    let strategy;
    let startTime;

    beforeEach(async () => {
        await web3.eth.sendTransaction({from: owner, to: HBTC_HOLDER, value: web3.utils.toWei('1')});
        const token = await MockToken.new();
        await token.initialize("ACoconut", "AC", 18);
        const controller = await Controller.new();
        await controller.initialize(token.address, treasury);

        hbtc = await ERC20.at(HBTC);
        hbtcVault = await Vault.new();
        await hbtcVault.initialize(HBTC, controller.address, "", "");

        const strategyImpl = await StrategyHbtcCurveHbtc.new();
        const proxy = await AdminUpgradeabilityProxy.new(strategyImpl.address, owner);
        strategy = await StrategyHbtcCurveHbtc.at(proxy.address);
        await strategy.initialize(hbtcVault.address);
        // strategy = await StrategyHbtcCurveHbtc.new();
        // await strategy.initialize(hbtcVault.address);

        await hbtcVault.approveStrategy(strategy.address, true);
        await hbtcVault.setActiveStrategy(strategy.address);

        startTime = (await time.latest()).addn(10);
    });
    it("should harvest HBTC", async () => {
        await hbtc.approve(hbtcVault.address, web3.utils.toWei('16'), {from: HBTC_HOLDER});
        await hbtcVault.deposit(web3.utils.toWei('16'), {from: HBTC_HOLDER});

        await hbtcVault.earn();

        await timeIncreaseTo(startTime.add(time.duration.weeks(1)));
        await hbtcVault.harvest();

        const MAX = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
        await hbtcVault.withdraw(MAX, {from: HBTC_HOLDER});
    });
});