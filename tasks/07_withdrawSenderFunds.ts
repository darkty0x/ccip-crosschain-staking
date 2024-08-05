import { networks } from "../networks";
import "@nomicfoundation/hardhat-toolbox";
import { task } from "hardhat/config";
import {
  StakeAcrossSender,
  StakeAcrossSender__factory,
} from "../typechain-types";

//  usage: npx hardhat withdraw-sender-funds --network fuji --address 0x1234...

task("withdraw-sender-funds", "withdraw ETH and LINK from Sender.sol")
  .addParam("address", "Sender.sol contract address")
  .setAction(async (taskArguments, hre) => {
    // get network name from params
    const networkName = hre.network.name;

    if (networkName !== "fuji") {
      throw Error("This task must be used on Fuji.");
    }

    const bnmToken = networks[networkName].bnmToken;
    if (!bnmToken) {
      throw Error("Missing BNM Token Address");
    }

    const senderFactory: StakeAcrossSender__factory = <
      StakeAcrossSender__factory
    >await hre.ethers.getContractFactory("StakeAcrossSender");
    
    const senderContract: StakeAcrossSender = <StakeAcrossSender>(
      senderFactory.attach(taskArguments.address)
    );

    // Withdraw Native token, if any
    const withdrawEthTx = await senderContract.withdrawEth({
      gasLimit: 500_000,
    });
    await withdrawEthTx.wait(2);

    // Withdraw BnM
    const withdrawBnMTokenTx = await senderContract.withdrawToken(bnmToken, {
      gasLimit: 500_000,
    });
    await withdrawBnMTokenTx.wait(2);

    // Withdraw LINK
    const withdrawLinkTx = await senderContract.withdrawToken(
      networks[networkName].linkToken,
      {
        gasLimit: 500_000,
      }
    );
    await withdrawLinkTx.wait(2);

    // Fetch updated balances to confirm.
    const bnmTokenContract = await hre.ethers.getContractAt("ERC20", bnmToken);

    const linkTokenContract = await hre.ethers.getContractAt(
      "LinkTokenInterface",
      networks[networkName].linkToken
    );

    console.log(`
    Sender Contract's Link Token Balance  : ${await linkTokenContract.balanceOf(
      taskArguments.address
    )}
    Sender Contract's BnM Token Balance : ${await bnmTokenContract.balanceOf(
      taskArguments.address
    )}
    Sender Contract's native balance : ${await hre.ethers.provider.getBalance(
      taskArguments.address
    )}˝)
    `);
  });
