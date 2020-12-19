const Controller = artifacts.require("Controller");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");

const deployControllerProxy = async (deployer, accounts) => {
    const controller = (await Controller.deployed()).address;
    console.log('Controller address: ' + controller);
    console.log('Proxy admin: ' + accounts[0]);

    const controllerProxy = await deployer.deploy(AdminUpgradeabilityProxy, controller, accounts[0]);
    const proxiedController = await Controller.at(controllerProxy.address);

    // Beta
    const ac = "0xD104F7479117209c1B885390500f29110f84E8FB";
    const acDAO = "0x4804E40de5E8d06d7a37e2b6e417Fe92cCd0F677";
    // Production
    // const ac = "0x9A0aBA393aac4dFbFf4333B06c407458002C6183";
    // const acDAO = "0xc25D6AD0C82F21bE056699d575284e18678F8fE5";
    await proxiedController.initialize(ac, acDAO);
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deployControllerProxy(deployer, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};