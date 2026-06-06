import React, { createContext, useContext, useState, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: ToastType = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, type, message, duration }])

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const typeConfigs = {
    success: {
      borderColor: 'border-ccd-success/30',
      shadowColor: 'shadow-[0_8px_32px_rgba(34,197,94,0.15)]',
      progressColor: 'bg-ccd-success',
      iconColor: 'text-ccd-success',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
          <polyline points="20 6 9 17 5 12" />
        </svg>
      ),
    },
    error: {
      borderColor: 'border-ccd-danger/30',
      shadowColor: 'shadow-[0_8px_32px_rgba(239,68,68,0.15)]',
      progressColor: 'bg-ccd-danger',
      iconColor: 'text-ccd-danger',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    warning: {
      borderColor: 'border-ccd-warning/30',
      shadowColor: 'shadow-[0_8px_32px_rgba(245,158,11,0.15)]',
      progressColor: 'bg-ccd-warning',
      iconColor: 'text-ccd-warning',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
          <polygon points="12 2 22 21 2 21" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    info: {
      borderColor: 'border-ccd-info/30',
      shadowColor: 'shadow-[0_8px_32px_rgba(139,92,246,0.15)]',
      progressColor: 'bg-ccd-info',
      iconColor: 'text-ccd-info',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
  }

  const config = typeConfigs[toast.type]

  return (
    <div
      className={`pointer-events-auto w-full relative overflow-hidden rounded-xl border bg-ccd-surface/90 backdrop-blur-md p-4 flex gap-3 items-start animate-slide-down transition-all duration-300 ${config.borderColor} ${config.shadowColor}`}
    >
      {/* Icon */}
      <div className={`shrink-0 ${config.iconColor}`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm text-ccd-text font-medium leading-5">{toast.message}</p>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="shrink-0 text-ccd-text-muted hover:text-ccd-text transition-colors p-0.5 rounded-lg hover:bg-ccd-muted/30"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Shrinking progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-1 toast-progress ${config.progressColor}`}
        style={{
          animationDuration: `${toast.duration}ms`,
        }}
      />
    </div>
  )
}
