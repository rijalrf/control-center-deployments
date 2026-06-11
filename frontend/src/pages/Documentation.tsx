import React, { useState } from 'react'

interface DocSection {
  id: string
  title: string
}

export default function Documentation() {
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [copiedText, setCopiedText] = useState<Record<string, boolean>>({})

  const sections: DocSection[] = [
    { id: 'overview', title: '1. Pengenalan & Konsep Dasar' },
    { id: 'quickstart-flow', title: '2. Alur Penggunaan Awal (Panduan Pemula)' },
    { id: 'features', title: '3. Fitur-Fitur Utama' },
    { id: 'prerequisites', title: '4. Persyaratan Teknis & Secrets' },
    { id: 'workflow', title: '5. Setup GitHub Actions Workflow' },
    { id: 'deployment-workflow', title: '6. Strategi Rilis: Branch vs Image' },
    { id: 'variables', title: '7. Parameter Konfigurasi Khusus' },
    { id: 'troubleshooting', title: '8. Troubleshooting & Solusi' }
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
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
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
    <div className="w-full py-4">
      <div className="flex flex-col md:flex-row gap-10">
        
        {/* Navigation Sidebar (Card-less, Minimalist, Simple Text) */}
        <div className="w-full md:w-64 shrink-0">
          <div className="sticky top-8 flex flex-col">
            <h2 className="text-xs font-bold text-ccd-text-muted uppercase tracking-widest mb-4 px-3">
              Daftar Panduan
            </h2>
            <nav className="flex flex-col space-y-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`px-3 py-3 rounded-lg text-[15px] transition-all duration-150 text-left border-l-2 ${
                    activeTab === section.id
                      ? 'border-ccd-accent text-ccd-accent font-semibold bg-ccd-accent/5'
                      : 'border-transparent text-ccd-text-dim hover:text-ccd-text hover:bg-ccd-muted/10 font-medium'
                  }`}
                >
                  {section.title.substring(3)}
                </button>
              ))}
            </nav>
            
            <div className="mt-10 pt-6 border-t border-ccd-border/40 px-3">
              <span className="text-sm text-ccd-text-muted block leading-relaxed font-medium">
                Control Center Deployments v1.0.0
              </span>
              <span className="text-xs text-ccd-text-muted/65 block mt-1">
                Last updated: June 2026
              </span>
            </div>
          </div>
        </div>

        {/* Content Area (Clean Article Style, Full Width, Larger Font Size) */}
        <div className="flex-1 min-w-0 pt-1 pb-16">
          
          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-ccd-text tracking-tight mb-2">
                  Pengenalan & Konsep Dasar
                </h1>
                <p className="text-base text-ccd-text-muted">
                  Memahami apa itu CCD dan bagaimana sistem ini membantu menyederhanakan siklus deployment Anda.
                </p>
              </div>

              <hr className="border-ccd-border/40" />

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-ccd-text">Analogi untuk Orang Awam</h2>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  Bayangkan Anda memiliki 5 website atau aplikasi web yang berbeda di GitHub. Biasanya, setiap kali ingin merilis fitur baru ke server internet (VPS), Anda harus masuk secara manual ke server menggunakan Terminal/SSH, mengunduh kode baru, menghentikan aplikasi lama, mengompilasi ulang kode, dan menyalakannya kembali. Proses manual ini memakan waktu, rumit, dan sangat rawan kesalahan.
                </p>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  <strong>Control Center Deployment (CCD)</strong> bertindak sebagai <strong>"Remote Control Terpusat"</strong>. Anda tidak perlu lagi melakukan SSH manual ke server Anda. Cukup buka dashboard web ini, pilih proyek yang ingin dideploy, isi variabel pengaturannya, dan klik tombol eksekusi. Dashboard CCD yang akan menginstruksikan robot otomatis di GitHub (GitHub Actions) untuk membungkus kode Anda menjadi paket kontainer (Docker) lalu memasangnya secara otomatis ke server VPS Anda.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <h2 className="text-xl font-semibold text-ccd-text">Masalah Utama yang Diselesaikan</h2>
                <ul className="list-disc pl-6 text-base text-ccd-text-dim space-y-2.5 leading-relaxed">
                  <li>
                    <strong>Satu Engine untuk Semua Aplikasi:</strong> Anda cukup menulis script konfigurasi otomatis sekali di repositori pusat CCD. Semua proyek aplikasi Anda yang lain tidak perlu lagi dikonfigurasi satu-persatu.
                  </li>
                  <li>
                    <strong>Deployment Multi-Layanan:</strong> Anda dapat mendeploy beberapa aplikasi sekaligus (misal backend API dan frontend web) secara bersamaan hanya dengan sekali klik.
                  </li>
                  <li>
                    <strong>Pemantauan Real-Time Tanpa Terminal:</strong> Log proses pembuatan aplikasi, kompilasi, pengiriman, hingga jalannya aplikasi di server ditampilkan langsung di dashboard dalam bentuk log teks dan visualisasi animasi.
                  </li>
                </ul>
              </div>

              <div className="space-y-4 pt-2">
                <h2 className="text-xl font-semibold text-ccd-text">Arsitektur Sederhana</h2>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  Di balik layar, CCD menghubungkan tiga komponen utama:
                </p>
                <div className="overflow-x-auto">
                  <pre className="text-sm font-mono bg-black/30 text-ccd-cyan p-5 rounded-lg border border-ccd-border/60 leading-loose">
{`[Dashboard Web CCD] (Instruksi API) ──► [GitHub Actions (Pabrik Build)] ──► [Server VPS (Target Deploy)]
- Membuat Draf Rilis                  - Mengunduh Source Code           - Memasang Aplikasi
- Menampung Konfigurasi               - Membungkus Kode ke Docker       - Verifikasi Kesehatan Port
- Menampilkan Log Rilis               - Mengunggah Paket ke Registry    - Menyajikan Web ke Publik`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Quickstart Flow */}
          {activeTab === 'quickstart-flow' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-ccd-text tracking-tight mb-2">
                  Alur Penggunaan Awal (Panduan Pemula)
                </h1>
                <p className="text-base text-ccd-text-muted">
                  Panduan langkah-demi-langkah dari nol untuk melakukan deployment pertama Anda dengan benar.
                </p>
              </div>

              <hr className="border-ccd-border/40" />

              <p className="text-base text-ccd-text-dim leading-relaxed">
                Untuk mendeploy aplikasi pertama Anda, ikuti alur langkah yang telah terstruktur berikut:
              </p>

              <div className="space-y-6">
                <div className="relative pl-8 border-l-2 border-ccd-border">
                  <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-ccd-accent flex items-center justify-center text-xs font-bold text-white">
                    1
                  </div>
                  <h3 className="font-semibold text-base text-ccd-text mb-1">Hubungkan Proyek dari GitHub</h3>
                  <p className="text-sm text-ccd-text-muted leading-relaxed">
                    Masuk ke menu <strong>Repositories</strong> di panel kiri, lalu klik tombol <strong>Sync Repositories</strong>. CCD akan secara otomatis menarik daftar proyek (repositori) Anda dari akun atau organisasi GitHub Anda dan menyimpannya di database lokal.
                  </p>
                </div>

                <div className="relative pl-8 border-l-2 border-ccd-border">
                  <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-ccd-accent flex items-center justify-center text-xs font-bold text-white">
                    2
                  </div>
                  <h3 className="font-semibold text-base text-ccd-text mb-1">Daftarkan Target Server (VPS)</h3>
                  <p className="text-sm text-ccd-text-muted leading-relaxed">
                    Masuk ke menu <strong>Configuration</strong>:
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Buka sub-menu <strong>Environments</strong> untuk menentukan pengelompokan (contoh: buat environment "Staging" dan "Production").</li>
                      <li>Buka sub-menu <strong>Servers</strong> untuk mendaftarkan detail server VPS Anda (masukkan Nama Server, IP Host, User SSH, dan Port).</li>
                    </ul>
                  </p>
                </div>

                <div className="relative pl-8 border-l-2 border-ccd-border">
                  <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-ccd-accent flex items-center justify-center text-xs font-bold text-white">
                    3
                  </div>
                  <h3 className="font-semibold text-base text-ccd-text mb-1">Konfigurasi Kunci Akses (GitHub Secrets)</h3>
                  <p className="text-sm text-ccd-text-muted leading-relaxed">
                    Karena GitHub Actions yang akan mengirimkan aplikasi ke server Anda, Anda wajib mendaftarkan Kunci SSH Private Server Anda di GitHub Secrets repositori pusat Anda agar GitHub memiliki izin untuk masuk ke server target. (Lihat tab "Persyaratan Teknis & Secrets" untuk detailnya).
                  </p>
                </div>

                <div className="relative pl-8 border-l-2 border-ccd-border">
                  <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-ccd-accent flex items-center justify-center text-xs font-bold text-white">
                    4
                  </div>
                  <h3 className="font-semibold text-base text-ccd-text mb-1">Jalankan Deployment Wizard</h3>
                  <p className="text-sm text-ccd-text-muted leading-relaxed">
                    Masuk ke menu <strong>Deployment</strong> di panel kiri, lalu klik <strong>Create New Deployment</strong>:
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li><strong>Step 1:</strong> Pilih Target Environment (misal: Staging) dan pilih proyek aplikasi yang ingin dideploy.</li>
                      <li><strong>Step 2:</strong> Sistem akan membaca konfigurasi <code className="text-xs">.env.example</code> dari proyek Anda secara otomatis. Isi nilai konfigurasi tersebut (misal URL database, token rahasia, port aplikasi).</li>
                      <li><strong>Step 3:</strong> Tinjau ringkasan, lalu klik <strong>Execute Deployment</strong>.</li>
                    </ul>
                  </p>
                </div>

                <div className="relative pl-8">
                  <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-ccd-accent flex items-center justify-center text-xs font-bold text-white">
                    5
                  </div>
                  <h3 className="font-semibold text-base text-ccd-text mb-1">Pantau Jalannya Rilis</h3>
                  <p className="text-sm text-ccd-text-muted leading-relaxed">
                    Sistem akan mengarahkan Anda ke Halaman Pemantauan Aktif secara otomatis. Anda dapat memantau indikator status di setiap tahapan pipeline (Initializing, Fetching Code, Building, Deploying) hingga melihat log keluaran terminal dari server secara langsung untuk memastikan aplikasi berjalan normal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Fitur-fitur Utama */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-ccd-text tracking-tight mb-2">
                  Fitur-Fitur Utama
                </h1>
                <p className="text-base text-ccd-text-muted">
                  Kemampuan dan modul utama yang ditawarkan oleh ekosistem Control Center Deployment.
                </p>
              </div>

              <hr className="border-ccd-border/40" />

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-ccd-text">Otomatisasi Pipeline Tanpa Script Berulang</h2>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  Anda tidak perlu menulis file konfigurasi CI/CD YAML yang rumit di setiap proyek Anda. CCD menggunakan file engine deployment terpusat yang mampu membaca konfigurasi proyek target secara dinamis.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <h2 className="text-xl font-semibold text-ccd-text">Manajemen Variabel Lingkungan (.env) Visual</h2>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  CCD memindai file contoh pengaturan (`.env.example`) di repositori target Anda saat deployment dibuat. Anda dapat langsung mengedit nilai konfigurasi tersebut secara visual di halaman web tanpa perlu login SSH dan menyunting file secara manual di server.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <h2 className="text-xl font-semibold text-ccd-text">Dukungan Strategi Docker & Docker Compose</h2>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  Mendukung dua jenis arsitektur deployment:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><strong>Standard Docker:</strong> Menjalankan kontainer aplikasi tunggal secara terisolasi.</li>
                    <li><strong>Docker Compose:</strong> Menjalankan banyak kontainer sekaligus yang saling terhubung (misal: App Container + Database Container + Cache Memory) menggunakan konfigurasi terpadu.</li>
                  </ul>
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <h2 className="text-xl font-semibold text-ccd-text">Pembersihan Otomatis Sampah Docker (Pruning)</h2>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  Setiap kali Anda men-deploy versi baru, Docker biasanya meninggalkan sisa-sisa image versi lama yang tidak terpakai (dangling images). CCD memiliki fitur otomatis untuk menghapus file sampah ini sehingga harddisk server VPS Anda tidak cepat penuh.
                </p>
              </div>
            </div>
          )}

          {/* Tab: Prerequisites */}
          {activeTab === 'prerequisites' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-ccd-text tracking-tight mb-2">
                  Persyaratan Teknis & Secrets
                </h1>
                <p className="text-base text-ccd-text-muted">
                  Variabel lokal proyek dan repositori GitHub Actions Secrets yang wajib dikonfigurasi.
                </p>
              </div>

              <hr className="border-ccd-border/40" />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-ccd-text">1. Variabel Environment Backend (.env)</h3>
                <p className="text-sm text-ccd-text-dim leading-relaxed">
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
                  <pre className="text-sm font-mono bg-black/30 text-ccd-text-dim p-4 rounded-lg border border-ccd-border/60 overflow-x-auto leading-relaxed">
                    {codeSnippets.env}
                  </pre>
                </div>
              </div>

              <div className="border-l-4 border-ccd-warning bg-ccd-warning/5 px-5 py-4 rounded-r-lg text-sm text-ccd-text-dim leading-relaxed">
                <strong>Penting: GITHUB_TOKEN</strong><br />
                Gunakan Personal Access Token (PAT) GitHub dengan scope minimal <code className="text-ccd-warning font-semibold">repo</code> (untuk akses kode repositori privat) dan <code className="text-ccd-warning font-semibold">workflow</code> (untuk memicu workflow dispatch).
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-ccd-text">2. GitHub Secrets (Pada Repositori Pusat)</h3>
                <p className="text-sm text-ccd-text-dim leading-relaxed">
                  Tambahkan secrets berikut pada menu **Settings &gt; Secrets and variables &gt; Actions** di repositori pusat GitHub Anda:
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-ccd-border">
                        <th className="py-3 font-bold text-ccd-text-muted uppercase">Nama Secret</th>
                        <th className="py-3 font-bold text-ccd-text-muted uppercase">Deskripsi</th>
                        <th className="py-3 font-bold text-ccd-text-muted uppercase">Kategori</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ccd-border/40">
                      <tr>
                        <td className="py-3.5 font-mono text-ccd-cyan font-semibold">GIT_TOKEN</td>
                        <td className="py-3.5">GitHub Personal Access Token (PAT) untuk proses checkout source code repositori target.</td>
                        <td className="py-3.5 text-ccd-danger font-medium">Wajib</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 font-mono text-ccd-cyan font-semibold">DOCKERHUB_USERNAME</td>
                        <td className="py-3.5">Username Docker Hub Anda untuk otentikasi saat mempublikasikan build image.</td>
                        <td className="py-3.5 text-ccd-text-muted">Opsional (jika diset, image dipush ke registry)</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 font-mono text-ccd-cyan font-semibold">DOCKERHUB_TOKEN</td>
                        <td className="py-3.5">Access token Docker Hub (bukan password akun utama).</td>
                        <td className="py-3.5 text-ccd-text-muted">Opsional (butuh jika username diset)</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 font-mono text-ccd-cyan font-semibold">SSH_KEY_PRODUCTION</td>
                        <td className="py-3.5">Private SSH Key untuk login ke server VPS Production. Digunakan jika target branch adalah `main`.</td>
                        <td className="py-3.5 text-ccd-warning font-medium">Wajib jika deploy ke Prod</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 font-mono text-ccd-cyan font-semibold">SSH_KEY_STAGING</td>
                        <td className="py-3.5">Private SSH Key untuk login ke server VPS Staging. Digunakan jika target branch selain `main`.</td>
                        <td className="py-3.5 text-ccd-warning font-medium">Wajib jika deploy ke Staging</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: GitHub Actions Central Workflow */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-ccd-text tracking-tight mb-2">
                  Setup GitHub Actions Central Workflow
                </h1>
                <p className="text-base text-ccd-text-muted">
                  Konfigurasi engine workflow utama yang diletakkan pada repositori pusat.
                </p>
              </div>

              <hr className="border-ccd-border/40" />

              <p className="text-base text-ccd-text-dim leading-relaxed">
                Workflow di bawah ini bertindak sebagai engine orkestrasi pusat. Salin dan simpan ke file path berikut pada repositori pusat Anda:
                <br />
                <code className="text-ccd-cyan bg-black/20 px-1.5 py-0.5 rounded text-sm font-mono">.github/workflows/central-deploy.yml</code>
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
                <pre className="text-sm font-mono bg-black/30 text-ccd-text-dim p-4 rounded-lg border border-ccd-border/60 max-h-96 overflow-y-auto leading-relaxed font-semibold">
                  {codeSnippets.workflow}
                </pre>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="text-lg font-semibold text-ccd-text">Langkah-langkah yang dieksekusi oleh workflow:</h3>
                <ul className="list-decimal pl-5 text-sm text-ccd-text-dim space-y-2.5 leading-relaxed">
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
                <h1 className="text-3xl font-bold text-ccd-text tracking-tight mb-2">
                  Strategi Rilis: Branch vs Image
                </h1>
                <p className="text-base text-ccd-text-muted">
                  Memahami opsi penyebaran aplikasi dan bagaimana mempromosikan perubahan secara aman.
                </p>
              </div>

              <hr className="border-ccd-border/40" />

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-ccd-text">Opsi 1: Deployment berbasis Branch (Build from Source)</h2>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  Ini adalah alur di mana GitHub Actions akan men-checkout kode Anda langsung dari branch git tertentu (misal branch `staging`), melakukan build Docker image dari awal, melakukan push, dan mendeploy-nya.
                </p>
                <div className="border-l-4 border-ccd-accent bg-ccd-accent/5 px-5 py-4 rounded-r-lg text-sm text-ccd-text-dim leading-relaxed">
                  <strong>Kapan harus digunakan?</strong> Sangat cocok untuk server Staging/Uji coba di mana developer sering melakukan push update fitur baru dan ingin langsung melihat perubahannya secara real-time.
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h2 className="text-xl font-semibold text-ccd-text">Opsi 2: Deployment berbasis Image (Promosi Image / Direkomendasikan untuk Production)</h2>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  Ketika Anda merilis aplikasi ke server Production (Live publik), sangat tidak disarankan untuk me-rebuild kode dari branch git secara langsung untuk menghindari resiko inkonsistensi (misalnya ada perbedaan library/dependencies saat build).
                </p>
                <p className="text-base text-ccd-text-dim leading-relaxed">
                  Sebagai gantinya, gunakan metode <strong>Promosi Image</strong>. Caranya adalah menggunakan Docker image yang sama persis yang sebelumnya sudah Anda uji dan berhasil berjalan di server Staging.
                </p>
                
                <h3 className="text-base font-semibold text-ccd-text">Langkah Penerapannya:</h3>
                <ul className="list-disc pl-5 text-sm text-ccd-text-dim space-y-2.5 leading-relaxed">
                  <li>
                    Saat deploy ke Staging, tentukan tag rilis unik pada parameter `VERSION_TAG` di konfigurasi (misalnya: <code className="text-ccd-cyan bg-black/20 px-1.5 rounded font-mono">v1.2.0</code>). Pipeline akan mem-build dan mengunggah image tersebut ke registry Docker Hub.
                  </li>
                  <li>
                    Setelah dites dan sukses di staging, lakukan deploy ke Production di dashboard CCD, dan masukkan tag versi yang sama (<code className="text-ccd-cyan bg-black/20 px-1.5 rounded font-mono">v1.2.0</code>).
                  </li>
                  <li>
                    GitHub Actions secara otomatis mendeteksi bahwa image `v1.2.0` sudah terdaftar di Docker Hub. Pipeline akan <strong>melewati (skip)</strong> proses build dan push, lalu langsung mengunduh dan menjalankan kontainer tersebut di server Production Anda.
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-ccd-warning bg-ccd-warning/5 px-5 py-4 rounded-r-lg text-sm text-ccd-text-dim leading-relaxed">
                <strong>Catatan Sinkronisasi Git:</strong><br />
                Meskipun Anda menggunakan metode promosi image untuk bypass build ke server Production, pastikan Anda tetap membuat Pull Request (PR) dan melakukan merge dari branch <code className="text-ccd-warning font-semibold">staging</code> ke <code className="text-ccd-warning font-semibold">main</code> di GitHub agar kode sumber di repositori Anda tetap sinkron dengan versi aplikasi yang sedang aktif berjalan.
              </div>
            </div>
          )}

          {/* Tab: Configuration Parameters */}
          {activeTab === 'variables' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-ccd-text tracking-tight mb-2">
                  Parameter Konfigurasi Khusus
                </h1>
                <p className="text-base text-ccd-text-muted">
                  Gunakan parameter khusus ini pada Step 2 Wizard Deployment untuk mengatur perilaku kontainer.
                </p>
              </div>

              <hr className="border-ccd-border/40" />

              <p className="text-base text-ccd-text-dim leading-relaxed">
                Selain variabel lingkungan (`.env`) aplikasi Anda, Anda dapat menambahkan variabel kontrol berikut untuk mengatur lokasi file, strategi kontainer, dan script kustom pada server target:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-ccd-border">
                      <th className="py-3 font-bold text-ccd-text-muted uppercase">Nama Key</th>
                      <th className="py-3 font-bold text-ccd-text-muted uppercase">Pilihan Nilai</th>
                      <th className="py-3 font-bold text-ccd-text-muted uppercase">Default</th>
                      <th className="py-3 font-bold text-ccd-text-muted uppercase">Fungsi / Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ccd-border/40">
                    <tr>
                      <td className="py-3.5 font-mono text-ccd-cyan font-semibold">DEPLOY_STRATEGY</td>
                      <td className="py-3.5"><code className="text-ccd-text-muted font-mono">standard</code> | <code className="text-ccd-text-muted font-mono">docker-compose</code></td>
                      <td className="py-3.5 font-mono">standard</td>
                      <td className="py-3.5">Menentukan apakah deployment berupa kontainer tunggal (`docker run`) atau multi-layanan (`docker compose`).</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 font-mono text-ccd-cyan font-semibold">DEPLOY_DIR</td>
                      <td className="py-3.5">Path folder absolut</td>
                      <td className="py-3.5 font-mono">/app/[repo-name]</td>
                      <td className="py-3.5">Folder di server tujuan yang digunakan untuk menampung file compose, `.env`, dan logs.</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 font-mono text-ccd-cyan font-semibold">COMPOSE_FILE</td>
                      <td className="py-3.5">Nama file yaml</td>
                      <td className="py-3.5 font-mono">docker-compose.yml</td>
                      <td className="py-3.5">Nama file compose yang akan diparse jika menggunakan strategi `docker-compose`.</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 font-mono text-ccd-cyan font-semibold">DOCKERFILE_PATH</td>
                      <td className="py-3.5">Path relatif file</td>
                      <td className="py-3.5 font-mono">Dockerfile</td>
                      <td className="py-3.5">Lokasi Dockerfile aplikasi dari root folder (contoh: `backend/Dockerfile` jika bersarang).</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 font-mono text-ccd-cyan font-semibold">DOCKER_BUILD_TARGET</td>
                      <td className="py-3.5">Stage name di Dockerfile</td>
                      <td className="py-3.5">Kosong</td>
                      <td className="py-3.5">Digunakan jika Dockerfile Anda menggunakan multi-stage build dan Anda ingin membatasi build sampai stage tertentu.</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 font-mono text-ccd-cyan font-semibold">DOCKER_PRUNE_STRATEGY</td>
                      <td className="py-3.5"><code className="text-ccd-text-muted font-mono font-semibold">dangling</code> | <code className="text-ccd-text-muted font-mono font-semibold">all</code></td>
                      <td className="py-3.5">Kosong</td>
                      <td className="py-3.5">Mengatur pembersihan image docker setelah rilis: `dangling` (hapus sisa builder) atau `all` (hapus semua image tak terpakai).</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 font-mono text-ccd-cyan font-semibold">PRE_DEPLOY_COMMANDS</td>
                      <td className="py-3.5">Bash Shell Script</td>
                      <td className="py-3.5">Kosong</td>
                      <td className="py-3.5">Kumpulan perintah shell yang dijalankan di server VPS sesaat sebelum kontainer baru dinyalakan.</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 font-mono text-ccd-cyan font-semibold">POST_DEPLOY_COMMANDS</td>
                      <td className="py-3.5">Bash Shell Script</td>
                      <td className="py-3.5">Kosong</td>
                      <td className="py-3.5">Kumpulan perintah shell yang dijalankan di server VPS sesaat setelah kontainer baru berhasil berjalan (contoh: `docker exec -t app-name npm run db:migrate`).</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-ccd-text">Contoh: Template Docker Compose Minimal</h3>
                <p className="text-sm text-ccd-text-dim leading-relaxed">
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
                  <pre className="text-sm font-mono bg-black/30 text-ccd-text-dim p-4 rounded-lg border border-ccd-border/60 overflow-x-auto leading-relaxed">
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
                <h1 className="text-3xl font-bold text-ccd-text tracking-tight mb-2">
                  Troubleshooting & Solusi
                </h1>
                <p className="text-base text-ccd-text-muted">
                  Solusi cepat untuk masalah umum yang terjadi saat deployment.
                </p>
              </div>

              <hr className="border-ccd-border/40" />

              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-ccd-danger flex items-center gap-2 mb-2">
                    <span>🔴</span> Error 422: "No ref found" saat trigger pipeline
                  </h3>
                  <p className="text-sm text-ccd-text-dim leading-relaxed pl-6">
                    <strong>Penyebab:</strong> Branch yang dikonfigurasi pada target Environment (misalnya branch `staging`) belum dibuat atau belum di-push ke GitHub repositori target Anda.
                    <br />
                    <strong>Solusi:</strong> Pastikan Anda telah melakukan push branch tersebut ke GitHub. Gunakan perintah <code className="text-ccd-cyan bg-black/20 px-1.5 py-0.5 rounded font-mono text-xs">git push origin staging</code> di komputer lokal Anda sebelum memulai deploy.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-ccd-danger flex items-center gap-2 mb-2">
                    <span>🔴</span> Error: SSH Connection Failed / Permission Denied
                  </h3>
                  <p className="text-sm text-ccd-text-dim leading-relaxed pl-6">
                    <strong>Penyebab:</strong> Key SSH yang didaftarkan di GitHub Secrets (`SSH_KEY_PRODUCTION` / `SSH_KEY_STAGING`) tidak terdaftar di file `~/.ssh/authorized_keys` di server target, atau IP Host server salah.
                    <br />
                    <strong>Solusi:</strong> Periksa kembali IP Host di tab Server. Uji koneksi SSH secara manual dari komputer lokal Anda menggunakan key yang sama. Pastikan SSH private key berformat PEM/OpenSSH yang valid.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-ccd-danger flex items-center gap-2 mb-2">
                    <span>🔴</span> Error: Docker daemon permission denied
                  </h3>
                  <p className="text-sm text-ccd-text-dim leading-relaxed pl-6">
                    <strong>Penyebab:</strong> User SSH yang didaftarkan pada server target tidak memiliki izin untuk mengeksekusi docker commands tanpa hak akses administrator (`sudo`).
                    <br />
                    <strong>Solusi:</strong> Masukkan user ke grup docker di VPS target dengan perintah:
                    <br />
                    <code className="text-ccd-cyan bg-black/20 px-1.5 py-0.5 rounded font-mono text-xs block w-fit mt-1">
                      sudo usermod -aG docker $USER && newgrp docker
                    </code>
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-ccd-danger flex items-center gap-2 mb-2">
                    <span>🔴</span> Error: Docker compose port conflict / address already in use
                  </h3>
                  <p className="text-sm text-ccd-text-dim leading-relaxed pl-6">
                    <strong>Penyebab:</strong> Anda mencoba mendeploy kontainer baru yang memetakan port host yang sudah terpakai oleh kontainer/aplikasi lain pada VPS yang sama.
                    <br />
                    <strong>Solusi:</strong> Ubah pemetaan port host di file compose atau ubah variabel `PORT` di konfigurasi environment. Gunakan port yang unik untuk setiap aplikasi terpisah.
                  </p>
                </div>
              </div>

              <div className="border-l-4 border-ccd-accent bg-ccd-accent/5 px-5 py-4 rounded-r-lg text-sm text-ccd-text-dim leading-relaxed mt-6">
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
