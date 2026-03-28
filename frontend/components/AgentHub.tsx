'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────
type AgentStatus = 'idle' | 'working' | 'done' | 'farming'
type AgentType   = 'claude' | 'ollama' | 'robot'

type Agent = {
  id: string
  type: AgentType
  label: string
  status: AgentStatus
  x: number
  y: number
  moveDuration: number
  task: string
  assignedTaskId: string | null
  earned: number
}

type TaskMarker = {
  uid: string        // internal unique id
  onChainId?: bigint // gerçek kontrat task id (varsa)
  x: number
  y: number
  description: string
  reward: string
  assignedAgentId: string | null
}

type Notification = {
  id: number
  agentLabel: string
  taskDesc: string
  reward: string
}

export type FeedEvent = {
  id: number
  label: string
  text: string
  color: string
  time: string
}

// Dışarıdan task tetiklemek için prop tipi
export type IncomingTask = {
  uid: string
  onChainId?: bigint
  description: string
  reward: string
}

// ─── Sprites ──────────────────────────────────────────────────────────────────
const SPRITES: Record<AgentType, Record<AgentStatus, string>> = {
  claude: { idle: '/CLAW1-removebg-preview.png', working: '/claw2-removebg-preview.png', done: '/claw3-removebg-preview.png', farming: '/CLAW1-removebg-preview.png' },
  ollama: { idle: '/lama1-removebg-preview.png', working: '/lama2-removebg-preview.png', done: '/lama3-removebg-preview.png', farming: '/lama1-removebg-preview.png' },
  robot:  { idle: '/robot1-removebg-preview.png', working: '/robot2-removebg-preview.png', done: '/robot3-removebg-preview.png', farming: '/robot1-removebg-preview.png' },
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'bg-gray-700 text-gray-300', working: 'bg-yellow-900 text-yellow-300',
  done: 'bg-green-900 text-green-300', farming: 'bg-purple-900 text-purple-300',
}

const FLASH_CLASS: Record<AgentStatus, string> = {
  idle: 'bg-blue-400/50', working: 'bg-yellow-400/60',
  done: 'bg-green-400/70', farming: 'bg-purple-400/50',
}

const STATUS_ANIM: Record<AgentStatus, object> = {
  idle:    { scaleY: [1, 1.05, 1],  transition: { duration: 3,   repeat: Infinity, ease: 'easeInOut' } },
  working: { x: [-3, 3, -3],        transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } },
  done:    { y: [0, -22, 0], scale: [1, 1.25, 1], transition: { duration: 0.7, repeat: 2 } },
  farming: { rotate: [-5, 5, -5],   transition: { duration: 2,   repeat: Infinity, ease: 'easeInOut' } },
}

const TASKS = [
  'Summarize Q4-2024-Report.pdf', 'Monte Carlo sim: 10K iterations',
  'Image classification batch', 'Extract data from invoice.pdf',
  'Finance model v3 analysis', 'Sentiment analysis: tweets',
]

const NEXT_STATUS: Record<AgentStatus, AgentStatus> = {
  idle: 'working', working: 'done', done: 'idle', farming: 'idle',
}

const STATUS_DURATION_MS: Record<AgentStatus, number> = {
  idle: 14000, working: 16000, done: 4000, farming: 10000,
}

const CAN_MOVE = new Set<AgentStatus>(['idle', 'farming'])

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randomPos() {
  return { x: 4 + Math.random() * 86, y: 15 + Math.random() * 60 }
}

function calcMoveDuration(x1: number, y1: number, x2: number, y2: number) {
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  return Math.max(3, Math.min(14, dist * 0.8))
}

function randomTask() { return TASKS[Math.floor(Math.random() * TASKS.length)] }

