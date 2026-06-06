import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Deployment } from '../types'

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  draft:     { cls: 'badge-muted',    label: 'Draft' },
  pending:   { cls: 'badge-warning',  label: 'Pending' },
  running:   { cls: 'badge-accent',   label: 'Running' },
  success:   { cls: 'badge-success',  label: 'Success' },
  failed:    { cls: 'badge-danger',   label: 'Failed' },
  cancelled: { cls: 'badge-muted',    label: 'Cancelled' },
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  sub?: string;
}

function StatCard({ label, value, icon, colorClass, sub }: StatCardProps) {
  return (
    <div className="ccd-card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-ccd-text">{value}</div>
        <div className="text-xs text-ccd-text-muted mt-0.5">{label}</div>
        {sub && <div className="text-xs text-ccd-text-muted opacity-60 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]           = useState<{ repos: number; envs: number; servers: number; deployments: Deployment[] }>({ repos: 0, envs: 0, servers: 0, deployments: [] })
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/repos'),
      api.get('/environments'),
      api.get('/servers'),
      api.get('/deployments'),
    ]).then(([r, e, s, d]) => {
      setStats({
        repos:       r.data.length,
        envs:        e.data.length,
        servers:     s.data.length,
        deployments: d.data,
      })
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const recent = stats.deployments.slice(0, 8)
  const successCount = stats.deployments.filter(d => d.status === 'success').length
  const failedCount  = stats.deployments.filter(d => d.status === 'failed').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Repositories"
          value={loading ? '—' : stats.repos}
          colorClass="bg-ccd-accent/15 text-ccd-accent"
          sub="GitHub synced"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>}
        />
        <StatCard
          label="Environments"
          value={loading ? '—' : stats.envs}
          colorClass="bg-ccd-cyan/15 text-ccd-cyan"
          sub="Configured"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>}
        />
        <StatCard
          label="Servers"
          value={loading ? '—' : stats.servers}
          colorClass="bg-ccd-info/15 text-ccd-info"
          sub="Infrastructure"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>}
        />
        <StatCard
          label="Deployments"
          value={loading ? '—' : stats.deployments.length}
          colorClass="bg-ccd-success/15 text-ccd-success"
          sub={`${successCount} success · ${failedCount} failed`}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>}
        />
      </div>

      {/* Recent deployments */}
      <div className="ccd-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ccd-border">
          <div className="text-sm font-semibold text-ccd-text">Recent Deployments</div>
          <Link to="/deployment" className="text-xs text-ccd-accent hover:underline">
            New Deployment →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner w-6 h-6" />
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-ccd-text-muted text-sm mb-2">No deployments yet</div>
            <Link to="/deployment" className="text-ccd-accent text-sm hover:underline">
              Create your first deployment →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ccd-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Environment</th>
                  <th>Applications</th>
                  <th>Status</th>
                  <th>Deployed By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(d => {
                  const badge = STATUS_BADGE[d.status] || STATUS_BADGE.draft
                  return (
                    <tr key={d.id}>
                      <td>
                        <span className="font-mono text-xs text-ccd-text-dim">#{d.id}</span>
                      </td>
                      <td>
                        {d.environment ? (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.environment.color }} />
                            <span className="text-sm">{d.environment.name}</span>
                          </div>
                        ) : <span className="text-ccd-text-muted text-xs">—</span>}
                      </td>
                      <td>
                        <span className="text-xs text-ccd-text-muted">
                          {Array.isArray(d.repositories) ? `${d.repositories.length} app${d.repositories.length !== 1 ? 's' : ''}` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={badge.cls}>{badge.label}</span>
                      </td>
                      <td>
                        {d.user ? (
                          <div className="flex items-center gap-2">
                            <img src={d.user.avatar_url || ''} alt={d.user.login} className="w-5 h-5 rounded-full" />
                            <span className="text-xs font-mono">{d.user.login}</span>
                          </div>
                        ) : <span className="text-ccd-text-muted text-xs">—</span>}
                      </td>
                      <td>
                        <span className="text-xs font-mono">
                          {new Date(d.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
