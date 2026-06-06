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
}

export default function Step01Setup({ data, onChange }: Step01SetupProps) {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/environments'),
      api.get('/repos'),
    ]).then(([envRes, repoRes]) => {
      setEnvironments(envRes.data)
      setRepos(repoRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const toggleRepo = (repo: Repository) => {
    const exists = data.repositories.find(r => r.id === repo.id)
    if (exists) {
      onChange({ repositories: data.repositories.filter(r => r.id !== repo.id) })
    } else {
      onChange({ repositories: [...data.repositories, repo] })
    }
  }

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
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
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider">
            Select Applications <span className="text-ccd-danger">*</span>
          </label>
          {data.repositories.length > 0 && (
            <span className="badge-accent">{data.repositories.length} selected</span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            className="w-4 h-4 text-ccd-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ccd-input pl-9"
          />
        </div>

        {/* Repo list */}
        <div className="border border-ccd-border rounded-xl overflow-hidden">
          {filteredRepos.length === 0 ? (
            <div className="text-center py-12 text-sm text-ccd-text-muted">
              {repos.length === 0 ? 'No repositories synced yet. Go to Repos to sync.' : 'No results found.'}
            </div>
          ) : (
            <div className="divide-y divide-ccd-border/50 max-h-80 overflow-y-auto">
              {filteredRepos.map(repo => {
                const isSelected = !!data.repositories.find(r => r.id === repo.id)
                return (
                  <label
                    key={repo.id}
                    className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors duration-100 ${
                      isSelected ? 'bg-ccd-accent/8' : 'hover:bg-ccd-muted/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRepo(repo)}
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
              })}
            </div>
          )}
        </div>

        {/* Select all / clear */}
        {filteredRepos.length > 0 && (
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => onChange({ repositories: filteredRepos })}
              className="text-xs text-ccd-accent hover:underline"
            >
              Select all ({filteredRepos.length})
            </button>
            <span className="text-ccd-text-muted">·</span>
            <button
              onClick={() => onChange({ repositories: [] })}
              className="text-xs text-ccd-text-muted hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
