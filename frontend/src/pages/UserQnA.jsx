import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Send, Bot, User, ShieldAlert, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const SUGGESTED = [
  'Was my last transaction flagged?',
  'Why was my payment blocked?',
  'Am I at risk of fraud?',
  'Show me my recent suspicious activity',
  'What is a SIM swap attack?',
]

// Simulated AI response for demo
function generateDemoResponse(question, q) {
  const lower = q.toLowerCase()
  if (lower.includes('block') || lower.includes('flag')) {
    return {
      text: "Your transaction of ₹45,000 to a new beneficiary was blocked. Our AI detected: 8 transactions in the last hour from a new device (3 days old), combined with a new payee you've never sent money to before. This pattern matches phishing-induced transfers. If this was legitimate, you can raise a dispute below.",
      shapFeatures: [
        { feature: 'Transactions in last 1 hour', contribution: 0.88, direction: 'risk' },
        { feature: 'New device (3 days old)',      contribution: 0.71, direction: 'risk' },
        { feature: 'First-time beneficiary',       contribution: 0.85, direction: 'risk' },
        { feature: 'Account age (4 months)',        contribution: 0.42, direction: 'risk' },
      ],
      decision: 'BLOCK',
      riskScore: 0.91,
    }
  }
  if (lower.includes('risk') || lower.includes('safe')) {
    return {
      text: "Based on your transaction history, your account risk level is LOW (score: 4%). Your device is trusted (730 days old), you transact with known merchants, and your spending patterns are consistent. No suspicious activity has been detected in the last 30 days.",
      shapFeatures: [
        { feature: 'Device age (730 days)',         contribution: -0.82, direction: 'safe' },
        { feature: 'Known merchants',               contribution: -0.76, direction: 'safe' },
        { feature: 'Consistent spending pattern',   contribution: -0.65, direction: 'safe' },
        { feature: 'No prior fraud flags',           contribution: -0.58, direction: 'safe' },
      ],
      decision: 'ALLOW',
      riskScore: 0.04,
    }
  }
  if (lower.includes('sim swap')) {
    return {
      text: "A SIM swap attack happens when a fraudster convinces your telecom operator to transfer your phone number to a new SIM card they control. Once they have your number, they can receive OTPs and take over your UPI accounts. Signs: sudden loss of phone signal, unexpected OTPs you didn't request.",
      shapFeatures: [],
      decision: null,
      riskScore: null,
    }
  }
  return {
    text: "I've analysed your account. Your last 5 transactions all appear legitimate. Transaction to Amazon (₹1,299) scored 6% risk — well within safe range. Your account is in good standing with no active alerts.",
    shapFeatures: [
      { feature: 'All transactions on known device', contribution: -0.70, direction: 'safe' },
      { feature: 'Merchant trust score: 0.95',       contribution: -0.88, direction: 'safe' },
    ],
    decision: 'ALLOW',
    riskScore: 0.06,
  }
}

function SHAPBar({ feature, contribution, direction }) {
  const pct = Math.abs(contribution) * 100
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="text-gray-400 w-48 truncate">{feature}</div>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full"
             style={{
               width: `${pct}%`,
               background: direction === 'risk' ? '#ef4444' : '#22c55e',
             }} />
      </div>
      <div className={`w-10 text-right font-mono ${direction === 'risk' ? 'text-red-400' : 'text-green-400'}`}>
        {direction === 'risk' ? '+' : '-'}{pct.toFixed(0)}%
      </div>
    </div>
  )
}

function ChatMessage({ msg }) {
  const isBot = msg.role === 'assistant'
  return (
    <div className={`flex gap-3 animate-slide-up ${isBot ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
        isBot ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-surface-600'}`}>
        {isBot ? <Bot size={16} className="text-white" /> : <User size={16} className="text-gray-300" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] flex flex-col gap-2 ${isBot ? '' : 'items-end'}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isBot ? 'bg-surface-700 text-gray-200 rounded-tl-none' : 'bg-brand-600 text-white rounded-tr-none'}`}>
          {msg.content}
        </div>

        {/* SHAP Explanation */}
        {isBot && msg.shap && msg.shap.length > 0 && (
          <div className="w-full glass p-4 space-y-2 mt-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2">
              <ShieldAlert size={13} />
              AI Explanation — Key Risk Factors
            </div>
            {msg.shap.map((f, i) => (
              <SHAPBar key={i} {...f} />
            ))}
          </div>
        )}

        {/* Decision badge */}
        {isBot && msg.decision && (
          <div className="flex items-center gap-2">
            {msg.decision === 'BLOCK' && (
              <span className="badge-high flex items-center gap-1"><AlertCircle size={11} /> Transaction Blocked</span>
            )}
            {msg.decision === 'FLAG' && (
              <span className="badge-medium flex items-center gap-1"><AlertCircle size={11} /> Under Review</span>
            )}
            {msg.decision === 'ALLOW' && (
              <span className="badge-low flex items-center gap-1"><CheckCircle size={11} /> Cleared</span>
            )}
            {msg.riskScore !== null && (
              <span className="text-xs text-gray-500">Risk: {(msg.riskScore * 100).toFixed(0)}%</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function UserQnA() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your UPI Shield assistant. Ask me about your transactions, why a payment was blocked, or your fraud risk level.",
      shap: [], decision: null, riskScore: null,
    }
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const q = text || input.trim()
    if (!q) return
    setInput('')

    const userMsg = { role: 'user', content: q, shap: [], decision: null, riskScore: null }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await axios.post(`${API}/api/v1/user/ask`, { question: q, upiHandle: 'demo@okaxis' })
      const data = res.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.plainText || data.text || "I've processed your request.",
        shap: data.topFeatures || [],
        decision: data.decision || null,
        riskScore: data.riskScore ?? null,
      }])
    } catch {
      // Use demo response when backend unavailable
      const demo = generateDemoResponse(q, q)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: demo.text,
        shap: demo.shapFeatures,
        decision: demo.decision,
        riskScore: demo.riskScore,
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Header */}
      <header className="bg-surface-800 border-b border-white/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-100 text-sm">UPI Shield Assistant</div>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
              </div>
            </div>
          </div>
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-200 transition-colors">← Dashboard</Link>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}

          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-surface-700 rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                         style={{ animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="max-w-3xl mx-auto px-4 pb-2 w-full">
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                      className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                                 text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-full transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-surface-800 border-t border-white/5 p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your transactions or fraud risk…"
              disabled={loading}
              className="input flex-1"
            />
            <button type="submit" disabled={loading || !input.trim()}
                    className="btn-primary px-4 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
