import React from 'react'
import { Repository } from '../../types'

const DEFAULT_VARS = ['IMAGE_TAG', 'REPLICAS', 'PORT']

interface Step02ConfigProps {
  data: {
    repositories: Repository[];
    config: Record<string, Record<string, string>>;
  };
  onChange: (update: Partial<Step02ConfigProps['data']>) => void;
}

export default function Step02Config({ data, onChange }: Step02ConfigProps) {
  const { repositories, config } = data

  const updateVar = (repoName: string, key: string, value: string) => {
    onChange({
      config: {
        ...config,
        [repoName]: {
          ...(config[repoName] || {}),
          [key]: value,
        },
      },
    })
  }

  const addCustomVar = (repoName: string) => {
    const key = `CUSTOM_VAR_${Date.now()}`
    updateVar(repoName, key, '')
  }

  const removeVar = (repoName: string, key: string) => {
    const updated = { ...(config[repoName] || {}) }
    delete updated[key]
    onChange({ config: { ...config, [repoName]: updated } })
  }

  const renameKey = (repoName: string, oldKey: string, newKey: string) => {
    if (!newKey || newKey === oldKey) return
    const repoConfig = { ...(config[repoName] || {}) }
    const value = repoConfig[oldKey]
    delete repoConfig[oldKey]
    repoConfig[newKey] = value
    onChange({ config: { ...config, [repoName]: repoConfig } })
  }

  // Initialize default vars for repos that have none
  const ensureDefaults = (repo: Repository) => {
    if (!config[repo.name]) {
      const defaults: Record<string, string> = {}
      DEFAULT_VARS.forEach(v => { defaults[v] = '' })
      onChange({ config: { ...config, [repo.name]: defaults } })
    }
  }

  if (repositories.length === 0) {
    return (
      <div className="text-center py-16 text-ccd-text-muted text-sm">
        No repositories selected. Go back to Step 01 to select applications.
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <p className="text-sm text-ccd-text-muted">
        Configure deployment variables for each selected application.
        Variables will be injected into the deployment pipeline.
      </p>

      {repositories.map(repo => {
        if (!config[repo.name]) ensureDefaults(repo)
        const vars = config[repo.name] || {}
        const entries = Object.entries(vars)

        return (
          <div key={repo.id} className="ccd-card overflow-hidden">
            {/* Repo header */}
            <div className="flex items-center gap-3 px-5 py-3 bg-ccd-muted/20 border-b border-ccd-border">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-text-muted shrink-0">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <span className="font-mono text-sm font-semibold text-ccd-cyan">{repo.full_name || repo.name}</span>
              <span className="ml-auto text-xs text-ccd-text-muted">{entries.length} variable{entries.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Variables */}
            <div className="p-5 space-y-3">
              {entries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  {/* Key input */}
                  <input
                    type="text"
                    defaultValue={key}
                    onBlur={e => renameKey(repo.name, key, e.target.value.trim().toUpperCase())}
                    className="ccd-input font-mono text-xs text-ccd-warning w-44 shrink-0"
                    placeholder="VARIABLE_NAME"
                  />
                  <span className="text-ccd-text-muted text-sm shrink-0">=</span>
                  {/* Value input */}
                  <input
                    type="text"
                    value={value}
                    onChange={e => updateVar(repo.name, key, e.target.value)}
                    className="ccd-input font-mono text-xs flex-1"
                    placeholder="value"
                  />
                  {/* Remove button */}
                  <button
                    onClick={() => removeVar(repo.name, key)}
                    className="shrink-0 p-1.5 rounded-lg text-ccd-text-muted hover:text-ccd-danger hover:bg-ccd-danger/10 transition-colors"
                    title="Remove variable"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {entries.length === 0 && (
                <div className="text-xs text-ccd-text-muted italic py-2">No variables configured</div>
              )}

              {/* Add variable button */}
              <button
                onClick={() => addCustomVar(repo.name)}
                className="flex items-center gap-2 text-xs text-ccd-accent hover:text-ccd-accent-light transition-colors mt-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                </svg>
                Add Variable
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
