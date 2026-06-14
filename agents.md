# 🤖 Agents Context — Control Center Deployments (CCD)

> File ini ditujukan untuk AI agents / LLM coding assistants agar memahami project ini secara menyeluruh sebelum melakukan perubahan.

---

## 📋 Overview

**Control Center Deployments (CCD)** adalah aplikasi web internal (self-hosted) untuk mengelola dan men-trigger deployment aplikasi Docker ke server VPS secara terpusat melalui GitHub Actions workflow dispatch.

**Alur kerja utama:**
1. User login (GitHub OAuth atau credential lokal)
2. Sync repository dari GitHub
3. Konfigurasi environment (staging, production) + server target
4. Buat deployment: pilih environment → pilih repos → konfigurasi variables → review → execute
5. Backend trigger GitHub Actions workflow dispatch (`central-deploy.yml`)
6. GitHub Actions menjalankan pipeline: clone repo → build Docker image → push ke Docker Hub → SSH ke server → deploy container
7. Frontend menampilkan real-time logs dan status pipeline

---

## 🏗️ Arsitektur & Tech Stack

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│   React 18 + TypeScript + Vite + TailwindCSS    │
│   Port: 3000 (Nginx di production)              │
├─────────────────────────────────────────────────┤
│                   Backend                        │
│   Node.js + Express + TypeScript + Sequelize    │
│   Port: 5000                                    │
├─────────────────────────────────────────────────┤
│                   Database                       │
│   MySQL 8.0                                     │
│   Port: 3306                                    │
├─────────────────────────────────────────────────┤
│               External Services                  │
│   GitHub API (Octokit) + GitHub Actions          │
│   Docker Hub                                    │
└─────────────────────────────────────────────────┘
```

### Frontend
| Item | Detail |
|------|--------|
| Framework | React 18.3 + TypeScript 5.3 |
| Bundler | Vite 5.2 |
| Routing | react-router-dom 6.22 |
| Styling | TailwindCSS 3.4 + custom design system (`ccd-*` prefix) |
| HTTP Client | Axios 1.6 |
| State | React useState/useContext (no Redux/Zustand) |
| Auth | Context-based (`AuthContext`), JWT token via httpOnly cookie |

### Backend
| Item | Detail |
|------|--------|
| Runtime | Node.js + Express 4.18 |
| Language | TypeScript 5.3 |
| ORM | Sequelize 6.37 |
| Database | MySQL 8.0 (mysql2 driver) |
| Auth | Passport.js + GitHub OAuth2 + JWT (jsonwebtoken) |
| GitHub API | @octokit/rest 20.1 |
| YAML parsing | js-yaml 4.2 |

### Infrastructure
| Item | Detail |
|------|--------|
| Containerization | Docker + docker-compose |
| Network | `center-deployment-network` (bridge) |
| CI/CD | GitHub Actions workflow dispatch |

---

## 📁 Struktur Direktori

```
center-control-deployments/
├── frontend/                        # React SPA
│   ├── src/
│   │   ├── App.tsx                  # Router utama, protected routes
│   │   ├── main.tsx                 # Entry point
│   │   ├── index.css                # Global styles + design tokens
│   │   ├── components/
│   │   │   ├── Deployment/          # Komponen wizard deployment
│   │   │   │   ├── Step01Setup.tsx   # Step 1: Pilih environment & repos
│   │   │   │   ├── Step02Config.tsx  # Step 2: Konfigurasi variables & versioning
│   │   │   │   ├── Step03Review.tsx  # Step 3: Review & execute
│   │   │   │   ├── FileExplorerModal.tsx  # Modal file browser dari repo GitHub
│   │   │   │   └── DeploymentAccordion.tsx
│   │   │   └── Layout/
│   │   │       ├── Layout.tsx        # Wrapper layout dengan sidebar
│   │   │       ├── Sidebar.tsx       # Navigation sidebar
│   │   │       └── TopBar.tsx        # Top navigation bar
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # Overview & statistics
│   │   │   ├── Deployment.tsx        # ⭐ Halaman utama deployment (wizard + list + dashboard)
│   │   │   ├── Repos.tsx             # Manajemen repository
│   │   │   ├── Configuration.tsx     # Settings environment & server
│   │   │   ├── Users.tsx             # User management
│   │   │   ├── Documentation.tsx     # Halaman dokumentasi
│   │   │   └── Login.tsx             # Login page
│   │   ├── context/
│   │   │   ├── AuthContext.tsx        # Authentication state
│   │   │   └── ToastContext.tsx       # Toast notification system
│   │   ├── services/
│   │   │   └── api.ts                # Axios instance (baseURL: /api)
│   │   ├── types/
│   │   │   └── index.ts              # Semua TypeScript interfaces
│   │   └── utils/
│   │       └── errors.ts             # Error message helper
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                          # Express API
│   ├── src/
│   │   ├── app.ts                    # Express app setup
│   │   ├── server.ts                 # Bootstrap, DB sync, seed users
│   │   ├── config/
│   │   │   ├── database.ts           # Sequelize connection
│   │   │   └── env.ts                # Environment variables
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts     # GitHub OAuth + JWT login
│   │   │   ├── deployments.controller.ts  # CRUD deployment
│   │   │   ├── repos.controller.ts    # Repo sync, validation, file browsing
│   │   │   ├── environments.controller.ts
│   │   │   ├── servers.controller.ts
│   │   │   └── users.controller.ts
│   │   ├── routes/
│   │   │   ├── index.ts               # Route aggregator
│   │   │   ├── auth.routes.ts
│   │   │   ├── deployments.routes.ts
│   │   │   ├── repos.routes.ts
│   │   │   ├── environments.routes.ts
│   │   │   ├── servers.routes.ts
│   │   │   ├── config.routes.ts
│   │   │   └── users.routes.ts
│   │   ├── services/
│   │   │   ├── deployment.service.ts  # ⭐ Logika deployment & workflow dispatch
│   │   │   └── github.service.ts      # GitHub API wrapper (Octokit)
│   │   ├── models/
│   │   │   ├── index.ts               # Model associations
│   │   │   ├── User.ts
│   │   │   ├── Environment.ts
│   │   │   ├── Server.ts
│   │   │   ├── Repository.ts
│   │   │   ├── Deployment.ts
│   │   │   ├── DeploymentStep.ts
│   │   │   └── EnvVar.ts
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts
│   │   ├── types/                     # Backend type definitions
│   │   └── utils/
│   └── package.json
│
├── mysql/
│   └── init.sql                       # Database initialization script
├── docker-compose.yml                 # 3 services: mysql, backend, frontend
├── .env.example                       # Template environment variables
└── .github/                           # GitHub Actions workflows
```

---

## 🗄️ Database Schema

### Models & Relationships

```
User (1) ──→ (N) Repository
User (1) ──→ (N) Environment
User (1) ──→ (N) Server
User (1) ──→ (N) Deployment

