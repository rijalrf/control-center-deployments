import React, { useState } from 'react'

interface DocSection {
  id: string
  title: string
  icon: React.ReactNode
}

export default function Documentation() {
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [copiedText, setCopiedText] = useState<Record<string, boolean>>({})

  const sections: DocSection[] = [
    {
      id: 'overview',
      title: 'Gambaran Umum & Arsitektur',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'prerequisites',
      title: 'Persyaratan & Secrets',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5 8a3 3 0 11-6 0 3 3 0 016 0zm7-1.333l-1-.666A2 2 0 0015.333 15H14m-3.667 4.667L9.333 19A2 2 0 018.667 17H8m11.333-12.667l-1-.666A2 2 0 0017.333 3H16M8 21a4 4 0 01-4-4V5a4 4 0 014-4h8a4 4 0 014 4v12a4 4 0 01-4 4H8z" />
        </svg>
      )
    },
    {
      id: 'registry',
      title: 'Registrasi & Sinkronisasi',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
        </svg>
      )
    },
    {
      id: 'env-server',
      title: 'Env & Server Setup',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    },
    {
      id: 'workflow',
      title: 'Setup GitHub Actions',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )
    },
    {
      id: 'deployment-wizard',
      title: 'Panduan Deploy & Wizard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'variables',
      title: 'Parameter Konfigurasi',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    }
  ]

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(prev => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setCopiedText(prev => ({ ...prev, [id]: false }))
    }, 2000)
  }

  const codeSnippets = {
    env: `GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_TOKEN=ghp_your_personal_access_token_with_workflow_scope
JWT_SECRET=super_secret_jwt_random_string_here`,
    workflow: `name: Centralized Deployment Pipeline
on:
  workflow_dispatch:
    inputs:
      target_repo_url:
        description: 'URL Clone Repositori Target'
        required: true
      target_repo_name:
        description: 'Nama Repositori Target'
        required: true
      target_repo_path:
        description: 'Path Repositori Target (owner/repo)'
        required: true
      environment:
        description: 'Target Environment'
        required: true
      environment_secret_suffix:
        description: 'Suffix Secret Key (e.g. PRODUCTION)'
        required: true
      config:
        description: 'JSON string konfigurasi env variables'
        required: false
        default: '{}'
      server_host:
        description: 'Server IP / Host'
        required: true
      server_username:
        description: 'SSH Username'
        required: true
      dockerfile_path:
        description: 'Path ke Dockerfile (relatif terhadap root repo)'
        required: false
        default: 'Dockerfile'
      target_ref:
        description: 'Target Branch/Ref to Checkout'
        required: true
        default: 'main'`,
    dockerCompose: `version: '3.8'
services:
  web-app:
    image: \${DOCKERHUB_USERNAME}/\${TARGET_REPO_NAME}:latest
    restart: unless-stopped
    ports:
      - "80:80"
    env_file:
      - .env`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Navigation Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="sticky top-6 flex flex-col gap-2">
            <h2 className="text-xs font-bold text-ccd-text-muted uppercase tracking-wider px-3 mb-2">
              Dokumentasi Menu
            </h2>
            <div className="bg-ccd-card border border-ccd-border rounded-xl p-2 flex flex-col gap-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                    activeTab === section.id
                      ? 'bg-ccd-accent/15 text-ccd-accent border border-ccd-accent/20'
                      : 'text-ccd-text-muted hover:text-ccd-text hover:bg-ccd-muted/40'
                  }`}
                >
                  <span className={activeTab === section.id ? 'text-ccd-accent' : 'text-ccd-text-muted'}>
                    {section.icon}
                  </span>
                  <span className="truncate">{section.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 bg-ccd-card border border-ccd-border rounded-xl p-6 md:p-8">
          
          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-ccd-text flex items-center gap-2">
                <span>📖</span> Gambaran Umum & Arsitektur
              </h1>
              <p className="text-ccd-text-dim leading-relaxed">
                <strong>Control Center Deployment (CCD)</strong> adalah dashboard terpusat yang dirancang untuk mengelola dan melacak alur deployment kode ke remote server menggunakan pipeline GitHub Actions. 
                Dengan CCD, Anda tidak perlu mengonfigurasi pipeline CI/CD yang kompleks di setiap repositori. Anda cukup menghubungkan repositori ke sistem pusat, lalu meluncurkan deployment secara langsung dari antarmuka visual yang modern.
              </p>

              <div className="bg-ccd-surface border border-ccd-border rounded-xl p-6">
                <h3 className="text-sm font-semibold text-ccd-text mb-4">Arsitektur Aliran Kerja</h3>
                <div className="overflow-x-auto">
                  <pre className="text-xs font-mono bg-black/30 text-ccd-cyan p-4 rounded-lg border border-ccd-border leading-loose">
{`[Browser (Dashboard)] ──(Trigger API)──► [Backend Service (Express)]
                                                │
                                        (Dispatch Workflow)
                                                ▼
  [Remote Server VPS] ◄──(Deploy SSH)─── [GitHub Actions Pipeline]
  - Docker Compose                       - Build Container Image
  - Standard Docker                      - Push ke Docker Hub
  - Env Verification                     - Triggers Remote SSH Script`}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-ccd-border rounded-xl bg-ccd-surface/30">
                  <h4 className="font-semibold text-sm text-ccd-text mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-ccd-accent" />
                    Manajemen Terpusat
                  </h4>
                  <p className="text-xs text-ccd-text-muted">
                    Satu repositori GitHub Actions pusat bertindak sebagai pipeline engine untuk semua proyek aplikasi Anda.
                  </p>
                </div>
                <div className="p-4 border border-ccd-border rounded-xl bg-ccd-surface/30">
                  <h4 className="font-semibold text-sm text-ccd-text mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-ccd-cyan" />
                    Fleksibel & Cepat
                  </h4>
                  <p className="text-xs text-ccd-text-muted">
                    Mendukung deployment berbasis Docker Compose untuk multi-kontainer atau Standard Docker container dengan custom scripting pre/post deploy.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Prerequisites */}
          {activeTab === 'prerequisites' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-ccd-text flex items-center gap-2">
                <span>🔑</span> Persyaratan & Secrets
              </h1>
              <p className="text-ccd-text-dim leading-relaxed">
                Sebelum menggunakan sistem Control Center Deployment untuk melakukan deploy, pastikan Anda telah menyiapkan variabel environment serta konfigurasi GitHub Secrets berikut dengan benar.
              </p>

              <div className="space-y-4">
                <div className="border border-ccd-border rounded-xl overflow-hidden">
                  <div className="bg-ccd-surface px-4 py-3 border-b border-ccd-border">
                    <h3 className="text-sm font-semibold text-ccd-text">Variabel Environment Backend (.env)</h3>
                  </div>
                  <div className="p-4 bg-black/15">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-ccd-text-muted">Isi file konfigurasi .env</span>
                      <button 
                        onClick={() => handleCopy('env', codeSnippets.env)}
                        className="text-xs text-ccd-accent hover:underline flex items-center gap-1"
                      >
                        {copiedText['env'] ? 'Tersalin! ✅' : 'Salin Kode'}
                      </button>
                    </div>
                    <pre className="text-xs font-mono bg-black/45 text-ccd-text-dim p-3 rounded border border-ccd-border overflow-x-auto">
                      {codeSnippets.env}
                    </pre>
                  </div>
                </div>

                <div className="bg-ccd-warning/10 border border-ccd-warning/30 rounded-xl p-4 text-sm text-ccd-warning flex gap-3">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <h4 className="font-semibold mb-1">Penting: GitHub Personal Access Token (PAT)</h4>
                    <p className="text-xs text-ccd-warning/80 leading-relaxed">
                      Token GITHUB_TOKEN di atas memerlukan hak akses minimal <strong>repo</strong> (untuk membaca kode private) dan <strong>workflow</strong> (untuk men-dispatch workflow GitHub Actions secara remote).
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ccd-text">GitHub Actions Secrets (Pada Repositori Pusat)</h3>
                  <p className="text-xs text-ccd-text-muted">
                    Tambahkan secret berikut di repositori GitHub pusat Anda via menu <strong>Settings &gt; Secrets and variables &gt; Actions &gt; Repository secrets</strong>:
                  </p>
                  
                  <div className="overflow-x-auto border border-ccd-border rounded-xl">
                    <table className="ccd-table">
                      <thead>
                        <tr>
                          <th>Secret Key</th>
                          <th>Deskripsi</th>
                          <th>Kebutuhan</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-mono text-ccd-cyan text-xs">GIT_TOKEN</td>
                          <td>Personal Access Token (PAT) dengan akses pull repo.</td>
                          <td>Wajib</td>
                        </tr>
                        <tr>
                          <td className="font-mono text-ccd-cyan text-xs">DOCKERHUB_USERNAME</td>
                          <td>Username Docker Hub Anda untuk push build image.</td>
                          <td>Opsional (jika diset, image akan dipush ke registry)</td>
                        </tr>
                        <tr>
                          <td className="font-mono text-ccd-cyan text-xs">DOCKERHUB_TOKEN</td>
                          <td>Access token Docker Hub (bukan password utama).</td>
                          <td>Opsional (dibutuhkan jika username diset)</td>
                        </tr>
                        <tr>
                          <td className="font-mono text-ccd-cyan text-xs">SSH_KEY_PRODUCTION</td>
                          <td>Private SSH Key untuk login ke server Production.</td>
                          <td>Wajib jika menggunakan env Production</td>
                        </tr>
                        <tr>
                          <td className="font-mono text-ccd-cyan text-xs">SSH_KEY_STAGING</td>
                          <td>Private SSH Key untuk login ke server Staging.</td>
                          <td>Wajib jika menggunakan env Staging</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Registry */}
          {activeTab === 'registry' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-ccd-text flex items-center gap-2">
                <span>📦</span> Registrasi & Sinkronisasi Repositori
              </h1>
              <p className="text-ccd-text-dim leading-relaxed">
                Untuk mendaftarkan proyek baru ke dalam Control Center, Anda perlu mengimpor repositori dari akun atau organisasi GitHub Anda melalui tab <strong>Repositories</strong>.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-ccd-accent/20 text-ccd-accent flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ccd-text mb-1">Masuk ke Halaman Repositories</h3>
                    <p className="text-xs text-ccd-text-muted leading-relaxed">
                      Navigasikan kursor Anda ke menu **Repositories** di sebelah kiri dashboard utama. Halaman ini akan menampilkan daftar repositori yang telah terdaftar dalam sistem local database.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-ccd-accent/20 text-ccd-accent flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ccd-text mb-1">Klik Sync Repositories</h3>
                    <p className="text-xs text-ccd-text-muted leading-relaxed">
                      Tekan tombol **Sync Repositories** di sudut kanan atas. Dashboard akan memanggil API GitHub menggunakan OAuth / Personal Access Token Anda untuk mengambil repositori publik maupun privat terbaru, lalu menyinkronkannya dengan database Control Center.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-ccd-accent/20 text-ccd-accent flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ccd-text mb-1">Verifikasi Status Visibilitas</h3>
                    <p className="text-xs text-ccd-text-muted leading-relaxed">
                      Pastikan repositori yang disinkronkan memiliki label visibilitas yang sesuai (`public` atau `private`). Jika repositori bersifat private, pastikan token `GIT_TOKEN` Anda di GitHub Secrets memiliki izin akses yang memadai untuk melakukan checkout repositori tersebut.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Env & Server */}
          {activeTab === 'env-server' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-ccd-text flex items-center gap-2">
                <span>⚙️</span> Env & Server Setup
              </h1>
              <p className="text-ccd-text-dim leading-relaxed">
                Sebelum melakukan deploy, tentukan ke mana kode aplikasi akan dikirim. CCD mengelompokkan server tujuan berdasarkan <strong>Environments</strong>.
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-ccd-text mb-2">1. Menyiapkan Environment</h3>
                  <p className="text-xs text-ccd-text-muted leading-relaxed mb-3">
                    Environment (seperti <em>staging</em> atau <em>production</em>) digunakan untuk membagi target deployment. Anda dapat mengonfigurasinya melalui tab <strong>Configuration &gt; Environments</strong>.
                  </p>
                  <ul className="list-disc pl-5 text-xs text-ccd-text-dim space-y-1">
                    <li><strong>Slug:</strong> Slug yang digunakan harus sesuai dengan suffix secret di GitHub. Contoh slug: <code className="text-ccd-cyan bg-black/20 px-1 py-0.5 rounded">production</code> akan memetakan SSH key ke secret <code className="text-ccd-cyan bg-black/20 px-1 py-0.5 rounded">SSH_KEY_PRODUCTION</code>.</li>
                    <li><strong>Warna:</strong> Pilih kode warna penanda (Hex) untuk memberikan indikasi visual yang jelas pada dashboard deployment.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ccd-text mb-2">2. Menyiapkan Server SSH</h3>
                  <p className="text-xs text-ccd-text-muted leading-relaxed mb-3">
                    Setiap Environment harus memiliki minimal satu server yang terhubung. Konfigurasikan pada menu <strong>Configuration &gt; Servers</strong> dengan atribut:
                  </p>
                  <div className="overflow-x-auto border border-ccd-border rounded-xl">
                    <table className="ccd-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Deskripsi</th>
                          <th>Contoh</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-semibold text-xs text-ccd-text">Name</td>
                          <td>Nama pengenal server.</td>
                          <td><code className="text-xs text-ccd-text-muted">Main VPS Production</code></td>
                        </tr>
                        <tr>
                          <td className="font-semibold text-xs text-ccd-text">Host</td>
                          <td>IP Address publik VPS atau domain server.</td>
                          <td><code className="text-xs text-ccd-text-muted">103.18.23.44</code></td>
                        </tr>
                        <tr>
                          <td className="font-semibold text-xs text-ccd-text">Username</td>
                          <td>User SSH yang digunakan untuk login ke server.</td>
                          <td><code className="text-xs text-ccd-text-muted">ubuntu</code> atau <code className="text-xs text-ccd-text-muted">deploy</code></td>
                        </tr>
                        <tr>
                          <td className="font-semibold text-xs text-ccd-text">SSH Port</td>
                          <td>Port SSH yang terbuka di VPS.</td>
                          <td><code className="text-xs text-ccd-text-muted">22</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-ccd-accent/15 border border-ccd-accent/30 rounded-xl p-4 text-xs text-ccd-text-dim leading-relaxed flex gap-3">
                  <span className="text-lg">💡</span>
                  <p>
                    <strong>Akses Server:</strong> Pastikan user server Anda (misal `ubuntu`) terdaftar di dalam grup `docker` pada VPS target agar dapat menjalankan perintah docker tanpa menggunakan kata kunci `sudo` manual.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Workflow */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-ccd-text flex items-center gap-2">
                <span>🚀</span> Setup GitHub Actions Central Workflow
              </h1>
              <p className="text-ccd-text-dim leading-relaxed">
                Di bawah ini adalah file workflow utama yang dipicu secara remote oleh dashboard. Simpan kode ini ke dalam file path berikut di repositori deployment Anda:
                <br />
                <code className="text-ccd-cyan bg-black/20 px-1 py-0.5 rounded text-xs">.github/workflows/central-deploy.yml</code>
              </p>

              <div className="border border-ccd-border rounded-xl overflow-hidden">
                <div className="bg-ccd-surface px-4 py-3 border-b border-ccd-border flex justify-between items-center">
                  <span className="text-xs font-mono text-ccd-text-muted">.github/workflows/central-deploy.yml</span>
                  <button 
                    onClick={() => handleCopy('workflow', codeSnippets.workflow)}
                    className="text-xs text-ccd-accent hover:underline flex items-center gap-1"
                  >
                    {copiedText['workflow'] ? 'Tersalin! ✅' : 'Salin Workflow'}
                  </button>
                </div>
                <div className="p-4 bg-black/15 max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono text-ccd-text-dim leading-relaxed font-semibold">
                    {codeSnippets.workflow}
                  </pre>
                </div>
              </div>

              <div className="bg-ccd-surface border border-ccd-border rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-ccd-text">Bagaimana cara kerjanya?</h3>
                <ol className="list-decimal pl-5 text-xs text-ccd-text-dim space-y-1 leading-relaxed">
                  <li>Dashboard CCD mengirimkan request HTTP POST (Workflow Dispatch) ke API GitHub dengan parameter target repositori, server, dan environment.</li>
                  <li>GitHub Actions melakukan checkout project kode berdasarkan target branch.</li>
                  <li>Sistem membangun Docker container image baru dari file Dockerfile aplikasi target.</li>
                  <li>Kontainer didorong ke Docker Hub registry (opsional).</li>
                  <li>Menggunakan SSH Action, runner GitHub Actions login ke VPS target, menulis variabel konfigurasi ke file <code className="text-ccd-cyan bg-black/20 px-1 rounded">.env</code> lokal server, melakukan pull image terbaru, dan menjalankan ulang kontainer aplikasi secara mulus.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Tab: Deployment Wizard */}
          {activeTab === 'deployment-wizard' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-ccd-text flex items-center gap-2">
                <span>💻</span> Panduan Deploy & Wizard
              </h1>
              <p className="text-ccd-text-dim leading-relaxed">
                Melakukan deploy menggunakan wizard 3-Langkah di Control Center sangatlah mudah. Cukup masuk ke menu <strong>Deployment &gt; Create New Deployment</strong>.
              </p>

              <div className="space-y-6">
                <div className="relative pl-8 border-l border-ccd-border">
                  <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-ccd-accent flex items-center justify-center text-xs font-bold text-white">
                    1
                  </div>
                  <h3 className="font-semibold text-sm text-ccd-text mb-1">Langkah 1: Setup Target & Repositori</h3>
                  <p className="text-xs text-ccd-text-muted leading-relaxed">
                    Pilih target <strong>Environment</strong> (misalnya Production atau Staging) dan pilih repositori mana saja yang ingin dideploy secara bersamaan. Anda dapat mencentang lebih dari satu repositori jika ingin melakukan deployment multi-servis secara simultan.
                  </p>
                </div>

                <div className="relative pl-8 border-l border-ccd-border">
                  <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-ccd-accent flex items-center justify-center text-xs font-bold text-white">
                    2
                  </div>
                  <h3 className="font-semibold text-sm text-ccd-text mb-1">Langkah 2: Konfigurasi Environment Variable</h3>
                  <p className="text-xs text-ccd-text-muted leading-relaxed">
                    Sistem akan membaca file <code className="text-ccd-cyan bg-black/20 px-1 rounded">.env.example</code> dari setiap repositori secara otomatis untuk melacak key apa saja yang diperlukan. Masukkan nilai/value konfigurasi untuk setiap key yang terdaftar. Anda juga dapat menentukan parameter khusus seperti strategi docker-compose dan file penentu di sini.
                  </p>
                </div>

                <div className="relative pl-8 border-l border-ccd-border">
                  <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-ccd-accent flex items-center justify-center text-xs font-bold text-white">
                    3
                  </div>
                  <h3 className="font-semibold text-sm text-ccd-text mb-1">Langkah 3: Review & Execution</h3>
                  <p className="text-xs text-ccd-text-muted leading-relaxed">
                    Periksa kembali daftar server target, branch checkout yang dipilih, dan variabel config. Tekan tombol **Start Deployment** untuk mulai menjalankan pipeline. Dashboard akan menampilkan log pipeline GitHub Actions secara langsung secara real-time. Anda dapat melihat kegagalan atau keberhasilan setiap step secara instan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Variables */}
          {activeTab === 'variables' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-ccd-text flex items-center gap-2">
                <span>🛠️</span> Parameter & Variabel Konfigurasi Khusus
              </h1>
              <p className="text-ccd-text-dim leading-relaxed">
                Di <strong>Langkah 2 (Konfigurasi)</strong> pada Wizard Deployment, Anda dapat menambahkan key khusus berikut di luar isi <code className="text-ccd-cyan bg-black/20 px-1 rounded">.env</code> aplikasi untuk mengontrol perilaku alur deployment pada server target.
              </p>

              <div className="overflow-x-auto border border-ccd-border rounded-xl">
                <table className="ccd-table">
                  <thead>
                    <tr>
                      <th>Key Konfigurasi</th>
                      <th>Tipe / Pilihan</th>
                      <th>Default</th>
                      <th>Fungsi / Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-mono text-ccd-cyan text-xs">DEPLOY_STRATEGY</td>
                      <td><code className="text-xs text-ccd-text-muted">standard</code> | <code className="text-xs text-ccd-text-muted">docker-compose</code></td>
                      <td><code className="text-xs text-ccd-text-muted">standard</code></td>
                      <td>Menentukan apakah deployment akan dijalankan sebagai kontainer mandiri atau menggunakan docker-compose.</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-ccd-cyan text-xs">DEPLOY_DIR</td>
                      <td>Path Direktori Server</td>
                      <td><code className="text-xs text-ccd-text-muted">/app/[repo-name]</code></td>
                      <td>Direktori tujuan penulisan file <code className="text-xs text-ccd-text-muted">.env</code> dan file compose di dalam VPS target.</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-ccd-cyan text-xs">COMPOSE_FILE</td>
                      <td>Nama File YAML</td>
                      <td><code className="text-xs text-ccd-text-muted">docker-compose.yml</code></td>
                      <td>Nama file konfigurasi Compose yang dibaca jika <code className="text-xs text-ccd-text-muted">DEPLOY_STRATEGY</code> diset ke docker-compose.</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-ccd-cyan text-xs">DOCKERFILE_PATH</td>
                      <td>Path File Lokal</td>
                      <td><code className="text-xs text-ccd-text-muted">Dockerfile</code></td>
                      <td>Lokasi Dockerfile relatif terhadap root direktori repositori Anda.</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-ccd-cyan text-xs">PRE_DEPLOY_COMMANDS</td>
                      <td>Shell Script (Multi-line)</td>
                      <td>Kosong</td>
                      <td>Perintah bash shell yang akan dieksekusi tepat sebelum container/compose dijalankan (misal: membersihkan folder cache).</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-ccd-cyan text-xs">POST_DEPLOY_COMMANDS</td>
                      <td>Shell Script (Multi-line)</td>
                      <td>Kosong</td>
                      <td>Perintah bash shell yang dieksekusi sesudah container berjalan (misal: menjalankan database migration / seeder).</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border border-ccd-border rounded-xl overflow-hidden bg-ccd-surface/20">
                <div className="bg-ccd-surface px-4 py-2 border-b border-ccd-border">
                  <span className="text-xs font-semibold text-ccd-text">Contoh penggunaan DEPLOY_STRATEGY: docker-compose</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-ccd-text-muted">
                    Jika Anda menggunakan strategi docker-compose, pastikan repositori target Anda sudah memiliki file <code className="text-ccd-cyan bg-black/20 px-1 rounded">docker-compose.yml</code>. Berikut adalah contoh file compose minimal yang mengambil image hasil build dari pipeline:
                  </p>
                  <pre className="text-xs font-mono bg-black/40 text-ccd-text-dim p-3 rounded border border-ccd-border overflow-x-auto">
                    {codeSnippets.dockerCompose}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
