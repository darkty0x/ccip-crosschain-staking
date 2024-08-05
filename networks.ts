// All supported networks and related contract addresses are defined here.
//
// CCIP Supported Networks Testnet - v1.2.0 https://docs.chain.link/ccip/supported-networks/v1_2_0/testnet#overview
// LINK token addresses: https://docs.chain.link/resources/link-token-contracts/
// Price feeds addresses: https://docs.chain.link/data-feeds/price-feeds/addresses
// Chain IDs: https://chainlist.org/?testnets=true

import * as dotenvenc from "@chainlink/env-enc";
dotenvenc.config();

const DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS = 2;
const npmCommand = process.env.npm_lifecycle_event;
const isTestEnvironment = npmCommand == "test" || npmCommand == "test:unit";

// Set EVM private key (required)
const PRIVATE_KEY1 = process.env.PRIVATE_KEY1;
const PRIVATE_KEY2 = process.env.PRIVATE_KEY2;

// validate private keys are set and create array of accounts with both keys


if (!isTestEnvironment && !PRIVATE_KEY1) {
  throw Error(
    "Set the PRIVATE_KEY environment variable with your EVM wallet private key"
  );
}

const networks = {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL || "THIS HAS NOT BEEN SET",
    gasPrice: undefined,
    // router: "0xd0daae2231e9cb96b94c8512223533293c3693bf",
    router: "0x0bf3de8c5d3e8a2b34d2beeb17abfcebaf363a59",
    chainSelector: "16015286601757825753",
    accounts: PRIVATE_KEY1 !== undefined ? [PRIVATE_KEY1, PRIVATE_KEY2] : [],
    verifyApiKey: "THIS HAS NOT BEEN SET",
    chainId: 11155111,
    confirmations: DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "ETH",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789", // Sepolia Link
    bnmToken: "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05", // Sepolia -> Fuji
  },
  fuji: {
    url: process.env.AVALANCHE_FUJI_RPC_URL || "THIS HAS NOT BEEN SET",
    // router: "0x554472a2720e5e7d5d3c817529aba05eed5f82d8",
    router: "0xf694e193200268f9a4868e4aa017a0118c9a8177",
    chainSelector: "14767482510784806043",
    gasPrice: undefined,
    accounts: PRIVATE_KEY1 !== undefined ? [PRIVATE_KEY1, PRIVATE_KEY2] : [],
    verifyApiKey: "THIS HAS NOT BEEN SET",
    chainId: 43113,
    confirmations: 2 * DEFAULT_VERIFICATION_BLOCK_CONFIRMATIONS,
    nativeCurrencySymbol: "AVAX",
    linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846", // Fuji Link
    bnmToken: "0xd21341536c5cf5eb1bcb58f6723ce26e8d8e90e4", // Fuji -> Sepolia
  },
};

export { networks };