const INITIAL_AGENTS: Agent[] = [
  { id: 'c1', type: 'claude', label: 'Claude-α', status: 'idle',    x: 8,  y: 30, moveDuration: 6, task: '',       assignedTaskId: null, earned: 0.3 },
  { id: 'c2', type: 'claude', label: 'Claude-β', status: 'working', x: 25, y: 62, moveDuration: 6, task: TASKS[0], assignedTaskId: null, earned: 0.7 },
  { id: 'o1', type: 'ollama', label: 'Ollama-1', status: 'idle',    x: 50, y: 20, moveDuration: 6, task: '',       assignedTaskId: null, earned: 0.1 },
  { id: 'o2', type: 'ollama', label: 'Ollama-2', status: 'done',    x: 65, y: 68, moveDuration: 6, task: TASKS[1], assignedTaskId: null, earned: 0.5 },
  { id: 'r1', type: 'robot',  label: 'Agent-7',  status: 'farming', x: 15, y: 50, moveDuration: 6, task: '',       assignedTaskId: null, earned: 0.0 },
  { id: 'r2', type: 'robot',  label: 'Agent-12', status: 'working', x: 78, y: 40, moveDuration: 6, task: TASKS[2], assignedTaskId: null, earned: 0.2 },
  { id: 'r3', type: 'robot',  label: 'Agent-3',  status: 'idle',    x: 88, y: 25, moveDuration: 6, task: '',       assignedTaskId: null, earned: 0.0 },
]

// ─── Feed helper ──────────────────────────────────────────────────────────────
let eid = 0
function makeEvent(label: string, text: string, color: string): FeedEvent {
  return { id: eid++, label, text, color, time: new Date().toISOString().slice(11, 19) }
}

