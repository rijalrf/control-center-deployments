import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Environment, Repository } from '../../types'

interface Step01SetupProps {
  data: {
    environment_id: number | null;
    environment: Environment | null;
    repositories: Repository[];
  };
  onChange: (update: Partial<Step01SetupProps['data']>) => void;
  isValidated?: boolean;
  validationResults?: Record<number, {
    resolved_branch: string;
    desired_branch: string;
    exists: boolean;
    fallback_used: boolean;
    dockerfile_exists: boolean;
    docker_compose_exists: boolean;
  }>;
}

export default function Step01Setup({ data, onChange, isValidated = false, validationResults = {} }: Step01SetupProps) {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  
  // Popup selection state
  const [showPopup, setShowPopup] = useState(false)
  const [tempSelectedRepos, setTempSelectedRepos] = useState<Repository[]>([])
  const [tempSearch, setTempSearch] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/environments'),
      api.get('/repos'),
    ]).then(([envRes, repoRes]) => {
      setEnvironments(envRes.data)
      setRepos(repoRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const openSelector = () => {
    setTempSelectedRepos([...data.repositories])
    setTempSearch('')
    setShowPopup(true)
  }

  const toggleTempRepo = (repo: Repository) => {
    const exists = tempSelectedRepos.find(r => r.id === repo.id)
    if (exists) {
      setTempSelectedRepos(tempSelectedRepos.filter(r => r.id !== repo.id))
    } else {
      setTempSelectedRepos([...tempSelectedRepos, repo])
    }
  }

  const removeRepo = (repo: Repository) => {
    onChange({ repositories: data.repositories.filter(r => r.id !== repo.id) })
  }

  const selectAllTemp = () => {
    setTempSelectedRepos(tempFilteredRepos)
  }

  const clearAllTemp = () => {
    setTempSelectedRepos([])
  }

  const applyRepoSelection = () => {
    onChange({ repositories: tempSelectedRepos })
    setShowPopup(false)
  }

  const tempFilteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(tempSearch.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(tempSearch.toLowerCase())
  )

  const langColors: Record<string, string> = {
    JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3776ab',
    Go: '#00add8', Rust: '#dea584', Java: '#ed8b00', PHP: '#777bb4',
    Ruby: '#cc342d', 'C#': '#512bd4', Shell: '#89e051',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Environment selector */}
      <div>
        <label className="block text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-3">
          Target Environment <span className="text-ccd-danger">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {environments.map(env => (
            <button
              key={env.id}
              onClick={() => onChange({ environment_id: env.id, environment: env })}
              className={`relative p-4 rounded-xl border text-left transition-all duration-150 ${
                data.environment_id === env.id
                  ? 'border-ccd-accent bg-ccd-accent/10 glow-accent'
                  : 'border-ccd-border bg-ccd-surface hover:border-ccd-muted'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: env.color }} />
                <span className="text-sm font-semibold text-ccd-text">{env.name}</span>
                {data.environment_id === env.id && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-ccd-accent ml-auto">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
              <div className="text-xs text-ccd-text-muted font-mono">{env.slug}</div>
              {env.description && (
                <div className="text-xs text-ccd-text-muted mt-1 truncate">{env.description}</div>
              )}
              <div className="mt-2.5 pt-2 border-t border-ccd-border/40 flex items-center justify-between text-[10px]">
                <span className="text-ccd-text-muted uppercase tracking-wider font-semibold text-[9px]">Target Branch</span>
                <span className="font-mono badge-accent py-0.5 px-1.5 rounded font-semibold">
                  {env.target_branch || 'main'}
                </span>
              </div>
            </button>
          ))}
          {environments.length === 0 && (
            <div className="col-span-3 text-center py-8 text-sm text-ccd-text-muted">
              No environments configured. Go to Configuration to add one.
            </div>
          )}
        </div>
      </div>

      {/* Repository selector */}
      <div>
        <label className="block text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-3">
          Select Applications <span className="text-ccd-danger">*</span>
        </label>

        {data.repositories.length === 0 ? (
          <div className="border border-dashed border-ccd-border rounded-xl p-8 text-center bg-ccd-surface/10 hover:bg-ccd-surface/20 transition-all duration-150">
            <div className="w-12 h-12 rounded-full bg-ccd-accent/15 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ccd-accent">
                <path d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-ccd-text">No Applications Selected</h4>
            <p className="text-xs text-ccd-text-muted mt-1 mb-4">Choose the applications/repositories to deploy to this environment</p>
            <button
              type="button"
              onClick={openSelector}
              className="ccd-btn-primary text-xs py-2 px-4 inline-flex items-center gap-2"
            >
              + Choose Applications
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="badge-accent">{data.repositories.length} selected</span>
              <button
                type="button"
                onClick={openSelector}
                className="text-xs text-ccd-accent hover:underline font-semibold flex items-center gap-1"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Selection
              </button>
            </div>
            <div className="border border-ccd-border rounded-xl bg-ccd-surface/20 overflow-hidden divide-y divide-ccd-border/40">
              {data.repositories.map(repo => (
                <div key={repo.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ccd-text truncate">{repo.name}</span>
                      {repo.language && (
                        <span className="flex items-center gap-1 text-xs text-ccd-text-muted shrink-0">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColors[repo.language] || '#888' }} />
                          {repo.language}
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-ccd-text-muted truncate mt-0.5">{repo.description}</p>
                    )}
                    <div className="mt-2.5 flex flex-col gap-1.5 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-ccd-text-muted shrink-0 uppercase tracking-wider">
                          Docker Image Name:
                        </span>
                        <input
                          type="text"
                          placeholder={`${repo.name}:latest (default)`}
                          value={repo.docker_image_name || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = data.repositories.map(r => r.id === repo.id ? { ...r, docker_image_name: val } : r);
                            onChange({ repositories: updated });
                          }}
                          className="bg-[#0b0f19]/30 border border-ccd-border/40 text-ccd-text placeholder-ccd-text-muted/40 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-ccd-accent flex-1 transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-ccd-warning/70 leading-normal pl-[118px]">
                        ⚠️ Penting: Harus sesuai dengan nama image yang tertulis di file <code>docker-compose.yml</code> server target.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Branch validation status */}
                      {!isValidated ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-mono badge-muted">
                            {repo.default_branch}
                          </span>
                          <span className="text-[10px] text-ccd-text-muted mt-0.5">
                            default branch
                          </span>
                        </div>
                      ) : (
                        (() => {
                          const result = validationResults?.[repo.id];
                          if (result?.fallback_used) {
                            return (
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-mono badge-danger">
                                  {repo.default_branch}
                                </span>
                                <span className="text-[10px] text-ccd-danger mt-0.5 font-semibold">
                                  Staging branch not found (Fallback)
                                </span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-mono badge-success">
                                  {result?.resolved_branch || repo.default_branch}
                                </span>
                                <span className="text-[10px] text-ccd-success mt-0.5 font-semibold">
                                  Branch validated
                                </span>
                              </div>
                            );
                          }
                        })()
                      )}

                      {/* File validation indicators (shown only after validation) */}
                      {isValidated && (() => {
                        const result = validationResults?.[repo.id];
                        if (!result) return null;
                        return (
                          <div className="flex flex-col gap-1 mt-0.5 items-end">
                            {/* Dockerfile — REQUIRED */}
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              result.dockerfile_exists
                                ? 'bg-ccd-success/10 border-ccd-success/30 text-ccd-success'
                                : 'bg-ccd-danger/10 border-ccd-danger/40 text-ccd-danger'
                            }`}>
                              {result.dockerfile_exists ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 shrink-0">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 shrink-0">
                                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              )}
                              <span>Dockerfile {result.dockerfile_exists ? 'found' : 'MISSING'}</span>
                              {!result.dockerfile_exists && (
                                <span className="ml-0.5 bg-ccd-danger text-white text-[8px] px-1 py-0.5 rounded font-bold uppercase tracking-wider">Required</span>
                              )}
                            </div>

                            {/* docker-compose.yml — OPTIONAL */}
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              result.docker_compose_exists
                                ? 'bg-ccd-success/10 border-ccd-success/30 text-ccd-success'
                                : 'bg-ccd-warning/10 border-ccd-warning/30 text-ccd-warning'
                            }`}>
                              {result.docker_compose_exists ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 shrink-0">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                                  <path d="M12 9v4M12 17h.01" />
                                  <circle cx="12" cy="12" r="10" />
                                </svg>
                              )}
                              <span>docker-compose.yml {result.docker_compose_exists ? 'found' : 'not found'}</span>
                              {!result.docker_compose_exists && (
                                <span className="ml-0.5 bg-ccd-warning/70 text-ccd-bg text-[8px] px-1 py-0.5 rounded font-bold uppercase tracking-wider">Optional</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRepo(repo)}
                      className="text-ccd-danger hover:bg-ccd-danger/10 p-1.5 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
              </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Validation Summary Banner — shown after validate */}
      {isValidated && data.repositories.length > 0 && (() => {
        const errors: { repo: string; message: string }[] = [];
        const warnings: { repo: string; message: string }[] = [];

        data.repositories.forEach(repo => {
          const result = validationResults?.[repo.id];
          if (!result) return;

          // ERRORS (blockers)
          if (!result.dockerfile_exists) {
            errors.push({
              repo: repo.name,
              message: `Dockerfile tidak ditemukan di branch "${result.resolved_branch}". File ini wajib ada karena server menggunakan Docker untuk menjalankan aplikasi.`,
            });
          }

          // WARNINGS (non-blockers)
          if (result.fallback_used) {
            warnings.push({
              repo: repo.name,
              message: `Branch target "${result.desired_branch}" tidak ditemukan. Sistem akan menggunakan branch default "${result.resolved_branch}" sebagai fallback.`,
            });
          }
          if (!result.docker_compose_exists) {
            warnings.push({
              repo: repo.name,
              message: `docker-compose.yml tidak ditemukan di branch "${result.resolved_branch}". File ini opsional, namun direkomendasikan untuk orchestrasi container di server.`,
            });
          }
        });

        const allOk = errors.length === 0 && warnings.length === 0;

        return (
          <div className="mt-4 rounded-xl border overflow-hidden animate-fade-in">
            {/* Banner Header */}
            <div className={`flex items-center gap-3 px-4 py-3 ${
              errors.length > 0
                ? 'bg-ccd-danger/10 border-b border-ccd-danger/20'
                : warnings.length > 0
                  ? 'bg-ccd-warning/10 border-b border-ccd-warning/20'
                  : 'bg-ccd-success/10 border-b border-ccd-success/20'
            }`}>
              {errors.length > 0 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-danger shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : warnings.length > 0 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-warning shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-ccd-success shrink-0">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${
                  errors.length > 0 ? 'text-ccd-danger' : warnings.length > 0 ? 'text-ccd-warning' : 'text-ccd-success'
                }`}>
                  {errors.length > 0
                    ? `Validasi Gagal — ${errors.length} error wajib diperbaiki sebelum bisa melanjutkan`
                    : warnings.length > 0
                      ? `Validasi Selesai — ${warnings.length} peringatan (tidak memblokir, tapi perlu diperhatikan)`
                      : `Validasi Sukses — Semua repositori kompatibel dan siap dideploy`
                  }
                </p>
                <p className="text-[10px] text-ccd-text-muted mt-0.5">
                  {data.repositories.length} repositori diperiksa ·{' '}
                  {errors.length > 0 ? `${errors.length} error, ` : ''}{warnings.length} peringatan
                </p>
              </div>
            </div>

            {/* Error Items */}
            {errors.length > 0 && (
              <div className="divide-y divide-ccd-danger/10 bg-ccd-danger/5">
                {errors.map((e, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-ccd-danger/20 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-2.5 h-2.5 text-ccd-danger">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-ccd-danger">{e.repo}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-ccd-danger text-white px-1.5 py-0.5 rounded">Error · Wajib</span>
                      </div>
                      <p className="text-[11px] text-ccd-text-muted leading-relaxed">{e.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Warning Items */}
            {warnings.length > 0 && (
              <div className="divide-y divide-ccd-warning/10 bg-ccd-warning/5">
                {warnings.map((w, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-ccd-warning/20 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-2.5 h-2.5 text-ccd-warning">
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-ccd-warning">{w.repo}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-ccd-warning/70 text-ccd-bg px-1.5 py-0.5 rounded">Peringatan · Opsional</span>
                      </div>
                      <p className="text-[11px] text-ccd-text-muted leading-relaxed">{w.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All OK footer */}
            {allOk && (
              <div className="px-4 py-3 bg-ccd-success/5">
                <p className="text-[11px] text-ccd-success/80 leading-relaxed">
                  ✓ Semua repositori memiliki Dockerfile dan branch target yang valid. Kamu bisa melanjutkan ke langkah berikutnya.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Popup Modal for Repository Selection */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="ccd-card w-full max-w-2xl mx-4 rounded-2xl border border-ccd-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-slide-down">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ccd-border shrink-0">
              <h3 className="text-sm font-semibold text-ccd-text">Choose Applications</h3>
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="ccd-btn-ghost p-1.5 rounded-lg"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search and Action Bar */}
            <div className="px-6 py-4 border-b border-ccd-border shrink-0 space-y-3 bg-ccd-surface/10">
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="w-4 h-4 text-ccd-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={tempSearch}
                  onChange={e => setTempSearch(e.target.value)}
                  className="ccd-input pl-9"
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={selectAllTemp}
                    className="text-ccd-accent hover:underline font-semibold"
                  >
                    Select all ({tempFilteredRepos.length})
                  </button>
                  <span className="text-ccd-text-muted">·</span>
                  <button
                    type="button"
                    onClick={clearAllTemp}
                    className="text-ccd-text-muted hover:underline font-semibold"
                  >
                    Clear
                  </button>
                </div>
                <span className="badge-accent">{tempSelectedRepos.length} selected</span>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-ccd-border/40">
              {tempFilteredRepos.length === 0 ? (
                <div className="text-center py-12 text-sm text-ccd-text-muted">
                  {repos.length === 0
                    ? 'No repositories synced yet. Go to Repos to sync.'
                    : 'No results found.'}
                </div>
              ) : (
                tempFilteredRepos.map(repo => {
                  const isSelected = !!tempSelectedRepos.find(r => r.id === repo.id)
                  return (
                    <label
                      key={repo.id}
                      className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors duration-100 ${
                        isSelected ? 'bg-ccd-accent/8' : 'hover:bg-ccd-muted/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTempRepo(repo)}
                        className="w-4 h-4 accent-blue-500 rounded shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ccd-text truncate">
                            {repo.name}
                          </span>
                          {repo.language && (
                            <span className="flex items-center gap-1 text-xs text-ccd-text-muted shrink-0">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: langColors[repo.language] || '#888' }}
                              />
                              {repo.language}
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <div className="text-xs text-ccd-text-muted truncate mt-0.5">
                            {repo.description}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-ccd-text-muted font-mono shrink-0">
                        {repo.default_branch}
                      </span>
                    </label>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-ccd-border bg-ccd-surface shrink-0 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="ccd-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyRepoSelection}
                className="ccd-btn-primary text-xs"
              >
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
