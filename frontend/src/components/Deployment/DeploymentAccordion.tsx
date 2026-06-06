import React, { useState, useEffect } from 'react'
import { Deployment, DeploymentStep } from '../../types'

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    badgeClass: 'badge-muted',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-text-muted">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    dotClass: 'bg-ccd-text-muted',
    headerClass: 'border-ccd-border bg-ccd-surface',
  },
  running: {
    label: 'Running',
    badgeClass: 'badge-accent',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-accent animate-spin-slow">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    dotClass: 'bg-ccd-accent animate-pulse',
    headerClass: 'border-ccd-accent/30 bg-ccd-accent/5',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'badge-success',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-ccd-success">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
    dotClass: 'bg-ccd-success',
    headerClass: 'border-ccd-border bg-ccd-surface hover:bg-ccd-muted/20',
  },
  failed: {
    label: 'Failed',
    badgeClass: 'badge-danger',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-danger">
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
    dotClass: 'bg-ccd-danger',
    headerClass: 'border-ccd-danger/30 bg-ccd-danger/5',
  },
  skipped: {
    label: 'Skipped',
    badgeClass: 'badge-muted',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-text-muted">
        <path d="M5 4l15 8-15 8V4z" />
        <line x1="19" y1="4" x2="19" y2="20" />
      </svg>
    ),
    dotClass: 'bg-ccd-text-muted',
    headerClass: 'border-ccd-border bg-ccd-surface opacity-60',
  },
}

