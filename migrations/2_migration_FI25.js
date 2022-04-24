const FI25 = artifacts.require("FI25");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(FI25);
};
