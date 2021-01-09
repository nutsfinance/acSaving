const { expectRevert } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const MockToken = artifacts.require("MockToken");
const Controller = artifacts.require("Controller");
const VaultBase = artifacts.require("VaultBase");
const Strategy = artifacts.require("MockStrategy");

const MAX = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));

contract("Vault", async ([owner, treasury, user, user2]) => {
    let rewardToken;
    let controller;
    let vault;
    let strategy;
    let token;
    let anotherToken;

    beforeEach(async () => {
        rewardToken = await MockToken.new();
        await rewardToken.initialize("Mock Reward", "Mock Reward", 18);
        controller = await Controller.new();
        await controller.initialize(rewardToken.address, treasury);
        token = await MockToken.new();
        await token.initialize("Mock Token", "Mock Token", 18);
        anotherToken = await MockToken.new();
        await anotherToken.initialize("Another Token", "Another Token", 18);
        vault = await VaultBase.new();
        await vault.initialize(token.address, controller.address, "", "");
        strategy = await Strategy.new(vault.address);
    });
    it("should approve or revoke strategies", async () => {
        assert.strictEqual(await vault.approvedStrategies(strategy.address), false);
        await expectRevert(vault.setStrategy(strategy.address, true, {from: user}), "not governance");
        await vault.setStrategy(strategy.address, true);
        assert.strictEqual(await vault.approvedStrategies(strategy.address), true);
        await vault.setStrategy(strategy.address, false);
        assert.strictEqual(await vault.approvedStrategies(strategy.address), false);
    });
    it("should allow to set approved strategy as active strategy", async () => {
        assert.strictEqual(await vault.activeStrategy(), '0x0000000000000000000000000000000000000000');
        await expectRevert(vault.setActiveStrategy(strategy.address, {from: user}), "not strategist");
        await expectRevert(vault.setActiveStrategy(strategy.address), "strategy not approved");
        await vault.setStrategy(strategy.address, true);
        await vault.setActiveStrategy(strategy.address);
        assert.strictEqual(await vault.activeStrategy(), strategy.address);
    });
    it("should allow strategist to set emergency mode", async () => {
        assert.strictEqual(await vault.emergencyMode(), false);
        await expectRevert(vault.setEmergencyMode(true, {from: user}), "not strategist");
        await vault.setEmergencyMode(true);
        assert.strictEqual(await vault.emergencyMode(), true);
    });
    it("should reset active strategy on emergency mode", async () => {
        assert.strictEqual(await vault.activeStrategy(), '0x0000000000000000000000000000000000000000');
        await vault.setStrategy(strategy.address, true);
        await vault.setActiveStrategy(strategy.address);
        assert.strictEqual(await vault.activeStrategy(), strategy.address);
        await vault.setEmergencyMode(true);
        assert.strictEqual(await vault.activeStrategy(), '0x0000000000000000000000000000000000000000');
    });
    it("should set strategist", async () => {
        assert.strictEqual(await vault.strategist(), owner);
        await expectRevert(vault.setStrategist(user2, {from: user}), "not strategist");
        await vault.setStrategist(user);
        assert.strictEqual(await vault.strategist(), user);
    });
    it("should be able to deposit and withdraw with no strategy", async () => {
        await token.mint(user, 100);
        await token.approve(vault.address, 100, {from: user});
        await vault.deposit(40, {from: user});
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 40);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 60);
        assert.strictEqual((await vault.balance()).toNumber(), 40);
        assert.strictEqual((await vault.totalSupply()).toNumber(), 40);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 40);
        assert.strictEqual((await vault.getPricePerFullShare()).toString(), '1000000000000000000');

        await vault.withdraw(10, {from: user});
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 30);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 70);
        assert.strictEqual((await vault.balance()).toNumber(), 30);
        assert.strictEqual((await vault.totalSupply()).toNumber(), 30);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 30);
        assert.strictEqual((await vault.getPricePerFullShare()).toString(), '1000000000000000000');

        await vault.withdraw(MAX, {from: user});
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 0);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 100);
        assert.strictEqual((await vault.balance()).toNumber(), 0);
        assert.strictEqual((await vault.totalSupply()).toNumber(), 0);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 0);
    });
    it("should be able to deposit all and withdraw all with no strategy", async () => {
        await token.mint(user, 120);
        await token.approve(vault.address, 120, {from: user});
        await vault.deposit(MAX, {from: user});
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 120);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 0);
        assert.strictEqual((await vault.balance()).toNumber(), 120);
        assert.strictEqual((await vault.totalSupply()).toNumber(), 120);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 120);
        assert.strictEqual((await vault.getPricePerFullShare()).toString(), '1000000000000000000');

        await vault.withdraw(40, {from: user});
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 80);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 40);
        assert.strictEqual((await vault.balance()).toNumber(), 80);
        assert.strictEqual((await vault.totalSupply()).toNumber(), 80);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 80);
        assert.strictEqual((await vault.getPricePerFullShare()).toString(), '1000000000000000000');

        await vault.withdraw(MAX, {from: user});
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 0);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 120);
        assert.strictEqual((await vault.balance()).toNumber(), 0);
        assert.strictEqual((await vault.totalSupply()).toNumber(), 0);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 0);
    });
    it("should be able to deposit all and withdraw all with dummy strategy", async () => {
        await vault.setStrategy(strategy.address, true);
        await vault.setActiveStrategy(strategy.address);
        await token.mint(user, 120);
        await token.approve(vault.address, 120, {from: user});
        await vault.deposit(MAX, {from: user});
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 120);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 0);
        assert.strictEqual((await vault.balance()).toNumber(), 120);
        assert.strictEqual((await vault.totalSupply()).toNumber(), 120);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 120);
        assert.strictEqual((await vault.getPricePerFullShare()).toString(), '1000000000000000000');

        await vault.withdraw(40, {from: user});
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 80);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 40);
        assert.strictEqual((await vault.balance()).toNumber(), 80);
        assert.strictEqual((await vault.totalSupply()).toNumber(), 80);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 80);
        assert.strictEqual((await vault.getPricePerFullShare()).toString(), '1000000000000000000');

        await vault.withdraw(MAX, {from: user});
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 0);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 120);
        assert.strictEqual((await vault.balance()).toNumber(), 0);
        assert.strictEqual((await vault.totalSupply()).toNumber(), 0);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 0);
    });

    it("should be able to deposit into and withdraw from strategy", async () => {
        await vault.setStrategy(strategy.address, true);
        await vault.setActiveStrategy(strategy.address);
        await token.mint(user, 200);
        await token.approve(vault.address, 200, {from: user});
        await vault.deposit(200, {from: user});
        // Deposit into strategy!
        await vault.earn();
        assert.strictEqual((await vault.balance()).toNumber(), 200);
        assert.strictEqual((await strategy.balanceOf()).toNumber(), 200);
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 0);
        assert.strictEqual((await token.balanceOf(strategy.address)).toNumber(), 200);

        // Harvest from strategy!
        await strategy.harvest();
        assert.strictEqual((await vault.balance()).toNumber(), 240);
        assert.strictEqual((await strategy.balanceOf()).toNumber(), 240);
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 0);
        assert.strictEqual((await token.balanceOf(strategy.address)).toNumber(), 240);
        assert.strictEqual((await vault.getPricePerFullShare()).toString(), '1200000000000000000');

        // Withdraw from vault
        assert.strictEqual((await vault.totalSupply()).toNumber(), 200);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 200);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 0);
        await vault.withdraw(60, {from: user});
        assert.strictEqual((await vault.totalSupply()).toNumber(), 140);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 140);
        assert.strictEqual((await vault.balance()).toNumber(), 168);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 72);
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 0);
        assert.strictEqual((await token.balanceOf(strategy.address)).toNumber(), 168);

        await vault.withdraw(MAX, {from: user});
        assert.strictEqual((await vault.totalSupply()).toNumber(), 0);
        assert.strictEqual((await vault.balanceOf(user)).toNumber(), 0);
        assert.strictEqual((await vault.balance()).toNumber(), 0);
        assert.strictEqual((await token.balanceOf(user)).toNumber(), 240);
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 0);
        assert.strictEqual((await token.balanceOf(strategy.address)).toNumber(), 0);
    });
    it("should only allow governance or strategist to harvest", async () => {
        await expectRevert(vault.harvest({from: user}), "not strategist");
    });
    it("should not allow to harvest if strategy is not set", async () => {
        await expectRevert(vault.harvest({from: owner}), "no strategy");
    });
    it("should allow strategist to harvest", async () => {
        await vault.setStrategy(strategy.address, true);
        await vault.setActiveStrategy(strategy.address);
        await vault.setStrategist(user);
        await vault.harvest({from: user});
    });
    it("should update share prices after harvest", async () => {
        await vault.setStrategy(strategy.address, true);
        await vault.setActiveStrategy(strategy.address);
        await token.mint(user, 200);
        await token.approve(vault.address, 200, {from: user});
        await vault.deposit(MAX, {from: user});
        // Deposit into strategy!
        await vault.earn();
        // Harvest from strategy!
        await vault.harvest();
        assert.strictEqual((await vault.getPricePerFullShare()).toString(), '1200000000000000000');

        // Second user deposits 360 tokens
        await token.mint(user2, 360);
        await token.approve(vault.address, 360, {from: user2});
        await vault.deposit(MAX, {from: user2});
        assert.strictEqual((await vault.totalSupply()).toNumber(), 500);
        assert.strictEqual((await vault.balanceOf(user2)).toNumber(), 300);
        assert.strictEqual((await vault.balance()).toNumber(), 600);
        assert.strictEqual((await strategy.balanceOf()).toNumber(), 240);
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 360);
        assert.strictEqual((await token.balanceOf(strategy.address)).toNumber(), 240);

        await vault.earn();
        assert.strictEqual((await strategy.balanceOf()).toNumber(), 600);
        assert.strictEqual((await token.balanceOf(vault.address)).toNumber(), 0);
        assert.strictEqual((await token.balanceOf(strategy.address)).toNumber(), 600);
    });
    it("should only allow governance or strategist to salvage", async () => {
        await expectRevert(vault.salvageToken(anotherToken.address, {from: user}), "not strategist");
    });
    it("should allow strategist to salvage", async () => {
        await anotherToken.mint(vault.address, 200);
        assert.strictEqual((await anotherToken.balanceOf(treasury)).toNumber(), 0);
        await vault.setStrategist(user);
        await vault.salvageToken(anotherToken.address, {from: user});
        assert.strictEqual((await anotherToken.balanceOf(treasury)).toNumber(), 200);
        assert.strictEqual((await anotherToken.balanceOf(vault.address)).toNumber(), 0);
    });
});