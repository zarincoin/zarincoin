# Zarin (ZRN)

Minimalist, verifiable ERC-20. Transparent price discovery first; then a predictable, community-visible policy (optional reserve, extended emission intervals, and discretionary treasury burns).  
**Disclaimer:** Not affiliated with any government body. No wash trading, no fake volume, no hidden taxes.

---

## Contents
- [Overview](#overview)
- [Contracts](#contracts)
- [Fingerprints](#fingerprints)
- [Verification](#verification)
- [Getting started (dev)](#getting-started-dev)
- [Network scripts](#network-scripts)
- [Policy (short)](#policy-short)
- [Links](#links)
- [License](#license)

---

## Overview
Zarin (symbol **ZRN**) is a minimalist ERC-20 intended to be easy to verify and simple to reason about. All deployments below are compiled from the **same source** and verified on chain explorers.

---

## Contracts

All deployments use identical bytecode & ABI.

| Network | Address (verified) |
| --- | --- |
| **Ethereum** | [`0xA6C63DC375b0206373fB99F856B4f71B311670B9`](https://etherscan.io/address/0xA6C63DC375b0206373fB99F856B4f71B311670B9#code) |
| **Arbitrum One** | [`0x9F9d504ca217cfcAfbC250308385AD14b17bfBC1`](https://arbiscan.io/address/0x9F9d504ca217cfcAfbC250308385AD14b17bfBC1#code) |
| **BNB Smart Chain** | [`0x0d431E5A8c290f11a0e63911eC4202FB60D2E80b`](https://bscscan.com/address/0x0d431E5A8c290f11a0e63911eC4202FB60D2E80b#code) |
| **Sepolia (test)** | [`0xf2695b87924b728e1478Cf9e0F326262c983e6cA`](https://sepolia.etherscan.io/address/0xf2695b87924b728e1478Cf9e0F326262c983e6cA#code) |

**Constructor (all networks):**
```
"Zarin", "ZRN", <treasury=0xf5D895503b5b6AC08268a86aE86A73C33458C1a8>, 1000000000000000000000000000, 0
```

---

## Fingerprints

Identical across chains (expected; same compiler & optimizer settings).

```
codehash:   0x91e39f1387acc69414992069e028d4885c60a05169a8561c020e717157d66a95
abi.sha256: 0xa67f2cfa329a774a9fe0091585bd1c559e3acae837345d03dc66cbaae03af838
```

Reproduce locally (after `npx hardhat compile`):

```bash
# Ethereum
npm run fp:mainnet -- --address 0xA6C63DC375b0206373fB99F856B4f71B311670B9
# Arbitrum One
npm run fp:arb1    -- --address 0x9F9d504ca217cfcAfbC250308385AD14b17bfBC1
# BSC
npm run fp:bsc     -- --address 0x0d431E5A8c290f11eC4202FB60D2E80b
# Sepolia
npm run fp:sepolia -- --address 0xf2695b87924b728e1478Cf9e0F326262c983e6cA
```

---

## Verification

Using preconfigured scripts (constructor args inline):

```bash
# Ethereum
npm run verify:mainnet -- 0xA6C63DC375b0206373fB99F856B4f71B311670B9 "Zarin" "ZRN" 0xf5D895503b5b6AC08268a86aE86A73C33458C1a8 1000000000000000000000000000 0
# Arbitrum One
npm run verify:arb1    -- 0x9F9d504ca217cfcAfbC250308385AD14b17bfBC1 "Zarin" "ZRN" 0xf5D895503b5b6AC08268a86aE86A73C33458C1a8 1000000000000000000000000000 0
# BSC
npm run verify:bsc     -- 0x0d431E5A8c290f11a0e63911eC4202FB60D2E80b "Zarin" "ZRN" 0xf5D895503b5b6AC08268a86aE86A73C33458C1a8 1000000000000000000000000000 0
# Sepolia
npm run verify:sepolia -- 0xf2695b87924b728e1478Cf9e0F326262c983e6cA "Zarin" "ZRN" 0xf5D895503b5b6AC08268a86aE86A73C33458C1a8 1000000000000000000000000000 0
```

> Note: Hardhat may warn on Node v18.20.8; builds are stable here. Upgrade to Node 20 LTS when convenient.

---

## Getting started (dev)

**Requirements**
- Node.js 18+ (LTS recommended), npm
- Hardhat + toolbox (`@nomicfoundation/hardhat-toolbox`)

**Install**
```bash
npm ci
# or
npm i
```

**Compile & test**
```bash
npx hardhat compile
npx hardhat test
```

**Env template (`.env.example`)**
```
MAINNET_RPC_URL=
ARBITRUM_RPC_URL=
BSC_RPC_URL=
SEPOLIA_RPC_URL=

DEPLOYER_PK=            # optional (for non-Ledger deploys)

ETHERSCAN_API_KEY=
ARBISCAN_API_KEY=
BSCSCAN_API_KEY=
```

> Never commit `.env`. Ledger deployer is supported via deploy script; for first tests you may use a funded test key.

---

## Network scripts

**Deploy (examples)**
```bash
npx hardhat run scripts/deploy-ledger-zarin.js --network mainnet
npx hardhat run scripts/deploy-ledger-zarin.js --network arbitrumOne
npx hardhat run scripts/deploy-ledger-zarin.js --network bsc
npx hardhat run scripts/deploy-ledger-zarin.js --network sepolia
```

**Verify & Fingerprint** — see sections above for exact commands.

---

## Policy (short)

- No premine / no hidden team–VC allocations at launch.  
- Transparent liquidity; no wash trading or artificial volume.  
- Emission control (treasury):  
  - `mintNextEmission()` → +10% to treasury;  
  - `increaseMintInterval()` → intervals only increase;  
  - optional `finalizeMinting()` → disable further minting.  
- Owner/treasury are recommended to be multisig; operational transparency via website and ENS records.

---

## Links
- Website: https://zrncoin.com  
- ENS: `zarincoin.eth`  
- Telegram (announcements): https://t.me/zarintoken  
- Telegram (chat EN): https://t.me/zarintoken_chat  
- Telegram (chat RU): https://t.me/zarintoken_ru  
- GitHub: https://github.com/zarincoin/zarincoin

---

## License
MIT — see [LICENSE](LICENSE).
