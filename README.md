<div align="center">

# 🚀 Control Center Deployment

**Dashboard terpusat untuk mengelola deployment ke remote server via GitHub Actions.**

![Stack](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb?style=flat-square&logo=react)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=flat-square&logo=node.js)
![Database](https://img.shields.io/badge/Database-MySQL%208-4479a1?style=flat-square&logo=mysql)
![Auth](https://img.shields.io/badge/Auth-GitHub%20OAuth%202.0-181717?style=flat-square&logo=github)
![Infra](https://img.shields.io/badge/Infra-Docker%20%2B%20Compose-2496ed?style=flat-square&logo=docker)

</div>

---

## ✨ Fitur

| Fitur | Deskripsi |
|---|---|
| 🔐 **GitHub OAuth** | Login aman via GitHub |
| 📦 **Repository Registry** | Sinkronisasi repo dari GitHub API |
| 🚀 **Deployment Wizard** | Alur 3-step: Setup → Konfigurasi → Review & Eksekusi |
| 📊 **Live Monitoring** | Pelacakan real-time status pipeline GitHub Actions |
| ⚙️ **Infrastructure Config** | Manajemen Environment dan Server |
| 📋 **Deployment History** | Riwayat lengkap semua deployment |

---

## 🏗️ Arsitektur

```
Browser ──► Frontend (React)  ──► Backend (Express API) ──► MySQL
                                        │
                                        └──► GitHub Actions (trigger & polling)
                                                    │
                                                    └──► Remote Server (SSH deploy)
```

### Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, TypeScript |
| Backend | Node.js, Express, Sequelize ORM, TypeScript |
| Database | MySQL 8 |
| Auth | GitHub OAuth 2.0 + JWT (httpOnly cookie) |
| CI/CD | GitHub Actions (workflow dispatch) |
| Infra | Docker + Docker Compose |

---

## ⚡ Quick Start

### Prerequisites

Sebelum mulai, pastikan sudah tersedia:

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- GitHub account dengan akses ke repo yang ingin di-deploy

---

### 1. Clone & konfigurasi environment

```bash
git clone https://github.com/<your-org>/center-control-deployments.git
cd center-control-deployments

cp .env.example .env
```

Edit `.env` dan isi variabel berikut:

| Variabel | Deskripsi |
|---|---|
| `GITHUB_CLIENT_ID` | Client ID dari GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | Client Secret dari GitHub OAuth App |
| `GITHUB_TOKEN` | Personal Access Token (scope: `repo`, `workflow`) |
| `GITHUB_ORG` | Nama organisasi GitHub *(opsional, untuk sync repo org)* |
| `JWT_SECRET` | String random panjang untuk signing JWT |

---

### 2. Buat GitHub OAuth App

1. Buka **[GitHub Developer Settings](https://github.com/settings/developers)** → **New OAuth App**
2. Isi form:
   - **Application name**: `Control Center Deployment`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:5000/api/auth/github/callback`
3. Copy **Client ID** dan **Client Secret** ke `.env`

---

### 3. Tambahkan GitHub Secrets ke repositori ini

Aplikasi ini menggunakan repository pusat (repo ini) untuk menjalankan GitHub Actions deployment.  
Tambahkan secrets berikut di **Settings → Secrets and variables → Actions**:

| Secret | Deskripsi |
|---|---|
| `GIT_TOKEN` | Personal Access Token (PAT) dengan scope `repo` & `workflow` |
| `DOCKERHUB_USERNAME` | Username Docker Hub (untuk push/pull image) |
| `DOCKERHUB_TOKEN` | Access Token Docker Hub |
| `SSH_KEY_PRODUCTION` | SSH Private Key untuk server Production |
| `SSH_KEY_STAGING` | SSH Private Key untuk server Staging |

---

### 4. Jalankan aplikasi

```bash
docker-compose up --build -d
```

---

### 5. Akses aplikasi

| Service | URL |
|---|---|
| 🖥️ Frontend | <http://localhost:3000> |
| ⚙️ Backend API | <http://localhost:5000> |
| 💚 Health Check | <http://localhost:5000/api/health> |

---

## 📁 Struktur Project

```
center-control-deployments/
├── docker-compose.yml
├── .env.example
├── mysql/
│   └── init.sql
├── backend/                    ← Node.js + Express API
│   └── src/
│       ├── config/             ← Database, Passport, env
│       ├── controllers/        ← Request handlers
│       ├── middleware/         ← Auth, error handler
│       ├── models/             ← Sequelize models
│       ├── routes/             ← API route definitions
│       ├── services/           ← Business logic (GitHub, Deployment)
│       ├── types/              ← TypeScript interfaces
│       └── utils/              ← Shared utilities
└── frontend/                   ← React + Vite + Tailwind
    └── src/
        ├── components/         ← Reusable UI components
        ├── context/            ← Auth & Toast providers
        ├── pages/              ← Route-level pages
        ├── services/           ← Axios API client
        ├── types/              ← TypeScript interfaces
        └── utils/              ← Shared utilities
```

---

## 🐳 Docker Resources

| Resource | Name |
|---|---|
| Network | `center-deployment-network` |
| DB Volume | `ccd-mysql-data` |
| Container: Frontend | `ccd-frontend` |
| Container: Backend | `ccd-backend` |
| Container: Database | `ccd-mysql` |

---

## 🛠️ Commands

```bash
# Jalankan semua service
docker-compose up -d

# Jalankan dengan rebuild image
docker-compose up --build -d

# Lihat logs real-time
docker-compose logs -f ccd-backend
docker-compose logs -f ccd-frontend

# Hentikan semua service
docker-compose down

# Hentikan & hapus semua data (reset DB)
docker-compose down -v
```

---

## 📖 HOWTO

Lihat [HOWTO.md](./HOWTO.md) untuk panduan konfigurasi workflow GitHub Actions secara lengkap.
