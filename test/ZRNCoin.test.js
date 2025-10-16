const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// helpers for ethers v5
const DECIMALS = 18;
const E = (n) => ethers.utils.parseUnits(n.toString(), DECIMALS);

describe("ZRNCoin (ethers v5 tests)", function () {
  let owner, other, treasury, coin;

  const NAME = "ZRN Coin";
  const SYMBOL = "ZRN";

  async function deploy(initialSupply = E(1_000_000), mintInterval = 0) {
    [owner, other, treasury] = await ethers.getSigners();
    const ZRN = await ethers.getContractFactory("contracts/ZRNCoin.sol:ZRNCoin", owner);
    coin = await ZRN.deploy(
      NAME,
      SYMBOL,
      await treasury.getAddress(),
      initialSupply,
      mintInterval
    );
    await coin.deployed();
    return coin;
  }

  describe("constructor", () => {
    it("mints initial supply to treasury", async () => {
      await deploy(E(1_000_000));
      const ts = await coin.totalSupply();
      const tr = await coin.balanceOf(await treasury.getAddress());
      expect(ts).to.eq(E(1_000_000));
      expect(tr).to.eq(E(1_000_000));
    });

    it("reverts on zero treasury", async () => {
      const [deployer] = await ethers.getSigners();
      const ZRN = await ethers.getContractFactory("contracts/ZRNCoin.sol:ZRNCoin", deployer);
      await expect(
        ZRN.deploy(NAME, SYMBOL, ethers.constants.AddressZero, E(1_000_000), 0)
      ).to.be.revertedWith("zero treasury");
    });
  });

  describe("mintNextEmission", () => {
    it("only owner can mint", async () => {
      await deploy(E(1000));
      await expect(coin.connect(other).mintNextEmission())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("mints exactly 10% of current totalSupply to treasury", async () => {
      await deploy(E(1000));
      const tsBefore = await coin.totalSupply();
      const trBefore = await coin.balanceOf(await treasury.getAddress());

      //console.log("1");
      await expect(coin.mintNextEmission()).to.emit(coin, "EmissionMinted");
      //console.log("2");

      const tsAfter = await coin.totalSupply();
      const trAfter = await coin.balanceOf(await treasury.getAddress());

      const expected = tsBefore.div(10);
      expect(tsAfter.sub(tsBefore)).to.eq(expected);
      expect(trAfter.sub(trBefore)).to.eq(expected);
    });

it("enforces mintInterval when set", async () => {
  const oneDay = 24 * 60 * 60;
  await deploy(E(1000), oneDay);

  // need to wait the interval even for the first emission
  await network.provider.send("evm_increaseTime", [oneDay + 1]);
  await network.provider.send("evm_mine");

  await coin.mintNextEmission(); // теперь первая эмиссия проходит

  // next immediate attempt must revert
  await expect(coin.mintNextEmission()).to.be.revertedWith("interval not passed");

  // then wait again
  await network.provider.send("evm_increaseTime", [oneDay + 1]);
  await network.provider.send("evm_mine");

  await expect(coin.mintNextEmission()).to.not.be.reverted;
});

    it("reverts when totalSupply is zero", async () => {
      await deploy(ethers.BigNumber.from(0));
      await expect(coin.mintNextEmission()).to.be.revertedWith("totalSupply=0");
    });

    it("reverts when amount would be zero due to tiny supply", async () => {
      await deploy(ethers.BigNumber.from(5));
      await expect(coin.mintNextEmission()).to.be.revertedWith("amount=0");
    });
  });

  describe("finalizeMinting", () => {
    it("blocks further emissions", async () => {
      await deploy(E(1000));
      await coin.finalizeMinting();
      await expect(coin.mintNextEmission()).to.be.revertedWith(
        "minting finalized"
      );
    });

    it("onlyOwner", async () => {
      await deploy(E(1000));
      await expect(coin.connect(other).finalizeMinting())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("setMintInterval forbidden after finalize", async () => {
      await deploy(E(1000));
      await coin.finalizeMinting();
      await expect(coin.setMintInterval(0)).to.be.revertedWith(
        "minting finalized"
      );
    });
  });

  describe("burnFromTreasury", () => {
    it("onlyOwner can burn", async () => {
      await deploy(E(1000));
      await expect(coin.connect(other).burnFromTreasury(E(1)))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("burns from treasury and emits event", async () => {
      await deploy(E(1000));
      const trAddr = await treasury.getAddress();
      const tsBefore = await coin.totalSupply();
      const trBefore = await coin.balanceOf(trAddr);

      await expect(coin.burnFromTreasury(E(123)))
        .to.emit(coin, "TreasuryBurn")
        .withArgs(E(123));

      const tsAfter = await coin.totalSupply();
      const trAfter = await coin.balanceOf(trAddr);

      expect(tsBefore.sub(tsAfter)).to.eq(E(123));
      expect(trBefore.sub(trAfter)).to.eq(E(123));
    });

    it("reverts if treasury lacks tokens", async () => {
      await deploy(E(100));
      const trAddr = await treasury.getAddress();
      await coin.connect(treasury).transfer(await other.getAddress(), E(100));
      await expect(coin.burnFromTreasury(E(1))).to.be.reverted; // underflow
    });
  });

  describe("metadata", () => {
    it("has correct name/symbol/decimals", async () => {
      await deploy(E(1_000));
      expect(await coin.name()).to.eq(NAME);
      expect(await coin.symbol()).to.eq(SYMBOL);
      expect(await coin.decimals()).to.eq(18);
    });
  });

  describe("ownership", () => {
    it("transferOwnership works", async () => {
      await deploy(E(1_000));
      const newOwner = await other.getAddress();
      await coin.transferOwnership(newOwner);
      await expect(coin.connect(other).mintNextEmission()).to.not.be.reverted;
    });
  });
});

