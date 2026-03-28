'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  useAccount, useConnect, useDisconnect,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi'
import { injected } from 'wagmi/connectors'
import { formatEther } from 'viem'
import {
  MARKETPLACE_ADDRESS, IDLE_TOKEN_ADDRESS,
  MARKETPLACE_ABI, IDLE_TOKEN_ABI,
  shortenAddr,
} from '../../lib/contracts'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-2 text-gray-100 hover:text-gray-100 transition-colors text-xs shrink-0"
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}

const SETUP_STEPS = [
  {
    step: '01',
    title: 'Clone & Install',
    commands: [
      'git clone https://github.com/alperenacr/Daemon.git',
      'cd Daemon/agent-cli && npm install',
    ],
  },
  {
    step: '02',
    title: 'Configure .env',
    commands: [
      'PRIVATE_KEY=0x_your_private_key_here',
      `CONTRACT_ADDRESS=${MARKETPLACE_ADDRESS}`,
      'RPC_URL=https://testnet-rpc.monad.xyz',
    ],
    note: 'Create .env inside agent-cli/ with these values.',
  },
  {
    step: '03',
    title: 'Run Agent',
    commands: ['node agent-node.js'],
    note: 'Polls every 10s. Accepts tasks → completes → farmIdle() on idle.',
  },
]

type LogLine = { id: number; text: string; type: 'info' | 'success' | 'error' | 'tx' }
let logId = 0
const mkLog = (text: string, type: LogLine['type'] = 'info'): LogLine => ({ id: logId++, text, type })

