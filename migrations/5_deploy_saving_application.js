const SavingApplication = artifacts.require("SavingApplication");

module.exports = function(deployer) {
  deployer.deploy(SavingApplication);
};
