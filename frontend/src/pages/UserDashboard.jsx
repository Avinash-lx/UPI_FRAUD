import { useState, useEffect } from 'react'
import axios from 'axios'
import { Shield, Bell, AlertCircle, CheckCircle, MessageSquare, Flag, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const MOCK_TXNS = [
  { txnId: 'txn-001', merchant: 'Swiggy',       amount: 340,   riskScore: 0.04, decision: 'ALLOW', fraudType: 'LEGITIMATE',  timestamp: '2024-03-17 19:25', status: 'PROCESSED' },
  { txnId: 'txn-002', merchant: 'Amazon',        amount: 1299,  riskScore: 0.06, decision: 'ALLOW', fraudType: 'LEGITIMATE',  timestamp: '2024-03-17 15:10', status: 'PROCESSED' },
  { txnId: 'txn-003', merchant: 'UPI Transfer',  amount: 45000, riskScore: 0.91, decision: 'BLOCK', fraudType: 'PHISHING',    timestamp: '2024-03-16 02:18', status: 'CONFIRMED_FRAUD' },
  { txnId: 'txn-004', merchant: 'Flipkart',      amount: 3499,  riskScore: 0.08, decision: 'ALLOW', fraudType: 'LEGITIMATE',  timestamp: '2024-03-15 11:45', status: 'PROCESSED' },
  { txnId: 'txn-005', merchant: 'Blinkit',       amount: 675,   riskScore: 0.05, decision: 'ALLOW', fraudType: 'LEGITIMATE',  timestamp: '2024-03-17 20:55', status: 'PROCESSED' },
  { txnId: 'txn-006', merchant: 'PayLink',       amount: 12000, riskScore: 0.68, decision: 'FLAG',  fraudType: 'NIGHT_NEW_DEVICE','timestamp': '2024-03-15 01:32', status: 'REVIEWED' },
]

function RiskBadge({ score, decision }) {
  if (decision === 'BLOCK') return <span className="badge-high flex items-center gap-1"><AlertCircle size={10}/> Blocked</span>
  if (decision === 'FLAG')  return <span className="badge-medium flex items-center gap-1"><AlertCircle size={10}/> Review</span>
  return <span className="badge-low flex items-center gap-1"><CheckCircle size={10}/> Clear</span>
}

function RiskBar({ score }) {
  const color = score >= 0.8 ? '#dc2626' : score >= 0.45 ? '#f59e0b' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-700 rounded-full">
        <div className="h-full rounded-full" style={{ width: `${score*100}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-gray-400">{(score*100).toFixed(0)}%</span>
    </div>
  )
}

export default function UserDashboard() {
  const [txns, setTxns]         = useState(MOCK_TXNS)
  const [showAlert, setShowAlert] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [reportForm, setReportForm] = useState({ description: '', contact: '' })
  const [submitted, setSubmitted] = useState(false)

  const hasBlockedTxn = txns.some(t => t.decision === 'BLOCK')

  const submitReport = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/api/v1/user/report-fraud`, {
        upiHandle: 'demo@okaxis', ...reportForm
      })
    } catch {}
    setSubmitted(true)
    setTimeout(() => { setShowReport(false); setSubmitted(false) }, 2000)
  }

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="bg-surface-800 border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-100 text-sm">UPI Shield</div>
              <div className="text-xs text-gray-400 font-mono">demo@okaxis</div>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/ask"       className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"><MessageSquare size={13}/> Ask AI</Link>
            <Link to="/live"      className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"><TrendingUp size={13}/> Live Feed</Link>
            <Link to="/awareness" className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"><Bell size={13}/> Alerts</Link>
            <Link to="/login"     className="text-xs text-gray-400 hover:text-gray-200">Admin →</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Alert banner */}
        {hasBlockedTxn && showAlert && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-300 text-sm">⚠️ Fraud Alert on Your Account</div>
              <div className="text-xs text-gray-400 mt-1">
                A transaction of <strong className="text-gray-300">₹45,000 to UPI Transfer</strong> was automatically blocked on 16 Mar at 02:18 AM.
                Our AI detected a phishing pattern. This has been confirmed as fraud by an analyst.
              </div>
              <div className="mt-2 flex gap-3">
                <Link to="/ask" className="text-xs text-blue-400 underline">Ask AI about this</Link>
                <button onClick={() => setShowReport(true)} className="text-xs text-red-400 underline">Report an issue</button>
              </div>
            </div>
            <button onClick={() => setShowAlert(false)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Transactions', value: txns.length, color: 'text-blue-400' },
            { label: 'Blocked / Flagged',  value: txns.filter(t=>t.decision!=='ALLOW').length, color: 'text-red-400' },
            { label: 'Amount Protected',   value: '₹45,000', color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="glass p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <div className="glass overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-gray-200 text-sm">Transaction History</h2>
            <span className="text-xs text-gray-500">Last 30 days</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Merchant</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Risk</th>
                <th className="px-5 py-3 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {txns.map(txn => (
                <tr key={txn.txnId} className="table-row">
                  <td className="px-5 py-3 text-gray-200">{txn.merchant}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-300">
                    ₹{txn.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <RiskBadge score={txn.riskScore} decision={txn.decision} />
                  </td>
                  <td className="px-5 py-3 flex justify-center">
                    <RiskBar score={txn.riskScore} />
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-400">{txn.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Report Fraud Button */}
        <button onClick={() => setShowReport(true)}
                className="btn-ghost flex items-center gap-2 text-sm w-full justify-center">
          <Flag size={14} className="text-red-400" /> Report a Fraud
        </button>

        {/* Report Fraud Modal */}
        {showReport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass max-w-md w-full p-6 animate-slide-up">
              <h3 className="font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <Flag size={16} className="text-red-400" /> Report a Fraud
              </h3>
              {submitted ? (
                <div className="text-center py-6">
                  <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
                  <div className="text-green-300 font-semibold">Report Submitted!</div>
                  <div className="text-xs text-gray-400 mt-1">Our team will investigate within 24 hours.</div>
                </div>
              ) : (
                <form onSubmit={submitReport} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Describe the incident</label>
                    <textarea value={reportForm.description}
                              onChange={e => setReportForm(f => ({...f, description: e.target.value}))}
                              className="input resize-none" rows={4}
                              placeholder="e.g. I received an OTP I didn't request and ₹45,000 was transferred…"
                              required />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Contact number (optional)</label>
                    <input value={reportForm.contact}
                           onChange={e => setReportForm(f => ({...f, contact: e.target.value}))}
                           className="input" placeholder="+91-XXXXX-XXXXX" />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary flex-1">Submit Report</button>
                    <button type="button" onClick={() => setShowReport(false)} className="btn-ghost flex-1">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
