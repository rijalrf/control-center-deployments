import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { Environment, Repository } from '../../types'

interface ValidationResult {
  resolved_branch: string;
  desired_branch: string;
  exists: boolean;
  fallback_used: boolean;
  dockerfile_exists: boolean;
  docker_compose_exists: boolean;
}

interface Step01SetupProps {
  data: {
    environment_id: number | null;
    environment: Environment | null;
    repositories: Repository[];
  };
  onChange: (update: Partial<Step01SetupProps['data']>) => void;
  isValidated?: boolean;
  validationResults?: Record<number, ValidationResult>;
}

// Compute per-repo validation status
function getRepoStatus(result?: ValidationResult): 'error' | 'warning' | 'ok' | 'pending' {
  if (!result) return 'pending'
  if (!result.dockerfile_exists) return 'error'
  if (result.fallback_used || !result.docker_compose_exists) return 'warning'
  return 'ok'
}

export default function Step01Setup({ data, onChange, isValidated = false, validationResults = {} }: Step01SetupProps) {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)

  // Repo selector popup
  const [showSelectorPopup, setShowSelectorPopup] = useState(false)
  const [tempSelectedRepos, setTempSelectedRepos] = useState<Repository[]>([])
  const [tempSearch, setTempSearch] = useState('')

  // Validation detail popup
  const [detailRepo, setDetailRepo] = useState<Repository | null>(null)

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
    setShowSelectorPopup(true)
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

  const selectAllTemp = () => setTempSelectedRepos(tempFilteredRepos)
  const clearAllTemp = () => setTempSelectedRepos([])

  const applyRepoSelection = () => {
    onChange({ repositories: tempSelectedRepos })
    setShowSelectorPopup(false)
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

  // Overall summary counts
  const summaryStats = isValidated ? data.repositories.reduce((acc, repo) => {
    const s = getRepoStatus(validationResults[repo.id])
    if (s === 'error') acc.errors++
    else if (s === 'warning') acc.warnings++
    else if (s === 'ok') acc.ok++
    return acc
  }, { errors: 0, warnings: 0, ok: 0 }) : null

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

            {/* Repo List — clean rows */}
            <div className="border border-ccd-border rounded-xl bg-ccd-surface/20 overflow-hidden divide-y divide-ccd-border/40">
              {data.repositories.map(repo => {
                const result = validationResults[repo.id]
                const status = getRepoStatus(result)

                // Determine branch display
                const branchLabel = isValidated && result
                  ? result.resolved_branch
                  : repo.default_branch

                const branchClass = isValidated
                  ? result?.fallback_used
                    ? 'badge-danger'
                    : result
                      ? 'badge-success'
                      : 'badge-muted'
                  : 'badge-muted'

                return (
                  <div key={repo.id} className="flex items-center gap-3 px-4 py-3">
                    {/* GitHub icon */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-text-muted shrink-0">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>

                    {/* Repo name */}
                    <span className="text-sm font-semibold text-ccd-text truncate flex-1 min-w-0">{repo.name}</span>

                    {/* Language badge */}
                    {repo.language && (
                      <span className="flex items-center gap-1 text-xs text-ccd-text-muted shrink-0">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColors[repo.language] || '#888' }} />
                        {repo.language}
                      </span>
                    )}

                    {/* Branch badge */}
                    <span className={`text-xs font-mono shrink-0 ${branchClass}`}>
                      {branchLabel}
                    </span>

                    {/* Validation status label — clickable after validate */}
                    {isValidated && (
                      <button
                        type="button"
                        onClick={() => setDetailRepo(repo)}
                        title="Klik untuk melihat detail hasil validasi"
                        className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all hover:opacity-80 cursor-pointer ${
                          status === 'error'
                            ? 'bg-ccd-danger/10 border-ccd-danger/40 text-ccd-danger hover:bg-ccd-danger/20'
                            : status === 'warning'
                              ? 'bg-ccd-warning/10 border-ccd-warning/30 text-ccd-warning hover:bg-ccd-warning/20'
                              : 'bg-ccd-success/10 border-ccd-success/30 text-ccd-success hover:bg-ccd-success/20'
                        }`}
                      >
                        {status === 'error' ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-2.5 h-2.5">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Error
                          </>
                        ) : status === 'warning' ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-2.5 h-2.5">
                              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            Warning
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-2.5 h-2.5">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            Valid
                          </>
                        )}
                      </button>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeRepo(repo)}
                      className="text-ccd-danger hover:bg-ccd-danger/10 p-1.5 rounded-lg transition-colors shrink-0"
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Slim overall summary bar */}
            {isValidated && summaryStats && (
              <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs animate-fade-in ${
                summaryStats.errors > 0
                  ? 'bg-ccd-danger/8 border-ccd-danger/25 text-ccd-danger'
                  : summaryStats.warnings > 0
                    ? 'bg-ccd-warning/8 border-ccd-warning/25 text-ccd-warning'
                    : 'bg-ccd-success/8 border-ccd-success/25 text-ccd-success'
              }`}>
                {summaryStats.errors > 0 ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 shrink-0">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : summaryStats.warnings > 0 ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 shrink-0">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 shrink-0">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
                <span className="font-semibold">
                  {summaryStats.errors > 0
                    ? `${summaryStats.errors} repositori gagal validasi — tidak bisa lanjut. Klik label "Error" untuk detail.`
                    : summaryStats.warnings > 0
                      ? `${summaryStats.warnings} peringatan ditemukan — bisa lanjut, tapi perlu diperhatikan. Klik "Warning" untuk detail.`
                      : 'Semua repositori lolos validasi. Klik "Next" untuk melanjutkan.'
                  }
                </span>
                <span className="ml-auto text-[10px] opacity-70 shrink-0">
                  {summaryStats.ok}✓ · {summaryStats.warnings}⚠ · {summaryStats.errors}✗
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Validation Detail Popup ── */}
      {detailRepo && (() => {
        const result = validationResults[detailRepo.id]
        const status = getRepoStatus(result)

        const hasDockerfileError = result && !result.dockerfile_exists
        const hasBranchFallback = result?.fallback_used
        const hasNoCompose = result && !result.docker_compose_exists

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setDetailRepo(null)}
          >
            <div
              className="ccd-card w-full max-w-lg mx-4 rounded-2xl border border-ccd-border shadow-2xl overflow-hidden animate-slide-down"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${
                status === 'error'
                  ? 'border-ccd-danger/30 bg-ccd-danger/8'
                  : status === 'warning'
                    ? 'border-ccd-warning/30 bg-ccd-warning/8'
                    : 'border-ccd-success/30 bg-ccd-success/8'
              }`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-text-muted shrink-0">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ccd-text">{detailRepo.name}</p>
                  <p className="text-[10px] text-ccd-text-muted font-mono">{detailRepo.full_name}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  status === 'error'
                    ? 'bg-ccd-danger/10 border-ccd-danger/40 text-ccd-danger'
                    : status === 'warning'
                      ? 'bg-ccd-warning/10 border-ccd-warning/30 text-ccd-warning'
                      : 'bg-ccd-success/10 border-ccd-success/30 text-ccd-success'
                }`}>
                  {status === 'error' ? 'Error' : status === 'warning' ? 'Warning' : 'Valid'}
                </div>
                <button
                  type="button"
                  onClick={() => setDetailRepo(null)}
                  className="ccd-btn-ghost p-1.5 rounded-lg ml-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">

                {/* ① Branch Check */}
                <div className={`rounded-xl border p-4 space-y-2 ${
                  hasBranchFallback
                    ? 'bg-ccd-warning/6 border-ccd-warning/25'
                    : 'bg-ccd-success/6 border-ccd-success/25'
                }`}>
                  <div className="flex items-center gap-2">
                    {hasBranchFallback ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-warning shrink-0">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-ccd-success shrink-0">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    <span className={`text-xs font-bold ${hasBranchFallback ? 'text-ccd-warning' : 'text-ccd-success'}`}>
                      Branch Target {hasBranchFallback ? '— Fallback Digunakan' : '— Ditemukan'}
                    </span>
                    <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      hasBranchFallback ? 'bg-ccd-warning/20 text-ccd-warning' : 'bg-ccd-success/20 text-ccd-success'
                    }`}>
                      {hasBranchFallback ? 'Peringatan' : 'OK'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className="text-ccd-text-muted uppercase tracking-wider text-[9px] font-semibold mb-1">Branch yang diinginkan</p>
                      <code className="font-mono text-ccd-cyan bg-ccd-muted/20 px-2 py-0.5 rounded">{result?.desired_branch}</code>
                    </div>
                    <div>
                      <p className="text-ccd-text-muted uppercase tracking-wider text-[9px] font-semibold mb-1">Branch yang akan digunakan</p>
                      <code className={`font-mono px-2 py-0.5 rounded ${hasBranchFallback ? 'text-ccd-warning bg-ccd-warning/10' : 'text-ccd-success bg-ccd-success/10'}`}>
                        {result?.resolved_branch}
                      </code>
                    </div>
                  </div>
                  {hasBranchFallback && (
                    <p className="text-[11px] text-ccd-text-muted leading-relaxed pt-1 border-t border-ccd-warning/15">
                      Branch <strong className="text-ccd-warning">"{result?.desired_branch}"</strong> tidak ditemukan di repositori ini.
                      Sistem akan menggunakan branch default <strong className="text-ccd-text">"{result?.resolved_branch}"</strong> sebagai gantinya.
                      Pastikan branch target sudah dibuat di GitHub jika ingin deployment menggunakan branch yang benar.
                    </p>
                  )}
                </div>

                {/* ② Dockerfile Check */}
                <div className={`rounded-xl border p-4 space-y-2 ${
                  hasDockerfileError
                    ? 'bg-ccd-danger/6 border-ccd-danger/30'
                    : 'bg-ccd-success/6 border-ccd-success/25'
                }`}>
                  <div className="flex items-center gap-2">
                    {hasDockerfileError ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-ccd-danger shrink-0">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-ccd-success shrink-0">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    <span className={`text-xs font-bold ${hasDockerfileError ? 'text-ccd-danger' : 'text-ccd-success'}`}>
                      Dockerfile {hasDockerfileError ? '— Tidak Ditemukan' : '— Ditemukan'}
                    </span>
                    <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      hasDockerfileError
                        ? 'bg-ccd-danger text-white'
                        : 'bg-ccd-success/20 text-ccd-success'
                    }`}>
                      {hasDockerfileError ? 'Error · Wajib' : 'OK'}
                    </span>
                  </div>
                  {hasDockerfileError ? (
                    <p className="text-[11px] text-ccd-text-muted leading-relaxed pt-1 border-t border-ccd-danger/15">
                      File <code className="font-mono text-ccd-danger bg-ccd-danger/10 px-1 rounded">Dockerfile</code> tidak ditemukan
                      di branch <strong className="text-ccd-text">"{result?.resolved_branch}"</strong>.
                      <br /><br />
                      File ini <strong className="text-ccd-danger">wajib ada</strong> karena pipeline deployment akan mem-build Docker image dari repositori ini
                      menggunakan perintah <code className="font-mono bg-ccd-muted/30 px-1 rounded text-[10px]">docker build</code>.
                      Tanpa Dockerfile, proses build akan gagal dan deployment tidak dapat dilanjutkan.
                      <br /><br />
                      <strong className="text-ccd-text">Cara memperbaiki:</strong> Buat file <code className="font-mono text-ccd-accent bg-ccd-accent/10 px-1 rounded">Dockerfile</code>{' '}
                      di root direktori repositori di branch <strong className="text-ccd-text">"{result?.resolved_branch}"</strong>, lalu validasi ulang.
                    </p>
                  ) : (
                    <p className="text-[11px] text-ccd-text-muted leading-relaxed pt-1 border-t border-ccd-success/15">
                      File <code className="font-mono text-ccd-success bg-ccd-success/10 px-1 rounded">Dockerfile</code> ditemukan
                      di branch <strong className="text-ccd-text">"{result?.resolved_branch}"</strong>.
                      Pipeline deployment dapat mem-build Docker image dari repositori ini.
                    </p>
                  )}
                </div>

                {/* ③ docker-compose.yml Check */}
                <div className={`rounded-xl border p-4 space-y-2 ${
                  hasNoCompose
                    ? 'bg-ccd-warning/6 border-ccd-warning/25'
                    : 'bg-ccd-success/6 border-ccd-success/25'
                }`}>
                  <div className="flex items-center gap-2">
                    {hasNoCompose ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-warning shrink-0">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-ccd-success shrink-0">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    <span className={`text-xs font-bold ${hasNoCompose ? 'text-ccd-warning' : 'text-ccd-success'}`}>
                      docker-compose.yml {hasNoCompose ? '— Tidak Ditemukan' : '— Ditemukan'}
                    </span>
                    <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      hasNoCompose
                        ? 'bg-ccd-warning/20 text-ccd-warning'
                        : 'bg-ccd-success/20 text-ccd-success'
                    }`}>
                      {hasNoCompose ? 'Peringatan · Opsional' : 'OK'}
                    </span>
                  </div>
                  {hasNoCompose ? (
                    <p className="text-[11px] text-ccd-text-muted leading-relaxed pt-1 border-t border-ccd-warning/15">
                      File <code className="font-mono text-ccd-warning bg-ccd-warning/10 px-1 rounded">docker-compose.yml</code> tidak ditemukan
                      di branch <strong className="text-ccd-text">"{result?.resolved_branch}"</strong>.
                      <br /><br />
                      File ini <strong className="text-ccd-warning">opsional</strong> dan tidak akan memblokir proses deployment.
                      Namun, jika strategi deployment yang dipilih di Step 02 adalah <em>Docker Compose</em>,
                      file ini diperlukan di server target untuk menjalankan container.
                      <br /><br />
                      Jika tidak menggunakan Compose, file ini tidak perlu dibuat.
                    </p>
                  ) : (
                    <p className="text-[11px] text-ccd-text-muted leading-relaxed pt-1 border-t border-ccd-success/15">
                      File <code className="font-mono text-ccd-success bg-ccd-success/10 px-1 rounded">docker-compose.yml</code> ditemukan
                      di branch <strong className="text-ccd-text">"{result?.resolved_branch}"</strong>.
                      Repositori siap menggunakan strategi deployment Docker Compose.
                    </p>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-ccd-border bg-ccd-surface/30 flex items-center justify-between">
                <p className="text-[10px] text-ccd-text-muted">
                  Diperiksa pada branch: <code className="font-mono text-ccd-cyan">{result?.resolved_branch}</code>
                </p>
                <button
                  type="button"
                  onClick={() => setDetailRepo(null)}
                  className="ccd-btn-secondary text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Repo Selector Popup ── */}
      {showSelectorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="ccd-card w-full max-w-2xl mx-4 rounded-2xl border border-ccd-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-slide-down">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ccd-border shrink-0">
              <h3 className="text-sm font-semibold text-ccd-text">Choose Applications</h3>
              <button
                type="button"
                onClick={() => setShowSelectorPopup(false)}
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
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
                  <button type="button" onClick={selectAllTemp} className="text-ccd-accent hover:underline font-semibold">
                    Select all ({tempFilteredRepos.length})
                  </button>
                  <span className="text-ccd-text-muted">·</span>
                  <button type="button" onClick={clearAllTemp} className="text-ccd-text-muted hover:underline font-semibold">
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
                  {repos.length === 0 ? 'No repositories synced yet. Go to Repos to sync.' : 'No results found.'}
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
                          <span className="text-sm font-medium text-ccd-text truncate">{repo.name}</span>
                          {repo.language && (
                            <span className="flex items-center gap-1 text-xs text-ccd-text-muted shrink-0">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColors[repo.language] || '#888' }} />
                              {repo.language}
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <div className="text-xs text-ccd-text-muted truncate mt-0.5">{repo.description}</div>
                        )}
                      </div>
                      <span className="text-xs text-ccd-text-muted font-mono shrink-0">{repo.default_branch}</span>
                    </label>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-ccd-border bg-ccd-surface shrink-0 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowSelectorPopup(false)} className="ccd-btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={applyRepoSelection} className="ccd-btn-primary text-xs">Apply Selection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