Environment (1) ──→ (N) Server
Environment (1) ──→ (N) Deployment
Environment (1) ──→ (N) EnvVar

Deployment (1) ──→ (N) DeploymentStep
```

### Tabel Utama

| Model | Kolom Kunci | Deskripsi |
|-------|-------------|-----------|
| **User** | `id`, `github_id`, `login`, `name`, `email`, `password`, `avatar_url` | User yang login via GitHub OAuth atau credential lokal |
| **Environment** | `id`, `name`, `slug`, `color`, `target_branch`, `user_id` | Environment deployment (staging, production, dll) |
| **Server** | `id`, `name`, `host`, `port`, `username`, `environment_id`, `user_id` | Server VPS target deployment |
| **Repository** | `id`, `github_id`, `name`, `full_name`, `clone_url`, `default_branch`, `docker_image_name`, `visibility`, `user_id` | Repo GitHub yang disinkronkan |
| **Deployment** | `id`, `environment_id`, `user_id`, `repositories` (JSON), `config` (JSON), `status`, `notes`, `log`, `deployed_at` | Record deployment |
| **DeploymentStep** | `id`, `deployment_id`, `step_number`, `step_name`, `status`, `detail` (JSON), `log` | Langkah-langkah pipeline dalam 1 deployment |
| **EnvVar** | `id`, `environment_id`, `key`, `value` | Environment variables per-environment |

### Deployment Status Flow
```
draft → pending → running → success
                          → failed
                          → cancelled
