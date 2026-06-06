import React, { useState, useCallback } from 'react'
import api from '../services/api'
import Step01Setup from '../components/Deployment/Step01Setup'
import Step02Config from '../components/Deployment/Step02Config'
import Step03Review from '../components/Deployment/Step03Review'
import DeploymentAccordion from '../components/Deployment/DeploymentAccordion'
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

export default function Deployment() {
  const [currentStep, setCurrentStep]         = useState(1)
  const [formData, setFormData]               = useState<FormData>(INIT_DATA)
  const [submitting, setSubmitting]           = useState(false)
  const [activeDeployment, setActiveDeployment] = useState<DeploymentType | null>(null)
  const { showToast }                         = useToast()

  const updateData = (patch: Partial<FormData>) => setFormData(prev => ({ ...prev, ...patch }))

  const canNext = () => {
    if (currentStep === 1) return formData.environment_id !== null && formData.repositories.length > 0
    if (currentStep === 2) return true
    return false
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
      showToast('Deployment triggered successfully!', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Deployment failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const refreshDeployment = useCallback(async () => {
    if (!activeDeployment?.id) return
    try {
      const res = await api.get(`/deployments/${activeDeployment.id}`)
      setActiveDeployment(res.data)
    } catch (e) { /* silent */ }
  }, [activeDeployment?.id])

  const handleReset = () => {
    setFormData(INIT_DATA)
    setCurrentStep(1)
    setActiveDeployment(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex gap-6">
        {/* Left — Form Panel */}
        <div className={`flex-1 min-w-0 ${activeDeployment ? 'max-w-[55%]' : ''}`}>
          {/* Stepper header */}
          <div className="ccd-card p-5 mb-5">
            <StepIndicator current={currentStep} steps={STEPS} />
          </div>

          {/* Step content */}
          <div className="ccd-card p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-ccd-border">
              <div className="w-8 h-8 rounded-lg bg-ccd-accent/20 border border-ccd-accent/30 flex items-center justify-center font-mono text-xs font-bold text-ccd-accent">
                0{currentStep}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ccd-text">{STEPS[currentStep - 1].title}</h2>
                <p className="text-xs text-ccd-text-muted">{STEPS[currentStep - 1].subtitle}</p>
              </div>
            </div>

            {currentStep === 1 && <Step01Setup data={formData} onChange={updateData} />}
            {currentStep === 2 && <Step02Config data={formData} onChange={updateData} />}
            {currentStep === 3 && <Step03Review data={formData} />}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-ccd-border">
              <button
                onClick={() => currentStep > 1 ? setCurrentStep(s => s - 1) : null}
                disabled={currentStep === 1}
                className="ccd-btn-secondary"
              >
                ← Back
              </button>

              <div className="flex gap-3">
                {currentStep < 3 ? (
                  <button
                    onClick={() => setCurrentStep(s => s + 1)}
                    disabled={!canNext()}
                    className="ccd-btn-primary"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleExecute}
                    disabled={submitting}
                    id="execute-deploy-btn"
                    className="ccd-btn-primary bg-gradient-to-r from-ccd-accent to-ccd-cyan hover:opacity-90"
                  >
                    {submitting ? (
                      <><div className="spinner w-4 h-4" />Executing...</>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Execute Deployment
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Accordion Tracker */}
        {activeDeployment && (
          <div className="w-[45%] shrink-0 animate-slide-up">
            <div className="ccd-card p-5 sticky top-6">
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm font-semibold text-ccd-text flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-accent">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                  Deployment Progress
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-ccd-text-muted hover:text-ccd-text transition-colors"
                >
                  + New
                </button>
              </div>
              <DeploymentAccordion
                deployment={activeDeployment}
                onRefresh={refreshDeployment}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
