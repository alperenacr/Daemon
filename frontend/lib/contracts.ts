import { parseAbi, parseEther } from 'viem'

// ─── Contract Addresses ──────────────────────────────────────────────────────
// TODO: Update after running `npm run deploy` in the root contracts folder
export const MARKETPLACE_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`
export const IDLE_TOKEN_ADDRESS   = '0x0000000000000000000000000000000000000000' as `0x${string}`

// ─── ABIs ────────────────────────────────────────────────────────────────────
export const MARKETPLACE_ABI = parseAbi([
  'function taskCounter() view returns (uint256)',
  'function computeCredits(address) view returns (uint256)',
  'function registeredAgents(address) view returns (bool)',
  'function lastIdleTime(address) view returns (uint256)',
  'function getOpenTasks() view returns ((uint256 id, address poster, address worker, string description, uint256 reward, uint256 creditReward, uint8 status, uint256 createdAt)[])',
  'function registerAgent(address agentAddress)',
  'function postTask(string description, uint256 creditReward) payable',
  'function acceptTask(uint256 taskId)',
  'function completeTask(uint256 taskId)',
  'function farmIdle()',
  'event TaskPosted(uint256 indexed taskId, address indexed poster, uint256 reward)',
  'event TaskAccepted(uint256 indexed taskId, address indexed worker)',
  'event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 reward)',
  'event IdleFarmed(address indexed agent, uint256 amount)',
])

export const IDLE_TOKEN_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function symbol() view returns (string)',
])

// ─── Types ───────────────────────────────────────────────────────────────────
export type Task = {
  id: bigint
  poster: `0x${string}`
  worker: `0x${string}`
  description: string
  reward: bigint
  creditReward: bigint
  status: number
  createdAt: bigint
}

// ─── Demo Mock Data ───────────────────────────────────────────────────────────
// Shown when wallet not connected or contract not deployed — makes demo look alive
export const MOCK_TASKS: Task[] = [
  {
    id: 1n,
    poster: '0x742d35Cc6634C0532925a3b8D4C9b5E1a72e4f28',
    worker: '0x0000000000000000000000000000000000000000',
    description: 'Summarize: OpenAI-Q4-2024-Report.pdf (47 pages)',
    reward: parseEther('0.1'),
    creditReward: 50n,
    status: 0,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 300),
  },
  {
    id: 2n,
    poster: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    worker: '0x0000000000000000000000000000000000000000',
    description: 'Monte Carlo simulation: 10K iterations, finance-model-v3.json',
    reward: parseEther('0.5'),
    creditReward: 100n,
    status: 0,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 120),
  },
  {
    id: 3n,
    poster: '0xdEAD000000000000000042069420694206942069',
    worker: '0x0000000000000000000000000000000000000000',
    description: 'Image classification batch: retail-dataset-v2.zip (2.1 GB)',
    reward: parseEther('0.25'),
    creditReward: 75n,
    status: 0,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 60),
  },
]

export const MOCK_STATS = {
  monBalance:    '2.847',
  credits:       450,
  idleTokens:    130,
  activeAgents:  7,
  tasksCompleted: 23,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function shortenAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatMON(wei: bigint): string {
  const eth = Number(wei) / 1e18
  return eth.toFixed(4)
}

export function timeAgo(ts: bigint): string {
  const seconds = Math.floor(Date.now() / 1000) - Number(ts)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
