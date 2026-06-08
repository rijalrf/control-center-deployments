import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Deployment, Server, Environment } from '../types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getApiErrorMessage } from '../utils/errors'

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  sub?: string | React.ReactNode;
  className?: string;
}

function StatCard({ label, value, icon, colorClass, sub, className = '' }: StatCardProps) {
  return (
    <div className={`ccd-card p-5 flex items-start gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-ccd-accent/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] group ${className}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 ${colorClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-extrabold text-ccd-text tracking-tight">{value}</div>
        <div className="text-xs font-semibold text-ccd-text-dim mt-0.5 uppercase tracking-wider">{label}</div>
        {sub && <div className="text-[11px] text-ccd-text-muted mt-1.5 flex items-center gap-1">{sub}</div>}
      </div>
    </div>
  )
}

function getRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  
  if (isNaN(diffMs)) return '—'
  
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return 'Just now'
  
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getGreeting(): string {
  const hr = new Date().getHours()
  if (hr < 12) return 'Good morning'
  if (hr < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const [stats, setStats] = useState<{ repos: number; envs: number; servers: Server[]; deployments: Deployment[] }>({
    repos: 0, envs: 0, servers: [], deployments: []
  })
  const [loading, setLoading] = useState(true)
  const [pingingId, setPingingId] = useState<number | null>(null)
  
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()

  const fetchDashboardData = () => {
    setLoading(true)
    Promise.all([
      api.get('/repos'),
      api.get('/environments'),
      api.get('/servers'),
      api.get('/deployments'),
    ]).then(([r, e, s, d]) => {
      setStats({
        repos: r.data.length,
        envs: e.data.length,
        servers: s.data,
        deployments: d.data,
      })
    }).catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const testConnection = async (id: number) => {
    setPingingId(id)
    try {
      const res = await api.post(`/servers/${id}/ping`)
      showToast(
        res.data.message || 'Connection test completed', 
        res.data.status === 'active' ? 'success' : 'error'
      )
      // Refresh only servers
      const sRes = await api.get('/servers')
      setStats(prev => ({ ...prev, servers: sRes.data }))
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to test connection'), 'error')
    } finally {
      setPingingId(null)
    }
  }

  const successCount = stats.deployments.filter(d => d.status === 'success').length
  const failedCount = stats.deployments.filter(d => d.status === 'failed').length
  const totalCompleted = successCount + failedCount
  const successRate = totalCompleted > 0 ? ((successCount / totalCompleted) * 100).toFixed(1) : '100.0'

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

  // Get recent 6 deployments of any status
  const recentDeployments = useMemo(() => {
    return [...stats.deployments].slice(0, 6)
  }, [stats.deployments])

  // Split servers into active and inactive
  const serverCounts = useMemo(() => {
    const active = stats.servers.filter(s => s.status === 'active').length
    const total = stats.servers.length
    return { active, total, inactive: total - active }
  }, [stats.servers])

  // Status breakdown list
  const distribution = useMemo(() => {
    const total = stats.deployments.length
    if (total === 0) return []
    
    const groups = {
      success: stats.deployments.filter(d => d.status === 'success').length,
      failed: stats.deployments.filter(d => d.status === 'failed').length,
      running: stats.deployments.filter(d => d.status === 'running').length,
      cancelled: stats.deployments.filter(d => d.status === 'cancelled').length,
      others: stats.deployments.filter(d => ['pending', 'draft'].includes(d.status)).length,
    }
    
    return [
      { label: 'Success', count: groups.success, color: 'bg-ccd-success', text: 'text-ccd-success', pct: ((groups.success / total) * 100).toFixed(0) },
      { label: 'Failed', count: groups.failed, color: 'bg-ccd-danger', text: 'text-ccd-danger', pct: ((groups.failed / total) * 100).toFixed(0) },
      { label: 'Running', count: groups.running, color: 'bg-ccd-info', text: 'text-ccd-info', pct: ((groups.running / total) * 100).toFixed(0) },
      { label: 'Cancelled', count: groups.cancelled, color: 'bg-ccd-muted', text: 'text-ccd-text-muted', pct: ((groups.cancelled / total) * 100).toFixed(0) },
      { label: 'Others', count: groups.others, color: 'bg-ccd-warning', text: 'text-ccd-warning', pct: ((groups.others / total) * 100).toFixed(0) },
    ].filter(item => item.count > 0)
  }, [stats.deployments])

  // Last 7 days deployments data
  const last7DaysData = useMemo(() => {
    const data = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayName = dayNames[d.getDay()]
      const dateStr = d.toISOString().split('T')[0]
      
      const dailyDeployments = stats.deployments.filter(dep => {
        if (!dep.created_at) return false
        return dep.created_at.startsWith(dateStr)
      })
      
      const success = dailyDeployments.filter(dep => dep.status === 'success').length
      const failed = dailyDeployments.filter(dep => dep.status === 'failed').length
      const total = dailyDeployments.length
      
      data.push({
        dayName,
        dateStr,
        success,
        failed,
        total
      })
    }
    return data
  }, [stats.deployments])

  // SVG Chart Config
  const svgChart = useMemo(() => {
    if (last7DaysData.length === 0) return null
    
    const maxVal = Math.max(...last7DaysData.map(d => d.total), 4)
    const width = 500
    const height = 120
    const paddingLeft = 40
    const paddingRight = 20
    const paddingTop = 15
    const paddingBottom = 20
    
    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom
    
    const points = last7DaysData.map((d, idx) => {
      const x = paddingLeft + (idx * (chartWidth / (last7DaysData.length - 1)))
      const y = paddingTop + chartHeight - ((d.total / maxVal) * chartHeight)
      return { x, y }
    })
    
    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} Z`
      : ''
      
    return {
      width,
      height,
      points,
      linePath,
      areaPath,
      paddingLeft,
      paddingTop,
      chartWidth,
      chartHeight,
      maxVal
    }
  }, [last7DaysData])

  const midVal = svgChart ? (svgChart.maxVal / 2).toFixed(0) : '0'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome & Status Banner */}
      <div className="ccd-card p-6 relative overflow-hidden bg-gradient-to-r from-ccd-card via-ccd-card to-ccd-accent/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-ccd-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <img
              src={currentUser?.avatar_url || `https://github.com/${currentUser?.login || 'admin'}.png`}
              alt="avatar"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.name || 'Admin'}`
              }}
              className="w-12 h-12 rounded-xl border border-ccd-border shadow-inner object-cover"
            />
            <div>
              <h2 className="text-xl font-bold text-ccd-text flex items-center gap-2">
                {getGreeting()}, {currentUser?.name || currentUser?.login || 'Operator'}!
              </h2>
              <p className="text-xs text-ccd-text-muted mt-1">
                Control center is running. All systems are operational.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ccd-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ccd-success"></span>
            </span>
            <span className="text-xs font-mono text-ccd-text-dim">
              SYSTEM STATUS: <span className="text-ccd-success font-semibold">ONLINE</span>
            </span>
            <button 
              onClick={fetchDashboardData}
              className="p-1.5 rounded-lg hover:bg-ccd-muted/40 text-ccd-text-muted hover:text-ccd-text transition-colors"
              title="Reload Dashboard"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Synced Repositories"
          value={loading ? '—' : stats.repos}
          colorClass="bg-ccd-accent/15 text-ccd-accent"
          sub="GitHub registry"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>}
        />
        <StatCard
          label="Environments"
          value={loading ? '—' : stats.envs}
          colorClass="bg-ccd-cyan/15 text-ccd-cyan"
          sub="Target destinations"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>}
        />
        <StatCard
          label="Infrastructure Servers"
          value={loading ? '—' : stats.servers.length}
          colorClass="bg-ccd-info/15 text-ccd-info"
          sub={loading ? '—' : (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-ccd-success" /> {serverCounts.active} Active 
              <span className="mx-1">·</span> 
              <span className="w-1.5 h-1.5 rounded-full bg-ccd-danger" /> {serverCounts.inactive} Offline
            </span>
          )}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>}
        />
        <StatCard
          label="Success Rate"
          value={loading ? '—' : `${successRate}%`}
          colorClass={
            loading ? "bg-ccd-success/15 text-ccd-success" :
            parseFloat(successRate) >= 90 ? "bg-ccd-success/15 text-ccd-success" :
            parseFloat(successRate) >= 70 ? "bg-ccd-warning/15 text-ccd-warning" : "bg-ccd-danger/15 text-ccd-danger"
          }
          sub={loading ? '—' : `${successCount} success · ${failedCount} failed`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Analytics Left Panel: 7-day volume chart & breakdown */}
        <div className="ccd-card p-5 lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-semibold text-ccd-text">Deployment Activity</h3>
                <p className="text-[11px] text-ccd-text-muted mt-0.5">Deployment volume over the last 7 days</p>
              </div>
              {!loading && stats.deployments.length > 0 && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-ccd-accent/10 text-ccd-accent-light border border-ccd-accent/20">
                  {stats.deployments.length} Runs Total
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner w-6 h-6" />
              </div>
            ) : stats.deployments.length === 0 ? (
              <div className="text-center py-12 text-ccd-text-muted text-xs">
                No deployment history found. Run a plan to generate charts.
              </div>
            ) : (
              <div className="w-full">
                {/* SVG Line Chart */}
                {svgChart && (
                  <svg
                    viewBox={`0 0 ${svgChart.width} ${svgChart.height}`}
                    className="w-full h-auto overflow-visible"
                  >
                    <defs>
                      <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal lines */}
                    <line x1={svgChart.paddingLeft} y1={svgChart.paddingTop} x2={500 - 20} y2={svgChart.paddingTop} stroke="#1e2740" strokeWidth={0.5} strokeDasharray="3 3" />
                    <line x1={svgChart.paddingLeft} y1={svgChart.paddingTop + svgChart.chartHeight / 2} x2={500 - 20} y2={svgChart.paddingTop + svgChart.chartHeight / 2} stroke="#1e2740" strokeWidth={0.5} strokeDasharray="3 3" />
                    <line x1={svgChart.paddingLeft} y1={svgChart.paddingTop + svgChart.chartHeight} x2={500 - 20} y2={svgChart.paddingTop + svgChart.chartHeight} stroke="#1e2740" strokeWidth={0.5} />

                    {/* Y-axis Labels */}
                    <text x={svgChart.paddingLeft - 8} y={svgChart.paddingTop + 3} textAnchor="end" className="text-[9px] fill-ccd-text-muted font-mono font-bold">{svgChart.maxVal}</text>
                    <text x={svgChart.paddingLeft - 8} y={svgChart.paddingTop + svgChart.chartHeight / 2 + 3} textAnchor="end" className="text-[9px] fill-ccd-text-muted font-mono font-bold">{midVal}</text>
                    <text x={svgChart.paddingLeft - 8} y={svgChart.paddingTop + svgChart.chartHeight + 3} textAnchor="end" className="text-[9px] fill-ccd-text-muted font-mono font-bold">0</text>

                    {/* Line Area path */}
                    {svgChart.areaPath && (
                      <path d={svgChart.areaPath} fill="url(#chart-glow)" />
                    )}

                    {/* Main Line path */}
                    {svgChart.linePath && (
                      <path d={svgChart.linePath} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {/* Chart Points */}
                    {svgChart.points.map((p, idx) => {
                      const day = last7DaysData[idx]
                      if (day.total === 0) return null
                      return (
                        <g key={idx} className="group cursor-pointer">
                          <circle cx={p.x} cy={p.y} r={3} className="fill-ccd-bg stroke-ccd-accent stroke-[1.5]" />
                          <circle cx={p.x} cy={p.y} r={6} className="fill-ccd-accent/20 opacity-0 hover:opacity-100 transition-opacity" />
                          <title>{`${day.total} deployments (${day.success} success, ${day.failed} failed)`}</title>
                        </g>
                      )
                    })}

                    {/* X-axis labels */}
                    {last7DaysData.map((day, idx) => {
                      const x = svgChart.points[idx].x
                      return (
                        <text
                          key={idx}
                          x={x}
                          y={116}
                          textAnchor="middle"
                          className="text-[9px] fill-ccd-text-muted font-mono font-semibold"
                        >
                          {day.dayName}
                        </text>
                      )
                    })}
                  </svg>
                )}
              </div>
            )}
          </div>

          {/* Status Breakdown Segmented Bar */}
          <div className="mt-4 pt-4 border-t border-ccd-border">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ccd-text-muted mb-2.5">
              Status Distribution
            </h4>
            {loading ? (
              <div className="h-1.5 rounded-full bg-ccd-muted animate-pulse" />
            ) : distribution.length === 0 ? (
              <div className="text-ccd-text-muted text-xs font-medium">No distribution details available.</div>
            ) : (
              <div className="space-y-3">
                {/* Horizontal Segmented Bar */}
                <div className="h-2 rounded-full overflow-hidden flex bg-ccd-muted">
                  {distribution.map((segment, idx) => (
                    <div
                      key={idx}
                      className={`${segment.color} h-full`}
                      style={{ width: `${segment.pct}%` }}
                      title={`${segment.label}: ${segment.count} (${segment.pct}%)`}
                    />
                  ))}
                </div>
                {/* Legend list */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {distribution.map((segment, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-ccd-text-dim">
                      <span className={`w-2 h-2 rounded-full ${segment.color}`} />
                      <span>{segment.label}</span>
                      <span className="font-mono text-ccd-text-muted">({segment.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Right Panel: Connected Server Infrastructure Status Hub */}
        <div className="ccd-card p-5 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-ccd-text">Infrastructure Status</h3>
                <p className="text-[11px] text-ccd-text-muted mt-0.5">Live connectivity hub of connected servers</p>
              </div>
              <Link to="/configuration" className="text-xs text-ccd-accent hover:underline font-medium">Manage →</Link>
            </div>

            {loading ? (
              <div className="space-y-2 py-4">
                <div className="h-12 bg-ccd-muted/30 rounded-lg animate-pulse" />
                <div className="h-12 bg-ccd-muted/30 rounded-lg animate-pulse" />
              </div>
            ) : stats.servers.length === 0 ? (
              <div className="text-center py-10 text-ccd-text-muted text-xs">
                No connected servers. Add one under Configuration.
              </div>
            ) : (
              <div className="divide-y divide-ccd-border/50 max-h-[160px] overflow-y-auto pr-1">
                {stats.servers.map(server => (
                  <div key={server.id} className="py-2.5 flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ccd-text truncate">{server.name}</span>
                        {server.environment && (
                          <span 
                            className="text-[9px] px-1.5 rounded font-mono" 
                            style={{ backgroundColor: `${server.environment.color}15`, color: server.environment.color, border: `1px solid ${server.environment.color}25` }}
                          >
                            {server.environment.slug}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-ccd-text-muted font-mono mt-0.5 truncate">
                        {server.username}@{server.host}:{server.port}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Connection status indicator */}
                      {server.status === 'active' ? (
                        <span className="flex items-center gap-1 text-[10px] text-ccd-success font-semibold bg-ccd-success/10 border border-ccd-success/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Active
                        </span>
                      ) : server.status === 'inactive' ? (
                        <span className="flex items-center gap-1 text-[10px] text-ccd-danger font-semibold bg-ccd-danger/10 border border-ccd-danger/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Offline
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-ccd-text-muted font-semibold bg-ccd-muted border border-ccd-border px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Unknown
                        </span>
                      )}
                      
                      {/* Interactive Connection Ping test */}
                      <button
                        onClick={() => testConnection(server.id)}
                        disabled={pingingId !== null}
                        className="p-1.5 rounded bg-ccd-muted/30 hover:bg-ccd-muted hover:text-ccd-cyan text-ccd-text-muted transition-all duration-150 inline-flex items-center justify-center"
                        title="Ping SSH connection test"
                      >
                        {pingingId === server.id ? (
                          <div className="spinner w-3.5 h-3.5" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="pt-3 border-t border-ccd-border/80 text-[10px] text-ccd-text-muted flex justify-between items-center font-mono">
            <span>PING TEST: RE-CHECKS SSH POCKET PACKETS</span>
            <span>CCD CONTROL v1.0</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bottom Left Panel: Detailed Deployment Activity Feed */}
        <div className="ccd-card lg:col-span-7 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ccd-border">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ccd-text">Recent Deployment Activity</span>
              <span className="text-[11px] text-ccd-text-muted mt-0.5">Timeline of recent plans and runs</span>
            </div>
            <Link to="/deployment" className="text-xs text-ccd-accent hover:underline font-medium">All Runs →</Link>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto max-h-[420px]">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="spinner w-6 h-6" />
              </div>
            ) : recentDeployments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6">
                <span className="text-ccd-text-muted text-sm mb-2">No deployments registered yet</span>
                <Link to="/deployment" className="ccd-btn-primary text-xs">Prepare deployment plan</Link>
              </div>
            ) : (
              <div className="relative border-l border-ccd-border pl-6 space-y-6">
                {recentDeployments.map(dep => {
                  const relativeTime = getRelativeTime(dep.created_at)
                  const userLogin = dep.user?.login || 'system'
                  
                  // Status Config
                  const statusConfigs = {
                    success: { text: 'Success', color: 'text-ccd-success border-ccd-success/20 bg-ccd-success/10', dotColor: 'bg-ccd-success' },
                    failed: { text: 'Failed', color: 'text-ccd-danger border-ccd-danger/20 bg-ccd-danger/10', dotColor: 'bg-ccd-danger' },
                    running: { text: 'Running', color: 'text-ccd-info border-ccd-info/20 bg-ccd-info/10', dotColor: 'bg-ccd-info animate-pulse' },
                    pending: { text: 'Pending', color: 'text-ccd-warning border-ccd-warning/20 bg-ccd-warning/10', dotColor: 'bg-ccd-warning' },
                    cancelled: { text: 'Cancelled', color: 'text-ccd-text-muted border-ccd-border bg-ccd-muted/30', dotColor: 'bg-ccd-text-muted' },
                    draft: { text: 'Draft Plan', color: 'text-ccd-text-dim border-ccd-border bg-ccd-muted/50', dotColor: 'bg-ccd-text-muted' },
                  }
                  
                  const config = statusConfigs[dep.status] || { text: dep.status, color: 'text-ccd-text border-ccd-border bg-ccd-muted', dotColor: 'bg-ccd-text-muted' }

                  return (
                    <div key={dep.id} className="relative group">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[31px] top-1.5 flex h-2.5 w-2.5 rounded-full border border-ccd-bg ${config.dotColor}`} />
                      
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          {/* User Avatar + Username + Trigger details */}
                          <div className="flex items-center gap-2 text-xs">
                            <img
                              src={dep.user?.avatar_url || `https://github.com/${userLogin}.png`}
                              alt={userLogin}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${userLogin}`
                              }}
                              className="w-5 h-5 rounded-full border border-ccd-border object-cover"
                            />
                            <span className="font-semibold text-ccd-text">@{userLogin}</span>
                            <span className="text-ccd-text-muted">deployed to</span>
                            {dep.environment ? (
                              <span 
                                className="font-semibold" 
                                style={{ color: dep.environment.color }}
                              >
                                {dep.environment.name}
                              </span>
                            ) : <span className="text-ccd-text-muted font-mono text-[10px]">unknown</span>}
                          </div>

                          {/* List Repositories */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(dep.repositories || []).map((repo, idx) => (
                              <div key={idx} className="flex items-center gap-1 bg-ccd-muted/40 border border-ccd-border rounded px-1.5 py-0.5 text-[10px] font-mono">
                                <span className="text-ccd-text-dim font-bold">{repo.name}</span>
                                <span className="text-ccd-text-muted">({repo.branch})</span>
                              </div>
                            ))}
                          </div>

                          {/* Notes */}
                          {dep.notes && (
                            <p className="text-xs text-ccd-text-muted mt-1.5 italic line-clamp-1">
                              "{dep.notes}"
                            </p>
                          )}
                        </div>

                        {/* Status Badge & Timestamp */}
                        <div className="text-right shrink-0">
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${config.color}`}>
                            {config.text}
                          </span>
                          <div className="text-[10px] text-ccd-text-muted font-mono mt-1">{relativeTime}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Right Panel: Active Deployed Applications */}
        <div className="ccd-card lg:col-span-5 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ccd-border">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ccd-text">Active Deployed Applications</span>
              <span className="text-[11px] text-ccd-text-muted mt-0.5">Repositories with successful deployments</span>
            </div>
            <Link to="/repos" className="text-xs text-ccd-accent hover:underline font-medium">Registry →</Link>
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
                    <th className="pr-5">Environment</th>
                  </tr>
                </thead>
                <tbody>
                  {deployedRepos.map(repo => (
                    <tr key={repo.github_id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-ccd-text">{repo.name}</span>
                          {repo.docker_image_name ? (
                            <span className="text-[9px] text-ccd-text-muted font-mono mt-0.5 truncate max-w-[120px]" title={repo.docker_image_name}>
                              {repo.docker_image_name}
                            </span>
                          ) : (
                            <span className="text-[9px] text-ccd-text-muted font-mono mt-0.5">local clone</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-[10px] text-ccd-cyan bg-ccd-cyan/10 px-1.5 py-0.5 rounded border border-ccd-cyan/20">
                          {repo.branch}
                        </span>
                      </td>
                      <td className="pr-5">
                        <div className="flex flex-col items-start gap-0.5">
                          {repo.last_environment ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: repo.last_environment_color }} />
                              <span className="text-xs text-ccd-text-dim">{repo.last_environment}</span>
                            </div>
                          ) : <span className="text-ccd-text-muted text-xs">—</span>}
                          <span className="text-[9px] text-ccd-text-muted font-mono mt-0.5">
                            {getRelativeTime(repo.last_deployed_at)}
                          </span>
                        </div>
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