```

### Deployment Step Status Flow
```
pending → running → completed
                  → failed
                  → skipped
```

---

## 🌐 API Endpoints

Base URL: `/api`

### Auth (`/api/auth`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/github` | Redirect ke GitHub OAuth |
| GET | `/github/callback` | Callback dari GitHub OAuth |
| POST | `/login` | Login dengan username/password |
| GET | `/me` | Get current user session |
| POST | `/logout` | Logout, clear cookie |

### Repositories (`/api/repos`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/` | List semua repository user |
| POST | `/sync` | Sync repositories dari GitHub |
| DELETE | `/:id` | Hapus repository |
| GET | `/:id/env-keys` | Ambil environment variable keys dari `.env.example` di repo |
| POST | `/validate-branches` | Validasi branch target per-repo per-environment |
| GET | `/:id/compose-services` | Baca docker-compose.yml dan parse services |
| GET | `/:id/contents` | Browse file tree dari repository GitHub |

### Deployments (`/api/deployments`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/` | List semua deployments |
| GET | `/:id` | Detail deployment by ID (include steps, environment) |
| POST | `/` | Create deployment baru (atau draft plan) |
| PUT | `/:id` | Update deployment/draft |
| POST | `/:id/execute` | Execute draft deployment |
| POST | `/:id/retry` | Retry failed deployment |
| PATCH | `/:id/status` | Update status deployment |
| PATCH | `/:id/steps/:stepNumber` | Update step status & log |

### Environments (`/api/environments`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/` | List environments + servers |
| POST | `/` | Create environment |
| PUT | `/:id` | Update environment |
| DELETE | `/:id` | Delete environment |

### Servers (`/api/servers`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/` | List servers |
| POST | `/` | Create server |
| PUT | `/:id` | Update server |
| DELETE | `/:id` | Delete server |

### Users (`/api/users`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/` | List users |
| POST | `/` | Create user |
| PUT | `/:id` | Update user |
| DELETE | `/:id` | Delete user |

