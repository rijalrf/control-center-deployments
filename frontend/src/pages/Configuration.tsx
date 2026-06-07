import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { Environment, Server } from '../types'
import { useToast } from '../context/ToastContext'

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="ccd-card w-full max-w-md mx-4 rounded-2xl border border-ccd-border shadow-2xl animate-slide-down">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ccd-border">
          <h3 className="text-sm font-semibold text-ccd-text">{title}</h3>
          <button onClick={onClose} className="ccd-btn-ghost p-1.5 rounded-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="ccd-card w-full max-w-sm mx-4 rounded-2xl border border-ccd-danger/30 animate-slide-down">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-ccd-danger/15 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ccd-danger">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-ccd-text mb-2">Confirm Delete</h3>
          <p className="text-xs text-ccd-text-muted mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="ccd-btn-secondary flex-1">Cancel</button>
            <button onClick={onConfirm} className="ccd-btn-danger flex-1">Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Environments Section ──────────────────────────────────────
function EnvironmentsSection() {
  const [envs, setEnvs]           = useState<Environment[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [delTarget, setDelTarget] = useState<Environment | null>(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ name: '', slug: '', description: '', color: '#06b6d4' })
  const [error, setError]         = useState('')
  const { showToast }             = useToast()

  const fetch = () => {
    setLoading(true)
    api.get('/environments')
      .then(r => setEnvs(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/environments', form)
      showToast(`Environment "${form.name}" created successfully!`, 'success')
      setForm({ name: '', slug: '', description: '', color: '#06b6d4' })
      setShowModal(false)
      fetch()
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to create environment'
      setError(errMsg)
      showToast(errMsg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await api.delete(`/environments/${delTarget.id}`)
      showToast(`Environment "${delTarget.name}" deleted successfully.`, 'success')
      setDelTarget(null)
      fetch()
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to delete environment', 'error')
    }
  }

  const autoSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const PRESET_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#3b82f6', '#ec4899']

  return (
    <div>
      {delTarget && (
        <ConfirmModal
          message={`Delete environment "${delTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}

      {showModal && (
        <Modal title="Add Environment" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))}
                className="ccd-input"
                placeholder="Production"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className="ccd-input font-mono"
                placeholder="production"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="ccd-input"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-7 h-7 rounded-full border border-ccd-border cursor-pointer bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>
            {error && <div className="text-xs text-ccd-danger">{error}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="ccd-btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="ccd-btn-primary flex-1">
                {saving ? <><div className="spinner w-4 h-4" />Saving...</> : 'Add Environment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="ccd-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ccd-border">
          <div className="text-sm font-semibold text-ccd-text">Environments</div>
          <button onClick={() => setShowModal(true)} className="ccd-btn-primary text-xs px-3 py-1.5" id="add-env-btn">
            + Add Environment
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner w-6 h-6" /></div>
        ) : envs.length === 0 ? (
          <div className="text-center py-12 text-sm text-ccd-text-muted">No environments yet.</div>
        ) : (
          <table className="ccd-table">
            <thead>
              <tr><th>Name</th><th>Slug</th><th>Servers</th><th>Description</th><th></th></tr>
            </thead>
            <tbody>
              {envs.map(env => (
                <tr key={env.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: env.color }} />
                      <span className="text-sm font-medium text-ccd-text">{env.name}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs badge-muted">{env.slug}</span></td>
                  <td><span className="text-xs text-ccd-text-muted">{env.servers?.length || 0}</span></td>
                  <td><span className="text-xs text-ccd-text-muted truncate max-w-[180px] block">{env.description || '—'}</span></td>
                  <td>
                    <button onClick={() => setDelTarget(env)} className="ccd-btn-ghost p-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-danger">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Servers Section ───────────────────────────────────────────
function ServersSection() {
  const [servers, setServers]     = useState<Server[]>([])
  const [envs, setEnvs]           = useState<Environment[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [delTarget, setDelTarget] = useState<Server | null>(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ name: '', host: '', port: '22', username: '', environment_id: '' })
  const [error, setError]         = useState('')
  const { showToast }             = useToast()

  const fetch = () => {
    setLoading(true)
    Promise.all([api.get('/servers'), api.get('/environments')])
      .then(([s, e]) => { setServers(s.data); setEnvs(e.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/servers', { ...form, port: parseInt(form.port, 10), environment_id: form.environment_id ? parseInt(form.environment_id, 10) : null })
      showToast(`Server "${form.name}" added successfully!`, 'success')
      setForm({ name: '', host: '', port: '22', username: '', environment_id: '' })
      setShowModal(false)
      fetch()
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to add server'
      setError(errMsg)
      showToast(errMsg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await api.delete(`/servers/${delTarget.id}`)
      showToast(`Server "${delTarget.name}" deleted successfully.`, 'success')
      setDelTarget(null)
      fetch()
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to delete server', 'error')
    }
  }

  const STATUS_COLORS: Record<string, string> = { active: 'badge-success', inactive: 'badge-danger', unknown: 'badge-muted' }

  return (
    <div>
      {delTarget && (
        <ConfirmModal
          message={`Delete server "${delTarget.name}" (${delTarget.host})? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}

      {showModal && (
        <Modal title="Add Server" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Server Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="ccd-input" placeholder="prod-server-01" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Host / IP *</label>
                <input type="text" value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} className="ccd-input font-mono" placeholder="192.168.1.100" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Port</label>
                <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} className="ccd-input font-mono" placeholder="22" min="1" max="65535" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">SSH Username</label>
              <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="ccd-input font-mono" placeholder="deploy" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Environment</label>
              <select value={form.environment_id} onChange={e => setForm(f => ({ ...f, environment_id: e.target.value }))} className="ccd-select">
                <option value="">— None —</option>
                {envs.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            {error && <div className="text-xs text-ccd-danger">{error}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="ccd-btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="ccd-btn-primary flex-1">
                {saving ? <><div className="spinner w-4 h-4" />Saving...</> : 'Add Server'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="ccd-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ccd-border">
          <div className="text-sm font-semibold text-ccd-text">Servers</div>
          <button onClick={() => setShowModal(true)} className="ccd-btn-primary text-xs px-3 py-1.5" id="add-server-btn">
            + Add Server
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner w-6 h-6" /></div>
        ) : servers.length === 0 ? (
          <div className="text-center py-12 text-sm text-ccd-text-muted">No servers configured yet.</div>
        ) : (
          <table className="ccd-table">
            <thead>
              <tr><th>Name</th><th>Host</th><th>Username</th><th>Environment</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {servers.map(srv => (
                <tr key={srv.id}>
                  <td><span className="text-sm font-medium text-ccd-text">{srv.name}</span></td>
                  <td>
                    <div className="font-mono text-xs text-ccd-text-dim">
                      {srv.host}<span className="text-ccd-text-muted">:{srv.port}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs text-ccd-text-muted">{srv.username || '—'}</span></td>
                  <td>
                    {srv.environment ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: srv.environment.color }} />
                        <span className="text-xs">{srv.environment.name}</span>
                      </div>
                    ) : <span className="text-xs text-ccd-text-muted">—</span>}
                  </td>
                  <td><span className={STATUS_COLORS[srv.status] || 'badge-muted'}>{srv.status}</span></td>
                  <td>
                    <button onClick={() => setDelTarget(srv)} className="ccd-btn-ghost p-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-danger">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Main Configuration Page ───────────────────────────────────
export default function Configuration() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-ccd-text">Infrastructure Configuration</h2>
        <p className="text-sm text-ccd-text-muted mt-1">Manage deployment environments and server infrastructure</p>
      </div>
      <EnvironmentsSection />
      <ServersSection />
    </div>
  )
}
