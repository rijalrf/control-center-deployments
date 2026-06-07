import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { getApiErrorMessage } from '../utils/errors'

interface Particle {
  id: number;
  size: number;
  left: number;
  top: number;
  duration: number;
  delay: number;
  color: string;
}

const PARTICLES: Particle[] = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: Math.random() * 6 + 3,
  left: Math.random() * 100,
  top: Math.random() * 100,
  duration: Math.random() * 6 + 4,
  delay: Math.random() * 4,
  color: i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#06b6d4' : '#6366f1',
}))

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { username, password })
      setUser(res.data.user)
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Authentication failed. Please verify credentials.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ccd-bg grid-bg relative overflow-hidden flex items-center justify-center">
      {/* Radial gradient accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: 0.4,
          }}
        />
      ))}

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        {/* Glow border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-ccd-accent/20 via-transparent to-ccd-cyan/20 -z-10 blur-xl" />

        <div className="ccd-card rounded-2xl p-8 border border-ccd-border/80 backdrop-blur-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ccd-accent to-ccd-cyan flex items-center justify-center mb-3 glow-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="w-7 h-7">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                <line x1="12" y1="22" x2="12" y2="15.5" />
                <polyline points="22 8.5 12 15.5 2 8.5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-ccd-text tracking-tight">Control Center</h1>
            <p className="text-ccd-text-muted text-xs mt-0.5">Deployment Management Platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="ccd-input"
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="ccd-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-ccd-danger/10 border border-ccd-danger/25 text-ccd-danger text-xs leading-relaxed animate-fade-in">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full ccd-btn-primary justify-center py-2.5 text-sm font-semibold rounded-xl group mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="spinner w-4 h-4 border-white/20 border-t-white" />
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="border-t border-ccd-border/50 my-6" />

          {/* Features / Description */}
          <div className="space-y-2.5">
            {[
              { icon: '🔗', text: 'Sync repositories from GitHub' },
              { icon: '🚀', text: 'Orchestrate multi-environment deployments' },
              { icon: '⚙️', text: 'Manage infrastructure configurations' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3 text-xs text-ccd-text-muted">
                <span className="text-sm">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-[10px] text-ccd-text-muted opacity-50 font-mono">
          CCD v1.0.0 · Control Center Deployment
        </div>
      </div>
    </div>
  )
}