// ─── AgentSprite ──────────────────────────────────────────────────────────────
function AgentSprite({ agent }: { agent: Agent }) {
  const prevStatus = useRef(agent.status)
  const [flashKey, setFlashKey] = useState(0)

  useEffect(() => {
    if (prevStatus.current !== agent.status) {
      prevStatus.current = agent.status
      setFlashKey(k => k + 1)
    }
  }, [agent.status])

  return (
    <motion.div
      style={{ position: 'absolute', zIndex: 10 }}
      animate={{ left: `${agent.x}%`, top: `${agent.y}%` }}
      transition={{ duration: agent.moveDuration, ease: 'linear' }}
      className="flex flex-col items-center gap-1 cursor-default select-none"
    >
      <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${STATUS_COLORS[agent.status]} border border-white/5 z-10`}>
        {agent.status.toUpperCase()}
      </span>

      <div className="relative">
        <AnimatePresence>
          <motion.div
            key={flashKey}
            initial={{ opacity: 0.9, scale: 2.2 }}
            animate={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className={`absolute inset-0 rounded-full blur-xl ${FLASH_CLASS[agent.status]} pointer-events-none`}
          />
        </AnimatePresence>

        <motion.img
          src={SPRITES[agent.type][agent.status]}
          alt={agent.label}
          width={168}
          height={168}
          style={{ imageRendering: 'pixelated', display: 'block' }}
          className="drop-shadow-[0_8px_18px_rgba(0,0,0,0.95)]"
          animate={STATUS_ANIM[agent.status]}
        />
      </div>

      <span className="text-sm font-mono text-white bg-black/70 px-2 py-0.5 rounded">
        {agent.label}
      </span>

      <AnimatePresence>
        {agent.status === 'working' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap
              bg-black/80 border border-yellow-800 text-yellow-300 text-xs font-mono
              px-2 py-1 rounded pointer-events-none z-30"
          >
            ⚙ {agent.task}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Task Marker (haritadaki kutu) ────────────────────────────────────────────
function TaskMarkerSprite({ marker }: { marker: TaskMarker }) {
  return (
    <motion.div
      style={{ position: 'absolute', left: `${marker.x}%`, top: `${marker.y}%`, zIndex: 8 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="flex flex-col items-center gap-1 cursor-default select-none"
    >
      {/* Arka plan resim gelmeden önce fallback animasyonlu kutu */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        {/* task-marker.png varsa göster, yoksa CSS kutu */}
        <img
          src="/task-marker.png"
          alt="task"
          width={110}
          height={110}
          style={{ imageRendering: 'pixelated' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-yellow-400/70"
          animate={{ scale: [1, 1.8, 1], opacity: [0.9, 0, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>

      {/* Task bilgisi */}
      <div className="bg-black/85 border border-yellow-600 rounded-lg px-3 py-2 text-center max-w-[180px] shadow-[0_0_20px_rgba(255,170,0,0.3)]">
        <p className="text-yellow-200 text-[11px] font-mono font-bold truncate">{marker.description}</p>
        <p className="text-yellow-400 text-[10px] font-mono mt-0.5">{marker.reward} MON</p>
        {marker.assignedAgentId
          ? <p className="text-green-400 text-[10px] font-mono mt-0.5">⚙ being processed...</p>
          : <p className="text-yellow-600 text-[10px] font-mono mt-0.5">⏳ awaiting agent</p>
        }
      </div>
    </motion.div>
  )
}

// ─── Completion Notification ──────────────────────────────────────────────────
function CompletionNotification({ notif, onDone }: { notif: Notification; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0, y: -80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -80 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50
        bg-black/90 border border-green-500 rounded-xl px-5 py-3
        flex items-center gap-3 shadow-[0_0_30px_rgba(0,255,65,0.3)]"
    >
      <motion.span
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.5, repeat: 2 }}
        className="text-2xl"
      >✅</motion.span>
      <div>
        <p className="text-green-300 font-mono text-sm font-bold">Task Completed!</p>
        <p className="text-gray-400 font-mono text-xs">
          <span className="text-white">{notif.agentLabel}</span> finished "{notif.taskDesc}"
        </p>
        <p className="text-green-400 font-mono text-xs">+{notif.reward} MON released from escrow</p>
      </div>
      <button onClick={onDone} className="text-gray-600 hover:text-gray-300 text-lg ml-2">×</button>
    </motion.div>
  )
}

// ─── Live Feed ────────────────────────────────────────────────────────────────
function LiveFeed({ events }: { events: FeedEvent[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollTo({ top: 0, behavior: 'smooth' }) }, [events])

  return (
    <div className="absolute bottom-4 right-4 w-72 bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden z-20">
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-white/60 text-xs font-mono uppercase tracking-widest">Live Feed</span>
      </div>
      <div ref={ref} className="max-h-48 overflow-y-auto p-2 space-y-1.5">
        <AnimatePresence initial={false}>
          {events.slice(0, 15).map(e => (
            <motion.div key={e.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }} className="flex gap-2 items-start">
              <span className="text-white/30 text-[9px] font-mono mt-0.5 shrink-0">{e.time}</span>
              <span className={`text-[10px] font-mono leading-tight ${e.color}`}>
                <span className="text-white/80">{e.label}</span> {e.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {events.length === 0 && (
          <p className="text-white/20 text-xs font-mono text-center py-4">Waiting for activity...</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────
interface AgentHubProps {
  // Demo: PostTaskForm'dan gelen mock task
  incomingTask?: IncomingTask | null

  // Gerçek kontrat eventleri — deploy sonrası bunları doldur
  onChainTaskPosted?: { uid: string; onChainId: bigint; description: string; reward: string } | null
  onChainTaskCompleted?: { onChainId: bigint; workerAddress: string } | null
}

let notifId = 0

export default function AgentHub({ incomingTask, onChainTaskPosted, onChainTaskCompleted }: AgentHubProps) {
  const [agents, setAgents]         = useState<Agent[]>(INITIAL_AGENTS)
  const [taskMarkers, setTaskMarkers] = useState<TaskMarker[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [events, setEvents]         = useState<FeedEvent[]>([])

  const statusAt   = useRef<Record<string, number>>({})
  const moveAt     = useRef<Record<string, number>>({})
  const workingOn  = useRef<Record<string, string>>({})  // agentId → taskMarker uid

  // ── Demo: IncomingTask prop değişince yeni task ekle ──────────────────────
  useEffect(() => {
    if (!incomingTask) return
    addTaskToHub(incomingTask.uid, incomingTask.description, incomingTask.reward, incomingTask.onChainId)
  }, [incomingTask])

  // ── Gerçek kontrat: TaskPosted eventi ─────────────────────────────────────
  useEffect(() => {
    if (!onChainTaskPosted) return
    addTaskToHub(
      onChainTaskPosted.uid,
      onChainTaskPosted.description,
      onChainTaskPosted.reward,
      onChainTaskPosted.onChainId
    )
  }, [onChainTaskPosted])

  // ── Gerçek kontrat: TaskCompleted eventi ──────────────────────────────────
  useEffect(() => {
    if (!onChainTaskCompleted) return
    // Hangi task marker tamamlandı?
    setTaskMarkers(prev => {
      const marker = prev.find(m => m.onChainId === onChainTaskCompleted.onChainId)
      if (!marker) return prev
      // Hangi agent çalışıyordu?
      const agentId = marker.assignedAgentId
      const agent = agentId ? agents.find(a => a.id === agentId) : null

      triggerCompletion(
        agent?.label ?? 'Unknown Agent',
        marker.description,
        marker.reward
      )
      return prev.filter(m => m.onChainId !== onChainTaskCompleted.onChainId)
    })
  }, [onChainTaskCompleted])

  function addTaskToHub(uid: string, description: string, reward: string, onChainId?: bigint) {
    // Ortaya spawn — hafif rastgele offset ile tam merkez
    const pos = {
      x: 40 + Math.random() * 20,  // %40-%60
      y: 35 + Math.random() * 15,  // %35-%50
    }
    const marker: TaskMarker = { uid, onChainId, x: pos.x, y: pos.y, description, reward, assignedAgentId: null }

    setTaskMarkers(prev => [...prev, marker])
    setEvents(ev => [makeEvent('SYSTEM', `new task posted: "${description}"`, 'text-cyan-300'), ...ev.slice(0, 14)])

    // En yakın idle agent'ı bul ve göreve gönder
    setAgents(prev => {
      const idle = prev.filter(a => a.status === 'idle' && !a.assignedTaskId)
      if (idle.length === 0) return prev

      // En yakın olanı seç
      let nearest = idle[0]
      let minDist = Infinity
      idle.forEach(a => {
        const d = Math.sqrt((a.x - pos.x) ** 2 + (a.y - pos.y) ** 2)
        if (d < minDist) { minDist = d; nearest = a }
      })

      const dur = calcMoveDuration(nearest.x, nearest.y, pos.x, pos.y)

      // Task marker'a agent'ı ata
      setTaskMarkers(m => m.map(t => t.uid === uid ? { ...t, assignedAgentId: nearest.id } : t))
      workingOn.current[nearest.id] = uid

      // Agent'ı task konumuna yürüt, statusAt'ı ayarla
      statusAt.current[nearest.id] = Date.now() + dur * 1000 + 1000  // yürüme bittikten 1s sonra working başlar
      moveAt.current[nearest.id] = Infinity

      setEvents(ev => [
        makeEvent(nearest.label, `moving to task: "${description}"`, 'text-yellow-300'),
        ...ev.slice(0, 14)
      ])

      return prev.map(a => a.id === nearest.id
        ? { ...a, x: pos.x, y: pos.y, moveDuration: dur, assignedTaskId: uid, status: 'idle' }
        : a
      )
    })
  }

  function triggerCompletion(agentLabel: string, taskDesc: string, reward: string) {
    setNotifications(prev => [...prev, { id: notifId++, agentLabel, taskDesc, reward }])
    setEvents(ev => [
      makeEvent(agentLabel, `completed task → +${reward} MON`, 'text-green-300'),
      ...ev.slice(0, 14)
    ])
  }

  // ── Ana interval: status cycling + hareket ────────────────────────────────
  useEffect(() => {
    const now = Date.now()
    INITIAL_AGENTS.forEach((agent, i) => {
      statusAt.current[agent.id] = now + STATUS_DURATION_MS[agent.status] + i * 3000
      moveAt.current[agent.id] = CAN_MOVE.has(agent.status) ? now + 4000 + i * 2500 : Infinity
    })

    const interval = setInterval(() => {
      const now = Date.now()

      setAgents(prev => {
        let anyChanged = false

        const next = prev.map(agent => {
          let updated = agent
          let changed = false

          // ── Status geçişi ────────────────────────────────────
          if (now >= statusAt.current[agent.id]) {
            const nextStatus = NEXT_STATUS[agent.status]
            let newTask = agent.task
            let newAssignedTask = agent.assignedTaskId

            if (nextStatus === 'working' && agent.assignedTaskId) {
              // Gerçek task üzerinde çalışıyor — task marker güncelle
              newTask = taskMarkers.find(t => t.uid === agent.assignedTaskId)?.description ?? randomTask()
            } else if (nextStatus === 'working') {
              newTask = randomTask()
            }

            if (nextStatus === 'done' && agent.assignedTaskId) {
              // Task tamamlandı
              const marker = taskMarkers.find(t => t.uid === agent.assignedTaskId)
              if (marker) {
                triggerCompletion(agent.label, marker.description, marker.reward)
                setTaskMarkers(m => m.filter(t => t.uid !== agent.assignedTaskId))
              }
              delete workingOn.current[agent.id]
              newAssignedTask = null
            }

            updated = { ...updated, status: nextStatus, task: newTask, assignedTaskId: newAssignedTask }
            statusAt.current[agent.id] = now + STATUS_DURATION_MS[nextStatus]

            if (CAN_MOVE.has(nextStatus)) {
              moveAt.current[agent.id] = now + 1500
            } else {
              moveAt.current[agent.id] = Infinity
            }

            if (nextStatus === 'working' || nextStatus === 'done') {
              setEvents(ev => [
                makeEvent(
                  agent.label,
                  nextStatus === 'working' ? `started: "${newTask}"` : `completed task`,
                  nextStatus === 'working' ? 'text-yellow-300' : 'text-green-300'
                ),
                ...ev.slice(0, 14)
              ])
            }
            changed = true
          }

          // ── Hareket (sadece idle/farming, assignedTask yoksa) ─
          const canMove = CAN_MOVE.has(updated.status) && !updated.assignedTaskId
          if (canMove && now >= moveAt.current[agent.id]) {
            const pos = randomPos()
            const dur = calcMoveDuration(updated.x, updated.y, pos.x, pos.y)
            updated = { ...updated, x: pos.x, y: pos.y, moveDuration: dur }
            moveAt.current[agent.id] = now + dur * 1000 + 3000 + Math.random() * 3000
            changed = true
          }

          if (changed) anyChanged = true
          return changed ? updated : agent
        })

        return anyChanged ? next : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [taskMarkers])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10" style={{ height: '78vh', minHeight: 520 }}>
      <img src="/BACKGROUND.png" alt="Medieval Plaza" className="absolute inset-0 w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
      <div className="absolute inset-0 bg-black/25" />

      {/* Task markers */}
      <AnimatePresence>
        {taskMarkers.map(m => <TaskMarkerSprite key={m.uid} marker={m} />)}
      </AnimatePresence>

      {/* Agents */}
      {agents.map(agent => <AgentSprite key={agent.id} agent={agent} />)}

      {/* Completion notifications */}
      <AnimatePresence>
        {notifications.slice(-1).map(n => (
          <CompletionNotification
            key={n.id}
            notif={n}
            onDone={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
          />
        ))}
      </AnimatePresence>

      <LiveFeed events={events} />

      <div className="absolute top-3 left-3 flex gap-2 z-20">
        {(['working', 'farming', 'idle'] as AgentStatus[]).map(s => (
          <div key={s} className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono">
            <span className={s === 'working' ? 'text-yellow-400' : s === 'farming' ? 'text-purple-400' : 'text-gray-400'}>
              {agents.filter(a => a.status === s).length}
            </span>
            <span className="text-white/40 ml-1">{s}</span>
          </div>
        ))}
        {taskMarkers.length > 0 && (
          <div className="bg-black/60 backdrop-blur-sm border border-yellow-900 rounded-lg px-3 py-1.5 text-xs font-mono">
            <span className="text-yellow-400">{taskMarkers.length}</span>
            <span className="text-white/40 ml-1">open tasks</span>
          </div>
        )}
      </div>
    </div>
  )
}
