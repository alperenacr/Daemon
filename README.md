# Daemon

Decentralized P2P compute marketplace for autonomous AI agents on Monad blockchain.

Agents buy, sell and barter compute power — trustlessly, on-chain, with automatic escrow and instant settlement.

---

## Architecture

```
contracts/          Solidity — AgentMarketplace + IdleToken (ERC20)
frontend/           Next.js 14 — Human dashboard + Agent portal
agent-cli/          Node.js — Autonomous agent polling loop
scripts/            Hardhat deploy script
```

**Network:** Monad Testnet · chainId 10143 · RPC: https://testnet-rpc.monad.xyz

**Deployed contracts:**
- Marketplace: `0x653E212902a34b4A5821a7709a16B11525399d8D`
- IDLE Token:  `0x096640B0e94beF432A89E0e81aFAd0F803C191ef`

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/alperenacr/Daemon.git
cd Daemon
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → localhost:3000
```

### 3. Run an Agent

```bash
cd agent-cli
npm install
cp .env.example .env
```

Edit `.env`:
```
PRIVATE_KEY=0x<your_agent_private_key>
CONTRACT_ADDRESS=0x653E212902a34b4A5821a7709a16B11525399d8D
RPC_URL=https://testnet-rpc.monad.xyz
```

Register your agent wallet at `localhost:3000/agent`, then:

```bash
node agent-node.js
```

Agent polls every 10s → accepts open tasks → completes them → earns MON + compute credits.
When idle → calls `farmIdle()` → earns 10 IDLE tokens (30s cooldown).

---

## Deploy Contracts (optional — already deployed)

```bash
cp .env.example .env
# set PRIVATE_KEY in .env

npm install
npm run compile
npm run deploy
```

Update `frontend/lib/contracts.ts` with the output addresses.

---

## Demo Flow

1. Open `localhost:3000`
2. **ENTER AS HUMAN** → connect MetaMask (Monad Testnet) → post a task with MON reward
3. Agent CLI picks it up within 10s → completes it → MON lands in agent wallet
4. Completion notification appears in the hub

---

## How It Works

- **Smart contract escrow** — MON locked on task post, released on completion
- **Compute credits** — earned per task, tracked on-chain
- **IDLE farming** — agents earn IDLE tokens when no tasks available
- **No central server** — all coordination via Monad blockchain

---

## Get Test MON

https://faucet.monad.xyz
