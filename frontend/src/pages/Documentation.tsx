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
      title: '1. Gambaran Umum & Arsitektur',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'prerequisites',
      title: '2. Persyaratan & Secrets',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5 8a3 3 0 11-6 0 3 3 0 016 0zm7-1.333l-1-.666A2 2 0 0015.333 15H14m-3.667 4.667L9.333 19A2 2 0 018.667 17H8m11.333-12.667l-1-.666A2 2 0 0017.333 3H16M8 21a4 4 0 01-4-4V5a4 4 0 014-4h8a4 4 0 014 4v12a4 4 0 01-4 4H8z" />
        </svg>
      )
    },
    {
      id: 'env-server',
      title: '3. Environment & Server Setup',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    },
    {
      id: 'workflow',
      title: '4. Setup GitHub Actions',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )
    },
    {
      id: 'deployment-workflow',
      title: '5. Alur Deploy: Branch vs Image',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'variables',
      title: '6. Parameter Konfigurasi Khusus',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    },
    {
      id: 'troubleshooting',
      title: '7. Troubleshooting & Tips',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
JWT_SECRET=super_secret_jwt_random_string_here
GITHUB_CENTRAL_OWNER=repo_owner
GITHUB_CENTRAL_REPO=control-center-deployments`,
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
        default: 'main'
      docker_image_name:
        description: 'Nama Custom Docker Image (opsional)'
        required: false
        default: ''
      build_target:
        description: 'Target Stage Dockerfile (opsional)'
        required: false
        default: ''`,
    dockerCompose: `version: '3.8'
services:
  web-app:
    # Mengambil docker image otomatis dari pipeline
    image: \${DOCKERHUB_USERNAME}/\${TARGET_REPO_NAME}:latest
    restart: unless-stopped
    ports:
      - "8080:80"
    env_file:
      - .env`
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-6xl">
      <div className="flex flex-col md:flex-row gap-10">
        
        {/* Navigation Sidebar (Card-less & Minimalist) */}
        <div className="w-full md:w-64 shrink-0">
          <div className="sticky top-8 flex flex-col">
            <h2 className="text-[10px] font-bold text-ccd-text-muted uppercase tracking-widest mb-4 px-2">
              Daftar Dokumentasi
            </h2>
            <nav className="flex flex-col space-y-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left border-l-2 ${
                    activeTab === section.id
                      ? 'border-ccd-accent bg-ccd-accent/5 text-ccd-accent font-semibold'
                      : 'border-transparent text-ccd-text-dim hover:text-ccd-text hover:bg-ccd-muted/15 font-medium'
                  }`}
                >
                  <span className={activeTab === section.id ? 'text-ccd-accent' : 'text-ccd-text-muted'}>
                    {section.icon}
                  </span>
                  <span className="truncate">{section.title.substring(3)}</span>
                </button>
              ))}
            </nav>
            
            <div className="mt-8 pt-6 border-t border-ccd-border/50 px-3">
              <span className="text-xs text-ccd-text-muted block leading-relaxed">
                Control Center Deployments v1.0.0
              </span>
              <span className="text-[10px] text-ccd-text-muted/65 block mt-1">
                Last updated: June 2026
              </span>
            </div>
          </div>
        </div>

        {/* Content Area (Clean Article Style, Card-less) */}
        <div className="flex-1 min-w-0 pt-1 pb-16">
          
          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-ccd-text tracking-tight mb-2">
                  Gambaran Umum & Arsitektur
                </h1>
                <p className="text-sm text-ccd-text-muted">
                  Memahami prinsip kerja dasar dan arsitektur aliran data di Control Center Deployment (CCD).
                </p>
              </div>

              <hr className="border-ccd-border/50" />

              <p className="text-sm text-ccd-text-dim leading-relaxed">
                <strong>Control Center Deployment (CCD)</strong> adalah orkestrator deployment terpusat yang dirancang untuk mengotomatisasi penyebaran container aplikasi ke server target (VPS) via remote pipeline GitHub Actions. 
                Dengan CCD, Anda tidak perlu mengonfigurasi atau menulis pipeline CI/CD yang berulang pada setiap repositori aplikasi. Cukup daftarkan repositori Anda di panel ini, lakukan konfigurasi variabel, dan luncurkan deployment.
              </p>

              <div className="space-y-4">
                <h3 className="text-base font-semibold text-ccd-text">Skema Arsitektur Aliran Kerja</h3>
                <div className="overflow-x-auto">
                  <pre className="text-xs font-mono bg-black/30 text-ccd-cyan p-5 rounded-lg border border-ccd-border/60 leading-loose">
{`┌───────────────────────┐            Trigger API            ┌────────────────────────┐
│  Browser (Dashboard)  │ ────────────────────────────────> │ Backend Service (Node) │
└───────────────────────┘                                   └────────────────────────┘
            ▲                                                           │
            │                                                           │ Dispatch Workflow
            │ Polling Status & Log (setiap 4 detik)                     ▼
            │                                               ┌────────────────────────┐
            └────────────────────────────────────────────── │ GitHub Actions Runner  │
                                                            └────────────────────────┘
                                                                        │
                                                                        │ Build, Push & SSH
                                                                        ▼
                                                            ┌────────────────────────┐
                                                            │   Target VPS / Server  │
                                                            │ - Docker Compose/Run   │
                                                            │ - Health Verification  │
                                                            └────────────────────────┘`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <h3 className="text-base font-semibold text-ccd-text">Keunggulan Utama</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-sm text-ccd-text mb-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ccd-accent" />
                      Pipeline Centralized
                    </h4>
                    <p className="text-xs text-ccd-text-dim leading-relaxed">
                      Menggunakan satu file GitHub Actions workflow utama ([central-deploy.yml](file:///home/rijal/projects/center-control-deployments/.github/workflows/central-deploy.yml)) di repositori pusat sebagai pendorong deployment untuk semua aplikasi.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-ccd-text mb-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ccd-cyan" />
                      Verifikasi Otomatis
                    </h4>
                    <p className="text-xs text-ccd-text-dim leading-relaxed">
                      Sistem melakukan pengetesan port/status kontainer sesaat setelah dijalankan di VPS target. Jika kontainer mati, pipeline langsung melaporkan kegagalan dan menampilkan logs-nya.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-l-4 border-ccd-accent bg-ccd-accent/5 px-4 py-3 rounded-r-lg text-xs text-ccd-text-dim leading-relaxed mt-4">
                <strong>Rekomendasi Keamanan:</strong> Jangan mengekspos port database atau API sensitif secara publik di VPS. Gunakan Docker internal network atau pasang Docker compose di belakang Reverse Proxy (seperti Nginx atau Traefik).
              </div>
            </div>
          )}

          {/* Tab: Prerequisites */}
          {activeTab === 'prerequisites' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-ccd-text tracking-tight mb-2">
                  Persyaratan & Secrets
                </h1>
                <p className="text-sm text-ccd-text-muted">
                  Variabel lokal proyek dan repositori GitHub Actions Secrets yang wajib dikonfigurasi.
                </p>
              </div>

              <hr className="border-ccd-border/50" />

              <div className="space-y-4">
                <h3 className="text-base font-semibold text-ccd-text">1. Variabel Environment Backend (.env)</h3>
                <p className="text-xs text-ccd-text-dim leading-relaxed">
                  Konfigurasi backend utama diletakkan pada file <code className="text-ccd-cyan">.env</code> lokal. Pastikan key berikut terisi dengan benar:
                </p>
                <div className="relative group">
                  <div className="absolute right-3 top-3 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleCopy('env', codeSnippets.env)}
                      className="text-xs bg-ccd-muted hover:bg-ccd-muted/80 text-ccd-text px-2 py-1 rounded border border-ccd-border"
                    >
                      {copiedText['env'] ? 'Tersalin! ✅' : 'Salin'}
                    </button>
                  </div>
                  <pre className="text-xs font-mono bg-black/30 text-ccd-text-dim p-4 rounded-lg border border-ccd-border/60 overflow-x-auto leading-relaxed">
                    {codeSnippets.env}
                  </pre>
                </div>
              </div>

              <div className="border-l-4 border-ccd-warning bg-ccd-warning/5 px-4 py-3 rounded-r-lg text-xs text-ccd-text-dim leading-relaxed">
                <strong>Penting: GITHUB_TOKEN</strong><br />
                Gunakan Personal Access Token (PAT) GitHub dengan scope minimal <code className="text-ccd-warning font-semibold">repo</code> (untuk akses kode repositori privat) dan <code className="text-ccd-warning font-semibold">workflow</code> (untuk memicu workflow dispatch).
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-base font-semibold text-ccd-text">2. GitHub Secrets (Pada Repositori Pusat)</h3>
                <p className="text-xs text-ccd-text-dim leading-relaxed">
                  Tambahkan secrets berikut pada menu **Settings &gt; Secrets and variables &gt; Actions** di repositori pusat GitHub Anda:
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-ccd-border">
                        <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Nama Secret</th>
                        <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Deskripsi</th>
                        <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Kategori</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ccd-border/40">
                      <tr>
                        <td className="py-3 font-mono text-ccd-cyan font-semibold">GIT_TOKEN</td>
                        <td className="py-3">GitHub Personal Access Token (PAT) untuk proses checkout source code repositori target.</td>
                        <td className="py-3 text-ccd-danger font-medium">Wajib</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-mono text-ccd-cyan font-semibold">DOCKERHUB_USERNAME</td>
                        <td className="py-3">Username Docker Hub Anda untuk otentikasi saat mempublikasikan build image.</td>
                        <td className="py-3 text-ccd-text-muted">Opsional (jika diset, image dipush ke registry)</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-mono text-ccd-cyan font-semibold">DOCKERHUB_TOKEN</td>
                        <td className="py-3">Access token Docker Hub (bukan password akun utama).</td>
                        <td className="py-3 text-ccd-text-muted">Opsional (butuh jika username diset)</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-mono text-ccd-cyan font-semibold">SSH_KEY_PRODUCTION</td>
                        <td className="py-3">Private SSH Key untuk login ke server VPS Production. Digunakan jika target branch adalah `main`.</td>
                        <td className="py-3 text-ccd-warning font-medium">Wajib jika deploy ke Prod</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-mono text-ccd-cyan font-semibold">SSH_KEY_STAGING</td>
                        <td className="py-3">Private SSH Key untuk login ke server VPS Staging. Digunakan jika target branch selain `main`.</td>
                        <td className="py-3 text-ccd-warning font-medium">Wajib jika deploy ke Staging</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Env & Server Setup */}
          {activeTab === 'env-server' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-ccd-text tracking-tight mb-2">
                  Environment & Server Setup
                </h1>
                <p className="text-sm text-ccd-text-muted">
                  Konfigurasi target environment dan kredensial server SSH.
                </p>
              </div>

              <hr className="border-ccd-border/50" />

              <div className="space-y-4">
                <h3 className="text-base font-semibold text-ccd-text">1. Setup Target Environment</h3>
                <p className="text-sm text-ccd-text-dim leading-relaxed">
                  Environment (misal: <em>Staging</em> atau <em>Production</em>) bertindak sebagai pembagi target deployment Anda. 
                  Anda dapat membuatnya di menu **Configuration &gt; Environments**:
                </p>
                <ul className="list-disc pl-5 text-xs text-ccd-text-dim space-y-2 leading-relaxed">
                  <li>
                    <strong>Target Branch to Deploy:</strong> Menentukan branch asal repositori target yang akan dicheckout saat memicu deployment. Defaultnya adalah <code className="text-ccd-cyan bg-black/20 px-1 py-0.5 rounded">main</code> untuk Production dan <code className="text-ccd-cyan bg-black/20 px-1 py-0.5 rounded">staging</code> untuk Staging.
                  </li>
                  <li>
                    <strong>Suffix Key Matching:</strong> Nama branch target menentukan SSH key mana yang digunakan:
                    <ul className="list-circle pl-5 mt-1 space-y-0.5 text-ccd-text-muted">
                      <li>Jika branch target = <code className="text-xs">main</code> ➔ Menggunakan secret <code className="text-ccd-cyan">SSH_KEY_PRODUCTION</code>.</li>
                      <li>Jika branch target selain <code className="text-xs">main</code> (e.g. <code className="text-xs">staging</code>, <code className="text-xs">dev</code>) ➔ Menggunakan secret <code className="text-ccd-cyan">SSH_KEY_STAGING</code>.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-base font-semibold text-ccd-text">2. Setup Server SSH Kredensial</h3>
                <p className="text-sm text-ccd-text-dim leading-relaxed">
                  Tambahkan informasi akses server VPS Anda di menu **Configuration &gt; Servers**. Pastikan server terhubung dengan Environment yang sesuai:
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-ccd-border">
                        <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Nama Kolom</th>
                        <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Fungsi / Kegunaan</th>
                        <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Contoh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ccd-border/40">
                      <tr>
                        <td className="py-3 font-semibold text-ccd-text">Host</td>
                        <td className="py-3">Alamat IP publik VPS atau Domain Name server tujuan.</td>
                        <td className="py-3 font-mono text-ccd-text-muted">103.18.23.44</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-ccd-text">Username</td>
                        <td className="py-3">User SSH yang digunakan untuk masuk ke server target.</td>
                        <td className="py-3 font-mono text-ccd-text-muted">ubuntu / deploy</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-ccd-text">SSH Port</td>
                        <td className="py-3">Port SSH yang terbuka di VPS target (defaultnya 22).</td>
                        <td className="py-3 font-mono text-ccd-text-muted">22</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-l-4 border-ccd-success bg-ccd-success/5 px-4 py-3 rounded-r-lg text-xs text-ccd-text-dim leading-relaxed">
                <strong>Tips Akses Tanpa Sudo:</strong><br />
                Pastikan user SSH target (misal `ubuntu`) sudah didaftarkan ke dalam grup `docker` di VPS target. Jika tidak, proses deployment docker run/compose di server target akan gagal karena masalah hak akses (Permission Denied).
                <pre className="text-[10px] font-mono bg-black/40 text-ccd-cyan p-2.5 rounded mt-2 border border-ccd-border/50">
                  {`# Jalankan command ini di VPS target Anda:
