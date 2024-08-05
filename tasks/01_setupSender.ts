import { networks } from "../networks";
import "@nomicfoundation/hardhat-toolbox";
import { task } from "hardhat/config";
import { StakeAcrossSender } from "../typechain-types";

// usage example: npx hardhat setup-sender --network fuji

task("setup-sender", "deploy Sender.sol").setAction(async function (
  taskArguments,
  hre
) {
  // get network name from params
  const networkName = hre.network.name;

  if (networkName !== "fuji") {
    throw new Error(
      "This task is intended to be executed on the Fuji network."
    );
  }

  const networkConfig = networks[networkName];

  const bnmToken = networkConfig.bnmToken;
  if (!bnmToken) {
    throw new Error("Missing BNM Token Address");
  }
  const ROUTER = networkConfig.router;
  const LINK = networkConfig.linkToken;

  const ASSET_TOKEN_AMOUNT = "1.5"; // 1.5 CCIP-BnM
  const LINK_AMOUNT = "5";

  console.log("\n__Compiling Contracts__");
  await hre.run("compile");

  console.log(`\nDeploying StakeAcrossSender.sol to ${networkName}...`);
  const senderContract: StakeAcrossSender = <StakeAcrossSender>(
    await hre.ethers.deployContract("StakeAcrossSender", [ROUTER, LINK])
  );
  await senderContract.waitForDeployment();

  console.log(
    `\nSender contract is deployed to ${networkName} at ${senderContract.target}`
  );

  // Fund with CCIP BnM Token
  // for testing porpuses the contract is funded directly from the CCIP-BnM token contract
  // in production the contract will be funded from the depositors wallet at the time of the trasnfer
  console.log(
    `\nFunding ${senderContract.target} with ${ASSET_TOKEN_AMOUNT} CCIP-BnM `
  );
  const bnmTokenContract = await hre.ethers.getContractAt("ERC20", bnmToken);

  const bnmTokenTx = await bnmTokenContract.transfer(
    senderContract.target,
    hre.ethers.parseUnits(ASSET_TOKEN_AMOUNT)
  );
  await bnmTokenTx.wait(1);

  const bnmTokenBal_baseUnits = await bnmTokenContract.balanceOf(
    senderContract.target
  );
  const bnmTokenBal = hre.ethers.formatUnits(bnmTokenBal_baseUnits.toString());
  console.log(`\nFunded ${senderContract.target} with ${bnmTokenBal} CCIP-BnM`);

  // Fund with LINK
  console.log(`\nFunding ${senderContract.target} with ${LINK_AMOUNT} LINK `);
  const linkTokenContract = await hre.ethers.getContractAt(
    "LinkTokenInterface",
    networks[networkName].linkToken
  );

  // Transfer LINK tokens to the Sender contract
  const linkTx = await linkTokenContract.transfer(
    senderContract.target,
    hre.ethers.parseUnits(LINK_AMOUNT)
  );
  await linkTx.wait(1);

  const juelsBalance = await linkTokenContract.balanceOf(senderContract.target);
  const linkBalance = hre.ethers.formatEther(juelsBalance.toString());
  console.log(`\nFunded ${senderContract.target} with ${linkBalance} LINK`);
});
