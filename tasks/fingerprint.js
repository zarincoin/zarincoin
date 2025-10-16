// tasks/fingerprint.js
// Prints codehash (keccak256 of runtime bytecode) and abi.sha256 for a deployed contract.
const { task } = require("hardhat/config");
const crypto = require("crypto");

function stable(obj) {
  if (Array.isArray(obj)) return `[${obj.map(stable).join(",")}]`;
  if (obj && typeof obj === "object") {
    return `{${Object.keys(obj).sort().map(k => JSON.stringify(k)+":"+stable(obj[k])).join(",")}}`;
  }
  return JSON.stringify(obj);
}

task("fp", "Print codehash and abi.sha256 for a deployed contract")
  .addParam("address", "Deployed contract address")
  .addOptionalParam("contract", "Artifact name or FQN", "MI6Coin")
  .setAction(async ({ address, contract }, hre) => {
    const { ethers, artifacts, network } = hre;

    // 1) codehash from on-chain runtime bytecode
    const code = await ethers.provider.getCode(address);
    if (!code || code === "0x") {
      throw new Error(`No code at ${address} on network ${network.name}`);
    }
    const codehash = ethers.utils.keccak256(code);

    // 2) abi.sha256 from local artifact
    const artifact = await artifacts.readArtifact(contract);
    const abiSha = crypto.createHash("sha256")
      .update(stable(artifact.abi))
      .digest("hex");

    console.log(JSON.stringify({
      network: network.name,
      address,
      codehash,
      "abi.sha256": "0x" + abiSha
    }, null, 2));
  });

