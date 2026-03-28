/**
 * Daemon — Local AI Agent
 *
 * Behavior:
 *  1. Poll contract for open tasks every 10s
 *  2. If task found → acceptTask() → wait 3s (simulate work) → completeTask()
 *  3. If no tasks  → farmIdle() (30s cooldown enforced by contract)
 *
 * Usage:
 *   cp .env.example .env   # fill in PRIVATE_KEY + CONTRACT_ADDRESS
 *   npm install
 *   node agent-node.js
 */

require('dotenv').config()
const { ethers } = require('ethers')

// ─── Config ──────────────────────────────────────────────────────────────────
const RPC_URL          = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'
const PRIVATE_KEY      = process.env.PRIVATE_KEY
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const POLL_INTERVAL_MS = 10_000  // 10 seconds
const WORK_SIMULATE_MS = 3_000   // 3 seconds fake "compute"

if (!PRIVATE_KEY)      { console.error('[FATAL] PRIVATE_KEY not set in .env'); process.exit(1) }
if (!CONTRACT_ADDRESS) { console.error('[FATAL] CONTRACT_ADDRESS not set in .env'); process.exit(1) }

// ─── ABI (minimal — only what the agent needs) ───────────────────────────────
const ABI = [
  'function getOpenTasks() view returns ((uint256 id, address poster, address worker, string description, uint256 reward, uint256 creditReward, uint8 status, uint256 createdAt)[])',
  'function acceptTask(uint256 taskId)',
  'function completeTask(uint256 taskId)',
  'function farmIdle()',
  'function computeCredits(address) view returns (uint256)',
  'function lastIdleTime(address) view returns (uint256)',
  'event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 reward)',
  'event IdleFarmed(address indexed agent, uint256 amount)',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function log(tag, msg) {
  const ts = new Date().toISOString().slice(11, 19)
  const tagPad = tag.padEnd(7)
  console.log(`${ts}  [${tagPad}]  ${msg}`)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function shortAddr(addr) { return `${addr.slice(0, 6)}...${addr.slice(-4)}` }

// ─── Main loop ───────────────────────────────────────────────────────────────
async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet)

  const chainId  = (await provider.getNetwork()).chainId
  const balance  = await provider.getBalance(wallet.address)

  console.log('═'.repeat(65))
  console.log('  DAEMON AGENT — ONLINE')
  console.log('═'.repeat(65))
  log('ADDR',    wallet.address)
  log('NETWORK', `Monad Testnet · chainId ${chainId}`)
  log('BALANCE', `${ethers.formatEther(balance)} MON`)
  log('POLL',    `Every ${POLL_INTERVAL_MS / 1000}s`)
  console.log('═'.repeat(65))
  console.log()

  let cycle = 0

  while (true) {
    cycle++
    log('CYCLE', `#${cycle} — scanning marketplace...`)

    try {
      // ── Fetch state ──────────────────────────────────────────────────────
      const [openTasks, credits] = await Promise.all([
        contract.getOpenTasks(),
        contract.computeCredits(wallet.address),
      ])

      log('SCAN', `Open tasks: ${openTasks.length} | Credits: ${credits.toString()}`)

      // ── Task available? ──────────────────────────────────────────────────
      if (openTasks.length > 0) {
        const task = openTasks[0]
        const reward = ethers.formatEther(task.reward)
        log('TASK', `#${task.id} — "${task.description}"`)
        log('TASK', `Reward: ${reward} MON | Credits offered: ${task.creditReward}`)

        // Accept
        log('TX', 'Submitting acceptTask()...')
        const acceptTx = await contract.acceptTask(task.id)
        const acceptReceipt = await acceptTx.wait()
        log('OK', `Accepted · gas: ${acceptReceipt.gasUsed} · block: ${acceptReceipt.blockNumber}`)

        // Simulate work
        log('WORK', `Processing... (${WORK_SIMULATE_MS / 1000}s simulated compute)`)
        await sleep(WORK_SIMULATE_MS)

        // Complete
        log('TX', 'Submitting completeTask()...')
        const completeTx = await contract.completeTask(task.id)
        const completeReceipt = await completeTx.wait()
        log('OK', `Completed · gas: ${completeReceipt.gasUsed} · block: ${completeReceipt.blockNumber}`)
        log('$$', `+${reward} MON collected | +100 Compute Credits`)

      } else {
        // ── No tasks → idle farm ─────────────────────────────────────────
        log('IDLE', 'No tasks. Triggering farmIdle()...')
        try {
          const farmTx = await contract.farmIdle()
          const farmReceipt = await farmTx.wait()
          log('FARM', `+10 IDLE tokens · gas: ${farmReceipt.gasUsed} · block: ${farmReceipt.blockNumber}`)
        } catch (e) {
          const msg = e?.reason || e?.message || ''
          if (msg.includes('Cooldown') || msg.includes('cooldown')) {
            log('WAIT', 'Idle cooldown active (30s). Skipping farm.')
          } else {
            log('ERR', `farmIdle failed: ${msg.slice(0, 80)}`)
          }
        }
      }

    } catch (e) {
      log('ERR', (e?.message || String(e)).slice(0, 100))
    }

    log('SLEEP', `Next poll in ${POLL_INTERVAL_MS / 1000}s...\n`)
    await sleep(POLL_INTERVAL_MS)
  }
}

main().catch(e => {
  console.error('[FATAL]', e)
  process.exit(1)
})
