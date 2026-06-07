import React, { useState, useCallback, useEffect, useRef } from 'react'
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
}

function ActiveDeploymentDashboard({ deployment, onBack, onRefresh }: ActiveDeploymentDashboardProps) {
  const steps = deployment.steps || []
  const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number)
  const terminalRef = useRef<HTMLPreElement>(null)

  // Auto-refresh while running
  useEffect(() => {
    const hasRunning = steps.some(s => s.status === 'running' || s.status === 'pending')
    if (!hasRunning) return
    const interval = setInterval(onRefresh, 4000)
    return () => clearInterval(interval)
  }, [steps, onRefresh])

  // Consolidate logs like GitHub Actions
  const consolidatedLogs = sortedSteps
    .map(s => {
      const title = `[STEP 0${s.step_number}] ${s.step_name.toUpperCase()} - ${s.status.toUpperCase()}`;
      const divider = `========================================================================`;
      const logContent = s.log ? s.log.trim() : (s.status === 'pending' ? 'Waiting to start...' : 'No log output.');
      return `${divider}\n${title}\n${divider}\n${logContent}\n\n`;
    })
    .join('');

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [consolidatedLogs])

  const overallStatus = deployment.status || 'pending'
  const statusColors: Record<string, string> = {
    pending:   'bg-ccd-warning/15 text-ccd-warning border-ccd-warning/30',
    running:   'bg-ccd-accent/15 text-ccd-accent border-ccd-accent/30 animate-pulse',
    success:   'bg-ccd-success/15 text-ccd-success border-ccd-success/30',
    failed:    'bg-ccd-danger/15 text-ccd-danger border-ccd-danger/30',
    cancelled: 'bg-ccd-muted/50 text-ccd-text-muted border-ccd-border',
  }

  const animationStyle = `
    @keyframes pulseGlow {
      0%, 100% { transform: scale(0.96); opacity: 0.7; filter: drop-shadow(0 0 15px rgba(6, 182, 212, 0.3)); }
      50% { transform: scale(1.04); opacity: 1; filter: drop-shadow(0 0 30px rgba(6, 182, 212, 0.6)); }
    }
    @keyframes pulseDiod {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    @keyframes flowLines {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -40; }
    }
  `;

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
            Triggered at: {new Date(deployment.created_at).toLocaleString()}
          </p>
        </div>
        <button
          onClick={onBack}
          className="ccd-btn-secondary text-xs py-2 px-4 ml-auto sm:ml-0 border border-ccd-border/50"
        >
          ← Back to List
        </button>
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
                    {s.started_at && (
                      <div className="text-[10px] text-ccd-text-muted mt-0.5 font-mono">
                        Started: {new Date(s.started_at).toLocaleTimeString()}
                        {s.completed_at && ` · Finished: ${new Date(s.completed_at).toLocaleTimeString()}`}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Animation Illustration */}
        <div className="ccd-card p-6 flex flex-col items-center justify-center min-h-[220px] bg-ccd-muted/10 relative overflow-hidden">
          {/* Animated Server Pipeline Illustration */}
          <div className="relative flex flex-col items-center justify-center w-full h-full py-4">
            {/* Glowing aura */}
            <div 
              className="absolute w-32 h-32 rounded-full blur-2xl transition-all duration-1000"
              style={{
                background: overallStatus === 'success' ? 'rgba(34, 197, 94, 0.15)' :
                            overallStatus === 'failed' ? 'rgba(239, 68, 68, 0.15)' :
                            'rgba(6, 182, 212, 0.15)',
                animation: 'pulseGlow 3s infinite ease-in-out'
              }}
            />

            <svg viewBox="0 0 100 80" className="w-36 h-36 relative z-10">
              {/* Connection paths */}
              <path 
                d="M 50 15 L 50 65" 
                stroke="#1e293b" 
                strokeWidth="2" 
              />
              <path 
                d="M 50 15 L 50 65" 
                stroke={overallStatus === 'running' ? '#06b6d4' : overallStatus === 'success' ? '#10b981' : '#1e293b'} 
                strokeWidth="2" 
                strokeDasharray="8 8"
                style={{
                  animation: overallStatus === 'running' ? 'flowLines 1s linear infinite' : 'none'
                }}
              />

              {/* Node 1: Cloud/GitHub */}
              <g transform="translate(42, 5)">
                <rect x="0" y="0" width="16" height="12" rx="3" fill="#0f172a" stroke={overallStatus === 'running' || overallStatus === 'success' ? '#06b6d4' : '#334155'} strokeWidth="1.5" />
                <path d="M 4 8 L 8 4 L 12 8" stroke="#06b6d4" strokeWidth="1.2" fill="none" className={overallStatus === 'running' ? 'animate-bounce' : ''} />
              </g>

              {/* Node 2: Server Runner */}
              <g transform="translate(42, 33)">
                <rect x="0" y="0" width="16" height="14" rx="2" fill="#0f172a" stroke={overallStatus === 'running' ? '#22d3ee' : overallStatus === 'success' ? '#10b981' : '#334155'} strokeWidth="1.5" />
                <line x1="3" y1="4" x2="13" y2="4" stroke="#1e293b" strokeWidth="1.5" />
                <line x1="3" y1="7" x2="13" y2="7" stroke="#1e293b" strokeWidth="1.5" />
                {/* Blinking LEDs */}
                <circle cx="4" cy="11" r="0.8" fill="#22c55e" style={{ animation: 'pulseDiod 1s infinite' }} />
                <circle cx="7" cy="11" r="0.8" fill="#eab308" style={{ animation: 'pulseDiod 1.5s infinite' }} />
                <circle cx="10" cy="11" r="0.8" fill="#ef4444" style={{ animation: 'pulseDiod 0.7s infinite' }} />
              </g>

              {/* Node 3: Target Server */}
              <g transform="translate(42, 63)">
                <rect x="0" y="0" width="16" height="12" rx="2" fill="#0f172a" stroke={overallStatus === 'success' ? '#10b981' : overallStatus === 'failed' ? '#ef4444' : '#334155'} strokeWidth="1.5" />
                <circle cx="8" cy="6" r="2.5" stroke={overallStatus === 'success' ? '#10b981' : overallStatus === 'failed' ? '#ef4444' : '#06b6d4'} strokeWidth="1" fill="none" className={overallStatus === 'running' ? 'animate-ping' : ''} />
              </g>
            </svg>

            <div className="mt-2 text-center z-10">
              <span className={`text-xs font-semibold ${
                overallStatus === 'success' ? 'text-ccd-success' :
                overallStatus === 'failed' ? 'text-ccd-danger' :
                overallStatus === 'running' ? 'text-ccd-accent' :
                'text-ccd-text-muted'
              }`}>
                {overallStatus === 'success' ? 'Deployment Successful!' :
                 overallStatus === 'failed' ? 'Deployment Failed' :
                 overallStatus === 'running' ? 'Deploying to server via SSH...' :
                 'Awaiting Action Runner...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Logs (Styled like GitHub Actions logs) */}
      <div className="w-full mt-6">
        <div className="ccd-card overflow-hidden border-[#1e293b] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-[#21262d]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-ccd-danger/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-ccd-warning/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-ccd-success/60" />
              <span className="text-xs font-mono text-[#8b949e] ml-2">runner@ubuntu-latest: ~logs</span>
            </div>
            <span className="text-[10px] font-mono text-[#8b949e] flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-ccd-accent ${overallStatus === 'running' ? 'animate-ping' : ''}`} />
              {overallStatus === 'running' ? 'LIVE TRACKING' : 'STREAM ENDED'}
            </span>
          </div>
          
          {/* Terminal Console */}
          <pre 
            ref={terminalRef}
            className="p-5 font-mono text-xs text-[#c9d1d9] bg-[#0d1117] overflow-y-auto max-h-[420px] h-[360px] whitespace-pre-wrap break-all scrollbar-thin scrollbar-thumb-[#21262d] scrollbar-track-transparent leading-relaxed"
          >
            {consolidatedLogs}
          </pre>
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

  const updateData = (patch: Partial<FormData>) => setFormData(prev => ({ ...prev, ...patch }))

  // Restore active deployment on mount
  useEffect(() => {
    const savedActiveId = localStorage.getItem('ccd_active_deployment_id')
    if (savedActiveId) {
      api.get(`/deployments/${savedActiveId}`)
        .then(res => {
          setActiveDeployment(res.data)
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

  const handleExecute = async () => {
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

  const handleExecuteDraft = async (id: number) => {
    try {
      const res = await api.post(`/deployments/${id}/execute`)
      setActiveDeployment(res.data)
      localStorage.setItem('ccd_active_deployment_id', String(res.data.id))
      showToast('Deployment triggered successfully!', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to execute draft', 'error')
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
                  {deployments.map(d => {
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
                                className="badge-muted text-[10px] font-mono py-0.5 px-2"
                              >
                                {repo.name}{' '}
                                {repo.branch && (
                                  <span className="text-ccd-accent">{repo.branch}</span>
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
                            {new Date(d.created_at).toLocaleString()}
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
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
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
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
