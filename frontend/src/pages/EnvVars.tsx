import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

interface EnvVar {
  id: number
  name: string
  repository_name: string
  environment_id: number | null
  vars: Record<string, string>
  environment?: { id: number; name: string; color: string }
  created_at: string
}

interface Environment {
  id: number
  name: string
  color: string
}

// ── Key-Value Editor ──────────────────────────────────────────
function KVEditor({
  vars,
  onChange,
}: {
  vars: Record<string, string>
  onChange: (v: Record<string, string>) => void
}) {
  const [rows, setRows] = useState<{ key: string; value: string; visible: boolean }[]>(() =>
    Object.entries(vars).map(([key, value]) => ({ key, value, visible: false }))
  )

  const sync = (newRows: typeof rows) => {
    setRows(newRows)
    const obj: Record<string, string> = {}
    newRows.forEach(r => { if (r.key.trim()) obj[r.key.trim()] = r.value })
    onChange(obj)
  }

  const addRow = () => sync([...rows, { key: '', value: '', visible: false }])

  const updateRow = (i: number, field: 'key' | 'value', val: string) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
    sync(next)
  }

  const removeRow = (i: number) => sync(rows.filter((_, idx) => idx !== i))

  const toggleVisible = (i: number) => {
    setRows(rows.map((r, idx) => idx === i ? { ...r, visible: !r.visible } : r))
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text')
    if (!text.includes('=')) return
    e.preventDefault()
    const parsed = text.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=')
        return { key: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim(), visible: false }
      })
      .filter(r => r.key)
    if (parsed.length > 0) sync([...rows.filter(r => r.key), ...parsed])
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 px-1 mb-1">
        <span className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider">Key</span>
        <span className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider">Value</span>
        <span />
        <span />
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center group">
            <input
              type="text"
              value={row.key}
              onChange={e => updateRow(i, 'key', e.target.value)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="ccd-input font-mono text-xs py-2"
              placeholder="KEY_NAME"
              spellCheck={false}
            />
            <div className="relative">
              <input
                type={row.visible ? 'text' : 'password'}
                value={row.value}
                onChange={e => updateRow(i, 'value', e.target.value)}
                className="ccd-input font-mono text-xs py-2 pr-8 w-full"
                placeholder="value"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => toggleVisible(i)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ccd-text-muted hover:text-ccd-text"
                tabIndex={-1}
              >
                {row.visible ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleVisible(i)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="p-1.5 rounded hover:bg-ccd-danger/10 text-ccd-text-muted hover:text-ccd-danger transition-all"
              tabIndex={-1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full py-2 border border-dashed border-ccd-border rounded-lg text-xs text-ccd-text-muted hover:text-ccd-accent hover:border-ccd-accent/40 transition-all"
      >
        + Add Variable
      </button>

      <p className="text-xs text-ccd-text-muted opacity-60">
        💡 Tip: Paste isi file <code>.env</code> langsung di field KEY pertama
      </p>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────
function EnvModal({
  title,
  initial,
  envs,
  onSave,
  onClose,
}: {
  title: string
  initial?: Partial<EnvVar>
  envs: Environment[]
  onSave: (data: any) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    repository_name: initial?.repository_name || '',
    environment_id: initial?.environment_id?.toString() || '',
    vars: initial?.vars || {} as Record<string, string>,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({
        ...form,
        environment_id: form.environment_id ? parseInt(form.environment_id) : null,
      })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="ccd-card w-full max-w-2xl mx-4 rounded-2xl border border-ccd-border shadow-2xl animate-slide-down flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ccd-border shrink-0">
          <h3 className="text-sm font-semibold text-ccd-text">{title}</h3>
          <button onClick={onClose} className="ccd-btn-ghost p-1.5 rounded-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Label *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="ccd-input"
                  placeholder="my-app Production"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Repository</label>
                <input
                  type="text"
                  value={form.repository_name}
                  onChange={e => setForm(f => ({ ...f, repository_name: e.target.value }))}
                  className="ccd-input font-mono"
                  placeholder="my-app"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Environment</label>
              <select
                value={form.environment_id}
                onChange={e => setForm(f => ({ ...f, environment_id: e.target.value }))}
                className="ccd-select"
              >
                <option value="">— None —</option>
                {envs.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-2">Variables</label>
              <KVEditor vars={form.vars} onChange={v => setForm(f => ({ ...f, vars: v }))} />
            </div>

            {error && <div className="text-xs text-ccd-danger bg-ccd-danger/10 px-3 py-2 rounded-lg">{error}</div>}
          </div>

          <div className="px-6 py-4 border-t border-ccd-border flex gap-3 shrink-0">
            <button type="button" onClick={onClose} className="ccd-btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="ccd-btn-primary flex-1">
              {saving ? <><div className="spinner w-4 h-4" />Saving...</> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── View Modal (read-only .env preview) ───────────────────────
function ViewModal({ item, onClose }: { item: EnvVar; onClose: () => void }) {
  const { showToast } = useToast()
  const content = Object.entries(item.vars).map(([k, v]) => `${k}=${v}`).join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    showToast('Copied to clipboard!', 'success')
  }

  const handleDownload = async () => {
    try {
      const res = await api.get(`/env-vars/${item.id}/export`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `.env.${item.repository_name || item.name}`
      a.click()
      window.URL.revokeObjectURL(url)
      showToast('Downloaded!', 'success')
    } catch {
      showToast('Download failed', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="ccd-card w-full max-w-2xl mx-4 rounded-2xl border border-ccd-border shadow-2xl animate-slide-down">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ccd-border">
          <div>
            <h3 className="text-sm font-semibold text-ccd-text">{item.name}</h3>
            <p className="text-xs text-ccd-text-muted font-mono mt-0.5">.env preview</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="ccd-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </button>
            <button onClick={handleDownload} className="ccd-btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download .env
            </button>
            <button onClick={onClose} className="ccd-btn-ghost p-1.5 rounded-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">
          <pre className="bg-ccd-bg rounded-xl p-4 text-xs font-mono text-ccd-text leading-relaxed overflow-auto max-h-96 border border-ccd-border">
            {content || '# No variables defined'}
          </pre>
          <div className="mt-3 flex items-center gap-2 text-xs text-ccd-text-muted">
            <span className="badge-muted">{Object.keys(item.vars).length} variables</span>
            {item.environment && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.environment.color }} />
                {item.environment.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function EnvVars() {
  const [items, setItems] = useState<EnvVar[]>([])
  const [envs, setEnvs] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEnv, setFilterEnv] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<EnvVar | null>(null)
  const [viewItem, setViewItem] = useState<EnvVar | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EnvVar | null>(null)
  const { showToast } = useToast()

  const fetch = () => {
    setLoading(true)
    Promise.all([api.get('/env-vars'), api.get('/environments')])
      .then(([ev, en]) => { setItems(ev.data); setEnvs(en.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handleCreate = async (data: any) => {
    await api.post('/env-vars', data)
    showToast('Env vars created!', 'success')
    fetch()
  }

  const handleEdit = async (data: any) => {
    await api.put(`/env-vars/${editItem!.id}`, data)
    showToast('Env vars updated!', 'success')
    fetch()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/env-vars/${deleteTarget.id}`)
      showToast(`"${deleteTarget.name}" deleted.`, 'success')
      setDeleteTarget(null)
      fetch()
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  const filtered = items.filter(it => {
    const matchSearch = !search || it.name.toLowerCase().includes(search.toLowerCase()) || it.repository_name.toLowerCase().includes(search.toLowerCase())
    const matchEnv = !filterEnv || it.environment_id?.toString() === filterEnv
    return matchSearch && matchEnv
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Modals */}
      {showCreate && (
        <EnvModal title="New Env Variables" envs={envs} onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      {editItem && (
        <EnvModal title={`Edit — ${editItem.name}`} initial={editItem} envs={envs} onSave={handleEdit} onClose={() => setEditItem(null)} />
      )}
      {viewItem && (
        <ViewModal item={viewItem} onClose={() => setViewItem(null)} />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="ccd-card w-full max-w-sm mx-4 rounded-2xl border border-ccd-danger/30 animate-slide-down">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-ccd-danger/15 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ccd-danger">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-ccd-text mb-2">Delete Env Vars</h3>
              <p className="text-xs text-ccd-text-muted mb-6">Delete <strong>"{deleteTarget.name}"</strong>? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="ccd-btn-secondary flex-1">Cancel</button>
                <button onClick={handleDelete} className="ccd-btn-danger flex-1">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ccd-text">Env Variables</h2>
          <p className="text-sm text-ccd-text-muted mt-1">Kelola file .env per repository & environment</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="ccd-btn-primary flex items-center gap-2" id="new-env-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Env File
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ccd-text-muted">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ccd-input pl-9"
            placeholder="Search by name or repo..."
          />
        </div>
        <select value={filterEnv} onChange={e => setFilterEnv(e.target.value)} className="ccd-select w-48">
          <option value="">All Environments</option>
          {envs.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner w-6 h-6" /></div>
      ) : filtered.length === 0 ? (
        <div className="ccd-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-ccd-muted/30 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-8 h-8 text-ccd-text-muted">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" />
            </svg>
          </div>
          <p className="text-sm font-medium text-ccd-text mb-1">
            {search || filterEnv ? 'Tidak ada hasil' : 'Belum ada env vars'}
          </p>
          <p className="text-xs text-ccd-text-muted mb-4">
            {search || filterEnv ? 'Coba ubah filter pencarian' : 'Buat env vars baru untuk mulai'}
          </p>
          {!search && !filterEnv && (
            <button onClick={() => setShowCreate(true)} className="ccd-btn-primary text-xs">
              + New Env File
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="ccd-card px-5 py-4 hover:border-ccd-border/80 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-ccd-accent/10 border border-ccd-accent/20 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-accent">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-ccd-text truncate">{item.name}</span>
                      {item.repository_name && (
                        <span className="badge-muted font-mono text-xs">{item.repository_name}</span>
                      )}
                      {item.environment && (
                        <span className="flex items-center gap-1 text-xs text-ccd-text-muted">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.environment.color }} />
                          {item.environment.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-ccd-text-muted">
                        <span className="font-semibold text-ccd-cyan">{Object.keys(item.vars).length}</span> variables
                      </span>
                      <span className="text-xs text-ccd-text-muted opacity-60">
                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setViewItem(item)}
                    className="ccd-btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
                    title="Preview .env"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    Preview
                  </button>
                  <button
                    onClick={() => setEditItem(item)}
                    className="ccd-btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
                    title="Edit"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="ccd-btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5 hover:text-ccd-danger hover:bg-ccd-danger/10"
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
