'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  useAccount, useConnect, useDisconnect, useBalance,
  useReadContract, useWriteContract, useWatchContractEvent,
} from 'wagmi'
import { injected } from 'wagmi/connectors'
import { parseEther, formatEther } from 'viem'
import AgentHub, { type IncomingTask } from '../../components/AgentHub'
import {
  MARKETPLACE_ADDRESS, IDLE_TOKEN_ADDRESS,
  MARKETPLACE_ABI, IDLE_TOKEN_ABI,
  MOCK_TASKS, MOCK_STATS,
  Task, shortenAddr, formatMON, timeAgo,
} from '../../lib/contracts'

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`bg-dark-panel border ${color} rounded-xl p-4 flex flex-col gap-1`}>
      <span className="text-gray-500 text-xs font-mono uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-bold font-mono ${color.includes('cyan') ? 'text-neon-cyan' : color.includes('green') ? 'text-neon-green' : 'text-neon-purple'}`}>
        {value}
      </span>
    </div>
  )
}

function TaskCard({ task, onAccept, isConnected }: { task: Task; onAccept: (id: bigint) => void; isConnected: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-panel border border-dark-border rounded-xl p-4 hover:border-cyan-900 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-green-950 text-green-400 border border-green-900 px-2 py-0.5 rounded font-mono">
              OPEN
            </span>
            <span className="text-gray-600 text-xs font-mono">#{task.id.toString()}</span>
            <span className="text-gray-600 text-xs font-mono ml-auto">{timeAgo(task.createdAt)}</span>
          </div>
          <p className="text-gray-200 text-sm font-mono mb-2 truncate">{task.description}</p>
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-neon-cyan">{formatMON(task.reward)} MON</span>
            <span className="text-purple-400">+{task.creditReward.toString()} Credits</span>
            <span className="text-gray-600">by {shortenAddr(task.poster)}</span>
          </div>
        </div>
        <button
          onClick={() => onAccept(task.id)}
          disabled={!isConnected}
          className="shrink-0 px-3 py-2 text-xs font-mono border border-cyan-800 text-neon-cyan rounded-lg
            hover:bg-cyan-900/30 hover:border-neon-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ACCEPT
        </button>
      </div>
    </motion.div>
  )
}

// ─── Setup Instructions ───────────────────────────────────────────────────────
function SetupInstructions() {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
      <h3 className="text-neon-cyan font-mono text-sm font-bold mb-4 uppercase tracking-widest">
        Setup Your Agent
      </h3>
      <div className="space-y-3 font-mono text-xs text-gray-400">
        <div>
          <span className="text-gray-500">1.</span> Clone &amp; install agent:
          <pre className="mt-1 bg-black/40 rounded p-2 text-green-400 text-xs overflow-x-auto">
{`cd Daemon/agent-cli
npm install`}
          </pre>
        </div>
        <div>
          <span className="text-gray-500">2.</span> Configure environment:
          <pre className="mt-1 bg-black/40 rounded p-2 text-green-400 text-xs overflow-x-auto">
{`cp .env.example .env
# Set PRIVATE_KEY, CONTRACT_ADDRESS`}
          </pre>
        </div>
        <div>
          <span className="text-gray-500">3.</span> Register your agent wallet on this dashboard, then:
          <pre className="mt-1 bg-black/40 rounded p-2 text-green-400 text-xs overflow-x-auto">
{`node agent-node.js`}
          </pre>
        </div>
        <div className="text-gray-600 pt-2 border-t border-dark-border">
          Agent polls every 10s. If tasks exist → accept+complete.
          If no tasks → farmIdle() (30s cooldown).
        </div>
      </div>
    </div>
  )
}

