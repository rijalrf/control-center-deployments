import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import { User } from '../types'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../utils/errors'

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" style={{ marginTop: 0 }}>
      <div className="ccd-card w-full max-w-md mx-4 rounded-2xl border border-ccd-border shadow-2xl animate-slide-down">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ccd-border">
          <h3 className="text-sm font-semibold text-ccd-text">{title}</h3>
          <button onClick={onClose} className="ccd-btn-ghost p-1.5 rounded-lg" id="close-modal-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ marginTop: 0 }}>
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
            <button onClick={onCancel} className="ccd-btn-secondary flex-1" id="cancel-delete-btn">Cancel</button>
            <button onClick={onConfirm} className="ccd-btn-danger flex-1" id="confirm-delete-btn">Delete</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Users() {
  const [users, setUsers]           = useState<User[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [delTarget, setDelTarget]   = useState<User | null>(null)
  const [saving, setSaving]         = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError]           = useState('')
  const { showToast }               = useToast()
  const { user: currentUser }       = useAuth()

  const [form, setForm] = useState({
    login: '',
    name: '',
    email: '',
    avatar_url: '',
    password: '',
    github_id: ''
  })

  const fetchUsers = () => {
    setLoading(true)
    api.get('/users')
      .then(res => setUsers(res.data))
      .catch(err => showToast(getApiErrorMessage(err, 'Failed to fetch users'), 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const startAdd = () => {
    setForm({
      login: '',
      name: '',
      email: '',
      avatar_url: '',
      password: '',
      github_id: ''
    })
    setError('')
    setEditTarget(null)
    setShowModal(true)
  }

  const startEdit = (user: User) => {
    setForm({
      login: user.login || '',
      name: user.name || '',
      email: user.email || '',
      avatar_url: user.avatar_url || '',
      password: '',
      github_id: user.github_id || ''
    })
    setError('')
    setEditTarget(user)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload: any = {
        login: form.login,
        name: form.name || null,
        email: form.email || null,
        avatar_url: form.avatar_url || null,
        github_id: form.github_id || null,
      }

      if (form.password) {
        payload.password = form.password
      } else if (!editTarget) {
        setError('Password is required for new users')
        setSaving(false)
        return
      }

      if (editTarget) {
        await api.put(`/users/${editTarget.id}`, payload)
        showToast(`User "${form.login}" updated successfully!`, 'success')
      } else {
        await api.post('/users', payload)
        showToast(`User "${form.login}" added successfully!`, 'success')
      }

      setShowModal(false)
      setEditTarget(null)
      fetchUsers()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to save user'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await api.delete(`/users/${delTarget.id}`)
      showToast(`User "${delTarget.login}" deleted successfully!`, 'success')
      setDelTarget(null)
      fetchUsers()
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to delete user'), 'error')
    }
  }

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase()
    return (
      (u.login || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.github_id || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ccd-text-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search users by name, username, email..."
            className="ccd-input pl-10"
            id="search-users-input"
          />
        </div>
        <button
          onClick={startAdd}
          className="ccd-btn-primary text-xs px-4 py-2 shrink-0"
          id="add-user-btn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="ccd-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="spinner w-8 h-8" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-12 h-12 text-ccd-text-muted mx-auto mb-3">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <p className="text-ccd-text-muted text-sm font-medium">No users found</p>
            <p className="text-ccd-text-muted text-xs mt-1">Try refining your search or add a new user administrator.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ccd-table">
              <thead>
                <tr>
                  <th>User / Administrator</th>
                  <th>Email Address</th>
                  <th>GitHub ID</th>
                  <th>Date Created</th>
                  <th className="w-24 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const isSelf = currentUser && currentUser.id === u.id
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar_url || `https://github.com/${u.login}.png`}
                            alt={u.login}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || u.login}`
                            }}
                            className="w-10 h-10 rounded-full border border-ccd-border bg-ccd-muted object-cover"
                          />
                          <div>
                            <div className="font-semibold text-ccd-text text-sm flex items-center gap-1.5">
                              {u.name || u.login}
                              {isSelf && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-ccd-accent/20 text-ccd-accent border border-ccd-accent/30">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-ccd-text-muted font-mono">@{u.login}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-ccd-text-dim">
                          {u.email || <em className="opacity-40">No email</em>}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs badge-muted">
                          {u.github_id || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-ccd-text-muted">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : '—'}
                        </span>
                      </td>
                      <td className="pr-6">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => startEdit(u)}
                            className="ccd-btn-ghost p-1.5 rounded-lg"
                            title="Edit User"
                            id={`edit-user-${u.id}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-accent">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDelTarget(u)}
                            disabled={!!isSelf}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSelf
                                ? 'opacity-35 cursor-not-allowed text-ccd-text-muted'
                                : 'hover:bg-ccd-danger/10 text-ccd-danger'
                            }`}
                            title={isSelf ? "You cannot delete your own account" : "Delete User"}
                            id={`delete-user-${u.id}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <polyline points="9 6 9 4 15 4 15 6" />
                            </svg>
                          </button>
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

      {/* Add / Edit User Modal */}
      {(showModal) && (
        <Modal
          title={editTarget ? `Edit User: ${editTarget.login}` : "Add New Administrator"}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Username (Login) *</label>
              <input
                type="text"
                value={form.login}
                onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                className="ccd-input font-mono"
                placeholder="e.g. johndoe"
                required
                disabled={!!editTarget}
                id="user-form-username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="ccd-input"
                placeholder="e.g. John Doe"
                id="user-form-name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="ccd-input"
                placeholder="e.g. john@example.com"
                id="user-form-email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">Avatar URL</label>
              <input
                type="url"
                value={form.avatar_url}
                onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                className="ccd-input"
                placeholder="https://example.com/avatar.png"
                id="user-form-avatar"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">
                Password {editTarget ? '(Leave blank to keep current)' : '*'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="ccd-input"
                placeholder={editTarget ? '••••••••' : 'Enter secure password'}
                required={!editTarget}
                minLength={6}
                id="user-form-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ccd-text-muted mb-1.5">GitHub ID (Optional)</label>
              <input
                type="text"
                value={form.github_id}
                onChange={e => setForm(f => ({ ...f, github_id: e.target.value }))}
                className="ccd-input font-mono"
                placeholder="e.g. 12345678"
                id="user-form-github"
              />
              <span className="text-[10px] text-ccd-text-muted mt-1 block">
                Required only if linking login with GitHub OAuth.
              </span>
            </div>

            {error && <div className="text-xs text-ccd-danger" id="user-form-error">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditTarget(null); }}
                className="ccd-btn-secondary flex-1"
                id="user-form-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="ccd-btn-primary flex-1"
                id="user-form-submit"
              >
                {saving ? (
                  <><div className="spinner w-4 h-4" />Saving...</>
                ) : (
                  editTarget ? 'Save Changes' : 'Create User'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {delTarget && (
        <ConfirmModal
          message={`Are you sure you want to delete administrator "${delTarget.name || delTarget.login}"? This action is permanent and cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  )
}
