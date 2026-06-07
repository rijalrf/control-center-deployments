import React from 'react'
import { Environment, Repository } from '../../types'

interface Step03ReviewProps {
  data: {
    environment: Environment | null;
    repositories: Repository[];
    config: Record<string, Record<string, string>>;
  };
  validationResults?: Record<number, {
    resolved_branch: string;
    desired_branch: string;
    exists: boolean;
    fallback_used: boolean;
  }>;
}

export default function Step03Review({ data, validationResults = {} }: Step03ReviewProps) {
  const { environment, repositories, config } = data

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2 p-4 rounded-xl bg-ccd-warning/10 border border-ccd-warning/25">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-ccd-warning shrink-0">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="text-sm text-ccd-warning">
          Please review all parameters carefully before executing the deployment.
          This action cannot be undone.
        </p>
      </div>

      {/* Environment */}
      <div className="ccd-card p-5">
        <div className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-3">
          Target Environment
        </div>
        {environment ? (
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: environment.color }} />
            <div>
              <div className="text-sm font-semibold text-ccd-text">{environment.name}</div>
              <div className="text-xs text-ccd-text-muted font-mono">{environment.slug}</div>
            </div>
          </div>
        ) : (
          <span className="text-sm text-ccd-danger">Not selected</span>
        )}
      </div>

      {/* Applications */}
      <div className="ccd-card p-5">
        <div className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-3">
          Applications ({repositories.length})
        </div>
        {repositories.length === 0 ? (
          <div className="text-sm text-ccd-danger">No applications selected</div>
        ) : (
          <div className="space-y-3">
            {repositories.map(repo => {
              const result = validationResults[repo.id];
              const validatedBranch = result?.resolved_branch || repo.default_branch;
              const fallbackUsed = result?.fallback_used;
              return (
                <div key={repo.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 rounded-xl bg-ccd-muted/20 border border-ccd-border/30 hover:border-ccd-border/80 transition-all duration-150">
                  <div className="flex items-start gap-3 min-w-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ccd-text-muted mt-0.5 shrink-0">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-ccd-text truncate">{repo.name}</div>
                      <div className="text-[10px] text-ccd-text-muted truncate mt-0.5">{repo.full_name}</div>
                      
                      {/* Image name details */}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-semibold text-ccd-text-muted uppercase tracking-wider">Image:</span>
                        {(() => {
                          const versionTag = config[repo.name]?.['VERSION_TAG'] || 'latest';
                          if (repo.docker_image_name) {
                            const lastColon = repo.docker_image_name.lastIndexOf(':');
                            const lastSlash = repo.docker_image_name.lastIndexOf('/');
                            const hasTag = lastColon !== -1 && lastColon > lastSlash;
                            const baseImage = hasTag ? repo.docker_image_name.substring(0, lastColon) : repo.docker_image_name;
                            return (
                              <span className="text-[10px] font-mono text-ccd-accent bg-ccd-accent/10 py-0.5 px-2 rounded font-semibold border border-ccd-accent/20">
                                {`${baseImage}:${versionTag}`}
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-[10px] font-mono text-ccd-text-dim bg-ccd-muted/10 py-0.5 px-2 rounded font-medium">
                                {`<DOCKERHUB_USERNAME>/${repo.name}:${versionTag}`}
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:ml-auto shrink-0">
                    <span className="text-[9px] font-semibold text-ccd-text-muted uppercase tracking-wider">Branch:</span>
                    <span className={`text-[10px] font-mono py-0.5 px-2 rounded font-semibold border ${
                      fallbackUsed 
                        ? 'bg-ccd-danger/10 text-ccd-danger border-ccd-danger/25' 
                        : 'bg-ccd-success/10 text-ccd-success border-ccd-success/25'
                    }`}>
                      {validatedBranch}
                    </span>
                    {fallbackUsed && (
                      <span className="text-[9px] font-bold text-ccd-danger uppercase tracking-wider animate-pulse">
                        fallback
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="ccd-card p-5">
        <div className="text-xs font-semibold text-ccd-text-muted uppercase tracking-wider mb-3">
          Configuration Variables
        </div>
        {Object.keys(config).length === 0 ? (
          <div className="text-sm text-ccd-text-muted italic">No configuration variables</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(config).map(([repoName, vars]) => (
              <div key={repoName}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ccd-cyan" />
                  <span className="text-xs font-semibold text-ccd-cyan font-mono">{repoName}</span>
                </div>
                <div className="rounded-lg border border-ccd-border overflow-hidden">
                  {vars && Object.entries(vars).length > 0 ? (
                    Object.entries(vars).map(([key, val], i, arr) => (
                      <div key={key} className={`flex items-start text-xs font-mono ${i < arr.length - 1 ? 'border-b border-ccd-border/40' : ''}`}>
                        <span className="px-3 py-2 text-ccd-warning min-w-[160px] bg-ccd-muted/20 border-r border-ccd-border/40 select-all">{key}</span>
                        <span className="px-3 py-2 text-ccd-text-dim break-all select-all">{val || <em className="opacity-40">empty</em>}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-ccd-text-muted italic">No variables</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="ccd-card py-3">
          <div className="text-lg font-bold gradient-text">{repositories.length}</div>
          <div className="text-xs text-ccd-text-muted">Apps</div>
        </div>
        <div className="ccd-card py-3">
          <div className="text-lg font-bold gradient-text">
            {Object.values(config).reduce((acc, v) => acc + (v ? Object.keys(v).length : 0), 0)}
          </div>
          <div className="text-xs text-ccd-text-muted">Variables</div>
        </div>
        <div className="ccd-card py-3">
          <div className="text-sm font-bold text-ccd-text capitalize">{environment?.slug || '—'}</div>
          <div className="text-xs text-ccd-text-muted">Environment</div>
        </div>
      </div>
    </div>
  )
}