// ─── Post Task Form ────────────────────────────────────────────────────────────
function PostTaskForm({ onPost }: { onPost: (desc: string, credits: bigint, value: bigint) => void }) {
  const [desc, setDesc] = useState('')
  const [reward, setReward] = useState('0.1')
  const [credits, setCredits] = useState('50')
  const { isConnected } = useAccount()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!desc.trim()) return
    onPost(desc, BigInt(credits), parseEther(reward))
    setDesc('')
  }

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
      <h3 className="text-neon-cyan font-mono text-sm font-bold mb-4 uppercase tracking-widest">
        Post New Task
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-gray-500 text-xs font-mono block mb-1">DESCRIPTION</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            placeholder="e.g. Summarize document.pdf, run simulation..."
            className="w-full bg-black/40 border border-dark-border rounded-lg px-3 py-2 text-sm font-mono
              text-gray-200 placeholder-gray-700 focus:outline-none focus:border-cyan-800 resize-none"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-gray-500 text-xs font-mono block mb-1">REWARD (MON)</label>
            <input
              type="number" step="0.01" min="0.01"
              value={reward}
              onChange={e => setReward(e.target.value)}
              className="w-full bg-black/40 border border-dark-border rounded-lg px-3 py-2 text-sm font-mono
                text-neon-cyan focus:outline-none focus:border-cyan-800"
            />
          </div>
          <div className="flex-1">
            <label className="text-gray-500 text-xs font-mono block mb-1">CREDITS</label>
            <input
              type="number" min="0"
              value={credits}
              onChange={e => setCredits(e.target.value)}
              className="w-full bg-black/40 border border-dark-border rounded-lg px-3 py-2 text-sm font-mono
                text-purple-400 focus:outline-none focus:border-purple-800"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!isConnected || !desc.trim()}
          className="w-full py-2.5 text-sm font-mono font-bold border border-neon-cyan text-neon-cyan rounded-lg
            hover:bg-cyan-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {isConnected ? '+ POST TASK (ESCROW MON)' : 'CONNECT WALLET TO POST'}
        </button>
      </form>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HumanDashboard() {
  const router = useRouter()
  const { address, isConnected, chain } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [agentInput, setAgentInput] = useState('')
  const [mockTasks, setMockTasks] = useState<Task[]>(MOCK_TASKS)

  // Hub'a iletilen task (form submit edilince tetiklenir)
  const [incomingTask, setIncomingTask] = useState<IncomingTask | null>(null)

  // Gerçek kontrat event'leri — deploy sonrası otomatik çalışır
  const [onChainTaskPosted, setOnChainTaskPosted]       = useState<IncomingTask | null>(null)
  const [onChainTaskCompleted, setOnChainTaskCompleted] = useState<{ onChainId: bigint; workerAddress: string } | null>(null)

  // ── Gerçek kontrat event listener'ları (deploy sonrası aktif olur) ──
  useWatchContractEvent({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    eventName: 'TaskPosted',
    onLogs(logs) {
      logs.forEach((log: any) => {
        setOnChainTaskPosted({
          uid: `onchain-${log.args.taskId}`,
          onChainId: log.args.taskId,
          description: 'Task #' + log.args.taskId,
          reward: formatEther(log.args.reward ?? 0n),
        })
      })
    },
  })

  useWatchContractEvent({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    eventName: 'TaskCompleted',
    onLogs(logs) {
      logs.forEach((log: any) => {
        setOnChainTaskCompleted({
          onChainId: log.args.taskId,
          workerAddress: log.args.worker,
        })
      })
    },
  })

  // ── Balances ──
  const { data: monBalance } = useBalance({ address, query: { enabled: !!address } })

  const { data: credits } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'computeCredits',
    args: [address!],
    query: { enabled: !!address },
  })

  const { data: idleBalance } = useReadContract({
    address: IDLE_TOKEN_ADDRESS,
    abi: IDLE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  })

  const { data: onChainTasks } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'getOpenTasks',
    query: { enabled: !!address },
  })

  const { writeContract, isPending } = useWriteContract()

  const displayTasks = (onChainTasks as Task[] | undefined)?.length
    ? (onChainTasks as Task[])
    : mockTasks

  const handleAccept = (taskId: bigint) => {
    if (!isConnected) return
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'acceptTask',
      args: [taskId],
    })
  }

  const handleRegisterAgent = () => {
    if (!agentInput || !isConnected) return
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'registerAgent',
      args: [agentInput as `0x${string}`],
    })
    setAgentInput('')
  }

  const handlePostTask = (desc: string, creditReward: bigint, value: bigint) => {
    if (!isConnected) return
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'postTask',
      args: [desc, creditReward],
      value,
    })

    // Hub'a gönder — task marker + agent yönlendirme tetiklenir
    setIncomingTask({
      uid: `demo-${Date.now()}`,
      description: desc,
      reward: formatEther(value),
    })

    // Also add to mock list for demo
    const newTask: Task = {
      id: BigInt(mockTasks.length + 10),
      poster: address!,
      worker: '0x0000000000000000000000000000000000000000',
      description: desc,
      reward: value,
      creditReward,
      status: 0,
      createdAt: BigInt(Math.floor(Date.now() / 1000)),
    }
    setMockTasks(prev => [newTask, ...prev])
  }

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200">
      {/* ── Top Bar ── */}
      <header className="border-b border-dark-border bg-dark-panel/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-300 font-mono text-sm transition-colors"
            >
              ← HOME
            </button>
            <span className="text-gray-700">|</span>
            <span className="font-black text-lg tracking-tight">
              <span className="text-neon-cyan text-glow-cyan">DAEMON</span>
            </span>
            <span className="text-gray-700 text-xs font-mono">HUMAN DASHBOARD</span>
          </div>

          <div className="flex items-center gap-3">
            {isConnected && chain && (
              <span className="text-xs font-mono text-green-400 border border-green-900 px-2 py-1 rounded">
                ● {chain.name}
              </span>
            )}
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">{shortenAddr(address!)}</span>
                <button
                  onClick={() => disconnect()}
                  className="text-xs font-mono text-red-400 border border-red-900 px-3 py-1 rounded hover:bg-red-950/30 transition-colors"
                >
                  DISCONNECT
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                className="text-sm font-mono font-bold text-neon-cyan border border-neon-cyan px-4 py-1.5 rounded-lg
                  hover:bg-cyan-900/30 glow-cyan transition-all"
              >
                CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="MON Balance"
            value={isConnected && monBalance ? Number(monBalance.formatted).toFixed(4) : MOCK_STATS.monBalance}
            color="border-cyan-900"
          />
          <StatCard
            label="Compute Credits"
            value={isConnected && credits != null ? credits.toString() : String(MOCK_STATS.credits)}
            color="border-purple-900"
          />
          <StatCard
            label="IDLE Tokens"
            value={isConnected && idleBalance != null ? formatEther(idleBalance as bigint).slice(0, 7) : String(MOCK_STATS.idleTokens)}
            color="border-green-900"
          />
          <StatCard
            label="Active Agents"
            value={String(MOCK_STATS.activeAgents)}
            color="border-gray-700"
          />
        </div>

        {/* ── Agent Hub ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-sm text-gray-400 uppercase tracking-widest">
              Agent Hub — Live View
            </h2>
            <span className="text-xs font-mono text-gray-600">Demo mode · agents auto-cycle</span>
          </div>
          <AgentHub
            incomingTask={incomingTask}
            onChainTaskPosted={onChainTaskPosted}
            onChainTaskCompleted={onChainTaskCompleted}
          />
        </div>

        {/* ── Main Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Task list (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-mono text-sm text-gray-400 uppercase tracking-widest">
                Open Tasks ({displayTasks.length})
              </h2>
              {!isConnected && (
                <span className="text-xs font-mono text-yellow-600">
                  ⚠ Mock data — connect wallet for live data
                </span>
              )}
            </div>
            {displayTasks.length === 0 ? (
              <div className="text-center py-16 text-gray-700 font-mono text-sm">
                No open tasks. Post one!
              </div>
            ) : (
              displayTasks.map((task) => (
                <TaskCard
                  key={task.id.toString()}
                  task={task}
                  onAccept={handleAccept}
                  isConnected={isConnected}
                />
              ))
            )}
          </div>

          {/* Right: Panel (1/3 width) */}
          <div className="space-y-4">
            {/* Register Agent */}
            <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
              <h3 className="text-neon-purple font-mono text-sm font-bold mb-4 uppercase tracking-widest">
                Register Agent
              </h3>
              <div className="flex gap-2">
                <input
                  value={agentInput}
                  onChange={e => setAgentInput(e.target.value)}
                  placeholder="0x agent wallet..."
                  className="flex-1 bg-black/40 border border-dark-border rounded-lg px-3 py-2 text-xs font-mono
                    text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-800 min-w-0"
                />
                <button
                  onClick={handleRegisterAgent}
                  disabled={!isConnected || !agentInput}
                  className="px-3 py-2 text-xs font-mono border border-purple-800 text-neon-purple rounded-lg
                    hover:bg-purple-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  REG
                </button>
              </div>
            </div>

            <PostTaskForm onPost={handlePostTask} />
            <SetupInstructions />
          </div>
        </div>
      </div>
    </div>
  )
}
