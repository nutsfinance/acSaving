const SavingApplication = artifacts.require("SavingApplication");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");

const deploySavingApplicationProxy = async (deployer, accounts) => {
    const savingApplication = (await SavingApplication.deployed()).address;
    console.log('Saving application address: ' + savingApplication);
    console.log('Proxy admin: ' + accounts[0]);

    const savingApplicationProxy = await deployer.deploy(AdminUpgradeabilityProxy, savingApplication, accounts[0]);
    const proxiedSavingApplication = await SavingApplication.at(savingApplicationProxy.address);

    // Beta
    const controller = "0xE0127d51b64400D5400740a633EB705611d99822";
    // Production
    // const controller = "";
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