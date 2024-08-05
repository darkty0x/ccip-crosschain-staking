import { networks } from "../networks";
import "@nomicfoundation/hardhat-toolbox";
import { task } from "hardhat/config";
import {
  StakeAcrossVaultProtocol,
  StakeAcrossVaultProtocol__factory,
} from "../typechain-types";

// usage example: npx hardhat withdraw-protocol-funds --network sepolia --address 0x1234...

task(
  "withdraw-protocol-funds",
  "withdraw ETH and LINK from StakeAcrossVaultProtocol.sol"
)
  .addParam("address", "Protocol contract address")
  .setAction(async (taskArguments, hre) => {
    // get network name from params
    const networkName = hre.network.name;

    if (networkName === "hardhat") {
      throw Error(
        'This command cannot be used on a local development chain.  Specify a valid network ".'
      );
    }
    if (networkName !== "sepolia") {
      throw Error("This task must be used on Sepolia.");
    }

    const bnmToken = networks[networkName].bnmToken;
    if (!bnmToken) {
      throw Error("Missing BNM Token Address");
    }

    const protocolFactory: StakeAcrossVaultProtocol__factory = <
      StakeAcrossVaultProtocol__factory
    > await hre.ethers.getContractFactory("StakeAcrossVaultProtocol");
    const protocolContract: StakeAcrossVaultProtocol = <
      StakeAcrossVaultProtocol
    >protocolFactory.attach(taskArguments.address);

    const bnmTokenContract = await hre.ethers.getContractAt("ERC20", bnmToken);
    const linkTokenContract = await hre.ethers.getContractAt(
      "LinkTokenInterface",
      networks[networkName].linkToken
    );

    console.log(`
   Protocol Contract's Link Token Balance  : ${await linkTokenContract.balanceOf(
     taskArguments.address
   )}
   Protocol Contract's BnM Token Balance : ${await bnmTokenContract.balanceOf(
     taskArguments.address
   )}
   Protocol Contract's Eth balance : ${await hre.ethers.provider.getBalance(
     protocolContract.target
   )}
   `);

    // Withdraw BnM
    const withdrawBnMTokenTx = await protocolContract.withdrawToken(bnmToken, {
      gasLimit: 500_000,
    });
    await withdrawBnMTokenTx.wait();

    // Withdraw LINK
    const withdrawLinkTx = await protocolContract.withdrawToken(
      networks[networkName].linkToken,
      {
        gasLimit: 500_000,
      }
    );
    await withdrawLinkTx.wait();

    // Withdraw Contract Eth, if any
    const withdrawEthTx = await protocolContract.withdrawEth({
      gasLimit: 500_000,
    });
    await withdrawEthTx.wait();

    // Fetch updated balances to confirm.

    console.log(`
   Protocol Contract's Link Token Balance  : ${await linkTokenContract.balanceOf(
     taskArguments.address
   )}
   Protocol Contract's BnM Token Balance : ${await bnmTokenContract.balanceOf(
     taskArguments.address
   )}
   Protocol Contract's Eth balance : ${await hre.ethers.provider.getBalance(
     protocolContract.target
   )}
   `);
  });
