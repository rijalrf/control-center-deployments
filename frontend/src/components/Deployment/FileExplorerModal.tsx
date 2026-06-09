import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from '../../services/api'

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
}

interface FileExplorerModalProps {
  repoId: number;
  repoName: string;
  branch: string;
  initialPath?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

export default function FileExplorerModal({
  repoId,
  repoName,
  branch,
  initialPath = '',
  onSelect,
  onClose
}: FileExplorerModalProps) {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)

  // Initialize path from initial file path (extract parent directory)
  useEffect(() => {
    if (initialPath) {
      const parts = initialPath.split('/')
      if (parts.length > 1) {
        // has directory path
        setCurrentPath(parts.slice(0, -1).join('/'))
      } else {
        setCurrentPath('')
      }
    } else {
      setCurrentPath('')
    }
  }, [initialPath])

  // Fetch directory contents whenever currentPath changes
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setSelectedFile(null)

    api.get(`/repos/${repoId}/contents`, {
      params: { branch, path: currentPath }
    })
      .then(res => {
        if (!active) return
        // Sort: directories first, then files alphabetically
        const sorted = (res.data as FileItem[]).sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'dir' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })
        setItems(sorted)
      })
      .catch(err => {
        if (!active) return
        setError(err.response?.data?.error || err.message || 'Failed to read repository contents')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [repoId, branch, currentPath])

  // Breadcrumb path parts
  const breadcrumbs = useMemo(() => {
    if (!currentPath) return []
    const parts = currentPath.split('/')
    return parts.map((part, index) => ({
      name: part,
      path: parts.slice(0, index + 1).join('/')
    }))
  }, [currentPath])

  const handleFolderClick = (path: string) => {
    setCurrentPath(path)
  }

  const handleFileClick = (item: FileItem) => {
    setSelectedFile(item)
  }

  const handleSelectConfirm = () => {
    if (selectedFile) {
      onSelect(selectedFile.path)
    }
  }

  const isComposeFile = (name: string) => {
    const n = name.toLowerCase()
    return n.includes('docker-compose') && (n.endsWith('.yml') || n.endsWith('.yaml'))
  }

  const isYamlFile = (name: string) => {
    const n = name.toLowerCase()
    return n.endsWith('.yml') || n.endsWith('.yaml')
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" style={{ marginTop: 0 }}>
      <div className="ccd-card w-full max-w-2xl mx-4 rounded-2xl border border-ccd-border shadow-2xl animate-slide-down flex flex-col h-[520px] bg-ccd-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ccd-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-ccd-text">Repository File Explorer</h3>
            <p className="text-xs text-ccd-text-muted mt-0.5">
              Select a file from <span className="font-mono text-ccd-text-dim">@{repoName}</span> ({branch})
            </p>
          </div>
          <button onClick={onClose} className="ccd-btn-ghost p-1.5 rounded-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation / Breadcrumbs */}
        <div className="px-6 py-2.5 bg-ccd-card/50 border-b border-ccd-border shrink-0 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setCurrentPath('')}
            className="text-ccd-accent hover:underline shrink-0"
          >
            {repoName.split('/').pop()}
          </button>
          
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={idx}>
              <span className="text-ccd-text-muted">/</span>
              <button
                onClick={() => handleFolderClick(bc.path)}
                className="text-ccd-accent hover:underline shrink-0"
              >
                {bc.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Items Listing */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
              <div className="spinner w-8 h-8 border-t-transparent border-ccd-accent animate-spin" />
              <span className="text-xs text-ccd-text-muted font-mono">Fetching repository tree...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-ccd-danger mb-3">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-ccd-danger text-sm font-medium">Failed to retrieve contents</p>
              <p className="text-ccd-text-muted text-xs mt-1 max-w-sm">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-12 h-12 text-ccd-text-muted mb-2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-ccd-text-muted text-xs font-mono">This directory is empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Up directory if not at root */}
              {currentPath && (
                <div
                  onClick={() => {
                    const parts = currentPath.split('/')
                    setCurrentPath(parts.length > 1 ? parts.slice(0, -1).join('/') : '')
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-ccd-border hover:bg-ccd-muted/30 cursor-pointer text-xs font-semibold text-ccd-text-dim transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ccd-accent">
                    <path d="M19 12H5m7 7l-7-7 7-7" />
                  </svg>
                  <span>.. (Up Directory)</span>
                </div>
              )}

              {items.map(item => {
                const isSelected = selectedFile?.path === item.path
                const isCompose = isComposeFile(item.name)
                const isYaml = isYamlFile(item.name)

                if (item.type === 'dir') {
                  return (
                    <div
                      key={item.path}
                      onClick={() => handleFolderClick(item.path)}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-ccd-border/40 bg-ccd-card/30 hover:border-ccd-accent/40 hover:bg-ccd-accent/5 cursor-pointer text-xs font-medium text-ccd-text transition-all group"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-ccd-warning shrink-0 group-hover:scale-105 transition-transform">
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                      </svg>
                      <span className="truncate">{item.name}</span>
                    </div>
                  )
                }

                return (
                  <div
                    key={item.path}
                    onClick={() => handleFileClick(item)}
                    onDoubleClick={() => {
                      onSelect(item.path)
                    }}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                      isSelected
                        ? 'border-ccd-accent bg-ccd-accent/15 text-ccd-accent-light'
                        : 'border-ccd-border/40 hover:border-ccd-border hover:bg-ccd-muted/20 text-ccd-text-dim'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 shrink-0 text-ccd-text-muted">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="truncate font-mono">{item.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ccd-border bg-ccd-card/30 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-mono text-ccd-text-muted block">Selected File Path</span>
            <span className="text-xs font-mono text-ccd-text truncate block mt-0.5">
              {selectedFile ? selectedFile.path : <em className="opacity-40">Please select a file...</em>}
            </span>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="ccd-btn-secondary text-xs px-3.5 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSelectConfirm}
              disabled={!selectedFile}
              className="ccd-btn-primary text-xs px-3.5 py-2"
            >
              Select File
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