export default function AgentPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const [txLogs, setTxLogs] = useState<LogLine[]>([
    mkLog('[DAEMON] Agent registration portal ready.', 'info'),
    mkLog('[NET]    Monad Testnet · chainId 10143', 'info'),
  ])
  const logRef = useRef<HTMLDivElement>(null)
  const pushLog = (text: string, type: LogLine['type'] = 'info') =>
    setTxLogs(prev => [...prev.slice(-30), mkLog(text, type)])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [txLogs])

  const isRegisteredRead = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'registeredAgents',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const creditsRead = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'computeCredits',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const lastIdleRead = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'lastIdleTime',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const idleBalRead = useReadContract({
    address: IDLE_TOKEN_ADDRESS,
    abi: IDLE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const isRegistered = isRegisteredRead.data as boolean | undefined

  const { writeContract: writeRegister, data: registerHash } = useWriteContract()
  const registerReceipt = useWaitForTransactionReceipt({ hash: registerHash })

  useEffect(() => {
    if (registerHash) pushLog(`[TX]  registerAgent() → ${registerHash.slice(0, 18)}...`, 'tx')
  }, [registerHash])
  useEffect(() => {
    if (registerReceipt.isSuccess) { pushLog('[OK]  Agent registered on-chain.', 'success'); isRegisteredRead.refetch() }
    if (registerReceipt.isError) pushLog('[ERR] Registration failed.', 'error')
  }, [registerReceipt.isSuccess, registerReceipt.isError])

  const { writeContract: writeFarm, data: farmHash } = useWriteContract()
  const farmReceipt = useWaitForTransactionReceipt({ hash: farmHash })
  const [farmCooldown, setFarmCooldown] = useState(false)

  useEffect(() => {
    if (farmHash) pushLog(`[TX]  farmIdle() → ${farmHash.slice(0, 18)}...`, 'tx')
  }, [farmHash])
  useEffect(() => {
    if (farmReceipt.isSuccess) {
      pushLog('[OK]  farmIdle() confirmed. +10 IDLE', 'success')
      setFarmCooldown(true)
      setTimeout(() => setFarmCooldown(false), 30_000)
      idleBalRead.refetch()
      lastIdleRead.refetch()
    }
    if (farmReceipt.isError) pushLog('[ERR] farmIdle() reverted (cooldown?)', 'error')
  }, [farmReceipt.isSuccess, farmReceipt.isError])

  useEffect(() => {
    if (isConnected && address) pushLog(`[NET] Wallet connected: ${address}`, 'success')
  }, [isConnected, address])

  const credits  = creditsRead.data  as bigint | undefined
  const idleBal  = idleBalRead.data  as bigint | undefined
  const lastIdle = lastIdleRead.data as bigint | undefined

  const logColor: Record<LogLine['type'], string> = {
    info:    'text-gray-100',
    success: 'text-white',
    error:   'text-red-400',
    tx:      'text-gray-200',
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 font-mono flex flex-col overflow-hidden">
      <div className="fixed inset-0 scanlines opacity-10 pointer-events-none z-50" />

      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-2 flex items-center justify-between bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="text-gray-100 hover:text-gray-100 text-xs transition-colors">
            ← EXIT
          </button>
          <span className="text-gray-200 text-xs">|</span>
          <span className="text-white font-bold tracking-widest text-sm text-glow-white">DAEMON // AGENT PORTAL</span>
        </div>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <span className="text-gray-200 text-xs">● {shortenAddr(address!)}</span>
              <button onClick={() => disconnect()} className="text-xs text-gray-100 border border-gray-800 px-2 py-0.5 rounded hover:border-gray-600 hover:text-gray-100 transition-colors">
                DISCONNECT
              </button>
            </>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="text-xs text-white border border-gray-600 px-3 py-1 rounded hover:border-white glow-white transition-all"
            >
              CONNECT WALLET
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Registration & Stats */}
        <div className="w-80 border-r border-gray-800 flex flex-col overflow-y-auto bg-black">

          {/* Verification Badge */}
          <div className="p-5 border-b border-gray-800">
            <div className="text-gray-100 uppercase tracking-widest text-xs mb-3">Agent Status</div>
            <AnimatePresence mode="wait">
              {!isConnected ? (
                <motion.div key="disconnected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-gray-800 rounded p-4 text-center">
                  <div className="text-gray-100 text-xs mb-1">⬡ NOT CONNECTED</div>
                  <div className="text-gray-200 text-xs">Connect wallet to verify agent status</div>
                </motion.div>
              ) : isRegisteredRead.isLoading ? (
                <motion.div key="loading" className="border border-gray-800 rounded p-4 text-center">
                  <div className="text-gray-100 text-xs">Checking registry...</div>
                </motion.div>
              ) : isRegistered ? (
                <motion.div
                  key="verified"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative border border-gray-400 rounded p-4 text-center overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-white/5 rounded"
                    animate={{ opacity: [0.05, 0.12, 0.05] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                  <div className="relative">
                    <motion.div
                      className="text-white text-2xl mb-1"
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      ✓
                    </motion.div>
                    <div className="text-white font-bold tracking-widest text-sm text-glow-white">VERIFIED AGENT</div>
                    <div className="text-gray-100 text-xs mt-1 break-all">{address}</div>
                    <div className="text-gray-100 text-xs mt-1">On-chain · Monad Testnet</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="unregistered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-gray-700 rounded p-4">
                  <div className="text-gray-200 text-xs mb-2">⚠ NOT REGISTERED</div>
                  <div className="text-gray-100 text-xs mb-3">Wallet not registered as agent on-chain.</div>
                  <button
                    onClick={() => {
                      pushLog(`[TX]  Registering ${shortenAddr(address!)}...`, 'tx')
                      writeRegister({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'registerAgent', args: [address!] })
                    }}
                    disabled={registerReceipt.isLoading}
                    className="w-full text-sm border border-gray-600 text-white py-2 rounded
                      hover:border-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {registerReceipt.isLoading ? 'REGISTERING...' : '+ REGISTER AGENT'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stats */}
          <div className="p-5 border-b border-gray-800 space-y-3">
            <div className="text-gray-100 uppercase tracking-widest text-xs mb-2">Agent Stats</div>
            {[
              { label: 'Compute Credits', value: credits !== undefined ? credits.toString() : '—' },
              { label: 'IDLE Tokens', value: idleBal !== undefined ? Number(formatEther(idleBal)).toFixed(1) : '—' },
              { label: 'Last Idle Farm', value: lastIdle ? (lastIdle === 0n ? 'Never' : new Date(Number(lastIdle) * 1000).toLocaleTimeString()) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-gray-100 text-sm">{label}</span>
                <span className="text-white text-sm font-bold">{isConnected ? value : '—'}</span>
              </div>
            ))}
          </div>

          {/* farmIdle Quick Test */}
          {isConnected && isRegistered && (
            <div className="p-5">
              <div className="text-gray-100 uppercase tracking-widest text-xs mb-3">Quick Test</div>
              <button
                onClick={() => {
                  pushLog('[TX]  Calling farmIdle()...', 'tx')
                  writeFarm({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: 'farmIdle' })
                }}
                disabled={farmCooldown || farmReceipt.isLoading}
                className="w-full text-sm border border-gray-600 text-gray-100 py-2 rounded
                  hover:border-gray-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {farmReceipt.isLoading ? 'CONFIRMING...' : farmCooldown ? '⏱ COOLDOWN (30s)' : '⚡ farmIdle()'}
              </button>
              <div className="text-gray-200 text-sm mt-2 text-center">+10 IDLE / 30s cooldown</div>
            </div>
          )}
        </div>

        {/* CENTER: TX Log */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
            <span className="text-gray-100 uppercase tracking-widest text-xs">TX Log</span>
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-gray-400"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 text-sm">
            {txLogs.map(l => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className={logColor[l.type]}
              >
                <span className="text-gray-200 mr-2">{new Date().toISOString().slice(11, 19)}</span>
                {l.text}
              </motion.div>
            ))}
            <div className="text-gray-200 cursor" />
          </div>
        </div>

        {/* RIGHT: Setup Instructions */}
        <div className="w-96 flex flex-col overflow-y-auto bg-black">
          <div className="px-5 py-3 border-b border-gray-800">
            <span className="text-gray-100 uppercase tracking-widest text-xs">Setup Instructions</span>
          </div>

          <div className="flex-1 px-5 py-4 space-y-6">
            {SETUP_STEPS.map(({ step, title, commands, note }) => (
              <div key={step}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-200 text-xs border border-gray-800 rounded px-1.5 py-0.5">STEP {step}</span>
                  <span className="text-white text-sm font-bold">{title}</span>
                </div>
                {note && <div className="text-gray-100 text-sm mb-2">{note}</div>}
                <div className="bg-white/[0.02] border border-gray-800 rounded p-3 space-y-1.5">
                  {commands.map(cmd => (
                    <div key={cmd} className="flex items-start justify-between gap-2">
                      <code className="text-gray-100 text-sm break-all flex-1">
                        <span className="text-gray-100 mr-1">$</span>{cmd}
                      </code>
                      <CopyButton text={cmd} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Contract Addresses */}
            <div>
              <div className="text-gray-100 uppercase tracking-widest text-xs mb-2">Contract Addresses</div>
              <div className="bg-white/[0.02] border border-gray-800 rounded p-3 space-y-2">
                {[
                  { label: 'Marketplace', value: MARKETPLACE_ADDRESS },
                  { label: 'IDLE Token',  value: IDLE_TOKEN_ADDRESS  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-gray-100 text-sm">{label}</div>
                      <div className="text-gray-200 text-sm break-all">{value}</div>
                    </div>
                    <CopyButton text={value} />
                  </div>
                ))}
                <div className="text-gray-200 text-sm pt-1 border-t border-gray-800">
                  Monad Testnet · chainId 10143
                </div>
              </div>
            </div>

            {/* ABI quick ref */}
            <div>
              <div className="text-gray-100 uppercase tracking-widest text-xs mb-2">Key Functions</div>
              <div className="bg-white/[0.02] border border-gray-800 rounded p-3 space-y-1">
                {[
                  'registerAgent(address)',
                  'getOpenTasks() → Task[]',
                  'acceptTask(uint256 taskId)',
                  'completeTask(uint256 taskId)',
                  'farmIdle() → +10 IDLE',
                  'computeCredits(address) → uint256',
                ].map(fn => (
                  <div key={fn} className="text-gray-100 text-sm">
                    <span className="text-gray-200 mr-1">›</span>{fn}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
