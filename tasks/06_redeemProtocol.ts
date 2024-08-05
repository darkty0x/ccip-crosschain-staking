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
// npx hardhat redeem-protocol \
// --network sepolia \
// --address 0x6A10e6519a209482C8456C56768E7eA2fF0E19a1 \
// --dest-chain fuji \
// --receiver 0x1487f4304C8663683BEEf72B32bc8845F5Fb8941 \
// --amount 50

task("redeem-protocol", "redeem shares from protocol contract")
  .addParam("address", "address of CCIP Protocol contract to redeem from")
  .addParam("destChain", "destination chain as specified in networks.js file")
  .addParam("receiver", "address to receive redeemed tokens")
  .addParam("amount", "amount of shares to redeem in wei")
  .setAction(async (taskArgs, hre) => {
    // get network name from params
    const networkName = hre.network.name as keyof typeof networks;

    if (networkName != "fuji" && networkName != "sepolia") {
      throw Error(
        "This command is intended to be used with either Fuji or Sepolia."
      );
    }

    let { address, destChain, receiver, amount } = taskArgs;
    let destChainSelector =
      networks[destChain as keyof typeof networks].chainSelector;
    let bnmTokenAddress = networks[networkName].bnmToken;

    if (!bnmTokenAddress) {
      throw Error("Missing BnM Token Address from networks.js file");
    }

    const protocolFactory: StakeAcrossVaultProtocol__factory = <
      StakeAcrossVaultProtocol__factory
    >await hre.ethers.getContractFactory("StakeAcrossVaultProtocol");

    const protocolContract = <StakeAcrossVaultProtocol>(
      protocolFactory.attach(address)
    );
    const assetFromProtocol = await protocolContract.asset();
    console.log(`\nAsset from Protocol: ${assetFromProtocol}`);
    console.log(`\nBnM Token Address:   ${bnmTokenAddress}`);
    if (assetFromProtocol !== bnmTokenAddress) {
      throw Error(
        `Asset from Protocol '${assetFromProtocol}' does not match BnM Token Address '${bnmTokenAddress}'`
      );
    }

    // read vault balances
    const vaultTotalAssets = await protocolContract.totalAssets();
    const vaultTotalSupply = await protocolContract.totalSupply();
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

    // read user balances
    // const [deployer] = await hre.ethers.getSigners();
    const userBalance = await protocolContract.balanceOf(receiver);
    const symbol = await protocolContract.symbol();
    console.log(
      `\nUser ${symbol} Balance: ${hre.ethers.formatEther(
        userBalance.toString()
      )}`
    );

    // read vault preview redeem for user balance
    const assetsRedeem = await protocolContract.previewRedeem(userBalance);
    console.log(
      `\nVault Preview Redeem: ${hre.ethers.formatEther(
        assetsRedeem.toString()
      )}`
    );

    // redeem shares
    console.log(
      `\nRedeeming ${hre.ethers.formatEther(
        amount.toString()
      )} ${symbol} from vault`
    );

    // log function call parameters
    console.log(`\nParameters:
    amount: ${amount}
    destChainSelector: ${destChainSelector}
    receiver address: ${receiver}`);

    try {
      // ccipRedeem(uint256 shares, uint64 destinationChain, address receiver)
      const redeemTx = await protocolContract.ccipRedeem(
        amount,
        destChainSelector,
        receiver
      );

      await redeemTx.wait();
      console.log(`Redeem Tx: ${redeemTx.hash}`);
    } catch (error) {
      console.log(`Error: ${error}`);
    }

    // read vault balances
    const vaultTotalAssetsAfter = await protocolContract.totalAssets();
    const vaultTotalSupplyAfter = await protocolContract.totalSupply();
    console.log(
      `\nVault Total Assets after redeem: ${hre.ethers.formatEther(
        vaultTotalAssetsAfter.toString()
      )}`
    );
    console.log(
      `\nVault Total Supply after redeem: ${hre.ethers.formatEther(
        vaultTotalSupplyAfter.toString()
      )}`
    );

    const userBalanceAfter = await protocolContract.balanceOf(receiver);
    console.log(
      `\nUser ${symbol} Balance after redeem: ${hre.ethers.formatEther(
        userBalanceAfter.toString()
      )}`
    );
  });
