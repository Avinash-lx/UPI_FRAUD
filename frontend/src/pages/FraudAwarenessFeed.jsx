import { useState, useEffect } from 'react'
import { Shield, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const MOCK_PATTERNS = [
  {
    id: 1,
    type: 'VELOCITY_ABUSE',
    title: '31 micro-transactions in 1 hour detected',
    description: 'A cluster of ₹499 payments was sent from a single UPI handle to 6 different wallets within 60 minutes in Hyderabad. Our AI blocked the pattern at 31 transactions.',
    region: 'Hyderabad, Telangana',
    detectedAt: '20 minutes ago',
    severity: 'HIGH',
    color: '#a855f7',
  },
  {
    id: 2,
    type: 'SIM_SWAP',
    title: 'SIM swap attack wave — 3 accounts targeted',
    description: 'Three accounts had SIM replacement followed by immediate high-value transfers on a new device. The telecom operator was contacted and SIM changes flagged.',
    region: 'Mumbai Metropolitan Area',
    detectedAt: '1 hour ago',
    severity: 'CRITICAL',
    color: '#ef4444',
  },
  {
    id: 3,
    type: 'GEO_IMPOSSIBLE',
    title: 'Geo-impossible transaction: Mumbai → Singapore in 45 min',
    description: "A transaction was attempted from Singapore only 45 minutes after the account's last activity in Mumbai — physically impossible. The \u20b91.5L transfer was auto-blocked.",
    region: 'International',
    detectedAt: '2 hours ago',
    severity: 'CRITICAL',
    color: '#ec4899',
  },
  {
    id: 4,
    type: 'PHISHING',
    title: 'Phishing wave targeting Paytm users',
    description: 'Multiple reports of fraudulent SMS links claiming to be Paytm KYC verification. 12 users clicked; 4 had payment attempts blocked before funds left.',
    region: 'Delhi NCR',
    detectedAt: '3 hours ago',
    severity: 'HIGH',
    color: '#eab308',
  },
  {
    id: 5,
    type: 'MULE_NETWORK',
    title: 'Mule network of 8 accounts dismantled',
    description: 'Graph NN detected a layered network routing ₹4.8L through 8 accounts across 3 states. All accounts flagged and banks notified via NPCI.',
    region: 'Mumbai • Pune • Nagpur',
    detectedAt: '5 hours ago',
    severity: 'MEDIUM',
    color: '#f97316',
  },
]

const TIPS = [
  'Never share your UPI PIN or OTP with anyone — not even bank officials.',
  'Be suspicious of transfer requests at night or from unfamiliar beneficiaries.',
  'Link your UPI only to your primary number — not a secondary or shared SIM.',
  'Enable biometric lock on your UPI app to prevent device-theft fraud.',
  'Report any unexpected OTP you receive immediately to your bank.',
  'Check your transaction history weekly for small unrecognized charges.',
]

const SEVERITY_STYLE = {
  CRITICAL: 'border-red-500/40 bg-red-500/5',
  HIGH:     'border-amber-500/40 bg-amber-500/5',
  MEDIUM:   'border-blue-500/40 bg-blue-500/5',
}

const SEVERITY_BADGE = {
  CRITICAL: 'badge-critical',
  HIGH:     'badge-high',
  MEDIUM:   'badge-medium',
}

export default function FraudAwarenessFeed() {
  const [patterns, setPatterns] = useState(MOCK_PATTERNS)
  const [tip, setTip]           = useState(TIPS[0])
  const [tipIdx, setTipIdx]     = useState(0)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setTipIdx(i => {
        const next = (i + 1) % TIPS.length
        setTip(TIPS[next])
        return next
      })
    }, 8000)
    return () => clearInterval(id)
  }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/v1/fraud/awareness`)
      if (res.data?.length) setPatterns(res.data)
    } catch {}
    // Shuffle mock for demo effect
    setPatterns(p => [...p].sort(() => Math.random() - 0.5))
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="bg-surface-800 border-b border-white/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-400" />
            <div>
              <div className="font-bold text-gray-100 text-sm">Fraud Awareness Feed</div>
              <div className="text-xs text-gray-400">Anonymized patterns — updated in real time</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={refresh}
                    className={`text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1.5 transition-all ${loading ? 'animate-spin' : ''}`}>
              <RefreshCw size={13} /> {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-200">← Back</Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Tip Banner */}
        <div className="glass p-4 flex items-start gap-3 border border-blue-500/20 bg-blue-500/5">
          <Lightbulb size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-blue-400 mb-1">Safety Tip</div>
            <div className="text-sm text-gray-300 transition-all duration-500">{tip}</div>
          </div>
        </div>

        {/* Patterns */}
        <div className="space-y-4">
          {patterns.map(p => (
            <div key={p.id} className={`glass border ${SEVERITY_STYLE[p.severity]} p-5 animate-fade-in`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={SEVERITY_BADGE[p.severity]}>{p.severity}</span>
                    <span className="text-xs text-gray-500 font-mono" style={{ color: p.color }}>
                      {p.type.replace(/_/g,' ')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-200 text-sm">{p.title}</h3>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-500">{p.detectedAt}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{p.region}</div>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-gray-600 py-4">
          All fraud patterns are anonymized. No personally identifiable information is shared.
        </div>
      </div>
    </div>
  )
}
