// scripts/fingerprint.js
// All comments are in English (per project rule).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const hre = require("hardhat");
const { ethers, artifacts } = hre;

function stableStringify(obj) {
  const allKeys = new Set();
  JSON.stringify(obj, (k, v) => (allKeys.add(k), v));
  const keys = [...allKeys];
  keys.sort();
  return JSON.stringify(obj, keys);
}

async function main() {
  const addr = process.argv[2];
  if (!addr) {
    console.error("Usage: node scripts/fingerprint.js <address>");
    process.exit(1);
  }

  // 1) codehash = keccak256(runtimeBytecode)
  const code = await ethers.provider.getCode(addr);
  if (!code || code === "0x") {
    throw new Error(`No code at ${addr} on network ${hre.network.name}`);
  }
  const codehash = ethers.utils.keccak256(code);

  // 2) abi.sha256 from local artifact
  //    Hardhat writes artifacts to artifacts/contracts/ZRNCoin.sol/ZRNCoin.json
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "ZRNCoin.sol",
    "ZRNCoin.json"
  );
  const a = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = a.abi;
  const abiNormalized = stableStringify(abi);
  const abiSha256 = crypto.createHash("sha256").update(abiNormalized).digest("hex");

  console.log(JSON.stringify({
    network: hre.network.name,
    address: addr,
    codehash,
    "abi.sha256": "0x" + abiSha256
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

