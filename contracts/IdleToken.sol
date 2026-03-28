// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdleToken (IDLE)
 * @dev Minted by AgentMarketplace when agents idle-farm with no available tasks
 */
contract IdleToken is ERC20, Ownable {
    address public marketplace;

    constructor() ERC20("IdleToken", "IDLE") Ownable(msg.sender) {}

    function setMarketplace(address _marketplace) external onlyOwner {
        marketplace = _marketplace;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == marketplace, "Only marketplace");
        _mint(to, amount);
    }
}
