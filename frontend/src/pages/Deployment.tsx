import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Step01Setup from '../components/Deployment/Step01Setup'
import Step02Config from '../components/Deployment/Step02Config'
import Step03Review from '../components/Deployment/Step03Review'
import { Environment, Repository, Deployment as DeploymentType } from '../types'
import { useToast } from '../context/ToastContext'

interface Step {
  number: number;
  title: string;
  subtitle: string;
}

const STEPS: Step[] = [
  { number: 1, title: 'Setup',          subtitle: 'Environment & Apps' },
  { number: 2, title: 'Configuration',  subtitle: 'Variables & Secrets' },
  { number: 3, title: 'Review',         subtitle: 'Confirm & Execute' },
]

interface FormData {
  environment_id: number | null;
  environment: Environment | null;
  repositories: Repository[];
  config: Record<string, Record<string, string>>;
}

const INIT_DATA: FormData = {
  environment_id: null,
  environment:    null,
  repositories:   [],
  config:         {},
}

interface StepIndicatorProps {
  current: number;
  steps: Step[];
}

function StepIndicator({ current, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center">
      {steps.map((step, idx) => {
        const isCompleted = current > step.number
        const isActive    = current === step.number
        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                isCompleted ? 'bg-ccd-success border-ccd-success text-white' :
                isActive    ? 'bg-ccd-accent/20 border-ccd-accent text-ccd-accent animate-pulse' :
                              'bg-ccd-surface border-ccd-border text-ccd-text-muted'
              }`}>
                {isCompleted ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  `0${step.number}`
                )}
              </div>
              <div className="mt-1.5 text-center">
                <div className={`text-xs font-semibold ${isActive ? 'text-ccd-accent' : isCompleted ? 'text-ccd-success' : 'text-ccd-text-muted'}`}>
                  {step.title}
                </div>
                <div className="text-xs text-ccd-text-muted hidden sm:block">{step.subtitle}</div>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mt-[-18px] rounded transition-all duration-500 ${
                current > step.number
                  ? 'bg-gradient-to-r from-ccd-success to-ccd-accent'
                  : 'bg-ccd-border'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ActiveDeploymentDashboardProps {
  deployment: DeploymentType;
  onBack: () => void;
  onRefresh: () => void;
  onRetry?: (id: number) => void;
}

function ActiveDeploymentDashboard({ deployment, onBack, onRefresh, onRetry }: ActiveDeploymentDashboardProps) {
  const steps = deployment.steps || []
  const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number)
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const runningStep = sortedSteps.find(s => s.status === 'running')

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)

  // Auto-refresh while running
  useEffect(() => {
    const isActive = deployment.status === 'running' || 
                     deployment.status === 'pending' || 
                     steps.some(s => s.status === 'running' || s.status === 'pending')
    if (!isActive) return
    const interval = setInterval(onRefresh, 4000)
    return () => clearInterval(interval)
  }, [deployment.status, steps, onRefresh])

  // Consolidate all steps' logs into a single plain text log string
  const consolidatedLogs = sortedSteps
    .map(s => {
      const header = `>>> [STEP 0${s.step_number}] ${s.step_name.toUpperCase()} (${s.status.toUpperCase()})`;
      const body = s.log ? s.log.trim() : (s.status === 'pending' ? 'Waiting to execute...' : 'No log output recorded.');
      return `${header}\n${body}`;
    })
    .join('\n\n');

  const rawLogs = deployment.log || '';
  const hasRawLogs = !!rawLogs.trim();
  const logsToDisplay = hasRawLogs ? rawLogs : consolidatedLogs;

  // Auto-scroll logs container to bottom if deployment is active and autoScroll is enabled
  useEffect(() => {
    const isRunning = deployment.status === 'running' || deployment.status === 'pending'
    if (autoScroll && logsContainerRef.current && isRunning) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logsToDisplay, deployment.status, autoScroll])

  const overallStatus = deployment.status || 'pending'
  const statusColors: Record<string, string> = {
    pending:   'bg-ccd-warning/15 text-ccd-warning border-ccd-warning/30',
    running:   'bg-ccd-accent/15 text-ccd-accent border-ccd-accent/30 animate-pulse',
    success:   'bg-ccd-success/15 text-ccd-success border-ccd-success/30',
    failed:    'bg-ccd-danger/15 text-ccd-danger border-ccd-danger/30',
    cancelled: 'bg-ccd-muted/50 text-ccd-text-muted border-ccd-border',
  }

  // Copy logs handler
  const handleCopyLogs = () => {
    if (logsToDisplay) {
      navigator.clipboard.writeText(logsToDisplay)
    }
  }

  // Parse log line formatting helper
  const parseLogLine = (line: string) => {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(.*)$/)
    let timestamp = ''
    let content = line

    if (match) {
      timestamp = match[1]
      content = match[2]
    }

    let displayTime = ''
    if (timestamp) {
      try {
        const date = new Date(timestamp)
        displayTime = date.toLocaleTimeString([], { hour12: false })
      } catch (e) {
        displayTime = timestamp.substring(11, 19)
      }
    }

    let isGroup = false
    let isEndGroup = false
    let isError = false
    let isWarning = false
    let isDebug = false

    if (content.startsWith('##[group]')) {
      isGroup = true
      content = content.replace('##[group]', 'Step: ')
    } else if (content.startsWith('##[endgroup]')) {
      isEndGroup = true
      content = 'Step completed'
    } else if (content.startsWith('##[error]')) {
      isError = true
      content = content.replace('##[error]', '❌ ')
    } else if (content.startsWith('##[warning]')) {
      isWarning = true
      content = content.replace('##[warning]', '⚠️ ')
    } else if (content.startsWith('##[debug]')) {
      isDebug = true
      content = content.replace('##[debug]', '⚙️ [debug] ')
    }

    if (!isError && !isWarning && !isDebug && !isGroup && !isEndGroup) {
      if (/error|failed|exit code|fail|err|❌/i.test(content)) {
        isError = true
      }
    }

    return {
      time: displayTime,
      rawTime: timestamp,
      content,
      isGroup,
      isEndGroup,
      isError,
      isWarning,
      isDebug
    }
  }

  const renderLogLine = (line: string, idx: number) => {
    const { time, content, isGroup, isEndGroup, isError, isWarning, isDebug } = parseLogLine(line)

    if (isEndGroup) {
      return (
        <div key={idx} className="flex border-b border-ccd-border/10 pb-2 mb-2 opacity-30">
          <span className="w-16 select-none text-slate-700 text-right pr-3 shrink-0 font-mono text-[10px] pt-[2px] border-r border-ccd-border/20 mr-3">
            {time || '—'}
          </span>
          <span className="text-[10px] text-slate-500 italic">────────────────────────────────────────</span>
        </div>
      )
    }

    let lineClass = 'text-slate-300'
    let contentElem: React.ReactNode = content

    if (isGroup) {
      lineClass = 'text-ccd-accent font-bold text-xs mt-3 mb-1 pb-1 border-b border-ccd-accent/20 flex items-center gap-2'
      contentElem = (
        <>
          <span className="w-2 h-2 rounded-full bg-ccd-accent animate-pulse" />
          {content}
        </>
      )
    } else if (isError) {
      lineClass = 'text-red-400 font-medium'
    } else if (isWarning) {
      lineClass = 'text-amber-400 font-medium'
    } else if (isDebug) {
      lineClass = 'text-slate-500 font-light text-[10px]'
    } else if (/^\$\s|^running|^executing/i.test(content)) {
      lineClass = 'text-cyan-400 font-semibold'
    } else if (/success|berhasil|done|completed|✅/i.test(content)) {
      lineClass = 'text-green-400 font-medium'
    }

    return (
      <div key={idx} className={`flex hover:bg-[#1e2740]/30 rounded px-1 -mx-1 transition-colors ${isGroup ? 'bg-ccd-accent/5' : ''}`}>
        <span className="w-16 select-none text-slate-600 text-right pr-3 shrink-0 font-mono text-[10px] pt-[2px] border-r border-ccd-border/30 mr-3">
          {time || '—'}
        </span>
        <span className={`whitespace-pre-wrap break-all min-w-0 font-mono text-[11px] leading-relaxed ${lineClass}`}>
          {contentElem}
        </span>
      </div>
    )
  }

  // Get status details for each step
  const getStepStatus = (num: number) => {
    return sortedSteps.find(s => s.step_number === num)?.status || 'pending'
  }

  const s1 = getStepStatus(1)
  const s2 = getStepStatus(2)
  const s3 = getStepStatus(3)
  const s4 = getStepStatus(4)
  const s5 = getStepStatus(5)
  const s6 = getStepStatus(6)

  // Status for nodes
  const repoStatus = (s2 === 'completed' || s3 === 'completed' || s4 === 'completed' || s5 === 'completed' || s6 === 'completed' || overallStatus === 'success') ? 'completed' :
                     s2 === 'running' ? 'running' :
                     s2 === 'failed' ? 'failed' : 'pending'

  const runnerStatus = (s1 === 'running' || s2 === 'running' || s3 === 'running' || s4 === 'running' || s5 === 'running') ? 'running' :
                       (s3 === 'completed' || s4 === 'completed' || s5 === 'completed' || s6 === 'completed' || overallStatus === 'success') ? 'completed' :
                       (s1 === 'failed' || s2 === 'failed' || s3 === 'failed' || s4 === 'failed' || s5 === 'failed') ? 'failed' : 'pending'

  const registryStatus = (s4 === 'completed' || s5 === 'completed' || s6 === 'completed' || overallStatus === 'success') ? 'completed' :
                         (s3 === 'running' || s4 === 'running') ? 'running' :
                         (s3 === 'failed' || s4 === 'failed') ? 'failed' : 'pending'

  const serverStatus = (overallStatus === 'success' || s6 === 'completed') ? 'completed' :
                       (s5 === 'running' || s6 === 'running') ? 'running' :
                       (s5 === 'failed' || s6 === 'failed' || overallStatus === 'failed') ? 'failed' : 'pending'

  const getNodeColor = (status: string) => {
    if (status === 'completed') return '#10b981' // Neon Success Emerald
    if (status === 'running') return '#06b6d4' // Neon Active Cyan
    if (status === 'failed') return '#f43f5e' // Neon Danger Rose
    return '#334155' // Muted border slate
  }

  const getNodeBg = (status: string) => {
    if (status === 'completed') return 'rgba(16, 185, 129, 0.08)'
    if (status === 'running') return 'rgba(6, 182, 212, 0.12)'
    if (status === 'failed') return 'rgba(244, 63, 94, 0.12)'
    return '#0b0f19'
  }

  const animationStyle = `
    @keyframes pulseGlow {
      0%, 100% { transform: scale(0.96); opacity: 0.6; filter: drop-shadow(0 0 15px rgba(6, 182, 212, 0.25)); }
      50% { transform: scale(1.04); opacity: 0.9; filter: drop-shadow(0 0 25px rgba(6, 182, 212, 0.5)); }
    }
    @keyframes pulseDiod {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    @keyframes flowLines {
      from { stroke-dashoffset: 40; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes pulseRing {
      0% { transform: scale(0.85); opacity: 0.8; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    @keyframes activeNodePulse {
      0% { transform: scale(1) translateY(0); }
      50% { transform: scale(1.06) translateY(-6px); }
      100% { transform: scale(1) translateY(0); }
    }
    .animate-active-node {
      animation: activeNodePulse 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      transform-origin: 0px 0px;
    }
    .animate-pulse-ring {
      animation: pulseRing 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
      transform-origin: 0px 0px;
    }
    .active-line-flow {
      stroke-dasharray: 8 6;
      animation: flowLines 1.2s linear infinite;
    }
  `

  return (
    <div className="space-y-6 animate-fade-in">
      <style>{animationStyle}</style>

      {/* Header */}
      <div className="ccd-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-ccd-text">Deployment #{deployment.id}</h2>
            <span className={`badge uppercase tracking-wider text-[10px] px-2.5 py-0.5 border ${statusColors[overallStatus] || 'badge-muted'}`}>
              {overallStatus}
            </span>
          </div>
          <p className="text-xs text-ccd-text-muted mt-1.5 font-mono">
            Triggered at: {deployment.created_at || deployment.createdAt ? new Date(deployment.created_at || deployment.createdAt || '').toLocaleString() : '—'}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          {(overallStatus === 'failed' || overallStatus === 'cancelled') && onRetry && (
            <button
              onClick={() => onRetry(deployment.id)}
              className="ccd-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M16 3h5v5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 21H3v-5" />
              </svg>
              Try Again
            </button>
          )}
          <button
            onClick={onBack}
            className="ccd-btn-secondary text-xs py-2 px-4 border border-ccd-border/50"
          >
            ← Back to List
          </button>
        </div>
      </div>

      {/* Two Columns: Left Step Progress | Right Animation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Progress Steps */}
        <div className="ccd-card p-6 flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-ccd-text">Pipeline Execution Steps</h3>
            <p className="text-xs text-ccd-text-muted mt-0.5">Real-time step tracking from central runner</p>
          </div>

          <div className="space-y-5 relative pl-4 border-l border-ccd-border/60 ml-3">
            {sortedSteps.map((s) => {
              const isCompleted = s.status === 'completed'
              const isRunning = s.status === 'running'
              const isFailed = s.status === 'failed'
              const isSkipped = s.status === 'skipped'
              const isPending = s.status === 'pending'

              return (
                <div key={s.id} className="relative flex items-start gap-4">
                  {/* Left Side Icon/Spinner */}
                  <div className="absolute left-[-26px] top-1 z-10">
                    {isCompleted && (
                      <div className="w-5 h-5 rounded-full bg-ccd-success text-white flex items-center justify-center shrink-0 border border-ccd-success/30 shadow-lg shadow-ccd-success/20">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} className="w-3 h-3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    {isRunning && (
                      <div className="w-5 h-5 rounded-full bg-[#0d1117] border border-ccd-accent flex items-center justify-center shrink-0 shadow-lg shadow-ccd-accent/20">
                        <div className="spinner w-3 h-3 border-t-transparent border-ccd-accent animate-spin" />
                      </div>
                    )}
                    {isFailed && (
                      <div className="w-5 h-5 rounded-full bg-ccd-danger text-white flex items-center justify-center shrink-0 border border-ccd-danger/30 shadow-lg shadow-ccd-danger/20 animate-bounce">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} className="w-3 h-3">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </div>
                    )}
                    {isSkipped && (
                      <div className="w-5 h-5 rounded-full bg-ccd-muted/30 border border-ccd-border flex items-center justify-center shrink-0 opacity-60">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-2.5 h-2.5 text-ccd-text-muted">
                          <path d="M5 4l15 8-15 8V4z" /><line x1="19" y1="4" x2="19" y2="20" />
                        </svg>
                      </div>
                    )}
                    {isPending && (
                      <div className="w-5 h-5 rounded-full bg-[#1e293b] border border-ccd-border flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-ccd-text-muted/60" />
                      </div>
                    )}
                  </div>

                  {/* Step Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${
                        isRunning ? 'text-ccd-accent' : 
                        isCompleted ? 'text-ccd-success' : 
                        isSkipped ? 'text-ccd-text-muted opacity-60' :
                        'text-ccd-text-dim'
                      }`}>
                        {s.step_name}
                      </span>
                      {isRunning && <span className="text-[10px] text-ccd-accent font-mono animate-pulse">processing...</span>}
                      {isSkipped && <span className="text-[10px] text-ccd-text-muted font-mono italic">skipped</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Custom Animated Topology Illustration with Straight Lines */}
        <div className="ccd-card p-6 flex flex-col items-center justify-center min-h-[300px] bg-ccd-muted/10 relative overflow-hidden">
          {/* Tech Grid Pattern Background */}
          <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle, #3b82f6 1px, transparent 1px)`,
            backgroundSize: '16px 16px'
          }} />

          {/* Animated Server Pipeline Illustration */}
          <div className="relative flex flex-col items-center justify-center w-full h-full py-2 z-10">
            {/* Glowing aura */}
            <div 
              className="absolute w-48 h-48 rounded-full blur-3xl transition-all duration-1000"
              style={{
                background: overallStatus === 'success' ? 'rgba(16, 185, 129, 0.12)' :
                            overallStatus === 'failed' ? 'rgba(244, 63, 94, 0.12)' :
                            'rgba(6, 182, 212, 0.12)',
                animation: 'pulseGlow 4s infinite ease-in-out'
              }}
            />

            <svg viewBox="0 0 400 240" className="w-full max-w-[360px] h-auto">
              <defs>
                <filter id="cyan-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComponentTransfer in="blur" result="boost">
                    <feFuncA type="linear" slope="2"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode in="boost" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="green-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComponentTransfer in="blur" result="boost">
                    <feFuncA type="linear" slope="2"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode in="boost" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="red-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComponentTransfer in="blur" result="boost">
                    <feFuncA type="linear" slope="2"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode in="boost" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* ─── STRAIGHT CONNECTION LINES (MOVING WHEN ACTIVE) ─── */}
              {/* Path 1: Repository -> Actions Runner (Straight Horizontal Line) */}
              <line x1="60" y1="70" x2="200" y2="70" stroke="#161b2d" strokeWidth="5" strokeLinecap="round" />
              <line x1="60" y1="70" x2="200" y2="70" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              {repoStatus === 'completed' && (
                <line x1="60" y1="70" x2="200" y2="70" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" filter="url(#green-glow)" />
              )}
              {repoStatus === 'failed' && (
                <line x1="60" y1="70" x2="200" y2="70" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" filter="url(#red-glow)" />
              )}
              {repoStatus === 'running' && (
                <>
                  <line x1="60" y1="70" x2="200" y2="70" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" filter="url(#cyan-glow)" />
                  <line x1="60" y1="70" x2="200" y2="70" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" className="active-line-flow" />
                </>
              )}

              {/* Path 2: Actions Runner -> Docker Hub (Straight Vertical Line) */}
              <line x1="200" y1="70" x2="200" y2="170" stroke="#161b2d" strokeWidth="5" strokeLinecap="round" />
              <line x1="200" y1="70" x2="200" y2="170" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              {registryStatus === 'completed' && (
                <line x1="200" y1="70" x2="200" y2="170" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" filter="url(#green-glow)" />
              )}
              {registryStatus === 'failed' && (
                <line x1="200" y1="70" x2="200" y2="170" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" filter="url(#red-glow)" />
              )}
              {registryStatus === 'running' && (
                <>
                  <line x1="200" y1="70" x2="200" y2="170" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" filter="url(#cyan-glow)" />
                  <line x1="200" y1="70" x2="200" y2="170" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" className="active-line-flow" />
                </>
              )}

              {/* Path 3: Docker Hub -> Target Server (Straight Diagonal Line) */}
              <line x1="200" y1="170" x2="340" y2="70" stroke="#161b2d" strokeWidth="5" strokeLinecap="round" />
              <line x1="200" y1="170" x2="340" y2="70" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              {s6 === 'completed' && (
                <line x1="200" y1="170" x2="340" y2="70" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" filter="url(#green-glow)" />
              )}
              {s6 === 'failed' && (
                <line x1="200" y1="170" x2="340" y2="70" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" filter="url(#red-glow)" />
              )}
              {s6 === 'running' && (
                <>
                  <line x1="200" y1="170" x2="340" y2="70" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" filter="url(#cyan-glow)" />
                  <line x1="200" y1="170" x2="340" y2="70" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" className="active-line-flow" />
                </>
              )}

              {/* Path 4: Actions Runner -> Target Server (Straight SSH/Config Line) */}
              <line x1="200" y1="70" x2="340" y2="70" stroke="#161b2d" strokeWidth="5" strokeLinecap="round" />
              <line x1="200" y1="70" x2="340" y2="70" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              {s5 === 'completed' && (
                <line x1="200" y1="70" x2="340" y2="70" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" filter="url(#green-glow)" />
              )}
              {s5 === 'failed' && (
                <line x1="200" y1="70" x2="340" y2="70" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" filter="url(#red-glow)" />
              )}
              {s5 === 'running' && (
                <>
                  <line x1="200" y1="70" x2="340" y2="70" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" filter="url(#cyan-glow)" />
                  <line x1="200" y1="70" x2="340" y2="70" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" className="active-line-flow" />
                </>
              )}

              {/* ─── NODES (MOVING WHEN ACTIVE) ─── */}
              {/* NODE 1: Repository Node */}
              <g transform="translate(60, 70)">
                <g className={repoStatus === 'running' ? 'animate-active-node' : ''}>
                  {repoStatus === 'running' && (
                    <circle r="26" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="animate-pulse-ring" />
                  )}
                  <circle r="20" fill={getNodeBg(repoStatus)} stroke={getNodeColor(repoStatus)} strokeWidth="2" filter={repoStatus !== 'pending' ? `url(#${repoStatus === 'completed' ? 'green' : repoStatus === 'failed' ? 'red' : 'cyan'}-glow)` : undefined} />
                  {/* Git Icon */}
                  <g transform="translate(-10, -10)" stroke={repoStatus === 'pending' ? '#64748b' : '#e2e8f0'} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="5" cy="5" r="2" fill={repoStatus !== 'pending' ? getNodeColor(repoStatus) : 'none'} stroke="none" />
                    <circle cx="5" cy="15" r="2" fill={repoStatus !== 'pending' ? getNodeColor(repoStatus) : 'none'} stroke="none" />
                    <circle cx="15" cy="15" r="2" fill={repoStatus !== 'pending' ? getNodeColor(repoStatus) : 'none'} stroke="none" />
                    <line x1="5" y1="7" x2="5" y2="13" />
                    <path d="M 5 13 C 10 13, 11 15, 13 15" />
                  </g>
                </g>
                <text y="34" textAnchor="middle" fill={repoStatus === 'running' ? '#22d3ee' : '#64748b'} className="text-[10px] font-bold tracking-wider uppercase transition-colors duration-300">Repository</text>
              </g>

              {/* NODE 2: Actions Runner Node */}
              <g transform="translate(200, 70)">
                <g className={runnerStatus === 'running' ? 'animate-active-node' : ''}>
                  {runnerStatus === 'running' && (
                    <circle r="30" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="animate-pulse-ring" />
                  )}
                  <circle r="24" fill={getNodeBg(runnerStatus)} stroke={getNodeColor(runnerStatus)} strokeWidth="2" filter={runnerStatus !== 'pending' ? `url(#${runnerStatus === 'completed' ? 'green' : runnerStatus === 'failed' ? 'red' : 'cyan'}-glow)` : undefined} />
                  {/* Microchip representation */}
                  <g transform="translate(-12, -12)">
                    <rect x="2" y="2" width="20" height="20" rx="3" fill="#0f172a" stroke={runnerStatus === 'pending' ? '#64748b' : '#e2e8f0'} strokeWidth="1.5" />
                    <line x1="6" y1="0" x2="6" y2="2" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />
                    <line x1="12" y1="0" x2="12" y2="2" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />
                    <line x1="18" y1="0" x2="18" y2="2" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />
                    
                    <line x1="6" y1="22" x2="6" y2="24" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />
                    <line x1="12" y1="22" x2="12" y2="24" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />
                    <line x1="18" y1="22" x2="18" y2="24" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />

                    <line x1="0" y1="6" x2="2" y2="6" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />
                    <line x1="0" y1="12" x2="2" y2="12" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />
                    <line x1="0" y1="18" x2="2" y2="18" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />

                    <line x1="22" y1="6" x2="24" y2="6" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />
                    <line x1="22" y1="12" x2="24" y2="12" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />
                    <line x1="22" y1="18" x2="24" y2="18" stroke={runnerStatus === 'pending' ? '#475569' : '#06b6d4'} strokeWidth="1.5" />

                    <rect x="7" y="7" width="10" height="10" rx="1.5" fill={runnerStatus === 'running' ? 'rgba(6, 182, 212, 0.2)' : 'none'} stroke={getNodeColor(runnerStatus)} strokeWidth="1.2" className={runnerStatus === 'running' ? 'animate-pulse' : ''} />
                  </g>
                </g>
                <text y="42" textAnchor="middle" fill={runnerStatus === 'running' ? '#22d3ee' : '#64748b'} className="text-[10px] font-bold tracking-wider uppercase transition-colors duration-300">Runner</text>
              </g>

              {/* NODE 3: Docker Hub Node */}
              <g transform="translate(200, 170)">
                <g className={registryStatus === 'running' ? 'animate-active-node' : ''}>
                  {registryStatus === 'running' && (
                    <circle r="28" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="animate-pulse-ring" />
                  )}
                  <circle r="22" fill={getNodeBg(registryStatus)} stroke={getNodeColor(registryStatus)} strokeWidth="2" filter={registryStatus !== 'pending' ? `url(#${registryStatus === 'completed' ? 'green' : registryStatus === 'failed' ? 'red' : 'cyan'}-glow)` : undefined} />
                  {/* Container Box Icon */}
                  <g transform="translate(-11, -11)" stroke={registryStatus === 'pending' ? '#64748b' : '#e2e8f0'} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 2 L20 7.5 L11 13 L2 7.5 Z" fill={registryStatus === 'running' ? 'rgba(6, 182, 212, 0.1)' : 'none'} />
                    <path d="M2 7.5 L2 17.5 L11 23 L11 13" />
                    <path d="M20 7.5 L20 17.5 L11 23" />
                    <line x1="11" y1="7" x2="11" y2="13" strokeDasharray="1.5 1.5" />
                  </g>
                </g>
                <text y="35" textAnchor="middle" fill={registryStatus === 'running' ? '#22d3ee' : '#64748b'} className="text-[10px] font-bold tracking-wider uppercase transition-colors duration-300">Docker Hub</text>
              </g>

              {/* NODE 4: Target Server Node */}
              <g transform="translate(340, 70)">
                <g className={serverStatus === 'running' ? 'animate-active-node' : ''}>
                  {serverStatus === 'running' && (
                    <circle r="26" fill="none" stroke="#06b6d4" strokeWidth="1.5" className="animate-pulse-ring" />
                  )}
                  <circle r="20" fill={getNodeBg(serverStatus)} stroke={getNodeColor(serverStatus)} strokeWidth="2" filter={serverStatus !== 'pending' ? `url(#${serverStatus === 'completed' ? 'green' : serverStatus === 'failed' ? 'red' : 'cyan'}-glow)` : undefined} />
                  {/* Server Rack Icon */}
                  <g transform="translate(-11, -11)">
                    <rect x="0" y="0" width="22" height="22" rx="3" fill="#0f172a" stroke={serverStatus === 'pending' ? '#64748b' : '#e2e8f0'} strokeWidth="1.5" />
                    <rect x="3" y="4" width="16" height="3" rx="0.5" fill="#1e293b" stroke={serverStatus === 'completed' ? '#10b981' : serverStatus === 'running' ? '#06b6d4' : '#475569'} strokeWidth="1" />
                    <rect x="3" y="9" width="16" height="3" rx="0.5" fill="#1e293b" stroke={serverStatus === 'completed' ? '#10b981' : serverStatus === 'running' ? '#06b6d4' : '#475569'} strokeWidth="1" />
                    <rect x="3" y="14" width="16" height="3" rx="0.5" fill="#1e293b" stroke={serverStatus === 'completed' ? '#10b981' : serverStatus === 'running' ? '#06b6d4' : '#475569'} strokeWidth="1" />
                    <circle cx="16" cy="5.5" r="0.75" fill={serverStatus === 'completed' ? '#10b981' : '#64748b'} className={serverStatus === 'running' ? 'animate-pulse' : ''} />
                    <circle cx="16" cy="10.5" r="0.75" fill={serverStatus === 'completed' ? '#10b981' : '#64748b'} className={serverStatus === 'running' ? 'animate-pulse' : ''} />
                    <circle cx="16" cy="15.5" r="0.75" fill={overallStatus === 'success' ? '#10b981' : overallStatus === 'failed' ? '#f43f5e' : '#06b6d4'} className={overallStatus === 'running' ? 'animate-pulse' : ''} />
                  </g>
                </g>
                <text y="34" textAnchor="middle" fill={serverStatus === 'running' ? '#22d3ee' : '#64748b'} className="text-[10px] font-bold tracking-wider uppercase transition-colors duration-300">Target Server</text>
              </g>
            </svg>

            {/* Overall Status Text Banner */}
            <div className="mt-4 text-center z-10 px-4 py-1.5 rounded-full border bg-[#0b0f19]/80 border-slate-800 shadow-md">
              <span className={`text-xs font-semibold tracking-wide ${
                overallStatus === 'success' ? 'text-ccd-success' :
                overallStatus === 'failed' ? 'text-ccd-danger' :
                overallStatus === 'running' ? 'text-ccd-accent' :
                'text-ccd-text-muted'
              }`}>
                {overallStatus === 'success' ? '🚀 Deployment Completed Successfully!' :
                 overallStatus === 'failed' ? '❌ Deployment Pipeline Failed' :
                 overallStatus === 'running' ? `⚡ Active: ${runningStep?.step_name || 'Deploying...'}` :
                 '⏳ Awaiting Actions Runner Dispatch...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* NEW STYLISH CONSOLIDATED PLAIN TEXT LOGS SECTION */}
      <div className="w-full mt-6">
        <div className="ccd-card overflow-hidden border-[#1e2740] shadow-2xl flex flex-col">
          {/* Header Panel (Clean and non-terminal style) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 bg-[#0e1322] border-b border-ccd-border gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ccd-text">Deployment Execution Logs</h3>
              <p className="text-xs text-ccd-text-muted mt-0.5">Continuous synced logs directly from GitHub Actions</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search Log Box */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#161b2e] border border-ccd-border/60 text-ccd-text placeholder-ccd-text-muted rounded px-3 py-1.5 text-xs focus:outline-none focus:border-ccd-accent w-40 sm:w-48 transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ccd-text-muted hover:text-ccd-text text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Auto Scroll Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-ccd-border text-ccd-accent bg-ccd-surface focus:ring-ccd-accent w-3.5 h-3.5"
                />
                <span className="text-xs text-[#8b949e] font-medium">Auto-scroll</span>
              </label>

              {/* Copy Log Action */}
              <button
                onClick={handleCopyLogs}
                disabled={!logsToDisplay}
                className="ccd-btn-secondary py-1.5 px-3 text-xs border border-ccd-border/40 hover:bg-[#1e2740] text-ccd-text-dim disabled:opacity-40"
              >
                Copy all logs
              </button>
            </div>
          </div>

          {/* Unified Log Console (Clean style) */}
          <div className="bg-[#070a12] p-5 flex flex-col min-h-[360px]">
            <div 
              ref={logsContainerRef}
              className="flex-1 overflow-y-auto max-h-[420px] min-h-[300px] bg-[#090d16] rounded-xl border border-ccd-border/40 p-5 font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800"
            >
              {!logsToDisplay ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-ccd-text-muted p-12">
                  <div className="spinner w-6 h-6 border-t-transparent border-ccd-accent animate-spin mb-3" />
                  <p className="text-xs">Initializing logs stream... Syncing with GitHub Action Run...</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {logsToDisplay
                    .split('\n')
                    .filter(line => !searchQuery || line.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((line, idx) => renderLogLine(line, idx))}
                  {logsToDisplay.split('\n').filter(line => !searchQuery || line.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="text-center text-ccd-text-muted py-8">
                      No matches found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default function Deployment() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep]         = useState<number>(() => {
    const saved = localStorage.getItem('ccd_wizard_step')
    return saved ? Number(saved) : 1
  })
  const [formData, setFormData]               = useState<FormData>(() => {
    const saved = localStorage.getItem('ccd_wizard_form_data')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {}
    }
    return INIT_DATA
  })
  const [submitting, setSubmitting]           = useState(false)
  const [activeDeployment, setActiveDeployment] = useState<DeploymentType | null>(null)
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentType | null>(null)
  const [showWizard, setShowWizard]           = useState(false)
  const [deployments, setDeployments]         = useState<DeploymentType[]>([])
  const [loadingDeployments, setLoadingDeployments] = useState(false)
  const { showToast }                         = useToast()
  const [loadingKeys, setLoadingKeys]         = useState(false)
  
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [filterEnv, setFilterEnv] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 10

  // Fetch environments on mount for list filters
  useEffect(() => {
    api.get('/environments')
      .then(res => setEnvironments(res.data))
      .catch(() => {})
  }, [])

  // Filter logic
  const filteredDeployments = useMemo(() => {
    return deployments.filter(d => {
      if (filterEnv && (!d.environment_id || String(d.environment_id) !== filterEnv)) {
        return false
      }
      if (filterStatus && d.status !== filterStatus) {
        return false
      }
      const dateVal = d.created_at || d.createdAt
      if (filterStartDate && dateVal) {
        const start = new Date(filterStartDate)
        start.setHours(0, 0, 0, 0)
        const dDate = new Date(dateVal)
        if (dDate < start) return false
      }
      if (filterEndDate && dateVal) {
        const end = new Date(filterEndDate)
        end.setHours(23, 59, 59, 999)
        const dDate = new Date(dateVal)
        if (dDate > end) return false
      }
      return true
    })
  }, [deployments, filterEnv, filterStatus, filterStartDate, filterEndDate])

  const totalItems = filteredDeployments.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  // Handle current page out of bounds when filters change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const paginatedDeployments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredDeployments.slice(startIndex, startIndex + pageSize)
  }, [filteredDeployments, currentPage, pageSize])

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'wizard' | 'draft'; draftId?: number } | null>(null)

  const updateData = (patch: Partial<FormData>) => setFormData(prev => ({ ...prev, ...patch }))

  // Restore active deployment on mount
  useEffect(() => {
    const savedActiveId = localStorage.getItem('ccd_active_deployment_id')
    if (savedActiveId) {
      api.get(`/deployments/${savedActiveId}`)
        .then(res => {
          const isFinished = ['success', 'failed', 'cancelled'].includes(res.data.status)
          if (isFinished) {
            localStorage.removeItem('ccd_active_deployment_id')
          } else {
            setActiveDeployment(res.data)
          }
        })
        .catch(() => {
          localStorage.removeItem('ccd_active_deployment_id')
        })
    }
  }, [])

  // Persist wizard step and data
  useEffect(() => {
    localStorage.setItem('ccd_wizard_step', String(currentStep))
  }, [currentStep])

  useEffect(() => {
    localStorage.setItem('ccd_wizard_form_data', JSON.stringify(formData))
  }, [formData])

  // Fetch all deployments
  const fetchDeployments = useCallback(async () => {
    setLoadingDeployments(true)
    try {
      const res = await api.get('/deployments')
      setDeployments(res.data)
    } catch (err) {
      showToast('Failed to fetch deployments list', 'error')
    } finally {
      setLoadingDeployments(false)
    }
  }, [showToast])

  useEffect(() => {
    if (!activeDeployment && !selectedDeployment) {
      fetchDeployments()
    }
  }, [activeDeployment, selectedDeployment, fetchDeployments])

  // Refresh selected/viewed deployment details
  const refreshViewingDeployment = useCallback(async () => {
    const id = selectedDeployment?.id || activeDeployment?.id
    if (!id) return
    try {
      const res = await api.get(`/deployments/${id}`)
      if (selectedDeployment) {
        setSelectedDeployment(res.data)
      } else {
        setActiveDeployment(res.data)
        const isFinished = ['success', 'failed', 'cancelled'].includes(res.data.status)
        if (isFinished) {
          localStorage.removeItem('ccd_active_deployment_id')
        }
      }
    } catch (e) {}
  }, [activeDeployment?.id, selectedDeployment])

  const canNext = () => {
    if (currentStep === 1) return formData.environment_id !== null && formData.repositories.length > 0
    if (currentStep === 2) return true
    return false
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      setLoadingKeys(true)
      try {
        const newConfig = { ...formData.config }
        
        await Promise.all(
          formData.repositories.map(async (repo) => {
            if (!newConfig[repo.name] || Object.keys(newConfig[repo.name]).length === 0) {
              try {
                const res = await api.get(`/repos/${repo.id}/env-keys`)
                const keys = res.data.keys && res.data.keys.length > 0 ? res.data.keys : []
                
                const defaults: Record<string, string> = {}
                keys.forEach((k: string) => {
                  defaults[k] = ''
                })
                newConfig[repo.name] = defaults
              } catch (err) {
                const defaults: Record<string, string> = {}
                newConfig[repo.name] = defaults
              }
            }
          })
        )
        
        setFormData(prev => ({ ...prev, config: newConfig }))
        setCurrentStep(2)
      } catch (err) {
        showToast('Failed to fetch environment variables', 'error')
      } finally {
        setLoadingKeys(false)
      }
    } else {
      setCurrentStep(s => s + 1)
    }
  }

  const handleExecute = () => {
    setConfirmAction({ type: 'wizard' })
    setShowConfirmModal(true)
  }

  const handleExecuteDraft = (id: number) => {
    setConfirmAction({ type: 'draft', draftId: id })
    setShowConfirmModal(true)
  }

  const confirmAndExecute = async () => {
    if (!confirmAction) return
    setShowConfirmModal(false)
    
    if (confirmAction.type === 'wizard') {
      setSubmitting(true)
      try {
        const res = await api.post('/deployments', {
          environment_id: formData.environment_id,
          repositories:   formData.repositories,
          config:         formData.config,
        })
        setActiveDeployment(res.data)
        localStorage.setItem('ccd_active_deployment_id', String(res.data.id))
        showToast('Deployment triggered successfully!', 'success')
        // Reset wizard
        localStorage.removeItem('ccd_wizard_step')
        localStorage.removeItem('ccd_wizard_form_data')
        setFormData(INIT_DATA)
        setCurrentStep(1)
        setShowWizard(false)
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Deployment failed', 'error')
      } finally {
        setSubmitting(false)
        setConfirmAction(null)
      }
    } else if (confirmAction.type === 'draft' && confirmAction.draftId) {
      try {
        const res = await api.post(`/deployments/${confirmAction.draftId}/execute`)
        setActiveDeployment(res.data)
        localStorage.setItem('ccd_active_deployment_id', String(res.data.id))
        showToast('Deployment triggered successfully!', 'success')
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to execute draft', 'error')
      } finally {
        setConfirmAction(null)
      }
    }
  }

  const handleSavePlan = async () => {
    setSubmitting(true)
    try {
      await api.post('/deployments', {
        environment_id: formData.environment_id,
        repositories:   formData.repositories,
        config:         formData.config,
        status:         'draft',
      })
      showToast('Deployment plan saved successfully!', 'success')
      localStorage.removeItem('ccd_wizard_step')
      localStorage.removeItem('ccd_wizard_form_data')
      setFormData(INIT_DATA)
      setCurrentStep(1)
      setShowWizard(false)
      fetchDeployments()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save plan', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = async (id: number) => {
    try {
      const res = await api.post(`/deployments/${id}/retry`)
      if (selectedDeployment) {
        setSelectedDeployment(res.data)
      } else {
        setActiveDeployment(res.data)
        localStorage.setItem('ccd_active_deployment_id', String(res.data.id))
      }
      showToast('Deployment retried successfully!', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to retry deployment', 'error')
    }
  }

  const handleBackToList = () => {
    setActiveDeployment(null)
    setSelectedDeployment(null)
    localStorage.removeItem('ccd_active_deployment_id')
    fetchDeployments()
  }

  const viewingDeployment = selectedDeployment || activeDeployment

  const listStatusColors: Record<string, string> = {
    pending:   'badge-warning',
    running:   'badge-accent animate-pulse',
    success:   'badge-success',
    failed:    'badge-danger',
    cancelled: 'badge-muted',
    draft:     'badge-muted',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {viewingDeployment ? (
        <ActiveDeploymentDashboard
          deployment={viewingDeployment}
          onBack={handleBackToList}
          onRefresh={refreshViewingDeployment}
          onRetry={handleRetry}
        />
      ) : showWizard ? (
        /* Form Panel / Stepper Wizard */
        <div className="w-full">
          {/* Stepper header */}
          <div className="ccd-card p-5 mb-5">
            <StepIndicator current={currentStep} steps={STEPS} />
          </div>

          {/* Step content */}
          <div className="ccd-card p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-ccd-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-ccd-accent/20 border border-ccd-accent/30 flex items-center justify-center font-mono text-xs font-bold text-ccd-accent">
                  0{currentStep}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-ccd-text">{STEPS[currentStep - 1].title}</h2>
                  <p className="text-xs text-ccd-text-muted">{STEPS[currentStep - 1].subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="ccd-btn-secondary text-xs py-1.5 px-3 border border-ccd-border/50"
              >
                Cancel
              </button>
            </div>

            {currentStep === 1 && <Step01Setup data={formData} onChange={updateData} />}
            {currentStep === 2 && <Step02Config data={formData} onChange={updateData} />}
            {currentStep === 3 && <Step03Review data={formData} />}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-ccd-border">
              <button
                onClick={() => currentStep > 1 ? setCurrentStep(s => s - 1) : null}
                disabled={currentStep === 1 || loadingKeys}
                className="ccd-btn-secondary"
              >
                ← Back
              </button>

              <div className="flex gap-3">
                {currentStep < 3 ? (
                  <button
                    onClick={handleNext}
                    disabled={!canNext() || loadingKeys}
                    className="ccd-btn-primary flex items-center gap-2"
                  >
                    {loadingKeys ? (
                      <>
                        <div className="spinner w-4 h-4 border-t-transparent animate-spin" />
                        Loading variables...
                      </>
                    ) : (
                      <>Next →</>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSavePlan}
                      disabled={submitting}
                      className="ccd-btn-secondary border border-ccd-border/50 text-xs py-2.5 px-4"
                    >
                      Save as Plan
                    </button>
                    <button
                      onClick={handleExecute}
                      disabled={submitting}
                      id="execute-deploy-btn"
                      className="ccd-btn-primary bg-gradient-to-r from-ccd-accent to-ccd-cyan hover:opacity-90 animate-pulse"
                    >
                      {submitting ? (
                        <><div className="spinner w-4 h-4 animate-spin border-t-transparent mr-2" />Executing...</>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          Execute Deployment
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Deployments List Dashboard */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ccd-text">Deployments</h2>
              <p className="text-sm text-ccd-text-muted mt-1">
                Track and manage code deployments across your environment infrastructure.
              </p>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="ccd-btn-primary bg-gradient-to-r from-ccd-accent to-ccd-cyan hover:opacity-90 shadow-lg shadow-ccd-accent/20 text-xs py-2.5 px-4 inline-flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Deployment
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-ccd-surface/30 p-4 rounded-xl border border-ccd-border/50 flex flex-col md:flex-row md:items-end gap-3 text-xs">
            {/* Environment Filter */}
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-ccd-text-muted uppercase tracking-wider">Environment</label>
              <select
                value={filterEnv}
                onChange={e => { setFilterEnv(e.target.value); setCurrentPage(1); }}
                className="ccd-input bg-ccd-bg border-ccd-border focus:border-ccd-accent text-xs h-9 w-full"
              >
                <option value="">All Environments</option>
                {environments.map(env => (
                  <option key={env.id} value={String(env.id)}>{env.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-ccd-text-muted uppercase tracking-wider">Status</label>
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="ccd-input bg-ccd-bg border-ccd-border focus:border-ccd-accent text-xs h-9 w-full"
              >
                <option value="">All Statuses</option>
                <option value="draft">DRAFT</option>
                <option value="pending">PENDING</option>
                <option value="running">RUNNING</option>
                <option value="success">SUCCESS</option>
                <option value="failed">FAILED</option>
                <option value="cancelled">CANCELLED</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-ccd-text-muted uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={e => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
                className="ccd-input bg-ccd-bg border-ccd-border focus:border-ccd-accent text-xs h-9 w-full"
              />
            </div>

            {/* End Date */}
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold text-ccd-text-muted uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={e => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
                className="ccd-input bg-ccd-bg border-ccd-border focus:border-ccd-accent text-xs h-9 w-full"
              />
            </div>

            {/* Reset Button */}
            {(filterEnv || filterStatus || filterStartDate || filterEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setFilterEnv('');
                  setFilterStatus('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setCurrentPage(1);
                }}
                className="px-3 h-9 rounded-lg bg-ccd-muted/20 hover:bg-ccd-muted/30 text-ccd-text hover:text-ccd-danger transition-colors font-medium border border-ccd-border/30 flex items-center gap-1.5 shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Reset
              </button>
            )}
          </div>

          {loadingDeployments ? (
            <div className="ccd-card p-20 flex justify-center items-center">
              <div className="flex flex-col items-center gap-3">
                <div className="spinner w-8 h-8" />
                <p className="text-xs text-ccd-text-muted">Loading deployments...</p>
              </div>
            </div>
          ) : deployments.length === 0 ? (
            <div className="text-center py-20 bg-ccd-surface/10 border border-ccd-border rounded-xl">
              <div className="w-16 h-16 rounded-full bg-ccd-accent/10 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-ccd-accent">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-ccd-text">No Deployments Found</h3>
              <p className="text-xs text-ccd-text-muted mt-1 mb-6">Create your first deployment plan to get started.</p>
              <button
                onClick={() => setShowWizard(true)}
                className="ccd-btn-primary text-xs py-2 px-4"
              >
                + Create Deployment
              </button>
            </div>
          ) : (
            <>
              <div className="ccd-card overflow-hidden">
                <table className="ccd-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Environment</th>
                      <th>Applications</th>
                      <th>Notes</th>
                      <th>Triggered By</th>
                      <th>Executed At</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDeployments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-ccd-text-muted text-xs italic">
                          No deployments found matching the current filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedDeployments.map(d => {
                        const reposList = d.repositories || []
                        return (
                          <tr key={d.id}>
                            <td>
                              <span className="font-mono text-xs font-bold text-ccd-text">#{d.id}</span>
                            </td>
                            <td>
                              {d.environment ? (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: d.environment.color }}
                                  />
                                  <span className="text-xs font-semibold">{d.environment.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-ccd-text-muted">—</span>
                              )}
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                                {reposList.map((repo: any) => (
                                  <span
                                    key={repo.github_id || repo.name}
                                    className="badge-muted text-[10px] font-mono py-0.5 px-2 inline-flex items-center gap-1.5"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-ccd-text-muted">
                                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                                    </svg>
                                    <span>{repo.name}</span>
                                    {repo.branch && (
                                      <span className="text-ccd-accent">({repo.branch})</span>
                                    )}
                                  </span>
                                ))}
                                {reposList.length === 0 && (
                                  <span className="text-xs text-ccd-text-muted">—</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="text-xs text-ccd-text-muted truncate max-w-[150px] block" title={d.notes || ''}>
                                {d.notes || '—'}
                              </span>
                            </td>
                            <td>
                              {d.user ? (
                                <div className="flex items-center gap-2">
                                  {d.user.avatar_url && (
                                    <img
                                      src={d.user.avatar_url}
                                      alt={d.user.login}
                                      className="w-5 h-5 rounded-full border border-ccd-border"
                                    />
                                  )}
                                  <span className="text-xs">{d.user.name || d.user.login}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-ccd-text-muted">—</span>
                              )}
                            </td>
                            <td>
                              <span className="text-xs text-ccd-text-muted font-mono">
                                {d.created_at || d.createdAt ? new Date(d.created_at || d.createdAt || '').toLocaleString() : '—'}
                              </span>
                            </td>
                            <td>
                              <span className={`${listStatusColors[d.status] || 'badge-muted'} uppercase text-[9px] font-bold px-2 py-0.5 border`}>
                                {d.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                {d.status === 'draft' ? (
                                  <>
                                    <button
                                      onClick={() => handleExecuteDraft(d.id)}
                                      className="ccd-btn bg-ccd-success/15 hover:bg-ccd-success/25 text-ccd-success border border-ccd-success/20 text-[11px] py-1 px-2.5 rounded flex items-center gap-1"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                      </svg>
                                      Execute
                                    </button>
                                    <button
                                      onClick={() => setSelectedDeployment(d)}
                                      className="ccd-btn-ghost text-[11px] py-1 px-2 border border-ccd-border/40 hover:bg-ccd-muted/30"
                                    >
                                      Details
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setSelectedDeployment(d)}
                                    className="ccd-btn-ghost text-[11px] py-1 px-2.5 border border-ccd-border/40 hover:bg-ccd-muted/30 flex items-center gap-1"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-ccd-text-muted">
                                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                      <line x1="16" y1="13" x2="8" y2="13" />
                                      <line x1="16" y1="17" x2="8" y2="17" />
                                      <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                    View Logs
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 bg-ccd-surface/10 p-3 rounded-xl border border-ccd-border/40 text-xs text-ccd-text-muted font-mono">
                  <div>
                    Showing <span className="text-ccd-text font-bold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="text-ccd-text font-bold">
                      {Math.min(currentPage * pageSize, totalItems)}
                    </span>{' '}
                    of <span className="text-ccd-text font-bold">{totalItems}</span> deployments
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg bg-ccd-surface border border-ccd-border hover:border-ccd-muted disabled:opacity-40 disabled:hover:border-ccd-border text-ccd-text transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-ccd-text-dim text-xs">
                      Page <span className="text-ccd-cyan font-bold">{currentPage}</span> of{' '}
                      <span className="text-ccd-text font-bold">{totalPages}</span>
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg bg-ccd-surface border border-ccd-border hover:border-ccd-muted disabled:opacity-40 disabled:hover:border-ccd-border text-ccd-text transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Sleek Glassmorphism Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ccd-animate-fade-in" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}>
          <style>{`
            @keyframes ccdFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes ccdScaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .ccd-animate-fade-in { animation: ccdFadeIn 0.18s ease-out forwards; }
            .ccd-animate-scale-in { animation: ccdScaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          `}</style>
          <div className="bg-[#0b0f19] border border-ccd-border/60 max-w-md w-full rounded-2xl p-6 shadow-2xl shadow-black/80 ccd-animate-scale-in relative overflow-hidden">
            {/* Background cyan radial glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-ccd-accent/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-ccd-warning/5 blur-2xl pointer-events-none" />

            {/* Title & Icon */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-ccd-warning/10 border border-ccd-warning/20 flex items-center justify-center text-ccd-warning shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-ccd-text">Confirm Deployment</h4>
                <p className="text-xs text-ccd-text-muted mt-0.5">Please verify before proceeding</p>
              </div>
            </div>

            {/* Description details */}
            <div className="space-y-3 my-4 bg-ccd-muted/10 border border-ccd-border/40 rounded-xl p-4 text-xs">
              <p className="text-ccd-text-dim leading-relaxed">
                Anda akan memulai proses deployment ke server. Hal ini akan memicu pipeline GitHub Actions untuk membangun dan memperbarui container aplikasi Anda.
              </p>
              <div className="border-t border-ccd-border/30 pt-3 flex flex-col gap-1.5 font-mono text-[11px]">
                {confirmAction?.type === 'wizard' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-ccd-text-muted">Environment:</span>
                      <span className="text-ccd-accent font-semibold">{formData.environment?.name || 'Staging'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ccd-text-muted">Applications:</span>
                      <span className="text-ccd-text font-medium truncate max-w-[200px]" title={formData.repositories.map(r => r.name).join(', ')}>
                        {formData.repositories.map(r => r.name).join(', ')}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-ccd-text-muted">Source:</span>
                      <span className="text-ccd-warning font-semibold">Saved Draft Deployment</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ccd-text-muted">Draft ID:</span>
                      <span className="text-ccd-text font-medium">#{confirmAction?.draftId}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setConfirmAction(null)
                }}
                className="ccd-btn-secondary py-2 px-4 text-xs border border-ccd-border/50 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={confirmAndExecute}
                className="ccd-btn-primary py-2 px-5 text-xs bg-gradient-to-r from-ccd-accent to-ccd-cyan text-white font-semibold rounded-lg shadow-lg shadow-ccd-accent/20 hover:opacity-90"
              >
                Eksekusi Deployment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
