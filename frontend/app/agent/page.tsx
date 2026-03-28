'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { MARKETPLACE_ADDRESS, IDLE_TOKEN_ADDRESS, shortenAddr } from '../../lib/contracts'

// ─── Simulated terminal log stream ────────────────────────────────────────────
const LOG_SEQUENCE = [
  { delay: 0,    text: '[BOOT]   Daemon Agent v1.0.0 initializing...' },
  { delay: 400,  text: '[NET]    Connecting to Monad Testnet (chainId: 10143)...' },
  { delay: 900,  text: '[NET]    RPC: https://testnet-rpc.monad.xyz ✓' },
  { delay: 1400, text: '[CTR]    AgentMarketplace loaded at ' + (MARKETPLACE_ADDRESS.slice(0, 10) + '...') },
  { delay: 1900, text: '[SCAN]   Polling open tasks...' },
  { delay: 2500, text: '[SCAN]   3 tasks found. Evaluating rewards...' },
  { delay: 3000, text: '[TASK]   #2 — Monte Carlo sim: 10K iters → 0.5 MON' },
  { delay: 3600, text: '[TX]     Submitting acceptTask(2)...' },
  { delay: 4200, text: '[TX]     Confirmed. Gas: 43,210 | Block: 2,847,301' },
  { delay: 4800, text: '[WORK]   Processing task... (simulated 3s)' },
  { delay: 7900, text: '[TX]     Submitting completeTask(2)...' },
  { delay: 8500, text: '[TX]     Confirmed. +0.5 MON | +100 Credits' },
  { delay: 9000, text: '[SCAN]   Polling open tasks...' },
  { delay: 9600, text: '[SCAN]   0 tasks found.' },
  { delay: 10000,text: '[IDLE]   Triggering farmIdle()...' },
  { delay: 10700,text: '[TX]     Confirmed. +10 IDLE tokens' },
  { delay: 11200,text: '[SLEEP]  Next cycle in 10s...' },
  { delay: 21200,text: '[SCAN]   Polling open tasks...' },
  { delay: 21800,text: '[SCAN]   1 task found.' },
]

const ABI_LINES = [
  'function postTask(string description, uint256 creditReward) payable',
  'function acceptTask(uint256 taskId)',
  'function completeTask(uint256 taskId)',
  'function farmIdle()',
  'function getOpenTasks() view returns (Task[])',
  'function computeCredits(address) view returns (uint256)',
  'function registerAgent(address agentAddress)',
  'event TaskPosted(uint256 indexed taskId, address poster, uint256 reward)',
  'event TaskCompleted(uint256 indexed taskId, address worker, uint256 reward)',
  'event IdleFarmed(address indexed agent, uint256 amount)',
]

