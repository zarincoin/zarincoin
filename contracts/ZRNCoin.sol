// SPDX-License-Identifier: MIT
/**
 * @title ZRNCoin ERC20 Token
 * @notice Non-upgradeable ERC20 with scheduled emissions (10% of current total supply) minted to a treasury address.
 * @dev Key properties:
 *  - Owner-controlled periodic emission via `mintNextEmission()` with `mintInterval` (in seconds).
 *  - One-way `finalizeMinting()` to permanently disable further emissions.
 *  - Owner `burnFromTreasury(uint256)` to burn tokens from the treasury address.
 *  - Owner can adjust the current interval via `setMintInterval(uint256)` BUT it must always be strictly greater
 *    than the monotonic floor `minMintInterval`. This is enforced by:
 *        require(newInterval > minMintInterval, "new min <= current min");
 *  - Owner can only raise the floor via `increaseMinMintInterval(uint256)`. Decreasing the floor is impossible.
 *  - Uses OpenZeppelin ERC20 and Ownable.
 *
 * Constructor:
 *  constructor(
 *      string memory name_,
 *      string memory symbol_,
 *      address treasury_,
 *      uint256 initialSupply,
 *      uint256 initialMintInterval
 *  )
 * Requirements:
 *  - `treasury_` must be non-zero.
 *  - If `initialSupply` > 0, it is minted to `treasury_` and `lastMintAt` is initialized to `block.timestamp`.
 *  - `mintInterval` is initialized to `initialMintInterval`. The floor `minMintInterval` starts at 0 so
 *    testing/bootstrap is easy; once you raise the floor, you can no longer set intervals <= floor.
 */

pragma solidity ^0.8.24;

import {ERC20}       from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable}     from "@openzeppelin/contracts/access/Ownable.sol";

contract ZRNCoin is ERC20, Ownable {
    address public immutable treasury;

    uint256 public mintInterval;
    uint256 public lastMintAt;
    bool    public mintingFinalized;

    event EmissionMinted(uint256 amount, uint256 newTotalSupply);
    event MintIntervalUpdated(uint256 newInterval);
    event MintingFinalized();
    event TreasuryBurn(uint256 amount);

constructor(
    string memory name_,
    string memory symbol_,
    address treasury_,
    uint256 initialSupply,
    uint256 initialMintInterval
) ERC20(name_, symbol_) {
    require(treasury_ != address(0), "zero treasury");

    treasury = treasury_;
    if (initialSupply > 0) {
        _mint(treasury_, initialSupply);
        lastMintAt = block.timestamp;
    }
    mintInterval = initialMintInterval;
}

    function mintNextEmission() external onlyOwner {
        require(!mintingFinalized, "minting finalized");
        if (mintInterval > 0) {
            require(block.timestamp >= lastMintAt + mintInterval, "interval not passed");
        }
        uint256 ts = totalSupply();
        require(ts > 0, "totalSupply=0");
        uint256 amount = ts / 10; // 10%
        require(amount > 0, "amount=0");

        lastMintAt = block.timestamp;
        _mint(treasury, amount);
        emit EmissionMinted(amount, totalSupply());
    }

    function burnFromTreasury(uint256 amount) external onlyOwner {
        _burn(treasury, amount);
        emit TreasuryBurn(amount);
    }

    function finalizeMinting() external onlyOwner {
        require(!mintingFinalized, "already finalized");
        mintingFinalized = true;
        emit MintingFinalized();
    }

    function setMintInterval(uint256 newInterval) external onlyOwner {
        require(!mintingFinalized, "minting finalized");
        require(newInterval > mintInterval, "new min <= current min");
        mintInterval = newInterval;
        emit MintIntervalUpdated(newInterval);
    }
}