sudo usermod -aG docker $USER
newgrp docker`}
                </pre>
              </div>
            </div>
          )}

          {/* Tab: GitHub Actions Central Workflow */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-ccd-text tracking-tight mb-2">
                  Setup GitHub Actions Central Workflow
                </h1>
                <p className="text-sm text-ccd-text-muted">
                  Konfigurasi engine workflow utama yang diletakkan pada repositori pusat.
                </p>
              </div>

              <hr className="border-ccd-border/50" />

              <p className="text-sm text-ccd-text-dim leading-relaxed">
                Workflow di bawah ini bertindak sebagai engine orkestrasi pusat. Salin dan simpan ke file path berikut pada repositori pusat Anda:
                <br />
                <code className="text-ccd-cyan bg-black/20 px-1.5 py-0.5 rounded text-xs font-mono">.github/workflows/central-deploy.yml</code>
              </p>

              <div className="relative group">
                <div className="absolute right-3 top-3 opacity-70 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={() => handleCopy('workflow', codeSnippets.workflow)}
                    className="text-xs bg-ccd-muted hover:bg-ccd-muted/80 text-ccd-text px-2 py-1 rounded border border-ccd-border"
                  >
                    {copiedText['workflow'] ? 'Tersalin! ✅' : 'Salin'}
                  </button>
                </div>
                <pre className="text-xs font-mono bg-black/30 text-ccd-text-dim p-4 rounded-lg border border-ccd-border/60 max-h-96 overflow-y-auto leading-relaxed font-semibold">
                  {codeSnippets.workflow}
                </pre>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="text-base font-semibold text-ccd-text">Langkah-langkah yang dieksekusi oleh workflow:</h3>
                <ul className="list-decimal pl-5 text-xs text-ccd-text-dim space-y-2 leading-relaxed">
                  <li>
                    <strong>Checkout Source Code:</strong> Men-download file project dari repositori target berdasarkan branch yang dikonfigurasi.
                  </li>
                  <li>
                    <strong>Image Tag Check:</strong> Memeriksa apakah Docker image dengan tag spesifik sudah tersedia di Docker Hub untuk melewati proses build (Alur Promosi Image).
                  </li>
                  <li>
                    <strong>Build & Push:</strong> Melakukan build docker image lokal jika belum ada di registry, lalu melakukan push ke Docker Hub.
                  </li>
                  <li>
                    <strong>Configuring Server:</strong> Melakukan SSH ke server target untuk membuat direktori kerja dan menulis file <code className="text-ccd-cyan">.env</code>.
                  </li>
                  <li>
                    <strong>Deployment:</strong> Menghentikan container lama, menarik image terbaru dari Docker Hub, mengeksekusi script pre/post-deploy, dan menjalankan kontainer baru.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab: Deployment Workflow (Branch vs Image) */}
          {activeTab === 'deployment-workflow' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-ccd-text tracking-tight mb-2">
                  Alur Deployment: Branch vs Image
                </h1>
                <p className="text-sm text-ccd-text-muted">
                  Memahami strategi promosi kode yang aman dari Staging menuju Production.
                </p>
              </div>

              <hr className="border-ccd-border/50" />

              <div className="space-y-4">
                <h2 className="text-lg font-bold text-ccd-text">1. Deployment berbasis Branch (Build from Source)</h2>
                <p className="text-sm text-ccd-text-dim leading-relaxed">
                  Secara default, jika Anda tidak menentukan tag versi pada parameter konfigurasi (`VERSION_TAG` diset `latest` atau dikosongkan), CCD akan memicu pipeline untuk membangun kontainer langsung dari source code branch target.
                </p>
                <div className="border-l-4 border-ccd-accent bg-ccd-accent/5 px-4 py-3 rounded-r-lg text-xs text-ccd-text-dim leading-relaxed">
                  <strong>Kelebihan:</strong> Praktis untuk integrasi cepat di server Staging. Setiap kali developer melakukan push kode ke branch `staging`, perubahan bisa langsung dideploy dan di-build dari scratch.
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h2 className="text-lg font-bold text-ccd-text">2. Deployment berbasis Image (Promosi Image / Recommended untuk Prod)</h2>
                <p className="text-sm text-ccd-text-dim leading-relaxed">
                  Untuk mendeploy ke Production, sangat disarankan menggunakan metode **By Image** untuk menjamin konsistensi. Anda mempromosikan image Docker yang sudah sukses diuji di Staging ke server Production tanpa melakukan kompilasi/build ulang dari source code branch `main`.
                </p>
                
                <h3 className="text-sm font-semibold text-ccd-text">Bagaimana cara kerjanya?</h3>
                <ul className="list-disc pl-5 text-xs text-ccd-text-dim space-y-2 leading-relaxed">
                  <li>
                    Tentukan tag versi spesifik pada kolom `VERSION_TAG` di Step 2 Wizard (misalnya: <code className="text-ccd-cyan bg-black/20 px-1 rounded">v1.2.0</code>).
                  </li>
                  <li>
                    Saat dideploy di Staging pertama kali, GitHub Actions akan melakukan build dan mempublikasikan image dengan nama <code className="text-ccd-text font-semibold">user/repo-name:v1.2.0</code> ke Docker Hub registry Anda.
                  </li>
                  <li>
                    Ketika Anda ingin mendeploy kode tersebut ke Production, lakukan konfigurasi deployment ke server Production dengan mencantumkan tag <code className="text-ccd-cyan bg-black/20 px-1 rounded">v1.2.0</code> yang sama.
                  </li>
                  <li>
                    GitHub Actions akan memvalidasi registry Docker Hub. Karena image dengan tag <code className="text-ccd-cyan bg-black/20 px-1 rounded">v1.2.0</code> sudah ada, pipeline akan <strong>melewati (skip)</strong> langkah Docker build & push, lalu langsung men-deploy image tersebut ke server Production.
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-ccd-warning bg-ccd-warning/5 px-4 py-3 rounded-r-lg text-xs text-ccd-text-dim leading-relaxed">
                <strong>Catatan Alur PR Git:</strong><br />
                Meskipun Anda mendeploy menggunakan image untuk mempercepat rilis ke Production, pastikan Anda tetap melakukan Pull Request (PR) untuk menggabungkan branch <code className="text-ccd-warning">staging</code> ke branch <code className="text-ccd-warning">main</code> di GitHub agar riwayat kode di git tetap sinkron dengan versi kontainer yang berjalan di server.
              </div>

              <div className="space-y-4 pt-4">
                <h2 className="text-lg font-bold text-ccd-text">3. Fitur Auto-Increment Tag (`+` Suffix)</h2>
                <p className="text-sm text-ccd-text-dim leading-relaxed">
                  Untuk mempercepat proses penomoran tag rilis, backend CCD menyediakan fitur auto-increment. Jika Anda mengisi `VERSION_TAG` dengan tanda plus di bagian akhir (misalnya: <code className="text-ccd-cyan bg-black/20 px-1 rounded">v1.0.0+</code>), backend CCD akan membaca versi patch terakhir, menaikkan versinya (menjadi <code className="text-ccd-cyan bg-black/20 px-1 rounded">v1.0.1</code>), menulis nilainya ke database, dan memicu build dengan tag baru tersebut.
                </p>
              </div>
            </div>
          )}

          {/* Tab: Configuration Parameters */}
          {activeTab === 'variables' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-ccd-text tracking-tight mb-2">
                  Parameter Konfigurasi Khusus
                </h1>
                <p className="text-sm text-ccd-text-muted">
                  Gunakan parameter khusus ini pada Step 2 Wizard Deployment untuk mengatur perilaku kontainer.
                </p>
              </div>

              <hr className="border-ccd-border/50" />

              <p className="text-sm text-ccd-text-dim leading-relaxed">
                Selain variabel lingkungan (`.env`) aplikasi Anda, Anda dapat menambahkan variabel kontrol berikut untuk mengatur lokasi file, strategi kontainer, dan script kustom pada server target:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-ccd-border">
                      <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Nama Key</th>
                      <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Pilihan Nilai</th>
                      <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Default</th>
                      <th className="py-2.5 font-bold text-ccd-text-muted uppercase">Fungsi / Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ccd-border/40">
                    <tr>
                      <td className="py-3 font-mono text-ccd-cyan font-semibold">DEPLOY_STRATEGY</td>
                      <td className="py-3"><code className="text-ccd-text-muted font-mono">standard</code> | <code className="text-ccd-text-muted font-mono">docker-compose</code></td>
                      <td className="py-3 font-mono">standard</td>
                      <td className="py-3">Menentukan apakah deployment berupa kontainer tunggal (`docker run`) atau multi-layanan (`docker compose`).</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-mono text-ccd-cyan font-semibold">DEPLOY_DIR</td>
                      <td className="py-3">Path folder absolut</td>
                      <td className="py-3 font-mono">/app/[repo-name]</td>
                      <td className="py-3">Folder di server tujuan yang digunakan untuk menampung file compose, `.env`, dan logs.</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-mono text-ccd-cyan font-semibold">COMPOSE_FILE</td>
                      <td className="py-3">Nama file yaml</td>
                      <td className="py-3 font-mono">docker-compose.yml</td>
                      <td className="py-3">Nama file compose yang akan diparse jika menggunakan strategi `docker-compose`.</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-mono text-ccd-cyan font-semibold">DOCKERFILE_PATH</td>
                      <td className="py-3">Path relatif file</td>
                      <td className="py-3 font-mono">Dockerfile</td>
                      <td className="py-3">Lokasi Dockerfile aplikasi dari root folder (contoh: `backend/Dockerfile` jika bersarang).</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-mono text-ccd-cyan font-semibold">DOCKER_BUILD_TARGET</td>
                      <td className="py-3">Stage name di Dockerfile</td>
                      <td className="py-3">Kosong</td>
                      <td className="py-3">Digunakan jika Dockerfile Anda menggunakan multi-stage build dan Anda ingin membatasi build sampai stage tertentu.</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-mono text-ccd-cyan font-semibold">DOCKER_PRUNE_STRATEGY</td>
                      <td className="py-3"><code className="text-ccd-text-muted font-mono">dangling</code> | <code className="text-ccd-text-muted font-mono">all</code></td>
                      <td className="py-3">Kosong</td>
                      <td className="py-3">Mengatur pembersihan image docker setelah rilis: `dangling` (hapus sisa builder) atau `all` (hapus semua image tak terpakai).</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-mono text-ccd-cyan font-semibold">PRE_DEPLOY_COMMANDS</td>
                      <td className="py-3">Bash Shell Script</td>
                      <td className="py-3">Kosong</td>
                      <td className="py-3">Kumpulan perintah shell yang dijalankan di server VPS sesaat sebelum kontainer baru dinyalakan.</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-mono text-ccd-cyan font-semibold">POST_DEPLOY_COMMANDS</td>
                      <td className="py-3">Bash Shell Script</td>
                      <td className="py-3">Kosong</td>
                      <td className="py-3">Kumpulan perintah shell yang dijalankan di server VPS sesaat setelah kontainer baru berhasil berjalan (contoh: `docker exec -t app-name npm run db:migrate`).</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-base font-semibold text-ccd-text">Contoh: Template Docker Compose Minimal</h3>
                <p className="text-xs text-ccd-text-dim leading-relaxed">
                  Jika menggunakan strategi `docker-compose`, Anda harus memiliki file YAML di repositori target. CCD secara dinamis akan memperbarui field `image` dari service agar sesuai dengan tag build terbaru:
                </p>
                <div className="relative group">
                  <div className="absolute right-3 top-3 opacity-70 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={() => handleCopy('compose', codeSnippets.dockerCompose)}
                      className="text-xs bg-ccd-muted hover:bg-ccd-muted/80 text-ccd-text px-2 py-1 rounded border border-ccd-border"
                    >
                      {copiedText['compose'] ? 'Tersalin! ✅' : 'Salin'}
                    </button>
                  </div>
                  <pre className="text-xs font-mono bg-black/30 text-ccd-text-dim p-4 rounded-lg border border-ccd-border/60 overflow-x-auto leading-relaxed">
                    {codeSnippets.dockerCompose}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Troubleshooting & Tips */}
          {activeTab === 'troubleshooting' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-ccd-text tracking-tight mb-2">
                  Troubleshooting & Tips
                </h1>
                <p className="text-sm text-ccd-text-muted">
                  Solusi cepat untuk masalah umum yang terjadi saat deployment.
                </p>
              </div>

              <hr className="border-ccd-border/50" />

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-ccd-danger flex items-center gap-1.5 mb-2">
                    <span>🔴</span> Error 422: "No ref found" saat trigger pipeline
                  </h3>
                  <p className="text-xs text-ccd-text-dim leading-relaxed pl-5">
                    <strong>Penyebab:</strong> Branch yang dikonfigurasi pada target Environment (misalnya branch `staging`) belum dibuat atau belum di-push ke GitHub repositori target Anda.
                    <br />
                    <strong>Solusi:</strong> Pastikan Anda telah melakukan push branch tersebut ke GitHub. Gunakan perintah <code className="text-ccd-cyan bg-black/20 px-1 font-mono text-[10px]">git push origin staging</code> di komputer lokal Anda sebelum memulai deploy.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ccd-danger flex items-center gap-1.5 mb-2">
                    <span>🔴</span> Error: SSH Connection Failed / Permission Denied
                  </h3>
                  <p className="text-xs text-ccd-text-dim leading-relaxed pl-5">
                    <strong>Penyebab:</strong> Key SSH yang didaftarkan di GitHub Secrets (`SSH_KEY_PRODUCTION` / `SSH_KEY_STAGING`) tidak terdaftar di file `~/.ssh/authorized_keys` di server target, atau IP Host server salah.
                    <br />
                    <strong>Solusi:</strong> Periksa kembali IP Host di tab Server. Uji koneksi SSH secara manual dari komputer lokal Anda menggunakan key yang sama. Pastikan SSH private key berformat PEM/OpenSSH yang valid.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ccd-danger flex items-center gap-1.5 mb-2">
                    <span>🔴</span> Error: Docker daemon permission denied
                  </h3>
                  <p className="text-xs text-ccd-text-dim leading-relaxed pl-5">
                    <strong>Penyebab:</strong> User SSH yang didaftarkan pada server target tidak memiliki izin untuk mengeksekusi docker commands tanpa hak akses administrator (`sudo`).
                    <br />
                    <strong>Solusi:</strong> Masukkan user ke grup docker di VPS target dengan perintah:
                    <br />
                    <code className="text-ccd-cyan bg-black/20 px-1 font-mono text-[10px] block w-fit mt-1">
                      sudo usermod -aG docker $USER && newgrp docker
                    </code>
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ccd-danger flex items-center gap-1.5 mb-2">
                    <span>🔴</span> Error: Docker compose port conflict / address already in use
                  </h3>
                  <p className="text-xs text-ccd-text-dim leading-relaxed pl-5">
                    <strong>Penyebab:</strong> Anda mencoba mendeploy kontainer baru yang memetakan port host yang sudah terpakai oleh kontainer/aplikasi lain pada VPS yang sama.
                    <br />
                    <strong>Solusi:</strong> Ubah pemetaan port host di file compose atau ubah variabel `PORT` di konfigurasi environment. Gunakan port yang unik untuk setiap aplikasi terpisah.
                  </p>
                </div>
              </div>

              <div className="border-l-4 border-ccd-accent bg-ccd-accent/5 px-4 py-3 rounded-r-lg text-xs text-ccd-text-dim leading-relaxed mt-6">
                <strong>Tips Memantau Log:</strong><br />
                Jika deployment mengalami kegagalan, Anda dapat melihat log lengkap dari GitHub runner secara langsung melalui terminal log viewer yang terletak di bagian bawah halaman detail deployment CCD secara real-time.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
