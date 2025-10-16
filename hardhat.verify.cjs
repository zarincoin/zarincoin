require("dotenv").config();

require("@nomiclabs/hardhat-ethers");       // ethers v5
require("@nomicfoundation/hardhat-verify"); // V2 (2.0.14)

const {
  ETH_RPC_URL,
  SEPOLIA_RPC_URL,
  ARB_RPC_URL,
  BSC_RPC_URL,
  ETHERSCAN_API_KEY, // мультичейн-ключ из etherscan.io
} = process.env;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    mainnet:     { url: ETH_RPC_URL,     chainId: 1 },
    sepolia:     { url: SEPOLIA_RPC_URL, chainId: 11155111 },
    arbitrumOne: { url: ARB_RPC_URL,     chainId: 42161 },
    bsc:         { url: BSC_RPC_URL,     chainId: 56 },
  },
  etherscan: {
    // ОДНА строка — единый ключ Etherscan V2 для всех сетей (включая BSC)
    apiKey: ETHERSCAN_API_KEY,
  },
  sourcify: { enabled: false }, // убираем баннер
};
