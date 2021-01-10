const { expectRevert } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const StrategyHbtcCurveHbtc = artifacts.require("StrategyHbtcCurveHbtc");
const ERC20 = artifacts.require("ERC20Upgradeable");
const Vault = artifacts.require("Vault");
const Controller = artifacts.require("Controller");
const ACoconut = artifacts.require("ACoconut");

const HBTC = '0x0316eb71485b0ab14103307bf65a021042c6d380';
const HBTC_HOLDER = '0x24d48513eac38449ec7c310a79584f87785f856f';

/**
 * Start Mainnet fork node:
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u 0x24d48513eac38449ec7c310a79584f87785f856f
 * 
 * Run test:
 * truffle test mainnet-fork-test/StrategyHbtcCurveHbtc.test.js
 */
contract("StrategyHbtcCurveHbtc", async ([owner, user, user2, treasury]) => {
    let hbtc;
    let hbtcVault;

    beforeEach(async () => {
        const aCoconut = await ACoconut.deployed();
        await web3.eth.sendTransaction({from: owner, to: HBTC_HOLDER, value: web3.utils.toWei('1')});
        const controller = await Controller.new();
        await controller.initialize(aCoconut.address, treasury);

        hbtc = await ERC20.at(HBTC);
        hbtcVault = await Vault.new();
        await hbtcVault.initialize(HBTC, controller.address, "", "");

        const strategy = await StrategyHbtcCurveHbtc.new(hbtcVault.address);
        await hbtcVault.setStrategy(strategy.address, true);
        await hbtcVault.setActiveStrategy(strategy.address);
    });
    it("should harvest HBTC", async () => {
        await hbtc.approve(hbtcVault.address, web3.utils.toWei('160'), {from: HBTC_HOLDER});
        await hbtcVault.deposit(web3.utils.toWei('160'), {from: HBTC_HOLDER});
        await hbtcVault.earn();
    });
});