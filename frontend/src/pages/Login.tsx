import React from 'react'

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Login() {
  const handleLogin = () => {
    window.location.href = `${API_URL}/api/auth/github`
  }

  // Check for error param
  const error = new URLSearchParams(window.location.search).get('error')

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
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ccd-accent to-ccd-cyan flex items-center justify-center mb-4 glow-accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="w-8 h-8">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                <line x1="12" y1="22" x2="12" y2="15.5" />
                <polyline points="22 8.5 12 15.5 2 8.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ccd-text tracking-tight">Control Center</h1>
            <p className="text-ccd-text-muted text-sm mt-1">Deployment Management Platform</p>
          </div>

          {/* Description */}
          <div className="space-y-3 mb-8">
            {[
              { icon: '🔗', text: 'Sync repositories from GitHub' },
              { icon: '🚀', text: 'Orchestrate multi-environment deployments' },
              { icon: '⚙️', text: 'Manage infrastructure configurations' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-ccd-text-muted">
                <span className="text-base">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-ccd-danger/10 border border-ccd-danger/25 text-ccd-danger text-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              Authentication failed. Please try again.
            </div>
          )}

          {/* Login button */}
          <button
            onClick={handleLogin}
            id="github-login-btn"
            className="w-full ccd-btn-github justify-center py-3 text-base font-semibold rounded-xl group"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          <p className="text-center text-xs text-ccd-text-muted mt-4">
            By signing in, you agree to allow CCD to access your GitHub profile and repositories.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-xs text-ccd-text-muted opacity-50 font-mono">
          CCD v1.0.0 · Control Center Deployment
        </div>
      </div>
    </div>
  )
}