### Config (`/api/config`)
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/` | Get app configuration |
| PUT | `/` | Update app configuration |

---

## 🚀 Deployment Wizard Flow (Frontend)

Halaman `Deployment.tsx` memiliki 3 mode:
1. **Deployment List** — daftar semua deployment dengan filter & pagination
2. **Wizard (3 steps)** — form pembuatan deployment baru
3. **Active Deployment Dashboard** — monitoring pipeline real-time

### Wizard Steps

#### Step 01 — Setup (`Step01Setup.tsx`)
- Pilih **environment** (staging/production)
- Pilih **repositories** yang akan di-deploy
- Klik **Validate** — backend cek apakah branch target ada, Dockerfile ada, docker-compose ada
- Hasil validasi menentukan: branch yang digunakan, strategi deployment, keberadaan file

#### Step 02 — Configuration (`Step02Config.tsx`)
- Per-repo accordion card
- **Version Tag**: dropdown dari tag terakhir yang sukses + opsi kustom
- **Release Notes**: catatan deployment
- **Environment Variables**: key-value editor + bulk import (.env)
- **Advanced Settings**: Dockerfile path, Docker Build Target, Docker Compose file path, Pre/Post deploy commands
- **FileExplorerModal**: modal untuk browse file di repo GitHub secara visual
- **Fetch compose services**: scan docker-compose.yml dari repo untuk auto-detect services & tags

#### Step 03 — Review (`Step03Review.tsx`)
- Tampilan read-only summary seluruh konfigurasi
- Environment, repositories, branches, image names, semua config variables
- Tombol **Execute Deployment** dan **Save as Plan**

### State Management
- Wizard state disimpan di `localStorage` agar survive page refresh:
  - `ccd_wizard_step` — step saat ini (1/2/3)
  - `ccd_wizard_form_data` — data form (JSON)
  - `ccd_show_wizard` — wizard visible atau tidak
  - `ccd_wizard_is_validated` — apakah validasi sudah dijalankan
  - `ccd_wizard_validation_results` — hasil validasi branch/Dockerfile
  - `ccd_wizard_editing_draft_id` — ID draft yang sedang diedit (null jika baru)
  - `ccd_active_deployment_id` — ID deployment aktif yang sedang running

### Plan/Draft System
- User bisa **Save as Plan** (status: `draft`) tanpa langsung execute
- Draft bisa diedit kembali (`handleEditPlan`) atau langsung di-execute
- Saat edit plan: state dikembalikan ke Step 01, user harus re-validate

---

## 🔐 Autentikasi

### Flow
1. **GitHub OAuth**: User redirect ke GitHub → callback → backend buat JWT → set httpOnly cookie `token`
2. **Local Login**: POST `/api/auth/login` dengan `{ username, password }` → backend verify hash → set cookie
3. **Session Check**: GET `/api/auth/me` — backend verify JWT dari cookie → return user data
4. **Frontend Guard**: `ProtectedRoute` component cek `useAuth()` context → redirect ke `/login` jika belum login
5. **API Interceptor**: Axios interceptor redirect ke `/login` pada response 401

### Password Hashing
- SHA-256 hash (bukan bcrypt) — lihat `server.ts` line 54

### Default Users (seeded)
- `admin` / `admin`
- `rijal` / `admin`

---

## 🎨 Design System

### CSS Prefix: `ccd-*`
Semua custom class menggunakan prefix `ccd-` (Control Center Deployments):

| Token | Deskripsi |
|-------|-----------|
| `ccd-bg` | Background utama (#0b0f19) |
| `ccd-surface` | Surface/card background |
| `ccd-card` | Card component class |
| `ccd-border` | Border color |
| `ccd-text` | Text primary |
| `ccd-text-dim` | Text secondary |
| `ccd-text-muted` | Text tertiary |
| `ccd-accent` | Accent color (cyan-ish) |
| `ccd-cyan` | Cyan variant |
| `ccd-success` | Green success |
| `ccd-danger` | Red danger |
| `ccd-warning` | Yellow/amber warning |
| `ccd-muted` | Muted gray |
| `ccd-btn-primary` | Primary button |
| `ccd-btn-secondary` | Secondary button |
| `ccd-btn-danger` | Danger button |
| `ccd-btn-ghost` | Ghost button |
| `ccd-input` | Input field |

### Theme
- **Dark mode only** — no light mode toggle
- Color palette: Deep navy/dark backgrounds, cyan accents, neon glows
- Animations: `animate-fade-in`, `animate-slide-down`, `animate-pulse`, spinners
- Glassmorphism: backdrop-blur, semi-transparent surfaces

---

## ⚙️ Environment Variables

Lihat `.env.example` untuk daftar lengkap. Variabel kunci:

| Variable | Deskripsi |
|----------|-----------|
| `NODE_ENV` | development / production |
| `BACKEND_PORT` | Port backend (default: 5000) |
| `FRONTEND_URL` | URL frontend (default: http://localhost:3000) |
| `JWT_SECRET` | Secret untuk signing JWT |
| `JWT_EXPIRES_IN` | Masa berlaku JWT (default: 7d) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Koneksi MySQL |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_CALLBACK_URL` | GitHub OAuth App |
| `GITHUB_TOKEN` | GitHub PAT untuk API calls (repo, workflow scope) |
| `GITHUB_ORG` | Nama org GitHub (opsional, jika kosong sync repo personal) |
| `GITHUB_CENTRAL_OWNER` / `GITHUB_CENTRAL_REPO` | Repo yang menyimpan workflow dispatch |
| `GITHUB_CENTRAL_WORKFLOW` | Nama file workflow (default: central-deploy.yml) |
| `GITHUB_CENTRAL_REF` | Branch untuk workflow dispatch (default: main) |
| `VITE_API_URL` | URL backend dari browser (default: http://localhost:5000) |
| `DOCKER_PRUNE_STRATEGY` | Strategy cleanup Docker images: dangling / all / empty |

---

## 🔧 Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- GitHub OAuth App (untuk login)
- GitHub PAT dengan scope: `repo`, `workflow`, `read:org`

### Quick Start
```bash
# 1. Copy environment
cp .env.example .env
# Edit .env dengan credentials yang benar

# 2. Start semua services
docker-compose up -d

# 3. Atau development tanpa Docker:
# Terminal 1 - Backend
cd backend && npm install && npm run dev

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

### Frontend Dev
```bash
cd frontend
npm run dev      # Vite dev server di port 3000
npm run build    # Build production
```

### Backend Dev
```bash
cd backend
npm run dev      # nodemon + ts-node, auto-reload
npm run build    # Compile TypeScript
npm start        # Run compiled JS
```

---

## ⚠️ Hal Penting untuk Agents

### Konvensi Kode
- **TypeScript strict** di backend dan frontend
- **Tailwind classes** menggunakan custom design tokens `ccd-*`
- **API calls** selalu melalui `api.ts` (Axios instance), base path `/api`
- **State persistence** via `localStorage` untuk wizard — hati-hati saat mengubah key names
- **File besar**: `Deployment.tsx` (~2200 baris) — ini file terbesar dan paling kompleks, berisi wizard, deployment list, dan active deployment dashboard dalam 1 file

### Known Patterns
1. **Validation flow wajib** sebelum bisa Next dari Step 01 ke Step 02
2. **Config structure**: `Record<repoName, Record<key, value>>` — nested by repo name
3. **Special keys** di config yang bukan env vars: `DEPLOY_STRATEGY`, `VERSION_TAG`, `DOCKERFILE_PATH`, `COMPOSE_FILE`, `DEPLOY_DIR`, `PRE_DEPLOY_COMMANDS`, `POST_DEPLOY_COMMANDS`, `TARGET_COMPOSE_SERVICE`, `RELEASE_NOTES`, `DOCKER_BUILD_TARGET`
4. **Draft/Plan system**: Deployment dengan status `draft` bisa diedit ulang sebelum dieksekusi
5. **Branch resolution**: Environment punya `target_branch` → validasi cek apakah branch ada di repo → kalau tidak, fallback ke `default_branch`

### Gotchas / Masalah Umum
1. `Step02Config.tsx` membaca `validationResults` dari localStorage via `useMemo([])` — hanya sekali saat mount. Jika data berubah setelah mount, `validationMap` tidak ter-update
2. `handleEditPlan` di `Deployment.tsx` me-reset `isValidated` dan `validationResults` ke kosong — ini menyebabkan Step02 kehilangan data validasi saat edit plan
3. `Deployment.tsx` sangat besar — perubahan di sini harus hati-hati terhadap side effects
4. `formData.repositories[].id` saat edit plan menggunakan `parseInt(dr.github_id)` yang bisa menghasilkan `0` jika `github_id` bukan angka

### Bahasa
- Komentar dan variabel dalam **Bahasa Inggris**
- Toast messages campuran **Bahasa Indonesia** dan **Inggris**
- Documentation files dalam **Bahasa Inggris**
