import { useState } from 'react'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login }               = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/admin')
    } catch (err) {
      setError('Invalid credentials. Use demo credentials below.')
    } finally {
      setLoading(false)
    }
  }

  // Demo bypass
  const demoLogin = () => {
    setUsername('superadmin')
    setPassword('Admin@1234')
    setTimeout(() => document.getElementById('login-submit')?.click(), 100)
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-900/50">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">UPI Shield</h1>
          <p className="text-gray-400 text-sm mt-1">Admin Dashboard Login</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input"
              placeholder="superadmin"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input pr-10"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button id="login-submit" type="submit" disabled={loading}
                  className="btn-primary w-full justify-center disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            ) : 'Sign In to Admin Dashboard'}
          </button>

          {/* Demo credentials hint */}
          <div className="border-t border-white/5 pt-4">
            <div className="text-xs text-gray-500 text-center mb-3">Demo credentials</div>
            <div className="bg-white/5 rounded-lg p-3 text-xs text-gray-400 space-y-1 font-mono">
              <div>Username: <span className="text-gray-200">superadmin</span></div>
              <div>Password: <span className="text-gray-200">Admin@1234</span></div>
            </div>
            <button type="button" onClick={demoLogin}
                    className="btn-ghost w-full text-xs mt-3">
              Quick Demo Login
            </button>
          </div>
        </form>

        <div className="text-center mt-6 text-xs text-gray-500">
          <Link to="/" className="hover:text-gray-300 transition-colors">← Back to User Dashboard</Link>
        </div>

        <div className="mt-4 text-center text-xs text-gray-600">
          Protected by JWT · 15-minute session timeout
        </div>
      </div>
    </div>
  )
}
