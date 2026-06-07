import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

interface EnvForm {
  NODE_ENV: string;
  BACKEND_PORT: string;
  FRONTEND_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_ROOT_PASSWORD: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_CALLBACK_URL: string;
  GITHUB_TOKEN: string;
  GITHUB_ORG: string;
  GITHUB_CENTRAL_OWNER: string;
  GITHUB_CENTRAL_REPO: string;
  GITHUB_CENTRAL_WORKFLOW: string;
  VITE_API_URL: string;
}

const DEFAULT_FORM: EnvForm = {
  NODE_ENV: 'development',
  BACKEND_PORT: '5000',
  FRONTEND_URL: 'http://localhost:3000',
  JWT_SECRET: '',
  JWT_EXPIRES_IN: '7d',
  DB_HOST: 'ccd-mysql',
  DB_PORT: '3306',
  DB_NAME: 'ccd_db',
  DB_USER: 'ccd_user',
  DB_PASSWORD: '',
  DB_ROOT_PASSWORD: '',
  GITHUB_CLIENT_ID: '',
  GITHUB_CLIENT_SECRET: '',
  GITHUB_CALLBACK_URL: 'http://localhost:5000/api/auth/github/callback',
  GITHUB_TOKEN: '',
  GITHUB_ORG: '',
  GITHUB_CENTRAL_OWNER: '',
  GITHUB_CENTRAL_REPO: 'control-center-deployments',
  GITHUB_CENTRAL_WORKFLOW: 'central-deploy.yml',
  VITE_API_URL: 'http://localhost:5000',
};

type ActiveTab = 'app' | 'database' | 'github-oauth' | 'github-pat' | 'central';

