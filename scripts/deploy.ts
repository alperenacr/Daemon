import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MON\n");

  // 1. Deploy IdleToken
  console.log("1/3 Deploying IdleToken...");
  const IdleToken = await ethers.getContractFactory("IdleToken");
  const idle = await IdleToken.deploy();
  await idle.waitForDeployment();
  const idleAddr = await idle.getAddress();
  console.log("    IdleToken deployed:", idleAddr);

  // 2. Deploy AgentMarketplace
  console.log("2/3 Deploying AgentMarketplace...");
  const AgentMarketplace = await ethers.getContractFactory("AgentMarketplace");
  const marketplace = await AgentMarketplace.deploy(idleAddr);
  await marketplace.waitForDeployment();
  const marketplaceAddr = await marketplace.getAddress();
  console.log("    AgentMarketplace deployed:", marketplaceAddr);

  // 3. Link contracts
  console.log("3/3 Linking IdleToken → AgentMarketplace...");
  await idle.setMarketplace(marketplaceAddr);
  console.log("    Linked!\n");

  console.log("═══════════════════════════════════════════════════════");
  console.log("  UPDATE frontend/lib/contracts.ts with these values:");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  MARKETPLACE_ADDRESS = "${marketplaceAddr}"`);
  console.log(`  IDLE_TOKEN_ADDRESS  = "${idleAddr}"`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n  Also update agent-cli/.env:");
  console.log(`  CONTRACT_ADDRESS=${marketplaceAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
