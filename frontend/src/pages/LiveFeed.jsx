import { Link } from 'react-router-dom'
import LiveFeedPanel from '../components/LiveFeedPanel'
import { Radio } from 'lucide-react'

export default function LiveFeed() {
  return (
    <div className="min-h-screen bg-surface-900">
      <header className="bg-surface-800 border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio size={20} className="text-green-400" />
            <h1 className="font-bold text-gray-100">Live Transaction Monitor</h1>
          </div>
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-200 transition-colors">← Dashboard</Link>
        </div>
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <LiveFeedPanel standalone={false} />
      </div>
    </div>
  )
}