export default function EnvVars() {
  const [form, setForm] = useState<EnvForm>(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('app')
  const { showToast } = useToast()
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLoading(true)
    api.get('/env-vars/project-env/json')
      .then(res => {
        // Merge response with defaults to ensure all keys exist
        setForm(prev => ({
          ...prev,
          ...res.data
        }))
      })
      .catch(() => {
        showToast('Gagal memuat file .env project', 'error')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [showToast])

  const handleChange = (key: keyof EnvForm, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/env-vars/project-env/json', form)
      showToast('File .env project berhasil diperbarui!', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Gagal menyimpan file .env', 'error')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'app', label: 'App & Security', desc: 'Konfigurasi web panel dan enkripsi JWT' },
    { id: 'database', label: 'Database (MySQL)', desc: 'Koneksi database lokal MySQL container' },
    { id: 'github-oauth', label: 'GitHub OAuth App', desc: 'Pengaturan otentikasi login GitHub' },
    { id: 'github-pat', label: 'GitHub Access Token (PAT)', desc: 'Otorisasi API GitHub repositori & organisasi' },
    { id: 'central', label: 'Central Deployer', desc: 'Target repository runner pipeline GitHub Actions' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-ccd-text">Project Configuration (.env)</h2>
        <p className="text-sm text-ccd-text-muted mt-1">
          Edit variabel environment milik panel Control Center ini secara terpusat
        </p>
      </div>

      {/* Warning Alert Banner */}
      <div className="bg-ccd-warning/10 border border-ccd-warning/20 rounded-2xl p-4 flex gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-ccd-warning/15 flex items-center justify-center shrink-0 text-ccd-warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <h4 className="text-xs font-bold text-ccd-warning uppercase tracking-wider">Perhatian Penting</h4>
          <p className="text-xs text-ccd-text-muted mt-1 leading-relaxed">
            Menyimpan perubahan di bawah ini akan secara langsung memperbarui file <code>.env</code> di root folder server target. 
            Anda <strong>harus memulai ulang kontainer Docker</strong> (<code>docker compose restart</code>) agar perubahan parameter 
            seperti port, database, dan token GitHub dapat sepenuhnya diterapkan oleh sistem.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="ccd-card p-20 flex justify-center items-center">
          <div className="spinner w-8 h-8" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Left Side: Navigation Tabs */}
          <div className="space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-ccd-accent/10 border-ccd-accent/30 text-ccd-accent shadow-md shadow-ccd-accent/5'
                      : 'bg-ccd-surface/30 border-transparent text-ccd-text-muted hover:bg-ccd-surface/60 hover:text-ccd-text'
                  }`}
                >
                  <div className="text-xs font-bold">{tab.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5 truncate">{tab.desc}</div>
                </button>
              )
            })}
          </div>

          {/* Right Side: Tab Form Panel */}
          <div className="ccd-card p-6 space-y-6 flex flex-col justify-between min-h-[420px]">
            <div>
              {/* TAB 1: App & Security */}
              {activeTab === 'app' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ccd-text border-b border-ccd-border pb-3 mb-4">App & Security Configuration</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Node Environment</label>
                      <select
                        value={form.NODE_ENV}
                        onChange={e => handleChange('NODE_ENV', e.target.value)}
                        className="ccd-select"
                      >
                        <option value="development">development (Debug mode)</option>
                        <option value="production">production (Performance mode)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Backend Port</label>
                      <input
                        type="number"
                        value={form.BACKEND_PORT}
                        onChange={e => handleChange('BACKEND_PORT', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="5000"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Frontend App URL</label>
                    <input
                      type="url"
                      value={form.FRONTEND_URL}
                      onChange={e => handleChange('FRONTEND_URL', e.target.value)}
                      className="ccd-input font-mono"
                      placeholder="http://localhost:3000"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">JWT Secret Key</label>
                      <div className="relative">
                        <input
                          type={showSecrets['JWT_SECRET'] ? 'text' : 'password'}
                          value={form.JWT_SECRET}
                          onChange={e => handleChange('JWT_SECRET', e.target.value)}
                          className="ccd-input font-mono pr-10"
                          placeholder="Super secret signing token key"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecret('JWT_SECRET')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ccd-text-muted hover:text-ccd-text"
                        >
                          {showSecrets['JWT_SECRET'] ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">JWT Expires In</label>
                      <input
                        type="text"
                        value={form.JWT_EXPIRES_IN}
                        onChange={e => handleChange('JWT_EXPIRES_IN', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="7d"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Database Configuration */}
              {activeTab === 'database' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ccd-text border-b border-ccd-border pb-3 mb-4">MySQL Connection Settings</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Database Host</label>
                      <input
                        type="text"
                        value={form.DB_HOST}
                        onChange={e => handleChange('DB_HOST', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="ccd-mysql"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Database Port</label>
                      <input
                        type="number"
                        value={form.DB_PORT}
                        onChange={e => handleChange('DB_PORT', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="3306"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Database Name</label>
                      <input
                        type="text"
                        value={form.DB_NAME}
                        onChange={e => handleChange('DB_NAME', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="ccd_db"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Database Username</label>
                      <input
                        type="text"
                        value={form.DB_USER}
                        onChange={e => handleChange('DB_USER', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="ccd_user"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Database Password</label>
                      <div className="relative">
                        <input
                          type={showSecrets['DB_PASSWORD'] ? 'text' : 'password'}
                          value={form.DB_PASSWORD}
                          onChange={e => handleChange('DB_PASSWORD', e.target.value)}
                          className="ccd-input font-mono pr-10"
                          placeholder="Enter DB password"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecret('DB_PASSWORD')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ccd-text-muted hover:text-ccd-text"
                        >
                          {showSecrets['DB_PASSWORD'] ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">MySQL Root Password</label>
                      <div className="relative">
                        <input
                          type={showSecrets['DB_ROOT_PASSWORD'] ? 'text' : 'password'}
                          value={form.DB_ROOT_PASSWORD}
                          onChange={e => handleChange('DB_ROOT_PASSWORD', e.target.value)}
                          className="ccd-input font-mono pr-10"
                          placeholder="Enter root database password"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecret('DB_ROOT_PASSWORD')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ccd-text-muted hover:text-ccd-text"
                        >
                          {showSecrets['DB_ROOT_PASSWORD'] ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GitHub OAuth App */}
              {activeTab === 'github-oauth' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-ccd-border pb-3 mb-4">
                    <h3 className="text-sm font-semibold text-ccd-text">GitHub OAuth Application Settings</h3>
                    <a
                      href="https://github.com/settings/developers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-ccd-accent hover:underline flex items-center gap-1"
                    >
                      Buka GitHub Developer Settings ↗
                    </a>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">GitHub Client ID</label>
                    <input
                      type="text"
                      value={form.GITHUB_CLIENT_ID}
                      onChange={e => handleChange('GITHUB_CLIENT_ID', e.target.value)}
                      className="ccd-input font-mono"
                      placeholder="e.g. Iv23liv8FboWMVDbA4by"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">GitHub Client Secret</label>
                    <div className="relative">
                      <input
                        type={showSecrets['GITHUB_CLIENT_SECRET'] ? 'text' : 'password'}
                        value={form.GITHUB_CLIENT_SECRET}
                        onChange={e => handleChange('GITHUB_CLIENT_SECRET', e.target.value)}
                        className="ccd-input font-mono pr-10"
                        placeholder="Enter OAuth app client secret"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret('GITHUB_CLIENT_SECRET')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ccd-text-muted hover:text-ccd-text"
                      >
                        {showSecrets['GITHUB_CLIENT_SECRET'] ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">OAuth Authorization Callback URL</label>
                    <input
                      type="url"
                      value={form.GITHUB_CALLBACK_URL}
                      onChange={e => handleChange('GITHUB_CALLBACK_URL', e.target.value)}
                      className="ccd-input font-mono bg-ccd-bg/50 border-ccd-border/50 text-ccd-text-muted cursor-not-allowed"
                      placeholder="http://localhost:5000/api/auth/github/callback"
                      readOnly
                      title="Callback URL diatur permanen di internal backend"
                    />
                    <p className="text-[10px] text-ccd-text-muted mt-1 opacity-70">
                      💡 Callback URL ini didasarkan pada HOST backend utama (biasanya port 5000)
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: GitHub Personal Access Token */}
              {activeTab === 'github-pat' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-ccd-border pb-3 mb-4">
                    <h3 className="text-sm font-semibold text-ccd-text">Personal Access Token (PAT) Settings</h3>
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-ccd-accent hover:underline flex items-center gap-1"
                    >
                      Buat PAT Classic di GitHub ↗
                    </a>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">GitHub Personal Access Token (GITHUB_TOKEN)</label>
                    <div className="relative">
                      <input
                        type={showSecrets['GITHUB_TOKEN'] ? 'text' : 'password'}
                        value={form.GITHUB_TOKEN}
                        onChange={e => handleChange('GITHUB_TOKEN', e.target.value)}
                        className="ccd-input font-mono pr-10"
                        placeholder="e.g. ghp_..."
                        required
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret('GITHUB_TOKEN')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ccd-text-muted hover:text-ccd-text"
                      >
                        {showSecrets['GITHUB_TOKEN'] ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-ccd-text-muted mt-1 opacity-70">
                      🔑 Scope wajib: <code>repo</code>, <code>workflow</code>, <code>read:org</code>. Token digunakan untuk membaca repo dan men-dispatch Actions.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">GitHub Organization (Optional)</label>
                    <input
                      type="text"
                      value={form.GITHUB_ORG}
                      onChange={e => handleChange('GITHUB_ORG', e.target.value)}
                      className="ccd-input font-mono"
                      placeholder="Kosongkan jika menggunakan personal account"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: Central Deployer settings */}
              {activeTab === 'central' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ccd-text border-b border-ccd-border pb-3 mb-4">Centralized Deployer Workflow Settings</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">GitHub Central Owner</label>
                      <input
                        type="text"
                        value={form.GITHUB_CENTRAL_OWNER}
                        onChange={e => handleChange('GITHUB_CENTRAL_OWNER', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="Owner repository (e.g. rijalrf)"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">GitHub Central Repo</label>
                      <input
                        type="text"
                        value={form.GITHUB_CENTRAL_REPO}
                        onChange={e => handleChange('GITHUB_CENTRAL_REPO', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="control-center-deployments"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Workflow File Name</label>
                      <input
                        type="text"
                        value={form.GITHUB_CENTRAL_WORKFLOW}
                        onChange={e => handleChange('GITHUB_CENTRAL_WORKFLOW', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="central-deploy.yml"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ccd-text-muted mb-1.5">Vite Frontend API URL</label>
                      <input
                        type="url"
                        value={form.VITE_API_URL}
                        onChange={e => handleChange('VITE_API_URL', e.target.value)}
                        className="ccd-input font-mono"
                        placeholder="http://localhost:5000"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-4 border-t border-ccd-border/60 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="ccd-btn-primary px-6 py-2.5 flex items-center gap-1.5 text-xs font-bold"
              >
                {saving ? (
                  <>
                    <div className="spinner w-4 h-4 border-t-transparent animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                    </svg>
                    Simpan Perubahan .env
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