function StepDetail({ step }: { step: DeploymentStep }) {
  const detail = step.detail || {}

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Step metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="ccd-card p-3">
          <div className="text-xs text-ccd-text-muted mb-1">Step</div>
          <div className="font-mono text-sm text-ccd-accent">0{step.step_number}</div>
        </div>
        <div className="ccd-card p-3">
          <div className="text-xs text-ccd-text-muted mb-1">Started</div>
          <div className="font-mono text-xs text-ccd-text-dim">
            {step.started_at ? new Date(step.started_at).toLocaleTimeString() : '—'}
          </div>
        </div>
        <div className="ccd-card p-3">
          <div className="text-xs text-ccd-text-muted mb-1">Completed</div>
          <div className="font-mono text-xs text-ccd-text-dim">
            {step.completed_at ? new Date(step.completed_at).toLocaleTimeString() : '—'}
          </div>
        </div>
      </div>

      {/* Step 1 — Setup Detail */}
      {step.step_number === 1 && (
        <div className="space-y-3">
          {detail.environment_id && (
            <div className="ccd-card p-4">
              <div className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-2">
                Target Environment
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-ccd-accent" />
                <span className="text-sm text-ccd-text font-medium">Environment ID: {detail.environment_id}</span>
              </div>
            </div>
          )}
          {detail.repositories?.length > 0 && (
            <div className="ccd-card p-4">
              <div className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-3">
                Selected Repositories ({detail.repositories.length})
              </div>
              <div className="space-y-2">
                {detail.repositories.map((repo: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-ccd-muted/30">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-ccd-text-muted shrink-0">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    <span className="font-mono text-xs text-ccd-text-dim">
                      {repo.full_name || repo.name || repo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Configuration Detail */}
      {step.step_number === 2 && detail.config && (
        <div className="ccd-card p-4">
          <div className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-3">
            Configuration Variables
          </div>
          {Object.keys(detail.config).length === 0 ? (
            <div className="text-xs text-ccd-text-muted italic">No configuration variables set</div>
          ) : (
            Object.entries(detail.config).map(([repoName, vars]: [string, any]) => (
              <div key={repoName} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ccd-cyan" />
                  <span className="text-xs font-semibold text-ccd-cyan font-mono">{repoName}</span>
                </div>
                <div className="bg-ccd-bg rounded-lg border border-ccd-border overflow-hidden">
                  {vars && Object.entries(vars).map(([key, val]: [string, any], i) => (
                    <div key={key} className={`flex items-start gap-0 text-xs font-mono ${i < Object.entries(vars).length - 1 ? 'border-b border-ccd-border/50' : ''}`}>
                      <span className="px-3 py-2 text-ccd-warning min-w-[160px] bg-ccd-muted/20 border-r border-ccd-border/50">{key}</span>
                      <span className="px-3 py-2 text-ccd-text-dim break-all">{val || <em className="opacity-40">empty</em>}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Step 3 — Review Detail */}
      {step.step_number === 3 && (
        <div className="ccd-card p-4">
          <div className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-3">
            Execution Summary
          </div>
          {step.status === 'pending' ? (
            <div className="flex items-center gap-2 text-sm text-ccd-text-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Awaiting previous steps to complete
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-success">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-sm text-ccd-text">All parameters validated</span>
              </div>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-success">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-sm text-ccd-text">Deployment record created</span>
              </div>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-success">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-sm text-ccd-text">Pipeline triggered successfully</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log output */}
      {step.log && (
        <div className="ccd-card p-4">
          <div className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-2">Output Log</div>
          <pre className="text-xs font-mono text-ccd-text-dim bg-ccd-bg rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {step.log}
          </pre>
        </div>
      )}
    </div>
  )
}

function AccordionItem({ step, defaultOpen }: { step: DeploymentStep; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const cfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending

  // Auto-expand running steps
  useEffect(() => {
    if (step.status === 'running') setOpen(true)
  }, [step.status])

  const canExpand = step.status !== 'pending' || step.step_number === 1

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${cfg.headerClass}`}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
        onClick={() => canExpand && setOpen(o => !o)}
        disabled={!canExpand}
      >
        {/* Step number */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
          step.status === 'completed' ? 'bg-ccd-success/20 text-ccd-success border border-ccd-success/30' :
          step.status === 'running'   ? 'bg-ccd-accent/20 text-ccd-accent border border-ccd-accent/30 animate-pulse' :
          step.status === 'failed'    ? 'bg-ccd-danger/20 text-ccd-danger border border-ccd-danger/30' :
          'bg-ccd-muted/40 text-ccd-text-muted border border-ccd-border'
        }`}>
          0{step.step_number}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ccd-text">{step.step_name}</span>
            <span className={`badge ${cfg.badgeClass}`}>
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          {step.started_at && (
            <div className="text-xs text-ccd-text-muted mt-0.5">
              Started {new Date(step.started_at).toLocaleTimeString()}
              {step.completed_at && ` · Completed ${new Date(step.completed_at).toLocaleTimeString()}`}
            </div>
          )}
        </div>

        {/* Chevron */}
        {canExpand && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`w-4 h-4 text-ccd-text-muted transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
        {!canExpand && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-text-muted shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className={`accordion-content ${open && canExpand ? 'open' : 'closed'}`}>
        <div className="px-5 pb-5">
          <div className="border-t border-ccd-border/50 pt-4">
            <StepDetail step={step} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface DeploymentAccordionProps {
  deployment: Deployment | null;
  onRefresh?: () => void;
}

export default function DeploymentAccordion({ deployment, onRefresh }: DeploymentAccordionProps) {
  const steps = deployment?.steps || []

  // Sort by step_number
  const sorted = [...steps].sort((a, b) => a.step_number - b.step_number)

  // Auto-refresh while running
  useEffect(() => {
    const hasRunning = steps.some(s => s.status === 'running' || s.status === 'pending')
    if (!hasRunning || !onRefresh) return
    const interval = setInterval(onRefresh, 3000)
    return () => clearInterval(interval)
  }, [steps, onRefresh])

  const overallStatus = deployment?.status || 'draft'
  const statusColors: Record<string, string> = {
    pending:   'text-ccd-warning',
    running:   'text-ccd-accent',
    success:   'text-ccd-success',
    failed:    'text-ccd-danger',
    cancelled: 'text-ccd-text-muted',
    draft:     'text-ccd-text-muted',
  }

  if (!deployment) return null

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ccd-text">
            Deployment #{deployment.id}
          </h3>
          <p className="text-xs text-ccd-text-muted mt-0.5">
            {new Date(deployment.created_at).toLocaleString()}
          </p>
        </div>
        <div className={`text-xs font-semibold uppercase tracking-wider ${statusColors[overallStatus] || 'text-ccd-text-muted'}`}>
          {overallStatus}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-ccd-muted/40 rounded-full h-1 mb-4">
        <div
          className="h-1 rounded-full bg-gradient-to-r from-ccd-accent to-ccd-cyan transition-all duration-700"
          style={{
            width: `${(sorted.filter(s => s.status === 'completed').length / (sorted.length || 3)) * 100}%`
          }}
        />
      </div>

      {/* Accordion items */}
      {sorted.map(step => (
        <AccordionItem
          key={step.id}
          step={step}
          defaultOpen={step.status === 'running' || step.status === 'completed'}
        />
      ))}

      {sorted.length === 0 && (
        <div className="text-center py-8 text-ccd-text-muted text-sm">
          No steps recorded
        </div>
      )}
    </div>
  )
}
