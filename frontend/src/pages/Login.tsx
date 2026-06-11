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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser } = useAuth()
  const navigate = useNavigate()

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
          <div className="flex flex-col items-center mb-10">
            <img src="/logo-ccd.png" alt="CCD Logo" className="w-20 h-20 rounded-2xl object-contain mb-4" />
            <h1 className="text-2xl font-bold text-ccd-text tracking-tight">Control Center</h1>
            <p className="text-ccd-text-muted text-sm mt-1">Deployment Management Platform</p>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <p className="text-ccd-text-dim text-sm px-4">
                Please sign in with your GitHub account to access the dashboard and manage your deployments.
              </p>
            </div>

            <button
              onClick={() => {
                setLoading(true);
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                window.location.href = `${baseUrl}/api/auth/github`;
              }}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#24292f] hover:bg-[#24292f]/90 text-white rounded-xl text-base font-semibold transition-all shadow-lg shadow-black/20 group"
            >
              {loading ? (
                <div className="spinner w-5 h-5 border-white/20 border-t-white" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 group-hover:scale-110 transition-transform">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.082.824-.26.824-.578 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  Sign in with GitHub
                </>
              )}
            </button>
          </div>

          <div className="border-t border-ccd-border/50 my-8" />

          {/* Features / Description */}
          <div className="space-y-3 px-2">
            {[
              { icon: '🔗', text: 'Sync repositories from GitHub' },
              { icon: '🚀', text: 'Orchestrate multi-environment deployments' },
              { icon: '⚙️', text: 'Manage infrastructure configurations' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-4 text-[13px] text-ccd-text-muted">
                <span className="text-lg bg-ccd-muted/30 w-8 h-8 flex items-center justify-center rounded-lg">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[10px] text-ccd-text-muted opacity-50 font-mono">
          CCD v1.0.0 · Control Center Deployment
        </div>
      </div>
    </div>
  )
}
