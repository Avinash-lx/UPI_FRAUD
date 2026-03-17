import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from './pages/UserDashboard'
import UserQnA from './pages/UserQnA'
import LiveFeed from './pages/LiveFeed'
import FraudAwarenessFeed from './pages/FraudAwarenessFeed'
import { AuthProvider, useAuth } from './context/AuthContext'

function ProtectedRoute({ children, adminOnly = false }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && !user?.roles?.some(r => ['ROLE_ANALYST','ROLE_SUPERADMIN'].includes(r))) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login"   element={<Login />} />
        <Route path="/"        element={<UserDashboard />} />
        <Route path="/ask"     element={<UserQnA />} />
        <Route path="/live"    element={<LiveFeed />} />
        <Route path="/awareness" element={<FraudAwarenessFeed />} />
        <Route path="/admin"   element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
