// Deploy ZRNCoin using a Ledger device, signing exactly like depArb.js:
// 1) serialize unsigned tx
// 2) try resolution via ledgerService.resolveTransaction(...)
// 3) signTransaction(HD_PATH, raw, resolution) or fallback to 2-arg legacy
// 4) yParity for EIP-1559, or v as number for legacy
// 5) serialize with v/r/s and send raw
//
// Networks: mainnet | sepolia | arbitrumOne | bsc
// RPC via env: ETH_RPC_URL, SEPOLIA_RPC_URL, ARB_RPC_URL, BSC_RPC_URL
//
// ENV:
//   LEDGER_PATH="44'/60'/0'/0/0"
//   USE_LEDGER=1 (default) | 0 to force PK
//   DEPLOYER_PK=0x... (fallback when USE_LEDGER=0 or Ledger unavailable)
//   ZRN_NAME, ZRN_SYMBOL, ZRN_TREASURY, ZRN_INITIAL_SUPPLY (wei), ZRN_MINT_INTERVAL (seconds)
//
// Run examples:
//   npx hardhat --config hardhat.config.js run scripts/deploy-ledger-zarin.js --network sepolia
//   USE_LEDGER=0 DEPLOYER_PK=0x... npx hardhat --config hardhat.config.js run scripts/deploy-ledger-zarin.js --network bsc

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const AppEth = require("@ledgerhq/hw-app-eth").default;
const ledgerService = require("@ledgerhq/hw-app-eth/lib/services/ledger").default;

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

// Resolve network config (no hardhat imports; read HARDHAT_NETWORK or NETWORK)
function resolveNetwork() {
  const name = process.env.HARDHAT_NETWORK || process.env.NETWORK || "mainnet";
  if (name === "mainnet") {
    return {
      name,
      chainId: 1,
      rpc: env("ETH_RPC_URL", "https://rpc.ankr.com/eth"),
    };
  }
  if (name === "sepolia") {
    return {
      name,
      chainId: 11155111,
      rpc: env("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com"),
    };
  }
  if (name === "arbitrumOne") {
    return {
      name,
      chainId: 42161,
      rpc: env("ARB_RPC_URL", "https://arb1.arbitrum.io/rpc"),
    };
  }
  if (name === "bsc") {
    return {
      name,
      chainId: 56,
      rpc: env("BSC_RPC_URL", "https://bsc-dataseed.binance.org"),
    };
  }
  throw new Error(`Unsupported network: ${name}`);
}

function readArtifact() {
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "ZRNCoin.sol", "ZRNCoin.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run "npm run compile" first.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function buildGasFields(provider) {
  const fee = await provider.getFeeData();
  // If EIP-1559 is available, prefer type:2
  if (fee.maxFeePerGas && fee.maxPriorityFeePerGas) {
    return {
      type: 2,
      maxFeePerGas: fee.maxFeePerGas,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
    };
  }
  // Legacy fallback (e.g., BSC or non-1559 RPC)
  return {
    gasPrice: fee.gasPrice || ethers.utils.parseUnits("3", "gwei"),
  };
}

async function safeEstimateGas(provider, from, data) {
  try {
    const est = await provider.estimateGas({ from, to: null, data });
    return est.mul(120).div(100); // +20% buffer
  } catch (_) {
    return ethers.BigNumber.from("5000000");
  }
}