export default function AgentTerminal() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [logs, setLogs] = useState<string[]>([])
  const [showAbi, setShowAbi] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Simulate log stream
  useEffect(() => {
    LOG_SEQUENCE.forEach(({ delay, text }) => {
      const t = setTimeout(() => {
        setLogs(prev => [...prev.slice(-40), text])
      }, delay)
      timerRef.current.push(t)
    })
    return () => timerRef.current.forEach(clearTimeout)
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs])

  const ts = () => new Date().toISOString().slice(11, 19)

  return (
    <div className="min-h-screen bg-black text-neon-green font-mono flex flex-col overflow-hidden">
      {/* Scanlines */}
      <div className="fixed inset-0 scanlines opacity-10 pointer-events-none z-50" />

      {/* Header bar */}
      <div className="border-b border-green-900/50 px-6 py-2 flex items-center justify-between bg-black/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-green-700 hover:text-green-400 text-xs transition-colors"
          >
            ← EXIT
          </button>
          <span className="text-green-600 text-xs">|</span>
          <span className="text-neon-green font-bold tracking-widest text-sm text-glow-green">
            DAEMON AGENT TERMINAL
          </span>
          <span className="text-green-700 text-xs">v1.0.0</span>
        </div>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <span className="text-green-400 text-xs">● CONNECTED: {shortenAddr(address!)}</span>
              <button
                onClick={() => disconnect()}
                className="text-xs text-red-500 border border-red-900 px-2 py-0.5 rounded hover:bg-red-950/30 transition-colors"
              >
                EJECT
              </button>
            </>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="text-xs text-neon-green border border-green-700 px-3 py-1 rounded
                hover:bg-green-950/30 glow-green transition-all"
            >
              CONNECT AGENT WALLET
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Live terminal log ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ASCII banner */}
          <div className="px-6 pt-4 pb-2 text-green-700 text-xs leading-tight select-none">
            <pre>{`
  ███╗   ███╗ ██████╗ ███╗   ██╗ █████╗ ██████╗
  ████╗ ████║██╔═══██╗████╗  ██║██╔══██╗██╔══██╗
  ██╔████╔██║██║   ██║██╔██╗ ██║███████║██║  ██║
  ██║╚██╔╝██║██║   ██║██║╚██╗██║██╔══██║██║  ██║
  ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║  ██║██████╔╝
  ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚═════╝
  SWARM — Decentralized AI Agent Economy on Monad
`}</pre>
          </div>

          {/* System info */}
          <div className="px-6 pb-3 text-xs space-y-0.5 text-green-600 border-b border-green-900/30">
            <div>NETWORK   : Monad Testnet · chainId 10143 · RPC https://testnet-rpc.monad.xyz</div>
            <div>MARKETPLACE: {MARKETPLACE_ADDRESS}</div>
            <div>IDLE_TOKEN : {IDLE_TOKEN_ADDRESS}</div>
            <div>POLL_INTERVAL: 10s · IDLE_COOLDOWN: 30s · IDLE_REWARD: 10 IDLE/farm</div>
          </div>

          {/* Live logs */}
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-0.5 text-xs"
          >
            {logs.map((line, i) => {
              const color =
                line.includes('[TX]')   ? 'text-yellow-400' :
                line.includes('[OK]') || line.includes('Confirmed') ? 'text-green-300' :
                line.includes('[ERR]')  ? 'text-red-400' :
                line.includes('[IDLE]') || line.includes('[FARM]') ? 'text-purple-400' :
                line.includes('[TASK]') ? 'text-cyan-400' :
                'text-green-500'
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`font-mono ${color}`}
                >
                  <span className="text-green-800 mr-2">{ts()}</span>
                  {line}
                </motion.div>
              )
            })}
            {/* Blinking cursor */}
            <div className="text-neon-green cursor" />
          </div>
        </div>

        {/* ── Right: Contract reference panel ── */}
        <div className="w-80 border-l border-green-900/40 flex flex-col bg-black/60">
          <div className="px-4 py-3 border-b border-green-900/30">
            <span className="text-green-600 text-xs tracking-widest uppercase">Contract Reference</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
            {/* Endpoints */}
            <div>
              <div className="text-green-700 uppercase tracking-widest text-xs mb-2">RPC Endpoints</div>
              <div className="space-y-1 text-green-500">
                <div>• https://testnet-rpc.monad.xyz</div>
                <div>• chainId: 0x279F (10143)</div>
              </div>
            </div>

            {/* ABI */}
            <div>
              <button
                onClick={() => setShowAbi(v => !v)}
                className="text-green-700 uppercase tracking-widest text-xs mb-2 hover:text-green-400 transition-colors flex items-center gap-2"
              >
                ABI Functions
                <span>{showAbi ? '▼' : '▶'}</span>
              </button>
              {showAbi && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5"
                >
                  {ABI_LINES.map((line, i) => (
                    <div key={i} className="text-green-600 text-xs break-all">
                      <span className="text-green-800">›</span> {line}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* CLI Quick start */}
            <div>
              <div className="text-green-700 uppercase tracking-widest text-xs mb-2">Quick Start</div>
              <pre className="text-green-600 text-xs leading-relaxed whitespace-pre-wrap">{`# Install
cd agent-cli && npm i

# Configure
PRIVATE_KEY=0x...
CONTRACT_ADDRESS=${MARKETPLACE_ADDRESS.slice(0, 10)}...

# Run
node agent-node.js`}</pre>
            </div>

            {/* Agent status if connected */}
            {isConnected && (
              <div className="border border-green-900 rounded p-3 bg-green-950/10">
                <div className="text-green-400 text-xs mb-1">AGENT CONNECTED</div>
                <div className="text-green-600 text-xs break-all">{address}</div>
                <div className="text-green-700 text-xs mt-1">Status: READY TO DEPLOY</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
