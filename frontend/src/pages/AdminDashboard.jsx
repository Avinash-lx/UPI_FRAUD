import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts'
import {
  Shield, AlertTriangle, TrendingUp, Users, DollarSign, Activity,
  Eye, CheckCircle, XCircle, RefreshCw, Download, Search, Filter,
  ChevronDown, ChevronRight, LogOut, Cpu, Radio, BarChart2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import LiveFeedPanel from '../components/LiveFeedPanel'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const FRAUD_COLORS = {
  SIM_SWAP:        '#ef4444',
  MULE_NETWORK:    '#f97316',
  PHISHING:        '#eab308',
  VELOCITY_ABUSE:  '#a855f7',
  DEVICE_SPOOFING: '#06b6d4',
  GEO_IMPOSSIBLE:  '#ec4899',
  NIGHT_NEW_DEVICE:'#8b5cf6',
}

const RISK_GRADIENT = ['#22c55e','#84cc16','#f59e0b','#ef4444','#dc2626']

// ── Mock data for UI demo when backend is not yet available ──────────────
const MOCK_OVERVIEW = {
  totalFraudToday: 12, totalFraudWeek: 87, totalFraudMonth: 342, totalFraudFY: 1843,
  usersAffected: 294, usersPct: 3.2, moneySaved: 4732500,
  falsePositiveRate: 0.0212, modelAccuracy: 0.9847, f1Score: 0.9712,
  precision: 0.9788, recall: 0.9638,
}

const MOCK_BY_TYPE = [
  { type: 'SIM_SWAP',        label: 'SIM Swap',          count: 48,  amount: 1820000, accounts: 22, trend: 'up' },
  { type: 'MULE_NETWORK',    label: 'Mule Network',       count: 71,  amount: 2341000, accounts: 38, trend: 'up' },
  { type: 'PHISHING',        label: 'Phishing',           count: 103, amount: 876000,  accounts: 64, trend: 'down' },
  { type: 'VELOCITY_ABUSE',  label: 'Velocity Abuse',     count: 214, amount: 432000,  accounts: 87, trend: 'up' },
  { type: 'DEVICE_SPOOFING', label: 'Device Spoofing',    count: 37,  amount: 540000,  accounts: 19, trend: 'down' },
  { type: 'GEO_IMPOSSIBLE',  label: 'Geo-Impossible',     count: 18,  amount: 680000,  accounts: 11, trend: 'up' },
  { type: 'NIGHT_NEW_DEVICE',label: 'Night+New Device',   count: 62,  amount: 311000,  accounts: 43, trend: 'down' },
]

const MOCK_USERS = [
  { upiHandle: 'a***t@paytm',   riskScore: 0.97, fraudType: 'SIM_SWAP',       amount: 255000, status: 'CONFIRMED_FRAUD', date: '2024-03-10' },
  { upiHandle: 'v***m@okicici', riskScore: 0.94, fraudType: 'SIM_SWAP',       amount: 315000, status: 'CONFIRMED_FRAUD', date: '2024-03-12' },
  { upiHandle: 'd***a@oksbi',   riskScore: 0.91, fraudType: 'PHISHING',        amount: 83500,  status: 'CONFIRMED_FRAUD', date: '2024-03-14' },
  { upiHandle: 'm***n@okhdfc',  riskScore: 0.96, fraudType: 'GEO_IMPOSSIBLE',  amount: 245000, status: 'PENDING',         date: '2024-03-15' },
  { upiHandle: 'k***n@ybl',     riskScore: 0.81, fraudType: 'VELOCITY_ABUSE',  amount: 4990,   status: 'REVIEWED',        date: '2024-03-16' },
  { upiHandle: 'p***a@oksbi',   riskScore: 0.75, fraudType: 'NIGHT_NEW_DEVICE',amount: 22500,  status: 'FALSE_POSITIVE',  date: '2024-03-14' },
  { upiHandle: 'a***a@okaxis',  riskScore: 0.68, fraudType: 'NIGHT_NEW_DEVICE',amount: 11000,  status: 'FALSE_POSITIVE',  date: '2024-03-12' },
]

const MOCK_RINGS = [
  { ringId: '1', name: 'SIM Swap Gang Alpha',  memberCount: 4, totalAmount: 485000, fraudType: 'SIM_SWAP',       firstSeen: '2024-01-31', lastSeen: '2024-03-15', isActive: true,  estimatedStolen: 320000 },
  { ringId: '2', name: 'Delhi Phishing Ring',  memberCount: 3, totalAmount: 198500, fraudType: 'PHISHING',       firstSeen: '2024-02-14', lastSeen: '2024-03-16', isActive: true,  estimatedStolen: 140000 },
  { ringId: '3', name: 'Velocity Abusers South',memberCount:4, totalAmount: 75200,  fraudType: 'VELOCITY_ABUSE', firstSeen: '2024-03-02', lastSeen: '2024-03-17', isActive: true,  estimatedStolen: 62000 },
  { ringId: '4', name: 'Geo-Jump Fraudsters',  memberCount: 2, totalAmount: 320000, fraudType: 'GEO_IMPOSSIBLE', firstSeen: '2024-03-10', lastSeen: '2024-03-17', isActive: true,  estimatedStolen: 280000 },
  { ringId: '5', name: 'Night-Device Combo Ring',memberCount:3,totalAmount: 52000,  fraudType: 'NIGHT_NEW_DEVICE',firstSeen:'2024-02-25',lastSeen: '2024-03-17', isActive: false, estimatedStolen: 43000 },
]

const MOCK_MODEL = {
  version: 'v2.4.1', accuracy: 0.9847, f1: 0.9712, precision: 0.9788, recall: 0.9638,
  auc: 0.9923, fpr: 0.0212,
  confusion: { tp: 4219, fp: 91, tn: 42109, fn: 162 },
  featureImportance: [
    { feature: 'txn_velocity_1h',   importance: 0.187 },
    { feature: 'device_age_days',   importance: 0.162 },
    { feature: 'amount_percentile', importance: 0.134 },
    { feature: 'graph_centrality',  importance: 0.119 },
    { feature: 'biometric_delta',   importance: 0.098 },
    { feature: 'sim_change_flag',   importance: 0.087 },
    { feature: 'location_delta_km', importance: 0.074 },
    { feature: 'hour_of_day',       importance: 0.061 },
    { feature: 'merchant_trust',    importance: 0.048 },
    { feature: 'beneficiary_new',   importance: 0.030 },
  ],
  history: [
    { version: 'v2.2', accuracy: 0.9654, f1: 0.9502, trainedAt: '2023-10-01' },
    { version: 'v2.3', accuracy: 0.9791, f1: 0.9654, trainedAt: '2024-01-15' },
    { version: 'v2.4.1',accuracy:0.9847, f1: 0.9712, trainedAt: '2024-03-10' },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtCurrency(n) {
  if (n >= 1e7) return `₹${(n/1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${(n/1e5).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

function RiskBadge({ score }) {
  if (score >= 0.85) return <span className="badge-critical">Critical</span>
  if (score >= 0.70) return <span className="badge-high">High</span>
  if (score >= 0.45) return <span className="badge-medium">Medium</span>
  return <span className="badge-low">Low</span>
}

function StatusBadge({ status }) {
  const map = {
    CONFIRMED_FRAUD: 'badge-high',
    PENDING:         'badge-medium',
    REVIEWED:        'badge-low',
    FALSE_POSITIVE:  'badge-low',
  }
  return <span className={map[status] || 'badge-medium'}>{status?.replace('_',' ')}</span>
}

function TrendIcon({ dir }) {
  return dir === 'up'
    ? <span className="text-red-400 text-xs font-bold">↑</span>
    : <span className="text-green-400 text-xs font-bold">↓</span>
}

// ── Nav ───────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'overview',    label: 'Overview',       icon: BarChart2 },
  { id: 'fraud-types', label: 'Fraud Breakdown',icon: AlertTriangle },
  { id: 'users',       label: 'Affected Users', icon: Users },
  { id: 'rings',       label: 'Fraud Rings',    icon: Activity },
  { id: 'live',        label: 'Live Monitor',   icon: Radio },
  { id: 'model',       label: 'Model Performance', icon: Cpu },
]

// ── Section 1: Overview ───────────────────────────────────────────────────

function OverviewSection({ data }) {
  const kpis = [
    { label: 'Frauds Today',       value: data.totalFraudToday,  icon: AlertTriangle, color: 'text-red-400',   sub: `${data.totalFraudMonth} this month` },
    { label: 'Users Affected',     value: data.usersAffected,    icon: Users,         color: 'text-amber-400', sub: `${data.usersPct}% of user base` },
    { label: 'Money Saved',        value: fmtCurrency(data.moneySaved), icon: DollarSign, color: 'text-green-400', sub: 'blocked fraud value' },
    { label: 'False Positive Rate',value: `${(data.falsePositiveRate*100).toFixed(2)}%`, icon: Eye, color: 'text-blue-400', sub: 'legitimate txns blocked' },
    { label: 'Model Accuracy',     value: `${(data.modelAccuracy*100).toFixed(2)}%`, icon: TrendingUp, color: 'text-purple-400', sub: `F1: ${(data.f1Score*100).toFixed(2)}%` },
  ]

  const weeklyTrend = [
    { day: 'Mon', blocked: 38, flagged: 22 },
    { day: 'Tue', blocked: 51, flagged: 34 },
    { day: 'Wed', blocked: 29, flagged: 19 },
    { day: 'Thu', blocked: 63, flagged: 41 },
    { day: 'Fri', blocked: 44, flagged: 28 },
    { day: 'Sat', blocked: 71, flagged: 55 },
    { day: 'Sun', blocked: 87, flagged: 62 },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-gray-500">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Weekly Trend Chart */}
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Weekly Fraud Activity</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={weeklyTrend}>
            <defs>
              <linearGradient id="blockedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="flaggedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
            <Legend />
            <Area type="monotone" dataKey="blocked" stroke="#ef4444" fill="url(#blockedGrad)" strokeWidth={2} name="Blocked" />
            <Area type="monotone" dataKey="flagged"  stroke="#f59e0b" fill="url(#flaggedGrad)"  strokeWidth={2} name="Flagged" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Model Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Precision', value: data.precision, color: '#3b82f6' },
          { label: 'Recall',    value: data.recall,    color: '#22c55e' },
          { label: 'F1 Score',  value: data.f1Score,   color: '#a855f7' },
          { label: 'AUC-ROC',   value: 0.9923,         color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className="glass p-4 text-center">
            <div className="text-xs text-gray-400 mb-2">{m.label}</div>
            <div className="text-2xl font-bold" style={{ color: m.color }}>
              {(m.value * 100).toFixed(2)}%
            </div>
            {/* Mini progress bar */}
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${m.value * 100}%`, backgroundColor: m.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section 2: Fraud Breakdown ────────────────────────────────────────────

function FraudTypesSection({ data }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Fraud Count by Attack Type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" stroke="#6b7280" fontSize={11} />
              <YAxis type="category" dataKey="label" stroke="#6b7280" fontSize={11} width={110} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
              <Bar dataKey="count" radius={[0,4,4,0]}>
                {data.map((d) => <Cell key={d.type} fill={FRAUD_COLORS[d.type] || '#60a5fa'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="glass p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Amount Lost by Type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="amount" nameKey="label" cx="50%" cy="50%" outerRadius={90}
                   label={({ label, percent }) => `${label.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
                   labelLine={false}>
                {data.map((d) => <Cell key={d.type} fill={FRAUD_COLORS[d.type]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                       formatter={v => fmtCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Attack Type</th>
              <th className="px-4 py-3 text-right">Count</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Accounts</th>
              <th className="px-4 py-3 text-center">Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <>
                <tr key={row.type}
                    className="table-row cursor-pointer"
                    onClick={() => setExpanded(expanded === row.type ? null : row.type)}>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: FRAUD_COLORS[row.type] }} />
                    <span className="text-gray-200">{row.label}</span>
                    {expanded === row.type ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">{row.count}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">{fmtCurrency(row.amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{row.accounts}</td>
                  <td className="px-4 py-3 text-center"><TrendIcon dir={row.trend} /></td>
                </tr>
                {expanded === row.type && (
                  <tr key={`${row.type}-detail`} className="bg-white/5">
                    <td colSpan={5} className="px-6 py-4 text-xs text-gray-400">
                      Avg per case: {fmtCurrency(Math.round(row.amount / row.count))} ·
                      Avg accounts per ring: {(row.accounts / Math.max(row.count / 10, 1)).toFixed(1)} ·
                      See fraud rings section for detailed profiles.
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Section 3: Affected Users ─────────────────────────────────────────────

function AffectedUsersSection({ data }) {
  const [search, setSearch] = useState('')

  const filtered = data.filter(u =>
    u.upiHandle.toLowerCase().includes(search.toLowerCase()) ||
    u.fraudType.toLowerCase().includes(search.toLowerCase()) ||
    u.status.toLowerCase().includes(search.toLowerCase())
  )

  const handleExport = () => {
    const csv = ['UPI Handle,Risk Score,Fraud Type,Amount,Status,Date',
      ...filtered.map(u =>
        `${u.upiHandle},${u.riskScore},${u.fraudType},${u.amount},${u.status},${u.date}`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `affected-users-${Date.now()}.csv`; a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Search handle, fraud type, status…"
                 className="input pl-9 text-sm" />
        </div>
        <button onClick={handleExport} className="btn-ghost flex items-center gap-2 text-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">UPI Handle</th>
              <th className="px-4 py-3 text-center">Risk</th>
              <th className="px-4 py-3 text-left">Fraud Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={i} className="table-row">
                <td className="px-4 py-3 font-mono text-blue-300">{u.upiHandle}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-mono text-gray-300">{(u.riskScore * 100).toFixed(0)}%</span>
                    <div className="w-16 h-1 bg-gray-700 rounded-full">
                      <div className="h-full rounded-full"
                           style={{ width: `${u.riskScore*100}%`, background: u.riskScore >= 0.85 ? '#dc2626' : u.riskScore >= 0.7 ? '#ef4444' : '#f59e0b' }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300">{u.fraudType.replace(/_/g,' ')}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-300">{fmtCurrency(u.amount)}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">{u.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 text-xs text-gray-500 border-t border-white/5">
          Showing {filtered.length} of {data.length} records
        </div>
      </div>
    </div>
  )
}

// ── Section 4: Fraud Rings ────────────────────────────────────────────────

function FraudRingsSection({ rings }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rings.map(ring => (
        <div key={ring.ringId} className={`glass p-5 border-l-4 ${ring.isActive ? 'border-red-500' : 'border-gray-600'}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-100">{ring.name}</h3>
                {ring.isActive
                  ? <span className="inline-flex items-center gap-1 text-xs text-red-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> ACTIVE
                    </span>
                  : <span className="text-xs text-gray-500">Inactive</span>}
              </div>
              <div className="text-xs text-gray-400 mt-0.5"
                   style={{ color: FRAUD_COLORS[ring.fraudType] }}>
                {ring.fraudType.replace(/_/g,' ')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-red-400">{fmtCurrency(ring.estimatedStolen)}</div>
              <div className="text-xs text-gray-400">est. stolen</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-sm font-bold text-gray-200">{ring.memberCount}</div>
              <div className="text-xs text-gray-500">Accounts</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-sm font-bold text-gray-200">{fmtCurrency(ring.totalAmount)}</div>
              <div className="text-xs text-gray-500">Total Routed</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-xs font-medium text-gray-300">{ring.firstSeen}</div>
              <div className="text-xs text-gray-500">First Seen</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">Last seen: {ring.lastSeen}</div>
        </div>
      ))}
    </div>
  )
}

// ── Section 6: Model Performance ─────────────────────────────────────────

function ModelPerformanceSection({ model }) {
  const { confusion: c } = model
  const total = c.tp + c.fp + c.tn + c.fn

  return (
    <div className="space-y-6">
      {/* Version History */}
      <div className="glass p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Model Version History</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={model.history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="version" stroke="#6b7280" fontSize={11} />
            <YAxis domain={[0.93, 1.0]} stroke="#6b7280" fontSize={11}
                   tickFormatter={v => `${(v*100).toFixed(1)}%`} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                     formatter={v => `${(v*100).toFixed(2)}%`} />
            <Legend />
            <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="Accuracy" />
            <Line type="monotone" dataKey="f1"        stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} name="F1 Score" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Confusion Matrix</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'True Positive',  value: c.tp, pct: (c.tp/total*100).toFixed(1), color: '#22c55e' },
              { label: 'False Positive', value: c.fp, pct: (c.fp/total*100).toFixed(1), color: '#f59e0b' },
              { label: 'False Negative', value: c.fn, pct: (c.fn/total*100).toFixed(1), color: '#ef4444' },
              { label: 'True Negative',  value: c.tn, pct: (c.tn/total*100).toFixed(1), color: '#3b82f6' },
            ].map(cell => (
              <div key={cell.label} className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: cell.color }}>
                  {cell.value.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">{cell.label}</div>
                <div className="text-xs text-gray-600 mt-1">{cell.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Importance */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Top SHAP Feature Importance</h3>
          <div className="space-y-2">
            {model.featureImportance.map(f => (
              <div key={f.feature} className="flex items-center gap-3">
                <div className="text-xs text-gray-400 w-36 truncate font-mono">{f.feature}</div>
                <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                       style={{ width: `${f.importance * 100 / 0.2}%` }} />
                </div>
                <div className="text-xs font-mono text-blue-300 w-10 text-right">
                  {(f.importance * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Retrain Button */}
      <div className="glass p-5 flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-200">Trigger Incremental Retraining</div>
          <div className="text-xs text-gray-400 mt-1">Current model: {model.version} · Trained 7 days ago</div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <RefreshCw size={15} /> Retrain Model
        </button>
      </div>
    </div>
  )
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [overview, setOverview]   = useState(MOCK_OVERVIEW)
  const [fraudTypes, setFraudTypes] = useState(MOCK_BY_TYPE)
  const [users, setUsers]         = useState(MOCK_USERS)
  const [rings, setRings]         = useState(MOCK_RINGS)
  const [model, setModel]         = useState(MOCK_MODEL)
  const [loading, setLoading]     = useState(false)
  const { user, logout }          = useAuth()
  const navigate                  = useNavigate()

  useEffect(() => {
    // Try to load real data; fall back to mock silently
    const load = async () => {
      setLoading(true)
      try {
        const [ov, ft, au] = await Promise.all([
          axios.get(`${API}/api/v1/admin/stats/overview`).then(r=>r.data).catch(()=>MOCK_OVERVIEW),
          axios.get(`${API}/api/v1/admin/stats/by-type`).then(r=>r.data).catch(()=>MOCK_BY_TYPE),
          axios.get(`${API}/api/v1/admin/users/affected`).then(r=>r.data?.content).catch(()=>MOCK_USERS),
        ])
        if (ov) setOverview(ov)
        if (ft) setFraudTypes(Array.isArray(ft) ? ft : ft.breakdown || ft)
        if (au) setUsers(Array.isArray(au) ? au : MOCK_USERS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-800 border-r border-white/5 flex flex-col fixed h-full z-20">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-100 text-sm">UPI Shield</div>
              <div className="text-xs text-gray-400">Admin Dashboard</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      activeSection === item.id
                        ? 'bg-brand-600/20 text-brand-400 font-medium'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}>
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-200">{user?.username || 'admin'}</div>
              <div className="text-xs text-gray-500">{user?.roles?.[0]?.replace('ROLE_','') || 'ANALYST'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-ghost w-full flex items-center justify-center gap-2 text-xs py-2">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-100">
              {NAV_ITEMS.find(n => n.id === activeSection)?.label}
            </h1>
            <div className="text-xs text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
              <span className="relative w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green-400" />
              </span>
              Live
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8 text-gray-400 text-sm">Loading dashboard data…</div>
        )}

        {!loading && (
          <div className="animate-fade-in">
            {activeSection === 'overview'    && <OverviewSection data={overview} />}
            {activeSection === 'fraud-types' && <FraudTypesSection data={fraudTypes} />}
            {activeSection === 'users'       && <AffectedUsersSection data={users} />}
            {activeSection === 'rings'       && <FraudRingsSection rings={rings} />}
            {activeSection === 'live'        && <LiveFeedPanel />}
            {activeSection === 'model'       && <ModelPerformanceSection model={model} />}
          </div>
        )}
      </main>
    </div>
  )
}
