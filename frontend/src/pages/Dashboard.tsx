import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Deployment, Server, Environment } from '../types'


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
  const [stats, setStats] = useState<{ repos: number; envs: number; servers: Server[]; deployments: Deployment[] }>({
    repos: 0, envs: 0, servers: [], deployments: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/repos'),
      api.get('/environments'),
      api.get('/servers'),
      api.get('/deployments'),
    ]).then(([r, e, s, d]) => {
      setStats({
        repos: r.data.length,
        envs: e.data.length,
        servers: s.data, // now saving the actual Server[] array
        deployments: d.data,
      })
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const successCount = stats.deployments.filter(d => d.status === 'success').length
  const failedCount = stats.deployments.filter(d => d.status === 'failed').length

  // Calculate Deployed Repositories
  const deployedRepos = useMemo(() => {
    const map = new Map<string, any>()
    
    // Sort deployments ascending by date so newer ones overwrite older ones
    const sortedDeployments = [...stats.deployments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    sortedDeployments.forEach(d => {
      if (d.status === 'success') {
        (d.repositories || []).forEach(repo => {
          map.set(repo.github_id, {
            ...repo,
            last_deployed_at: d.created_at,
            last_environment: d.environment?.name,
            last_environment_color: d.environment?.color,
          })
        })
      }
    })

    // Return array sorted descending by last deploy date
    return Array.from(map.values()).sort((a, b) => new Date(b.last_deployed_at).getTime() - new Date(a.last_deployed_at).getTime())
  }, [stats.deployments])

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
          value={loading ? '—' : stats.servers.length}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Active Deployed Applications */}
        <div className="ccd-card flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ccd-border">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ccd-text">Active Deployed Applications</span>
              <span className="text-[11px] text-ccd-text-muted mt-0.5">Repositori yang sukses di-deploy</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="spinner w-6 h-6" />
              </div>
            ) : deployedRepos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6">
                <span className="text-ccd-text-muted text-sm mb-2">No active deployed apps</span>
                <Link to="/deployment" className="text-ccd-accent text-xs hover:underline">Deploy an application →</Link>
              </div>
            ) : (
              <table className="ccd-table">
                <thead>
                  <tr>
                    <th>Repository</th>
                    <th>Branch</th>
                    <th>Environment</th>
                    <th>Last Deployed</th>
                  </tr>
                </thead>
                <tbody>
                  {deployedRepos.map(repo => (
                    <tr key={repo.github_id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-ccd-text">{repo.name}</span>
                          {repo.docker_image_name && (
                            <span className="text-[10px] text-ccd-text-muted font-mono mt-0.5" title="Docker Image">
                              {repo.docker_image_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-ccd-cyan bg-ccd-cyan/10 px-1.5 py-0.5 rounded border border-ccd-cyan/20">
                          {repo.branch}
                        </span>
                      </td>
                      <td>
                        {repo.last_environment ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: repo.last_environment_color }} />
                            <span className="text-xs">{repo.last_environment}</span>
                          </div>
                        ) : <span className="text-ccd-text-muted text-xs">—</span>}
                      </td>
                      <td>
                        <span className="text-xs text-ccd-text-dim" title={new Date(repo.last_deployed_at).toLocaleString()}>
                          {new Date(repo.last_deployed_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Infrastructure Servers */}
        <div className="ccd-card flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ccd-border">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ccd-text">Infrastructure Servers</span>
              <span className="text-[11px] text-ccd-text-muted mt-0.5">Daftar VPS yang terhubung</span>
            </div>
            <Link to="/configuration" className="text-[11px] text-ccd-accent hover:underline">Manage →</Link>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="spinner w-6 h-6" />
              </div>
            ) : stats.servers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6">
                <span className="text-ccd-text-muted text-sm mb-2">No servers connected</span>
                <Link to="/configuration" className="text-ccd-accent text-xs hover:underline">Add a server →</Link>
              </div>
            ) : (
              <table className="ccd-table">
                <thead>
                  <tr>
                    <th>Server Name</th>
                    <th>Host / IP</th>
                    <th>Environment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.servers.map(server => (
                    <tr key={server.id}>
                      <td>
                        <span className="text-sm font-medium text-ccd-text">{server.name}</span>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-ccd-text-dim">{server.host}</span>
                          <span className="text-[10px] text-ccd-text-muted mt-0.5">{server.username}@{server.host}:{server.port}</span>
                        </div>
                      </td>
                      <td>
                        {server.environment ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: server.environment.color }} />
                            <span className="text-xs">{server.environment.name}</span>
                          </div>
                        ) : <span className="text-ccd-text-muted text-xs">—</span>}
                      </td>
                      <td>
                        {server.status === 'active' ? (
                          <span className="badge-success text-[10px] uppercase tracking-wider px-2 py-0.5 border">Active</span>
                        ) : server.status === 'inactive' ? (
                          <span className="badge-danger text-[10px] uppercase tracking-wider px-2 py-0.5 border">Inactive</span>
                        ) : (
                          <span className="badge-muted text-[10px] uppercase tracking-wider px-2 py-0.5 border">Unknown</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
