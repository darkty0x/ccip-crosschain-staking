import { networks } from "../networks";
import "@nomicfoundation/hardhat-toolbox";
import { task } from "hardhat/config";
import {
  StakeAcrossSender,
  StakeAcrossSender__factory,
  StakeAcrossVaultProtocol__factory,
  StakeAcrossVaultProtocol,
} from "../typechain-types";

// usage example:
// a - check Protocol

// npx hardhat read-message \
// --network sepolia \
// --address 0x501Df3901CAdAc7822DFa18288D1189d46DEb713  \
// --contract Protocol \
// --message-id 0x6b8af01a2415fe824b61ee356b8159c5189baa75f265b75b7b844e21a2a05b99

// b - check sender

// npx hardhat read-message \
// --network fuji \
// --address 0xEd982FFfCE7935f5b6B2423B4bEA11Fa1DdA60a5  \
// --contract Sender \
// --message-id 0x6b8af01a2415fe824b61ee356b8159c5189baa75f265b75b7b844e21a2a05b99

task("read-message", "reads CCIP message on dest contract")
  .addParam("address", "address of CCIP contract to read")
  .addParam("contract", "Name of the CCIP contract to read")
  .addParam("messageId", "messageId to retrieve from the contract")
  .setAction(async (taskArgs, hre) => {
    // get network name from params
    const networkName = hre.network.name as keyof typeof networks;

    if (networkName != "fuji" && networkName != "sepolia") {
      throw Error(
        "This command is intended to be used with either Fuji or Sepolia."
      );
    }

    let { address, contract, messageId } = taskArgs;

    let ccipContract: StakeAcrossVaultProtocol | StakeAcrossSender;

    if (contract === "Protocol") {
      const ccipContractFactory: StakeAcrossVaultProtocol__factory = <
        StakeAcrossVaultProtocol__factory
      >await hre.ethers.getContractFactory("StakeAcrossVaultProtocol");

      ccipContract = <StakeAcrossVaultProtocol>(
        ccipContractFactory.attach(address)
      );
    } else if (contract === "Sender") {
      const ccipContractFactory: StakeAcrossSender__factory = <
        StakeAcrossSender__factory
      >await hre.ethers.getContractFactory("StakeAcrossSender");

      ccipContract = <StakeAcrossSender>ccipContractFactory.attach(address);
    } else {
      throw Error(
        `Contract ${contract} not valid. Must be "Protocol" or "Sender"`
      );
    }

    const [
      sourceChainSelector,
      senderContract,
      depositorEOA,
      transferredToken,
      amountTransferred,
    ] = await ccipContract.messageDetail(messageId);

    console.log(`\nmessage details received in ${contract} on ${networkName}: 
    messageId: ${messageId},
    sourceChainSelector: ${sourceChainSelector},
    senderContract: ${senderContract},
    depositorEOA: ${depositorEOA},
    transferredToken: ${transferredToken},
    amountTransferred: ${amountTransferred}
    `);

    // Checking state on Protocol.sol
    if (contract === "Protocol") {
      // read vault properties
      const vaultTotalAssets = await (
        ccipContract as StakeAcrossVaultProtocol
      ).totalAssets();
      const vaultTotalSupply = await (
        ccipContract as StakeAcrossVaultProtocol
      ).totalSupply();
      console.log(
        `\nVault Total Assets: ${hre.ethers.formatEther(
          vaultTotalAssets.toString()
        )}`
      );
      console.log(
        `\nVault Total Supply: ${hre.ethers.formatEther(
          vaultTotalSupply.toString()
        )}`
      );
    }
  });
