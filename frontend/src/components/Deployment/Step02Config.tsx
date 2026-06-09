import React, { useState, useEffect } from 'react'
import { Repository, Environment } from '../../types'
import api from '../../services/api'
import FileExplorerModal from './FileExplorerModal'

interface Step02ConfigProps {
  data: {
    environment_id: number | null;
    environment: Environment | null;
    repositories: Repository[];
    config: Record<string, Record<string, string>>;
  };
  onChange: (update: Partial<Step02ConfigProps['data']>) => void;
}

const SPECIAL_KEYS = [
  'DEPLOY_STRATEGY',
  'DEPLOY_DIR',
  'COMPOSE_FILE',
  'PRE_DEPLOY_COMMANDS',
  'POST_DEPLOY_COMMANDS',
  'DOCKERFILE_PATH',
  'TARGET_COMPOSE_SERVICE',
  'VERSION_TAG',
  'RELEASE_NOTES',
  'DOCKER_BUILD_TARGET'
]

export default function Step02Config({ data, onChange }: Step02ConfigProps) {
  const { repositories, config } = data
  const [bulkRepo, setBulkRepo] = useState<string | null>(null)
  const [bulkInput, setBulkInput] = useState<string>('')
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({})
  const [isCustomMode, setIsCustomMode] = useState<Record<string, boolean>>({})
  const [expandedRepos, setExpandedRepos] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {}
    repositories.forEach((repo, idx) => {
      initial[repo.id] = idx === 0
    })
    return initial
  })
  const [explorerTarget, setExplorerTarget] = useState<{ repo: Repository; initialPath: string; field: 'COMPOSE_FILE' | 'DOCKERFILE_PATH' } | null>(null)

  const validationMap = React.useMemo(() => {
    try {
      const validationSaved = localStorage.getItem('ccd_wizard_validation_results')
      return validationSaved ? JSON.parse(validationSaved) : {}
    } catch (e) {
      return {}
    }
  }, [])

  const getComposeDefaultPath = (repo: Repository) => {
    const result = validationMap[repo.id]
    return (result?.docker_compose_exists && result?.docker_compose_path)
      ? result.docker_compose_path
      : 'docker-compose.yml'
  }

  const toggleRepo = (repoId: number) => {
    setExpandedRepos(prev => ({ ...prev, [repoId]: !prev[repoId] }))
  }

  // Docker Compose services state
  interface ComposeServiceInfo {
    name: string;
    image: string;
    current_tag: string | null;
    suggested_tag: string;
  }
  interface FetchResult {
    compose_path: string;
    services: ComposeServiceInfo[];
  }
  const [composeData, setComposeData] = useState<Record<number, {
    loading: boolean;
    error: string | null;
    data: FetchResult | null;
  }>>({})

  const fetchComposeServices = async (repo: Repository, customPath?: string) => {
    setComposeData(prev => ({
      ...prev,
      [repo.id]: { loading: true, error: null, data: prev[repo.id]?.data || null }
    }))
    try {
      const targetBranch = data.environment?.target_branch || (data.environment?.name?.toLowerCase() === 'production' ? 'main' : 'staging')
      const resolvedBranch = validationMap[repo.id]?.resolved_branch || targetBranch || repo.default_branch || 'main'
      const composePath = customPath || config[repo.name]?.['COMPOSE_FILE'] || getComposeDefaultPath(repo)

      const res = await api.get(`/repos/${repo.id}/compose-services`, {
        params: { branch: resolvedBranch, path: composePath }
      })

      setComposeData(prev => ({
        ...prev,
        [repo.id]: { loading: false, error: null, data: res.data }
      }))

      // Pre-populate tag for service matching repository name
      const currentConfig = config[repo.name] || {}
      if (!currentConfig['VERSION_TAG'] && res.data.services?.length > 0) {
        const services = res.data.services
        const matchedService = services.find((s: any) => {
          const img = s.image?.toLowerCase() || ''
          return img.includes('/') || img.includes(repo.name.toLowerCase())
        }) || services[0]

        onChange({
          config: {
            ...config,
            [repo.name]: {
              ...currentConfig,
              'VERSION_TAG': matchedService.suggested_tag,
            }
          }
        })
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch compose file'
      setComposeData(prev => ({
        ...prev,
        [repo.id]: { loading: false, error: errMsg, data: null }
      }))
    }
  }

  useEffect(() => {
    repositories.forEach(repo => {
      const strategy = config[repo.name]?.['DEPLOY_STRATEGY']
      if (strategy === 'docker-compose') {
        if (!composeData[repo.id]) {
          fetchComposeServices(repo)
        }
      }
    })
  }, [repositories, config])

  const toggleAdvanced = (repoName: string) => {
    setExpandedAdvanced(prev => ({ ...prev, [repoName]: !prev[repoName] }))
  }

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
    const key = `VAR_${Date.now()}`
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

  const getSpecialVal = (repoName: string, key: string, defaultVal = '') => {
    return config[repoName]?.[key] ?? defaultVal
  }

  const setSpecialVal = (repoName: string, key: string, val: string) => {
    if (val === '') {
      const updated = { ...(config[repoName] || {}) }
      delete updated[key]
      onChange({ config: { ...config, [repoName]: updated } })
    } else {
      updateVar(repoName, key, val)
    }
  }

  // Initialize default vars for repos that have none
  const ensureDefaults = (repo: Repository) => {
    const currentRepoConfig = config[repo.name] || {}
    const hasStrategy = currentRepoConfig['DEPLOY_STRATEGY'] !== undefined
    const hasTag = currentRepoConfig['VERSION_TAG'] !== undefined
    const hasBuildTarget = currentRepoConfig['DOCKER_BUILD_TARGET'] !== undefined
    
    if (!hasStrategy || !hasTag || !hasBuildTarget) {
      const result = validationMap[repo.id]
      const hasCompose = result?.docker_compose_exists || false
      
      const newRepoConfig: Record<string, string> = {
        ...currentRepoConfig,
        'DEPLOY_STRATEGY': currentRepoConfig['DEPLOY_STRATEGY'] ?? (hasCompose ? 'docker-compose' : 'standard'),
        'VERSION_TAG': currentRepoConfig['VERSION_TAG'] ?? (hasCompose ? '' : 'v1.0.0'),
        'DOCKER_BUILD_TARGET': currentRepoConfig['DOCKER_BUILD_TARGET'] ?? ''
      }

      if (hasCompose && currentRepoConfig['COMPOSE_FILE'] === undefined && result?.docker_compose_path) {
        newRepoConfig['COMPOSE_FILE'] = result.docker_compose_path
      }
      
      onChange({
        config: {
          ...config,
          [repo.name]: newRepoConfig,
        },
      })
    }
  }

  const openBulkImport = (repoName: string) => {
    setBulkRepo(repoName)
    const currentVars = config[repoName] || {}
    const text = Object.entries(currentVars)
      .filter(([k]) => !SPECIAL_KEYS.includes(k) && !k.startsWith('COMPOSE_TAG_'))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
    setBulkInput(text)
  }

  const handleBulkImport = (repoName: string) => {
    const lines = bulkInput.split(/\r?\n/)
    const parsed: Record<string, string> = {}
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue
      
      const equalIndex = trimmed.indexOf('=')
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim().toUpperCase()
        const value = trimmed.substring(equalIndex + 1).trim()
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          parsed[key] = value
        }
      }
    }

    // Preserve special keys and compose tag keys
    const currentConfig = config[repoName] || {}
    for (const sk of SPECIAL_KEYS) {
      if (currentConfig[sk] !== undefined) {
        parsed[sk] = currentConfig[sk]
      }
    }
    for (const key of Object.keys(currentConfig)) {
      if (key.startsWith('COMPOSE_TAG_')) {
        parsed[key] = currentConfig[key]
      }
    }
    
    onChange({
      config: {
        ...config,
        [repoName]: parsed,
      },
    })
    
    setBulkRepo(null)
    setBulkInput('')
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
        const envEntries = Object.entries(vars).filter(([key]) => !SPECIAL_KEYS.includes(key) && !key.startsWith('COMPOSE_TAG_'))

        const strategy = getSpecialVal(repo.name, 'DEPLOY_STRATEGY', 'standard')
        const currentVersionTag = getSpecialVal(repo.name, 'VERSION_TAG', 'latest')
        const isExpanded = expandedRepos[repo.id] ?? false

        return (
          <div key={repo.id} className="ccd-card overflow-hidden">
            {/* Repo header */}
            <div
              onClick={() => toggleRepo(repo.id)}
              className={`flex items-center gap-3 px-5 py-3 bg-ccd-muted/20 cursor-pointer hover:bg-ccd-muted/30 transition-colors select-none ${isExpanded ? 'border-b border-ccd-border' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-text-muted shrink-0">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <span className="font-mono text-sm font-semibold text-ccd-cyan">{repo.full_name || repo.name}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                className={`w-3.5 h-3.5 text-ccd-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
              <span className="ml-auto text-xs text-ccd-text-muted">{envEntries.length} variable{envEntries.length !== 1 ? 's' : ''}</span>
            </div>

            {isExpanded && (
              <div className="animate-slide-down">
                {/* Metadata / Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 py-4 border-b border-ccd-border/30 bg-ccd-surface/10">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-ccd-text-muted tracking-wider block">Deployment Strategy</span>
                    <span className="text-xs font-semibold text-ccd-text flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${strategy === 'docker-compose' ? 'bg-ccd-cyan' : 'bg-ccd-success'}`} />
                      {strategy === 'docker-compose' ? 'Docker Compose' : 'Standard Container'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-ccd-text-muted tracking-wider block">Target Branch</span>
                    <span className="text-xs font-mono font-semibold text-ccd-cyan bg-ccd-cyan/5 border border-ccd-cyan/15 px-2 py-0.5 rounded-md inline-block">
                      {(() => {
                        const targetBranch = data.environment?.target_branch || (data.environment?.name?.toLowerCase() === 'production' ? 'main' : 'staging')
                        return validationMap[repo.id]?.resolved_branch || targetBranch || repo.default_branch || 'main'
                      })()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-ccd-text-muted tracking-wider block">Target Image (Auto)</span>
                    <span className="text-xs font-mono text-ccd-text-dim break-all">
                      [dockerhub-user]/{repo.name}:{currentVersionTag}
                    </span>
                  </div>
                </div>

                {/* Version Tag & Release Notes configuration section */}
                <div className="px-5 py-4 border-b border-ccd-border/30 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Version Tag */}
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-semibold text-ccd-text block">
                        Version Tag
                      </label>
                      
                      {composeData[repo.id]?.error && (
                        <div className="text-[10px] text-ccd-danger bg-ccd-danger/10 border border-ccd-danger/25 rounded p-1.5 mb-2 flex items-center justify-between">
                          <span className="truncate">Scan error: {composeData[repo.id].error}</span>
                          <button
                            type="button"
                            onClick={() => fetchComposeServices(repo)}
                            className="underline text-ccd-cyan font-semibold ml-2 shrink-0 hover:text-ccd-cyan-light"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {composeData[repo.id]?.loading ? (
                        <div className="flex items-center gap-2 py-2 text-xs text-ccd-text-muted">
                          <div className="spinner w-3.5 h-3.5 border-t-transparent border-ccd-cyan animate-spin" />
                          <span>Scanning {config[repo.name]?.['COMPOSE_FILE'] || getComposeDefaultPath(repo)} from GitHub...</span>
                        </div>
                      ) : (
                        (() => {
                          let currentTag = ''
                          let suggestedTag = ''

                          if (strategy === 'docker-compose' && composeData[repo.id]?.data?.services?.length) {
                            const services = composeData[repo.id]?.data?.services || []
                            const matchedService = services.find((s: any) => {
                              const img = s.image?.toLowerCase() || ''
                              return img.includes('/') || img.includes(repo.name.toLowerCase())
                            }) || services[0]
                            
                            currentTag = matchedService.current_tag || ''
                            suggestedTag = matchedService.suggested_tag || ''
                          } else {
                            currentTag = ''
                            suggestedTag = 'v1.0.0'
                          }

                          const currentVal = getSpecialVal(repo.name, 'VERSION_TAG', '')
                          const isCustom = isCustomMode[repo.name] || 
                            (currentVal !== '' && 
                             currentVal !== currentTag && 
                             currentVal !== `${currentTag}+` && 
                             (!suggestedTag || currentVal !== suggestedTag))
                          const selectVal = isCustom ? 'custom' : currentVal

                          return (
                            <div className="space-y-2">
                              <select
                                value={selectVal}
                                onChange={(e) => {
                                  const val = e.target.value
                                  if (val === 'custom') {
                                    setIsCustomMode(prev => ({ ...prev, [repo.name]: true }))
                                    setSpecialVal(repo.name, 'VERSION_TAG', '')
                                  } else {
                                    setIsCustomMode(prev => ({ ...prev, [repo.name]: false }))
                                    setSpecialVal(repo.name, 'VERSION_TAG', val)
                                  }
                                }}
                                className="ccd-input text-xs w-full bg-ccd-bg border-ccd-border focus:border-ccd-cyan cursor-pointer"
                              >
                                <option value="">-- Kosongkan --</option>
                                {currentTag && (
                                  <>
                                    <option value={`${currentTag}+`}>{currentTag}+</option>
                                    <option value={currentTag}>{currentTag}</option>
                                  </>
                                )}
                                {!currentTag && suggestedTag && (
                                  <option value={suggestedTag}>{suggestedTag}</option>
                                )}
                                <option value="custom">Kustom / Manual...</option>
                              </select>

                              {selectVal === 'custom' && (
                                <input
                                  type="text"
                                  value={currentVal}
                                  onChange={(e) => {
                                    setSpecialVal(repo.name, 'VERSION_TAG', e.target.value)
                                  }}
                                  placeholder="Ketik tag kustom (contoh: v1.0.1)"
                                  className="ccd-input font-mono text-xs w-full animate-slide-down"
                                />
                              )}
                            </div>
                          )
                        })()
                      )}
                    </div>

                    {/* Release Notes */}
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-semibold text-ccd-text block">
                        Release Notes / Catatan Deployment
                      </label>
                      <textarea
                        value={getSpecialVal(repo.name, 'RELEASE_NOTES')}
                        onChange={(e) => setSpecialVal(repo.name, 'RELEASE_NOTES', e.target.value)}
                        placeholder="Tuliskan catatan rilis (misal: fixing bug auth, update UI dashboard, dsb.)"
                        className="ccd-input text-xs w-full h-[38px] min-h-[38px] max-h-40 resize-y py-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Variables Content */}
                <div className="px-5 py-4 border-b border-ccd-border/30 space-y-4">
                  <h4 className="text-xs font-bold text-ccd-text uppercase tracking-wider">Environment Variables</h4>
                  {bulkRepo === repo.name ? (
                    <div className="space-y-4">
                      <div className="text-xs text-ccd-text-muted">
                        Paste your env file content here (Format: <code>KEY=VALUE</code>). Comments starting with <code>#</code> will be ignored.
                      </div>
                      <textarea
                        value={bulkInput}
                        onChange={e => setBulkInput(e.target.value)}
                        className="ccd-input font-mono text-xs w-full h-40 resize-y"
                        placeholder="PORT=8080&#10;IMAGE_TAG=latest&#10;DATABASE_URL=mysql://..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBulkImport(repo.name)}
                          className="px-3 py-1.5 rounded-lg bg-ccd-accent hover:bg-ccd-accent-light text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Save & Import
                        </button>
                        <button
                          onClick={() => { setBulkRepo(null); setBulkInput(''); }}
                          className="px-3 py-1.5 rounded-lg bg-ccd-muted/30 text-ccd-text-dim text-xs font-semibold hover:bg-ccd-muted/50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {envEntries.map(([key, value]) => (
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

                      {envEntries.length === 0 && (
                        <div className="text-xs text-ccd-text-muted italic py-2">No variables configured</div>
                      )}

                      <div className="flex gap-4 items-center mt-2 pt-2 border-t border-ccd-border/30">
                        {/* Add variable button */}
                        <button
                          onClick={() => addCustomVar(repo.name)}
                          className="flex items-center gap-2 text-xs text-ccd-accent hover:text-ccd-accent-light transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                          </svg>
                          Add Variable
                        </button>

                        {/* Bulk import button */}
                        <button
                          onClick={() => openBulkImport(repo.name)}
                          className="flex items-center gap-2 text-xs text-ccd-cyan hover:text-ccd-cyan-light transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                          </svg>
                          Bulk Import (.env)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Settings */}
                {bulkRepo !== repo.name && (
                  <div className="bg-ccd-muted/5 px-5 py-4 space-y-4">
                    <h4 className="text-xs font-bold text-ccd-text uppercase tracking-wider">Advanced Settings</h4>
                    
                    <div className="space-y-4">
                      {/* Target Deployment Directory */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-ccd-text-muted">Target Directory in VPS</label>
                        <input
                          type="text"
                          value={getSpecialVal(repo.name, 'DEPLOY_DIR', '')}
                          onChange={e => setSpecialVal(repo.name, 'DEPLOY_DIR', e.target.value)}
                          placeholder={`/app/${repo.name}`}
                          className="ccd-input font-mono text-xs w-full"
                        />
                      </div>

                      {/* Dockerfile & Build Target Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Dockerfile Path */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-ccd-text-muted">Dockerfile Path (relative to repo root)</label>
                          <div className="relative flex items-center">
                            <div 
                              onClick={() => setExplorerTarget({ repo, initialPath: getSpecialVal(repo.name, 'DOCKERFILE_PATH', 'Dockerfile'), field: 'DOCKERFILE_PATH' })}
                              className="flex items-center gap-2.5 bg-ccd-surface border border-ccd-border rounded-lg px-3 py-2 text-ccd-text text-sm w-full font-mono select-none pr-12 cursor-pointer hover:border-ccd-accent/40 transition-colors group"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-cyan shrink-0 group-hover:scale-105 transition-transform">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span className="truncate text-xs text-ccd-text-dim group-hover:text-ccd-text transition-colors">
                                {getSpecialVal(repo.name, 'DOCKERFILE_PATH', 'Dockerfile')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExplorerTarget({ repo, initialPath: getSpecialVal(repo.name, 'DOCKERFILE_PATH', 'Dockerfile'), field: 'DOCKERFILE_PATH' })}
                              className="absolute right-2.5 p-1 rounded hover:bg-ccd-muted/20 text-ccd-text-muted hover:text-ccd-warning transition-colors"
                              title="Browse repository files visually"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Target Build Stage */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-ccd-text-muted">Target Build Stage (optional, e.g. prod)</label>
                          <input
                            type="text"
                            value={getSpecialVal(repo.name, 'DOCKER_BUILD_TARGET', '')}
                            onChange={e => setSpecialVal(repo.name, 'DOCKER_BUILD_TARGET', e.target.value)}
                            placeholder="Leave blank for default stage"
                            className="ccd-input font-mono text-xs w-full"
                          />
                        </div>
                      </div>

                      {/* Docker Compose File Path */}
                      {strategy === 'docker-compose' && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-ccd-text-muted">Docker Compose File Path (relative to repo root)</label>
                          <div className="relative flex items-center">
                            <div 
                              onClick={() => setExplorerTarget({ repo, initialPath: getSpecialVal(repo.name, 'COMPOSE_FILE', getComposeDefaultPath(repo)), field: 'COMPOSE_FILE' })}
                              className="flex items-center gap-2.5 bg-ccd-surface border border-ccd-border rounded-lg px-3 py-2 text-ccd-text text-sm w-full font-mono select-none pr-20 cursor-pointer hover:border-ccd-accent/40 transition-colors group"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-cyan shrink-0 group-hover:scale-105 transition-transform">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span className="truncate text-xs text-ccd-text-dim group-hover:text-ccd-text transition-colors">
                                {getSpecialVal(repo.name, 'COMPOSE_FILE', getComposeDefaultPath(repo))}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExplorerTarget({ repo, initialPath: getSpecialVal(repo.name, 'COMPOSE_FILE', getComposeDefaultPath(repo)), field: 'COMPOSE_FILE' })}
                              className="absolute right-11 p-1 rounded hover:bg-ccd-muted/20 text-ccd-text-muted hover:text-ccd-warning transition-colors"
                              title="Browse repository files visually"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => fetchComposeServices(repo)}
                              disabled={composeData[repo.id]?.loading}
                              className="absolute right-2.5 p-1 rounded hover:bg-ccd-muted/20 text-ccd-text-muted hover:text-ccd-cyan transition-colors"
                              title="Scan compose file services"
                            >
                              {composeData[repo.id]?.loading ? (
                                <div className="spinner w-3.5 h-3.5 border-t-transparent border-ccd-cyan animate-spin" />
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Pre-Deploy Commands */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-ccd-text-muted block">
                          Pre-Deploy Script (commands run before container start)
                        </label>
                        <textarea
                          value={getSpecialVal(repo.name, 'PRE_DEPLOY_COMMANDS', '')}
                          onChange={e => setSpecialVal(repo.name, 'PRE_DEPLOY_COMMANDS', e.target.value)}
                          placeholder="e.g. docker volume rm my_volume || true"
                          className="ccd-input font-mono text-xs w-full h-16 resize-y"
                        />
                      </div>

                      {/* Post-Deploy Commands */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-ccd-text-muted block">
                          Post-Deploy Script (commands run after container start)
                        </label>
                        <textarea
                          value={getSpecialVal(repo.name, 'POST_DEPLOY_COMMANDS', '')}
                          onChange={e => setSpecialVal(repo.name, 'POST_DEPLOY_COMMANDS', e.target.value)}
                          placeholder="e.g. docker exec my_container php artisan migrate --force"
                          className="ccd-input font-mono text-xs w-full h-16 resize-y"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {explorerTarget && (
        <FileExplorerModal
          repoId={explorerTarget.repo.id}
          repoName={explorerTarget.repo.name}
          branch={
            validationMap[explorerTarget.repo.id]?.resolved_branch ||
            explorerTarget.repo.default_branch ||
            'main'
          }
          initialPath={explorerTarget.initialPath}
          field={explorerTarget.field}
          onSelect={(path) => {
            const updatedConfig = {
              ...config,
              [explorerTarget.repo.name]: {
                ...(config[explorerTarget.repo.name] || {}),
                [explorerTarget.field]: path
              }
            }
            onChange({ config: updatedConfig })
            if (explorerTarget.field === 'COMPOSE_FILE') {
              fetchComposeServices(explorerTarget.repo, path)
            }
            setExplorerTarget(null)
          }}
          onClose={() => setExplorerTarget(null)}
        />
      )}
    </div>
  )
}
