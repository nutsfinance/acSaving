const SavingApplication = artifacts.require("SavingApplication");
const SavingApplicationProxy = artifacts.require("SavingApplicationProxy");
const ControllerProxy = artifacts.require("ControllerProxy");

const deploySavingApplicationProxy = async (deployer, accounts) => {
    const savingApplication = (await SavingApplication.deployed()).address;
    console.log('Saving application address: ' + savingApplication);
    console.log('Proxy admin: ' + accounts[0]);

    const savingApplicationProxy = await deployer.deploy(SavingApplicationProxy, savingApplication, accounts[0]);
    const proxiedSavingApplication = await SavingApplication.at(savingApplicationProxy.address);
    console.log('Saving application proxy: ' + savingApplicationProxy.address);

    const controller = (await ControllerProxy.deployed()).address();
    console.log('Controller: ' + controller);
    await proxiedSavingApplication.initialize(controller);
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deploySavingApplicationProxy(deployer, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};