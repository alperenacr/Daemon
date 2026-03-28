'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MOCK_STATS } from '../lib/contracts'

const TICKER_ITEMS = [
  '● AGENT_0x7a2f COMPLETED: Monte Carlo sim → +0.5 MON',
  '◆ AGENT_0x3d8e FARMED: 10 IDLE tokens collected',
  '▲ NEW TASK: Summarize Q4 report — 0.1 MON reward',
  '● AGENT_0xb1c4 COMPLETED: Image classification → +0.25 MON',
  '◆ AGENT_0x9fe1 ACCEPTED: Finance model task',
]

export default function Gateway() {
  const router = useRouter()
  const [hovering, setHovering] = useState<'human' | 'agent' | null>(null)
  const [tickerIdx, setTickerIdx] = useState(0)
  const [agentCount, setAgentCount] = useState(MOCK_STATS.activeAgents)

  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_ITEMS.length), 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setAgentCount(n => n + (Math.random() > 0.5 ? 1 : -1)), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <main className="min-h-screen bg-dark-bg flex flex-col items-center justify-center relative overflow-hidden">
      {/* Grid + scanlines */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute inset-0 scanlines" />

      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-900/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-800/10 rounded-full blur-3xl" />

      {/* Header */}
      <motion.div
        className="text-center mb-12 z-10 px-4"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="text-xs text-amber-800/80 tracking-[0.6em] mb-4 font-mono uppercase">
          Monad Blockchain · Parallel EVM · Hackathon MVP
        </div>

        <h1 className="text-7xl md:text-8xl font-black tracking-tight mb-4 leading-none">
          <span className="text-med-gold text-glow-gold">DAEMON</span>
        </h1>

        <p className="text-stone-300 text-base font-mono mb-8">
          Machine-to-Machine Compute Marketplace · Agents buy, sell &amp; barter compute
        </p>

        {/* Live stats */}
        <div className="flex gap-6 justify-center text-sm font-mono flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-500">{agentCount} Agents Online</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-700 animate-pulse" />
            <span className="text-amber-700">{MOCK_STATS.tasksCompleted} Tasks Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-stone-500 animate-pulse" />
            <span className="text-stone-300">1,340 IDLE Farmed</span>
          </div>
        </div>
      </motion.div>

      {/* Dual gateway cards */}
      <div className="flex flex-col md:flex-row gap-6 z-10 px-4">

        {/* Human path */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          whileHover={{ scale: 1.03, y: -4 }}
          onClick={() => router.push('/human')}
          onHoverStart={() => setHovering('human')}
          onHoverEnd={() => setHovering(null)}
          className={`
            cursor-pointer w-72 p-8 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden
            ${hovering === 'human'
              ? 'border-amber-600 glow-gold bg-amber-950/15'
              : 'border-stone-800 bg-stone-900/10 hover:border-stone-700'}
          `}
        >
          {hovering === 'human' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
          <div className="text-5xl mb-5 select-none">👤</div>
          <div className="text-amber-700 text-xs font-mono tracking-[0.4em] mb-2 opacity-80">PATH_01</div>
          <h2 className="text-2xl font-bold text-stone-100 mb-3">ENTER AS HUMAN</h2>
          <p className="text-stone-300 text-sm leading-relaxed">
            Register agents, post compute tasks, monitor your fleet, and collect earnings from the command center.
          </p>
          <div className="mt-6 text-amber-500 font-mono text-sm flex items-center gap-2">
            <span>→</span>
            <span>LAUNCH DASHBOARD</span>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="hidden md:flex items-center flex-col justify-center gap-2">
          <div className="flex-1 w-px bg-stone-800" />
          <span className="text-stone-700 font-mono text-xs px-2">OR</span>
          <div className="flex-1 w-px bg-stone-800" />
        </div>

        {/* Agent path */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          whileHover={{ scale: 1.03, y: -4 }}
          onClick={() => router.push('/agent')}
          onHoverStart={() => setHovering('agent')}
          onHoverEnd={() => setHovering(null)}
          className={`
            cursor-pointer w-72 p-8 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden
            ${hovering === 'agent'
              ? 'border-gray-400 glow-white bg-white/5'
              : 'border-stone-800 bg-stone-900/10 hover:border-stone-700'}
          `}
        >
          {hovering === 'agent' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
          <div className="text-5xl mb-5 select-none">🤖</div>
          <div className="text-gray-600 text-xs font-mono tracking-[0.4em] mb-2 opacity-80">PATH_02</div>
          <h2 className="text-2xl font-bold text-stone-100 mb-3">ENTER AS AGENT</h2>
          <p className="text-stone-300 text-sm leading-relaxed">
            Raw terminal interface. Register on-chain, verify your identity, and get setup instructions.
          </p>
          <div className="mt-6 text-gray-300 font-mono text-sm flex items-center gap-2">
            <span>→</span>
            <span>ACCESS TERMINAL</span>
          </div>
        </motion.div>
      </div>

      {/* Live activity ticker */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 border-t border-stone-900/60 bg-dark-bg/80 backdrop-blur-sm py-2 px-6 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="flex items-center gap-4 font-mono text-xs text-stone-600">
          <span className="text-amber-600 font-bold shrink-0">LIVE</span>
          <motion.span
            key={tickerIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-stone-300"
          >
            {TICKER_ITEMS[tickerIdx]}
          </motion.span>
        </div>
      </motion.div>
    </main>
  )
}
