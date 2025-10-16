require("dotenv").config();

require("solidity-coverage");
require("@nomiclabs/hardhat-ethers");              // ethers v5
require("@nomicfoundation/hardhat-chai-matchers"); // матчерЫ: .revertedWith/.emit/BN.eq
require("@openzeppelin/hardhat-upgrades");         // прокси/апгрейды (v1.x)
require("./tasks/fingerprint");

const INFURA_KEY = process.env.INFURA_KEY || "";

const {
  ETH_RPC_URL,
  SEPOLIA_RPC_URL,
  ARB_RPC_URL,
  BSC_RPC_URL,
  DEPLOYER_PK, // приватник, если не Ledger
} = process.env;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    mainnet: {
      url:
        process.env.ETH_RPC_URL ||
        (INFURA_KEY ? `https://mainnet.infura.io/v3/${INFURA_KEY}` : undefined),
      //url: ETH_RPC_URL || "https://rpc.ankr.com/eth",
      accounts: DEPLOYER_PK ? [DEPLOYER_PK] : [],
      chainId: 1,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: DEPLOYER_PK ? [DEPLOYER_PK] : [],
      chainId: 11155111,
    },
    arbitrumOne: {
      url: ARB_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: DEPLOYER_PK ? [DEPLOYER_PK] : [],
      chainId: 42161,
    },
    bsc: {
      url: BSC_RPC_URL || "https://bsc-dataseed.binance.org",
      accounts: DEPLOYER_PK ? [DEPLOYER_PK] : [],
      chainId: 56,
    },
  },
  // ВАЖНО: здесь НЕ подключаем verify-плагин, чтобы не конфликтовать с OZ
};

