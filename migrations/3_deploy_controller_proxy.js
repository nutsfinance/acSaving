const Controller = artifacts.require("Controller");
const ControllerProxy = artifacts.require("ControllerProxy");

const deployControllerProxy = async (deployer, accounts) => {
    const controller = (await Controller.deployed()).address;
    console.log('Controller address: ' + controller);
    console.log('Proxy admin: ' + accounts[0]);

    const controllerProxy = await deployer.deploy(ControllerProxy, controller, accounts[0]);
    const proxiedController = await Controller.at(controllerProxy.address);
    console.log('Controller proxy address: ' + controllerProxy.address);

    // Beta
    // const ac = "0xD104F7479117209c1B885390500f29110f84E8FB";
    // const acDAO = "0x4804E40de5E8d06d7a37e2b6e417Fe92cCd0F677";
    // Production
    const aCoconut = "0x9A0aBA393aac4dFbFf4333B06c407458002C6183";  // reward token
    const aCoconutDAO = "0xc25D6AD0C82F21bE056699d575284e18678F8fE5";   // treasury
    await proxiedController.initialize(aCoconut, aCoconutDAO);
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deployControllerProxy(deployer, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};