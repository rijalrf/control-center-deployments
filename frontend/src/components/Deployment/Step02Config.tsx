import React, { useState, useEffect } from 'react'
import { Repository } from '../../types'
import api from '../../services/api'

interface Step02ConfigProps {
  data: {
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
  'RELEASE_NOTES'
]

export default function Step02Config({ data, onChange }: Step02ConfigProps) {
  const { repositories, config } = data
  const [bulkRepo, setBulkRepo] = useState<string | null>(null)
  const [bulkInput, setBulkInput] = useState<string>('')
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({})

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

  const fetchComposeServices = async (repo: Repository) => {
    setComposeData(prev => ({
      ...prev,
      [repo.id]: { loading: true, error: null, data: prev[repo.id]?.data || null }
    }))
    try {
      const validationSaved = localStorage.getItem('ccd_wizard_validation_results')
      const validationMap = validationSaved ? JSON.parse(validationSaved) : {}
      const resolvedBranch = validationMap[repo.id]?.resolved_branch || repo.default_branch || 'main'
      const composePath = validationMap[repo.id]?.docker_compose_path || ''

      const res = await api.get(`/repos/${repo.id}/compose-services`, {
        params: { branch: resolvedBranch, path: composePath }
      })

      setComposeData(prev => ({
        ...prev,
        [repo.id]: { loading: false, error: null, data: res.data }
      }))

      // Pre-populate tag for service matching repository name
      const currentConfig = config[repo.name] || {}
      const hasAnyComposeTag = Object.keys(currentConfig).some(k => k.startsWith('COMPOSE_TAG_'))
      if (!hasAnyComposeTag && res.data.services?.length > 0) {
        const mainService = res.data.services.find((s: any) => s.name.toLowerCase() === repo.name.toLowerCase()) || res.data.services[0]
        onChange({
          config: {
            ...config,
            [repo.name]: {
              ...currentConfig,
              [`COMPOSE_TAG_${mainService.name}`]: mainService.suggested_tag,
              'VERSION_TAG': mainService.suggested_tag,
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
    if (!config[repo.name]) {
      const validationSaved = localStorage.getItem('ccd_wizard_validation_results')
      const validationMap = validationSaved ? JSON.parse(validationSaved) : {}
      const hasCompose = validationMap[repo.id]?.docker_compose_exists || false
      
      onChange({
        config: {
          ...config,
          [repo.name]: {
            'DEPLOY_STRATEGY': hasCompose ? 'docker-compose' : 'standard',
          },
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

        return (
          <div key={repo.id} className="ccd-card overflow-hidden">
            {/* Repo header */}
            <div className="flex items-center gap-3 px-5 py-3 bg-ccd-muted/20 border-b border-ccd-border">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-text-muted shrink-0">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <span className="font-mono text-sm font-semibold text-ccd-cyan">{repo.full_name || repo.name}</span>
              <span className="ml-auto text-xs text-ccd-text-muted">{envEntries.length} variable{envEntries.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Docker Image Name Section */}
            <div className="px-5 pt-4 pb-0">
              {/* Info Card */}
              <div className="flex gap-3 p-3 rounded-xl bg-ccd-warning/8 border border-ccd-warning/25 mb-4">
                <div className="mt-0.5 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-warning">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ccd-warning mb-0.5">Penting: Nama Docker Image</p>
                  <p className="text-[11px] text-ccd-text-muted leading-relaxed">
                    Nama image <strong className="text-ccd-text">harus sama persis</strong> dengan yang tertulis di{' '}
                    <code className="font-mono text-ccd-cyan bg-ccd-muted/30 px-1 py-0.5 rounded text-[10px]">docker-compose.yml</code>{' '}
                    server target sebagai referensi image yang akan di-pull.
                    <br />
                    Kamu bisa isi hanya nama image-nya saja (misal:{' '}
                    <code className="font-mono text-ccd-accent bg-ccd-muted/30 px-1 py-0.5 rounded text-[10px]">lms-app:latest</code>),
                    username Docker Hub dari secret <code className="font-mono text-ccd-cyan bg-ccd-muted/30 px-1 py-0.5 rounded text-[10px]">DOCKERHUB_USERNAME</code>{' '}
                    akan otomatis ditambahkan di depannya oleh workflow.
                  </p>
                </div>
              </div>

              {/* Input */}
              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider shrink-0 w-32">
                  Docker Image Name
                </label>
                <div className="flex-1 relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-ccd-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  <input
                    type="text"
                    placeholder={`${repo.name}:latest  (username otomatis dari secret)`}
                    value={repo.docker_image_name || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedRepos = data.repositories.map(r =>
                        r.id === repo.id ? { ...r, docker_image_name: val } : r
                      );
                      onChange({ repositories: updatedRepos });
                    }}
                    className="ccd-input pl-8 font-mono text-xs w-full"
                  />
                </div>
                {repo.docker_image_name ? (
                  <span className="text-[10px] font-mono badge-success shrink-0 max-w-[120px] truncate" title={repo.docker_image_name}>
                    {repo.docker_image_name}
                  </span>
                ) : (
                  <span className="text-[10px] text-ccd-text-muted shrink-0">default</span>
                )}
              </div>
            </div>

            {/* Docker Compose configuration section */}
            {getSpecialVal(repo.name, 'DEPLOY_STRATEGY') === 'docker-compose' && (
              <div className="px-5 py-4 border-b border-ccd-border/30 space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-ccd-border/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-cyan">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <h4 className="text-xs font-bold text-ccd-cyan uppercase tracking-wider">Docker Compose Configuration</h4>
                </div>

                {composeData[repo.id]?.loading && (
                  <div className="flex items-center gap-2 py-2 text-xs text-ccd-text-muted">
                    <div className="spinner w-3.5 h-3.5 border-t-transparent border-ccd-cyan animate-spin" />
                    <span>Scanning docker-compose.yml from GitHub...</span>
                  </div>
                )}

                {composeData[repo.id]?.error && (
                  <div className="space-y-2 py-1">
                    <div className="text-xs text-ccd-danger bg-ccd-danger/10 border border-ccd-danger/25 rounded-lg p-2.5">
                      Failed to fetch Compose config: {composeData[repo.id].error}
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchComposeServices(repo)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-ccd-muted/30 hover:bg-ccd-muted/50 text-ccd-text rounded-md transition-all border border-ccd-border/40"
                    >
                      Retry Scan
                    </button>
                  </div>
                )}

                {composeData[repo.id]?.data && (
                  <div className="space-y-4">
                    {/* Services List directly in form */}
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-ccd-text-muted block uppercase tracking-wider">
                        Configure Service Version Tags
                      </label>
                      
                      {composeData[repo.id].data?.services.map(s => {
                        const tagKey = `COMPOSE_TAG_${s.name}`
                        const currentVal = getSpecialVal(repo.name, tagKey)
                        
                        return (
                          <div key={s.name} className="flex flex-col sm:flex-row sm:items-center gap-3 py-1">
                            <span className="font-mono text-xs font-bold text-ccd-cyan w-32 truncate shrink-0" title={s.name}>
                              {s.name}
                            </span>
                            <span className="text-[10px] text-ccd-text-muted max-w-[200px] truncate shrink-0 hidden sm:inline" title={s.image}>
                              {s.image}
                            </span>
                            
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                list={`tags-${repo.id}-${s.name}`}
                                value={currentVal}
                                onChange={(e) => {
                                  const tag = e.target.value
                                  const updatedConfig = {
                                    ...(config[repo.name] || {}),
                                    [tagKey]: tag
                                  }
                                  if (tag) {
                                    updatedConfig['VERSION_TAG'] = tag
                                  } else {
                                    const otherTag = Object.keys(updatedConfig)
                                      .find(k => k.startsWith('COMPOSE_TAG_') && updatedConfig[k])
                                    updatedConfig['VERSION_TAG'] = otherTag ? updatedConfig[otherTag] : ''
                                  }
                                  
                                  onChange({
                                    config: {
                                      ...config,
                                      [repo.name]: updatedConfig
                                    }
                                  })
                                }}
                                placeholder="Select or type tag (e.g. v3)"
                                className="ccd-input font-mono text-xs w-full"
                              />
                              <datalist id={`tags-${repo.id}-${s.name}`}>
                                <option value={s.suggested_tag}>{s.suggested_tag} (Saran +1)</option>
                                {s.current_tag && <option value={s.current_tag}>{s.current_tag} (Saat ini)</option>}
                              </datalist>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Release Notes */}
                    <div className="space-y-1 pt-2">
                      <label className="text-xs font-semibold text-ccd-text-muted block">
                        Release Notes / Catatan Deployment
                      </label>
                      <textarea
                        value={getSpecialVal(repo.name, 'RELEASE_NOTES')}
                        onChange={(e) => setSpecialVal(repo.name, 'RELEASE_NOTES', e.target.value)}
                        placeholder="Tuliskan catatan rilis untuk tracking histori (misal: fixing bug auth, update UI dashboard, dsb.)"
                        className="ccd-input text-xs w-full h-20 resize-y"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Variables Content */}
            {bulkRepo === repo.name ? (
              <div className="p-5 space-y-4">
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
              <div className="p-5 space-y-3">
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

            {/* Advanced Settings Accordion */}
            {bulkRepo !== repo.name && (
              <div className="border-t border-ccd-border/30 bg-ccd-muted/5 px-5 py-3">
                <button
                  type="button"
                  onClick={() => toggleAdvanced(repo.name)}
                  className="flex items-center gap-2 text-xs font-semibold text-ccd-text-dim hover:text-ccd-cyan transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className={`w-4 h-4 transition-transform duration-200 ${expandedAdvanced[repo.name] ? 'rotate-90' : ''}`}
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                  Advanced Deployment Settings
                </button>

                {expandedAdvanced[repo.name] && (
                  <div className="mt-4 pt-3 border-t border-ccd-border/20 space-y-4 animate-slide-down">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Strategy Selection */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-ccd-text-muted">Deployment Strategy</label>
                        <select
                          value={getSpecialVal(repo.name, 'DEPLOY_STRATEGY', 'standard')}
                          onChange={e => setSpecialVal(repo.name, 'DEPLOY_STRATEGY', e.target.value)}
                          className="ccd-input text-xs w-full bg-ccd-bg border-ccd-border focus:border-ccd-cyan"
                        >
                          <option value="standard">Standard Container (docker run)</option>
                          <option value="docker-compose">Docker Compose (docker compose)</option>
                        </select>
                      </div>

                      {/* Dockerfile Path */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-ccd-text-muted">Dockerfile Path</label>
                        <input
                          type="text"
                          value={getSpecialVal(repo.name, 'DOCKERFILE_PATH', 'Dockerfile')}
                          onChange={e => setSpecialVal(repo.name, 'DOCKERFILE_PATH', e.target.value)}
                          placeholder="Dockerfile"
                          className="ccd-input font-mono text-xs w-full"
                        />
                      </div>

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

                      {/* Compose File Name */}
                      {getSpecialVal(repo.name, 'DEPLOY_STRATEGY', 'standard') === 'docker-compose' && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-ccd-text-muted">Compose File Name</label>
                          <input
                            type="text"
                            value={getSpecialVal(repo.name, 'COMPOSE_FILE', 'docker-compose.yml')}
                            onChange={e => setSpecialVal(repo.name, 'COMPOSE_FILE', e.target.value)}
                            placeholder="docker-compose.yml"
                            className="ccd-input font-mono text-xs w-full"
                          />
                        </div>
                      )}
                    </div>

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
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
