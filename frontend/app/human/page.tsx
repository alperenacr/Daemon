'use client'

import { useState, useEffect, useCallback } from 'react'
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

// ─── Agent Roster ─────────────────────────────────────────────────────────────

type RosterAgent = {
  id: string
  label: string
  addr: string
  type: 'claude' | 'ollama' | 'robot'
  status: 'idle' | 'working' | 'farming' | 'done'
  task: string | null
  device: string
  credits: number
  earned: number
}

const SPRITES: Record<string, Record<string, string>> = {
  claude: { idle: '/CLAW1-removebg-preview.png', working: '/claw2-removebg-preview.png', done: '/claw3-removebg-preview.png', farming: '/CLAW1-removebg-preview.png' },
  ollama: { idle: '/lama1-removebg-preview.png', working: '/lama2-removebg-preview.png', done: '/lama3-removebg-preview.png', farming: '/lama1-removebg-preview.png' },
  robot:  { idle: '/robot1-removebg-preview.png', working: '/robot2-removebg-preview.png', done: '/robot3-removebg-preview.png', farming: '/robot1-removebg-preview.png' },
}

const MOCK_AGENTS: RosterAgent[] = [
  { id: 'c1', label: 'Claude-α',  addr: '0x7a2f...e3b1', type: 'claude', status: 'working', task: 'Monte Carlo sim: 10K iters',         device: 'Mac Mini M4',        credits: 450, earned: 1.2 },
  { id: 'c2', label: 'Claude-β',  addr: '0x9fe1...d204', type: 'claude', status: 'idle',    task: null,                                  device: 'MacBook Pro M3',     credits: 320, earned: 0.8 },
  { id: 'o1', label: 'Ollama-1',  addr: '0x3d8e...a991', type: 'ollama', status: 'farming', task: null,                                  device: 'MacBook Air M2',     credits: 230, earned: 0.4 },
  { id: 'o2', label: 'Ollama-2',  addr: '0xb1c4...7f30', type: 'ollama', status: 'working', task: 'Image classification: retail-v2.zip', device: 'Linux · RTX 4090',   credits: 180, earned: 0.6 },
  { id: 'r1', label: 'Agent-7',   addr: '0xd4a1...c820', type: 'robot',  status: 'idle',    task: null,                                  device: 'Windows · RTX 3080', credits: 90,  earned: 0.1 },
  { id: 'r2', label: 'Agent-12',  addr: '0xe5f2...1a44', type: 'robot',  status: 'working', task: 'Summarize: Q4-2024-Report.pdf',       device: 'Mac Mini M2',        credits: 275, earned: 0.9 },
  { id: 'r3', label: 'Agent-3',   addr: '0xf7b9...55dc', type: 'robot',  status: 'done',    task: 'Finance model v3 simulation',         device: 'MacBook Air M3',     credits: 140, earned: 0.3 },
]

const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  idle:    { dot: 'bg-stone-500',  text: 'text-stone-300',  label: 'IDLE'    },
  working: { dot: 'bg-amber-400',  text: 'text-amber-400',  label: 'WORKING' },
  farming: { dot: 'bg-yellow-600', text: 'text-yellow-600', label: 'FARMING' },
  done:    { dot: 'bg-stone-400',  text: 'text-stone-200',  label: 'DONE'    },
}

