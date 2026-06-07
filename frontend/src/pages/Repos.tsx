import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { Repository } from '../types'
import { useToast } from '../context/ToastContext'
import { getApiErrorMessage } from '../utils/errors'

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3776ab',
  Go: '#00add8', Rust: '#dea584', Java: '#ed8b00', PHP: '#777bb4',
  Ruby: '#cc342d', 'C#': '#512bd4', Shell: '#89e051', Kotlin: '#7F52FF',
  Swift: '#F05138', Dart: '#0175C2',
}

export default function Repos() {
  const [repos, setRepos]     = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const { showToast }         = useToast()

  const fetchRepos = () => {
    setLoading(true)
    api.get('/repos')
      .then(r => setRepos(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRepos() }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/repos/sync')
      showToast(`Synced ${res.data.synced} repositories from GitHub`, 'success')
      fetchRepos()
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Sync failed'), 'error')
    } finally {
      setSyncing(false)
    }
  }

  const lastSync = repos[0]?.synced_at

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ccd-text">Repository Registry</h2>
          <p className="text-sm text-ccd-text-muted mt-1">
            {repos.length} repositories · {lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}` : 'Never synced'}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="ccd-btn-primary"
          id="sync-repos-btn"
        >
          {syncing ? (
            <><div className="spinner w-4 h-4" />Syncing...</>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Sync from GitHub
            </>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="ccd-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-12 h-12 text-ccd-text-muted mx-auto mb-3">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            <p className="text-ccd-text-muted text-sm">No repositories synced yet.</p>
            <p className="text-ccd-text-muted text-xs mt-1">Click "Sync from GitHub" to import your repositories.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ccd-table">
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Description</th>
                  <th>Language</th>
                  <th>Branch</th>
                  <th>Visibility</th>
                  <th>Last Synced</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {repos.map(repo => (
                  <tr key={repo.id}>
                    <td>
                      <div className="font-medium text-ccd-text text-sm">{repo.name}</div>
                      <div className="text-xs text-ccd-text-muted font-mono">{repo.full_name}</div>
                    </td>
                    <td className="max-w-[220px]">
                      <span className="text-xs text-ccd-text-dim line-clamp-2">
                        {repo.description || <em className="opacity-40">No description</em>}
                      </span>
                    </td>
                    <td>
                      {repo.language ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.language] || '#888' }} />
                          <span className="text-xs text-ccd-text-dim">{repo.language}</span>
                        </div>
                      ) : <span className="text-xs text-ccd-text-muted">—</span>}
                    </td>
                    <td>
                      <span className="font-mono text-xs badge-muted">{repo.default_branch}</span>
                    </td>
                    <td>
                      <span className={`text-xs ${repo.visibility === 'public' ? 'badge-success' : 'badge-muted'}`}>
                        {repo.visibility}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-ccd-text-muted">
                        {repo.synced_at ? new Date(repo.synced_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td>
                      {repo.url && (
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-ccd-muted/40 text-ccd-text-muted hover:text-ccd-accent transition-colors inline-flex"
                          title="Open on GitHub"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
