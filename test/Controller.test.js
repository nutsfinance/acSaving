const { expectRevert } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const Controller = artifacts.require("Controller");
const MockToken = artifacts.require("MockToken");
const Vault = artifacts.require("Vault");

contract("Controller", async ([owner, user, user2, treasury]) => {
    let token;
    let controller;

    beforeEach(async () => {
        token = await MockToken.new();
        await token.initialize("TEST", "TEST", 18);
        controller = await Controller.new();
        await controller.initialize(token.address, treasury);
    });

    it("should initialize parameters", async () => {
        assert.strictEqual(await controller.rewardToken(), token.address);
        assert.strictEqual(await controller.governance(), owner);
        assert.strictEqual(await controller.treasury(), treasury);
    });
    it("should allow to update reward token", async () => {
        const newToken = await MockToken.new();
        await newToken.initialize("TEST", "TEST", 18);
        await expectRevert(controller.setRewardToken(newToken.address, {from: user}), "not governance");
        await controller.setRewardToken(newToken.address);
        assert.strictEqual(await controller.rewardToken(), newToken.address);
    });
    it("should allow to update govenance", async () => {
        await expectRevert(controller.setGovernance(user2, {from: user}), "not governance");
        await controller.setRewardToken(user2);
        assert.strictEqual(await controller.rewardToken(), user2);
    });
    it("should allow to update treasury", async () => {
        await expectRevert(controller.setTreasury(user2, {from: user}), "not governance");
        await controller.setTreasury(user2);
        assert.strictEqual(await controller.treasury(), user2);
    });
    it("should set vaults", async () => {
        assert.strictEqual((await controller.numVaults()).toNumber(), 0);
        await controller.setVault(0, user2);
        assert.strictEqual((await controller.numVaults()).toNumber(), 1);
        assert.strictEqual(await controller.vaults(0), user2);
    });
    it("should add rewards to vaults", async () => {
        const vaultToken = await MockToken.new();
        await vaultToken.initialize("TEST", "TEST", 18);
        const vault = await Vault.new();
        await vault.initialize(vaultToken.address, controller.address, "Mock Token Vault Token", "Mockv");
        await controller.setVault(0, vault.address);
        assert.strictEqual((await token.balanceOf(vault.address)).toString(), '0');
        assert.strictEqual((await token.balanceOf(owner)).toString(), '0');
        await token.mint(owner, '210000000000000000000000');
        await token.approve(controller.address, '150000000000000000000000');
        await controller.addRewards(0, '150000000000000000000000');
        assert.strictEqual((await token.balanceOf(vault.address)).toString(), '150000000000000000000000');
        assert.strictEqual((await token.balanceOf(owner)).toString(), '60000000000000000000000');
    });
});