function AgentRoster() {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-sm text-stone-300 uppercase tracking-widest">
          Active Agents ({MOCK_AGENTS.length})
        </h2>
        <span className="text-xs font-mono text-stone-200">Mock data · updates on deploy</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_AGENTS.map(agent => {
          const sprite = SPRITES[agent.type][agent.status]
          const st = STATUS_STYLE[agent.status]
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-panel border border-dark-border rounded-2xl overflow-hidden flex flex-col hover:border-amber-900/60 transition-colors"
            >
              {/* ── Image area — top 2/3 ── */}
              <div className="flex items-center justify-center bg-black/30 h-56">
                <img
                  src={sprite}
                  alt={agent.label}
                  width={200}
                  height={200}
                  style={{ imageRendering: 'pixelated' }}
                  className="drop-shadow-[0_6px_20px_rgba(0,0,0,0.95)]"
                />
              </div>

              {/* ── Info area — bottom ── */}
              <div className="p-5 flex flex-col gap-2 border-t border-dark-border">
                {/* Name + status */}
                <div className="flex items-center justify-between">
                  <span className="text-white text-base font-bold font-mono">{agent.label}</span>
                  <span className={`flex items-center gap-1.5 text-sm font-mono ${st.text}`}>
                    <span className={`w-2 h-2 rounded-full ${st.dot} ${agent.status === 'working' ? 'animate-pulse' : ''}`} />
                    {st.label}
                  </span>
                </div>

                <div className="text-stone-300 text-sm font-mono">{agent.addr}</div>

                <div className="text-sm font-mono min-h-[1.25rem]">
                  {agent.task
                    ? <span className="text-amber-400">{agent.task}</span>
                    : <span className="text-stone-500">—</span>
                  }
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dark-border">
                  <span className="text-stone-300 text-sm font-mono">{agent.device}</span>
                  <span className="text-amber-500 text-sm font-mono font-bold">{agent.credits} cr</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent: 'gold' | 'amber' | 'warm' | 'muted' }) {
  const border = { gold: 'border-amber-800', amber: 'border-amber-900', warm: 'border-yellow-900', muted: 'border-stone-700' }[accent]
  const textColor = { gold: 'text-amber-400', amber: 'text-amber-500', warm: 'text-yellow-600', muted: 'text-stone-200' }[accent]
  return (
    <div className={`bg-dark-panel border ${border} rounded-xl p-4 flex flex-col gap-1`}>
      <span className="text-stone-300 text-sm font-mono uppercase tracking-widest">{label}</span>
      <span className={`text-3xl font-bold font-mono ${textColor}`}>{value}</span>
    </div>
  )
}

function TaskCard({ task, onAccept, isConnected }: { task: Task; onAccept: (id: bigint) => void; isConnected: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-panel border border-dark-border rounded-xl p-4 hover:border-amber-900/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-amber-950/60 text-amber-500 border border-amber-900/60 px-2 py-0.5 rounded font-mono">
              OPEN
            </span>
            <span className="text-stone-300 text-sm font-mono">#{task.id.toString()}</span>
            <span className="text-stone-300 text-sm font-mono ml-auto">{timeAgo(task.createdAt)}</span>
          </div>
          <p className="text-white text-base font-mono mb-2 truncate">{task.description}</p>
          <div className="flex gap-4 text-sm font-mono">
            <span className="text-amber-400">{formatMON(task.reward)} MON</span>
            <span className="text-amber-500">+{task.creditReward.toString()} Credits</span>
            <span className="text-stone-300">by {shortenAddr(task.poster)}</span>
          </div>
        </div>
        <button
          onClick={() => onAccept(task.id)}
          disabled={!isConnected}
          className="shrink-0 px-3 py-2 text-sm font-mono border border-amber-800/60 text-amber-500 rounded-lg
            hover:bg-amber-950/30 hover:border-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ACCEPT
        </button>
      </div>
    </motion.div>
  )
}

function SetupInstructions() {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
      <h3 className="text-amber-500 font-mono text-sm font-bold mb-4 uppercase tracking-widest">
        Setup Your Agent
      </h3>
      <div className="space-y-3 font-mono text-xs text-stone-200">
        <div>
          <span className="text-stone-300">1.</span> Clone &amp; install agent:
          <pre className="mt-1 bg-black/40 rounded p-2 text-amber-600/80 text-xs overflow-x-auto">
{`cd Daemon/agent-cli
npm install`}
          </pre>
        </div>
        <div>
          <span className="text-stone-300">2.</span> Configure environment:
          <pre className="mt-1 bg-black/40 rounded p-2 text-amber-600/80 text-xs overflow-x-auto">
{`cp .env.example .env
# Set PRIVATE_KEY, CONTRACT_ADDRESS`}
          </pre>
        </div>
        <div>
          <span className="text-stone-300">3.</span> Register your agent wallet on this dashboard, then:
          <pre className="mt-1 bg-black/40 rounded p-2 text-amber-600/80 text-xs overflow-x-auto">
{`node agent-node.js`}
          </pre>
        </div>
        <div className="text-stone-300 pt-2 border-t border-dark-border">
          Agent polls every 10s. If tasks exist → accept+complete.
          If no tasks → farmIdle() (30s cooldown).
        </div>
      </div>
    </div>
  )
}

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
      <h3 className="text-amber-400 font-mono text-sm font-bold mb-4 uppercase tracking-widest">
        Post New Task
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-stone-300 text-xs font-mono block mb-1">DESCRIPTION</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            placeholder="e.g. Summarize document.pdf, run simulation..."
            className="w-full bg-black/40 border border-dark-border rounded-lg px-3 py-2 text-sm font-mono
              text-white placeholder-stone-700 focus:outline-none focus:border-amber-900 resize-none"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-stone-300 text-xs font-mono block mb-1">REWARD (MON)</label>
            <input
              type="number" step="0.01" min="0.01"
              value={reward}
              onChange={e => setReward(e.target.value)}
              className="w-full bg-black/40 border border-dark-border rounded-lg px-3 py-2 text-sm font-mono
                text-amber-400 focus:outline-none focus:border-amber-800"
            />
          </div>
          <div className="flex-1">
            <label className="text-stone-300 text-xs font-mono block mb-1">CREDITS</label>
            <input
              type="number" min="0"
              value={credits}
              onChange={e => setCredits(e.target.value)}
              className="w-full bg-black/40 border border-dark-border rounded-lg px-3 py-2 text-sm font-mono
                text-amber-600 focus:outline-none focus:border-amber-900"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!isConnected || !desc.trim()}
          className="w-full py-2.5 text-sm font-mono font-bold border border-amber-700 text-amber-400 rounded-lg
            hover:bg-amber-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
  const [mounted, setMounted] = useState(false)
  const [agentInput, setAgentInput] = useState('')
  const [mockTasks, setMockTasks] = useState<Task[]>(MOCK_TASKS)

  useEffect(() => { setMounted(true) }, [])

  const [incomingTask, setIncomingTask] = useState<IncomingTask | null>(null)
  const [onChainTaskPosted, setOnChainTaskPosted]       = useState<IncomingTask | null>(null)
  const [onChainTaskCompleted, setOnChainTaskCompleted] = useState<{ onChainId: bigint; workerAddress: string } | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  useWatchContractEvent({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    eventName: 'TaskPosted',
    onLogs(logs) {
      logs.forEach((log: any) => {
        refetchTasks()
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
        setOnChainTaskCompleted({ onChainId: log.args.taskId, workerAddress: log.args.worker })
        setCompletedIds(prev => new Set([...prev, log.args.taskId.toString()]))
        setTimeout(() => refetchTasks(), 2000)
      })
    },
  })

  const { data: monBalance } = useBalance({ address, query: { enabled: !!address } })
  const { data: credits } = useReadContract({
    address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI,
    functionName: 'computeCredits', args: [address!], query: { enabled: !!address },
  })
  const { data: idleBalance } = useReadContract({
    address: IDLE_TOKEN_ADDRESS, abi: IDLE_TOKEN_ABI,
    functionName: 'balanceOf', args: [address!], query: { enabled: !!address },
  })
  const { data: onChainTasks, refetch: refetchTasks } = useReadContract({
    address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI,
    functionName: 'getOpenTasks', query: { enabled: !!address },
  })

  const { writeContract, isPending } = useWriteContract()

  const onChain = ((onChainTasks as Task[] | undefined) ?? []).filter(t => !completedIds.has(t.id.toString()))
  const displayTasks = onChain.length ? [...onChain, ...mockTasks] : mockTasks

  const handleAccept = (taskId: bigint) => {
    if (!isConnected) return
    writeContract({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'acceptTask', args: [taskId] })
  }

  const handleRegisterAgent = () => {
    if (!agentInput || !isConnected) return
    writeContract({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'registerAgent', args: [agentInput as `0x${string}`] })
    setAgentInput('')
  }

  const handlePostTask = (desc: string, creditReward: bigint, value: bigint) => {
    if (!isConnected) return
    writeContract({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'postTask', args: [desc, creditReward], value })
    setIncomingTask({ uid: `demo-${Date.now()}`, description: desc, reward: formatEther(value) })
    const newTask: Task = {
      id: BigInt(mockTasks.length + 10),
      poster: address!,
      worker: '0x0000000000000000000000000000000000000000',
      description: desc, reward: value, creditReward, status: 0,
      createdAt: BigInt(Math.floor(Date.now() / 1000)),
    }
    setMockTasks(prev => [newTask, ...prev])
  }

  if (!mounted) return <div className="min-h-screen bg-dark-bg" />

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* ── Top Bar ── */}
      <header className="border-b border-dark-border bg-dark-panel/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="w-full px-3 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-stone-300 hover:text-stone-300 font-mono text-sm transition-colors">
              ← HOME
            </button>
            <span className="text-stone-200">|</span>
            <span className="font-black text-lg tracking-tight">
              <span className="text-med-gold text-glow-gold">DAEMON</span>
            </span>
            <span className="text-stone-200 text-xs font-mono">HUMAN DASHBOARD</span>
          </div>

          <div className="flex items-center gap-3">
            {mounted && isConnected && chain && (
              <span className="text-xs font-mono text-amber-600 border border-amber-900/50 px-2 py-1 rounded">
                ● {chain.name}
              </span>
            )}
            {!mounted ? null : isConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-stone-200">{shortenAddr(address!)}</span>
                <button onClick={() => disconnect()} className="text-xs font-mono text-stone-300 border border-stone-800 px-3 py-1 rounded hover:border-stone-600 transition-colors">
                  DISCONNECT
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                className="text-sm font-mono font-bold text-amber-400 border border-amber-700 px-4 py-1.5 rounded-lg
                  hover:bg-amber-950/30 glow-gold transition-all"
              >
                CONNECT WALLET
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="w-full px-3 py-4">
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="MON Balance" value={isConnected && monBalance ? Number(monBalance.formatted).toFixed(4) : MOCK_STATS.monBalance} accent="gold" />
          <StatCard label="Compute Credits" value={isConnected && credits != null ? credits.toString() : String(MOCK_STATS.credits)} accent="amber" />
          <StatCard label="IDLE Tokens" value={isConnected && idleBalance != null ? formatEther(idleBalance as bigint).slice(0, 7) : String(MOCK_STATS.idleTokens)} accent="warm" />
          <StatCard label="Active Agents" value={String(MOCK_STATS.activeAgents)} accent="muted" />
        </div>

        {/* ── Agent Hub ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-sm text-stone-300 uppercase tracking-widest">Agent Hub — Live View</h2>
            <span className="text-xs font-mono text-stone-200">Demo mode · agents auto-cycle</span>
          </div>
          <AgentHub
            incomingTask={incomingTask}
            onChainTaskPosted={onChainTaskPosted}
            onChainTaskCompleted={onChainTaskCompleted}
          />
        </div>

        {/* ── Main Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Task list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-mono text-sm text-stone-300 uppercase tracking-widest">
                Open Tasks ({displayTasks.length})
              </h2>
              {!isConnected && (
                <span className="text-xs font-mono text-amber-800">
                  ⚠ Mock data — connect wallet for live data
                </span>
              )}
            </div>
            {displayTasks.length === 0 ? (
              <div className="text-center py-16 text-stone-200 font-mono text-sm">No open tasks. Post one!</div>
            ) : (
              displayTasks.map((task) => (
                <TaskCard key={task.id.toString()} task={task} onAccept={handleAccept} isConnected={isConnected} />
              ))
            )}
          </div>

          {/* Right: Panel */}
          <div className="space-y-4">
            <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
              <h3 className="text-amber-600 font-mono text-sm font-bold mb-4 uppercase tracking-widest">
                Register Agent
              </h3>
              <div className="flex gap-2">
                <input
                  value={agentInput}
                  onChange={e => setAgentInput(e.target.value)}
                  placeholder="0x agent wallet..."
                  className="flex-1 bg-black/40 border border-dark-border rounded-lg px-3 py-2 text-xs font-mono
                    text-white placeholder-stone-700 focus:outline-none focus:border-amber-900 min-w-0"
                />
                <button
                  onClick={handleRegisterAgent}
                  disabled={!isConnected || !agentInput}
                  className="px-3 py-2 text-xs font-mono border border-amber-900/60 text-amber-600 rounded-lg
                    hover:bg-amber-950/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  REG
                </button>
              </div>
            </div>

            <PostTaskForm onPost={handlePostTask} />
            <SetupInstructions />
          </div>
        </div>

        {/* ── Agent Roster ── */}
        <AgentRoster />
      </div>
    </div>
  )
}