async function main() {
  // 1) Network / provider
  const netCfg = resolveNetwork();
  const provider = new ethers.providers.JsonRpcProvider(netCfg.rpc);
  console.log(`[deploy] Network: ${netCfg.name} (chainId=${netCfg.chainId})`);
  console.log(`[deploy] RPC: ${netCfg.rpc}`);

  // 2) Ledger or PK sender
  const HD_PATH = env("LEDGER_PATH", "44'/60'/0'/0/0");
  const useLedger = env("USE_LEDGER", "1") !== "0";

  let fromAddress;
  let transport = null;
  let ethApp = null;

  if (useLedger) {
    try {
      transport = await TransportNodeHid.create();
      ethApp = new AppEth(transport);
      console.log(HD_PATH);
      const { address } = await ethApp.getAddress(HD_PATH); //, false, true);
      fromAddress = address;
      console.log(`Ledger address: ${fromAddress} (path ${HD_PATH})`);
    } catch (e) {
      console.warn(e);
      console.warn("Ledger not available:", e.message || e);
    }
  }

  let pkWallet = null;
  if (!fromAddress) {
    const pk = process.env.DEPLOYER_PK;
    if (!pk) {
      throw new Error("Ledger unavailable and DEPLOYER_PK not set.");
    }
    pkWallet = new ethers.Wallet(pk, provider);
    fromAddress = await pkWallet.getAddress();
    console.log(`PK address: ${fromAddress}`);
  }

  // 3) Constructor args (defaults are safe; override with env)
  const NAME = env("ZRN_NAME", "ZRNCoin");
  const SYMBOL = env("ZRN_SYMBOL", "ZRN");
  const TREASURY = env("ZRN_TREASURY", fromAddress);
  const INITIAL_SUPPLY = env("ZRN_INITIAL_SUPPLY", ethers.utils.parseUnits("1000000", 18).toString()); // 1,000,000 ZRN
  const MINT_INTERVAL = env("ZRN_MINT_INTERVAL", "0"); // keep default 0 unless specified

  console.log("[deploy] Constructor:", { NAME, SYMBOL, TREASURY, INITIAL_SUPPLY, MINT_INTERVAL });

  // 4) Load artifact and encode data (exactly like depArb.js pattern)
  const artifact = readArtifact();
  const abi = artifact.abi;
  const iface = new ethers.utils.Interface(abi);
  const ctor = abi.find((x) => x.type === "constructor") || { inputs: [] };
  if ((ctor.inputs || []).length !== 5) {
    throw new Error(`Constructor expects 5 args, ABI shows ${(ctor.inputs || []).length}`);
  }
  const ctorArgs = [NAME, SYMBOL, TREASURY, ethers.BigNumber.from(INITIAL_SUPPLY), ethers.BigNumber.from(MINT_INTERVAL)];
  const encodedCtor = iface.encodeDeploy(ctorArgs);
  const data = artifact.bytecode + encodedCtor.slice(2);

  // 5) Gas / nonce
  const gasFields = await buildGasFields(provider);
  const nonce = await provider.getTransactionCount(fromAddress);
  const gasLimit = await safeEstimateGas(provider, fromAddress, data);

  // 6) Build unsigned creation tx
  const tx = {
    // to omitted for contract creation
    data,
    nonce,
    gasLimit,
    chainId: netCfg.chainId,
    ...gasFields, // type:2 fields or legacy gasPrice
    value: 0,
  };

  // 7) Sign and send EXACTLY like depArb.js
  let raw;
  if (ethApp) {
    const unsigned = ethers.utils.serializeTransaction(tx);
    const rawHex = unsigned.slice(2);
    let resolution = null;

    // Try legacy 2-arg style first: (raw, { externalPlugins, erc20, nft })
    try {
      resolution = await ledgerService.resolveTransaction(rawHex, {
        externalPlugins: true,
        erc20: true,
        nft: false,
      });
    } catch (e1) {
      try {
        // Newer hw-app-eth expects (raw, resolutionConfig={}, loadConfig)
        resolution = await ledgerService.resolveTransaction(
          rawHex,
          {},                                       // resolutionConfig
          { externalPlugins: true, erc20: true, nft: false } // loadConfig toggles
        );
      } catch (e2) {
        console.warn("[deploy] ledgerService.resolveTransaction failed → blind signing fallback:", (e2 && e2.message) || (e1 && e1.message) || e2 || e1);
        resolution = null;
      }
    }

    let sig;
    try {
      if (resolution) {
        // Preferred path with resolution (no warning)
        sig = await ethApp.signTransaction(HD_PATH, rawHex, resolution);
      } else {
        // Fallback: legacy 2-arg sign (requires Blind signing enabled in ETH app)
        sig = await ethApp.signTransaction(HD_PATH, rawHex);
      }
    } catch (eSign) {
      const msg = (eSign && eSign.message) || String(eSign);
      if (msg.includes("please provide the 'resolution' parameter")) {
        throw new Error("Ledger ETH app refused signing without 'resolution'. Enable Blind signing or ensure resolveTransaction is available.");
      }
      throw eSign;
    }

    // EIP-1559 vs legacy 'v'
    if (tx.type === 2) {
      const yParity = Number(sig.v) % 2; // 0 or 1
      raw = ethers.utils.serializeTransaction(tx, {
        v: yParity,
        r: "0x" + sig.r.padStart(64, "0"),
        s: "0x" + sig.s.padStart(64, "0"),
      });
    } else {
      const vNum = typeof sig.v === "string" && sig.v.startsWith("0x") ? parseInt(sig.v, 16) : Number(sig.v);
      raw = ethers.utils.serializeTransaction(tx, {
        v: vNum,
        r: "0x" + sig.r.padStart(64, "0"),
        s: "0x" + sig.s.padStart(64, "0"),
      });
    }
  } else {
    raw = await pkWallet.signTransaction(tx);
  }

  try {
    const resp = await provider.sendTransaction(raw);
    console.log("TX hash:", resp.hash);
    const receipt = await resp.wait();
    console.log("✅ Contract deployed at:", receipt.contractAddress);
    console.log("Name:", NAME, "| Symbol:", SYMBOL);
    console.log("Treasury:", TREASURY);
    console.log("InitialSupply (wei):", ethers.BigNumber.from(INITIAL_SUPPLY).toString());
    console.log("MintInterval (sec):", ethers.BigNumber.from(MINT_INTERVAL).toString());
  } finally {
    if (ethApp && transport && transport.close) {
      try { await transport.close(); } catch (_) {}
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

