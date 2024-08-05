import { networks } from "../networks";
import "@nomicfoundation/hardhat-toolbox";
import { task } from "hardhat/config";
import {
  StakeAcrossSender,
  StakeAcrossSender__factory,
  StakeAcrossVaultProtocol,
} from "../typechain-types";

// usage example:
// npx hardhat transfer-token \
// --network fuji \
// --sender 0x2f5dA50367C19B3e7d01f28109978B9A1a9708AF \
// --protocol 0xbe38384a67Cd54360E887468Aa109c2827486A29 \
// --dest-chain sepolia \
// --amount 500000000000000000

task(
  "transfer-token",
  "transfers token x-chain from Sender.sol to Protocol.sol"
)
  .addParam("sender", "address of Sender.sol")
  .addParam("protocol", "address of Protocol.sol")
  .addParam("destChain", "destination chain as specified in networks.js file")
  .addParam(
    "amount",
    "token amount to transfer in expressed in smallest denomination (eg juels, wei)"
  )
  .setAction(async (taskArguments, hre) => {
    // get network name from params
    const networkName = hre.network.name as keyof typeof networks;

    if (networkName !== "fuji") {
      throw Error("This task is intended to be executed on the Fuji network.");
    }

    const GAS_LIMIT = 600000;

    let bnmTokenAddress = networks[networkName].bnmToken;
    if (!bnmTokenAddress) {
      throw Error("Missing BnM Token Address from networks.js file");
    }

    const { sender, protocol, amount } = taskArguments;
    const destChain = taskArguments.destChain as keyof typeof networks;
    let destChainSelector = networks[destChain].chainSelector;

    const senderFactory: StakeAcrossSender__factory = <
      StakeAcrossSender__factory
    >await hre.ethers.getContractFactory("StakeAcrossSender");

    const senderContract: StakeAcrossSender = <StakeAcrossSender>(
      senderFactory.attach(sender)
    );

    // For testing porpuses the contract was previously funded directly from the CCIP-BnM token contract
    // In production, the contract will be funded from the depositor's wallet at the time of transfer.

    const signers = await hre.ethers.getSigners();
    const anotherUserAccount = signers[1];

    try {
      // send tokens from deployer
      const sendTokensTx = await senderContract.sendMessage(
        destChainSelector,
        protocol,
        bnmTokenAddress,
        amount,
        GAS_LIMIT,
        {
          gasLimit: GAS_LIMIT,
        }
      );

      await sendTokensTx.wait(2);

      console.log("\nTx hash is ", sendTokensTx.hash);
      console.log(`\nPlease visit the CCIP Explorer at 'https://ccip.chain.link'
        and paste in the Tx Hash '${sendTokensTx.hash}' to view the status of your CCIP tx.
        Be sure to make a note of your Message Id for use in the next steps.`);

      // send tokens from another user for  the half of the amount

      // convert amount to wei
      const fullAmount = hre.ethers.parseUnits(amount, "wei");
      // divide fullAmount by 2
      const halfAmount = fullAmount / 2n;

      const sendTokensTx2 = await senderContract
        .connect(anotherUserAccount)
        .sendMessage(
          destChainSelector,
          protocol,
          bnmTokenAddress,
          halfAmount,
          GAS_LIMIT,
          {
            gasLimit: GAS_LIMIT,
          }
        );
      await sendTokensTx2.wait(2);
      console.log("\nTx2 hash is ", sendTokensTx2.hash);
    } catch (error) {
      console.log(error);
    }
  });
