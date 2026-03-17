import { useState, useEffect, useRef } from 'react'
import { Radio, Filter, ShieldAlert, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

const WS_URL = typeof window !== 'undefined'
  ? (import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080/ws/fraud-stream`)
  : 'ws://localhost:8080/ws/fraud-stream'

// Mock live transaction generator
function generateMockTransaction() {
  const handles = ['rahul.sharma@okaxis','priya.nair@oksbi','amit.gupta@paytm','kiran.reddy@ybl','mohan.das@okhdfc','ananya.singh@okaxis']
  const merchants = ['Swiggy','Amazon','UPI Transfer','BigBasket','IRCTC','PayLink','Zomato','CryptoExch']
  const cities = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Pune','Kolkata']
  const fraudTypes = ['LEGITIMATE','PHISHING','VELOCITY_ABUSE','SIM_SWAP','MULE_NETWORK','GEO_IMPOSSIBLE','LEGITIMATE','LEGITIMATE','LEGITIMATE']

  const fraudType = fraudTypes[Math.floor(Math.random() * fraudTypes.length)]
  const riskScore = fraudType === 'LEGITIMATE'
    ? Math.random() * 0.3
    : fraudType === 'SIM_SWAP' ? 0.85 + Math.random() * 0.14
    : 0.4 + Math.random() * 0.55

  const decision = riskScore >= 0.80 ? 'BLOCK' : riskScore >= 0.45 ? 'FLAG' : 'ALLOW'

  return {
    txnId:      `txn-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    upiHandle:  handles[Math.floor(Math.random() * handles.length)],
    merchant:   merchants[Math.floor(Math.random() * merchants.length)],
    amount:     Math.round(Math.random() * 49900 + 100),
    riskScore:  Math.round(riskScore * 10000) / 10000,
    decision,
    fraudType,
    locationCity: cities[Math.floor(Math.random() * cities.length)],
    timestamp:  new Date().toISOString(),
    modelVersion:'v2.4.1',
  }
}

const DECISION_STYLE = {
  BLOCK: { badge: 'badge-high',   icon: XCircle,        label: 'BLOCKED' },
  FLAG:  { badge: 'badge-medium', icon: AlertTriangle,  label: 'FLAGGED' },
  ALLOW: { badge: 'badge-low',    icon: CheckCircle,    label: 'ALLOWED' },
}

const FRAUD_COLOR = {
  LEGITIMATE:     '#22c55e',
  PHISHING:       '#eab308',
  VELOCITY_ABUSE: '#a855f7',
  SIM_SWAP:       '#ef4444',
  MULE_NETWORK:   '#f97316',
  GEO_IMPOSSIBLE: '#ec4899',
  DEVICE_SPOOFING:'#06b6d4',
  NIGHT_NEW_DEVICE:'#8b5cf6',
}

function fmtCurrency(n) {
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

export default function LiveFeedPanel({ standalone = true }) {
  const [txns, setTxns]           = useState([])
  const [paused, setPaused]       = useState(false)
  const [filter, setFilter]       = useState('all')    // all | high | medium | low
  const [stats, setStats]         = useState({ blocked: 0, flagged: 0, allowed: 0, totalAmount: 0 })
  const wsRef                     = useRef(null)
  const pausedRef                 = useRef(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    // Try real WebSocket first
    let ws
    try {
      ws = new WebSocket(WS_URL)
      ws.onmessage = (e) => {
        if (pausedRef.current) return
        try {
          const txn = JSON.parse(e.data)
          addTxn(txn)
        } catch {}
      }
      ws.onerror = () => startMockFeed()
      wsRef.current = ws
    } catch {
      startMockFeed()
    }

    return () => {
      ws?.close()
    }
  }, [])

  function startMockFeed() {
    const interval = setInterval(() => {
      if (!pausedRef.current) {
        addTxn(generateMockTransaction())
      }
    }, 900 + Math.random() * 600)
    wsRef.current = { close: () => clearInterval(interval) }
  }

  function addTxn(txn) {
    setTxns(prev => [txn, ...prev].slice(0, 200))
    setStats(prev => ({
      blocked:     prev.blocked     + (txn.decision === 'BLOCK' ? 1 : 0),
      flagged:     prev.flagged     + (txn.decision === 'FLAG'  ? 1 : 0),
      allowed:     prev.allowed     + (txn.decision === 'ALLOW' ? 1 : 0),
      totalAmount: prev.totalAmount + (txn.amount || 0),
    }))
  }

  const filtered = txns.filter(t => {
    if (filter === 'high')   return t.riskScore >= 0.80
    if (filter === 'medium') return t.riskScore >= 0.45 && t.riskScore < 0.80
    if (filter === 'low')    return t.riskScore < 0.45
    return true
  })

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Blocked',  value: stats.blocked,  color: '#ef4444' },
          { label: 'Flagged',  value: stats.flagged,  color: '#f59e0b' },
          { label: 'Allowed',  value: stats.allowed,  color: '#22c55e' },
          { label: 'Volume',   value: fmtCurrency(stats.totalAmount), color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} className="glass p-4 text-center">
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-xs text-green-400">
          <span className="relative w-2.5 h-2.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-60 animate-ping" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-green-400" />
          </span>
          LIVE
        </div>

        {/* Filter */}
        <div className="flex gap-1 ml-2">
          {['all','high','medium','low'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${
                      filter === f
                        ? 'bg-brand-600/20 border-brand-500 text-brand-400'
                        : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <button onClick={() => setPaused(p => !p)}
                className={`ml-auto text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  paused
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                    : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      {/* Feed table */}
      <div className="glass overflow-hidden" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface-800 z-10">
            <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Handle</th>
              <th className="px-4 py-3 text-left">Merchant</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Risk</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">City</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((txn, i) => {
              const ds = DECISION_STYLE[txn.decision] || DECISION_STYLE.ALLOW
              return (
                <tr key={txn.txnId}
                    className={`border-b border-white/5 transition-all duration-150 ${
                      i === 0 ? 'animate-slide-up' : ''} 
                      ${txn.decision === 'BLOCK' ? 'bg-red-500/5' : txn.decision === 'FLAG' ? 'bg-amber-500/5' : ''}`}>
                  <td className="px-4 py-2.5">
                    <span className={ds.badge}>{ds.label}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-blue-300 truncate max-w-[100px]">{txn.upiHandle}</td>
                  <td className="px-4 py-2.5 text-gray-300 truncate max-w-[90px]">{txn.merchant}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-300">{fmtCurrency(txn.amount)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-gray-700 rounded-full">
                        <div className="h-full rounded-full"
                             style={{
                               width: `${txn.riskScore * 100}%`,
                               background: txn.riskScore >= 0.8 ? '#dc2626' : txn.riskScore >= 0.45 ? '#f59e0b' : '#22c55e',
                             }} />
                      </div>
                      <span className="text-gray-400">{(txn.riskScore * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs" style={{ color: FRAUD_COLOR[txn.fraudType] || '#9ca3af' }}>
                      {txn.fraudType?.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{txn.locationCity}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono">
                    {txn.timestamp ? new Date(txn.timestamp).toLocaleTimeString('en-IN') : '--'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            No transactions matching the current filter.
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 text-right">
        {filtered.length} of {txns.length} transactions shown
      </div>
    </div>
  )
}
