# 🚀 Control Center Deployment (CCD)

Dashboard manajemen deployment remote GitHub dengan antarmuka modern dan alur deployment terstruktur.

## Stack

| Layer    | Tech                           |
| -------- | ------------------------------ |
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend  | Node.js + Express + Sequelize  |
| Database | MySQL 8                        |
| Auth     | GitHub OAuth 2.0 + JWT         |
| Infra    | Docker + Docker Compose        |

## Quick Start

### 1. Copy & isi environment variables

```bash
cp .env.example .env
# Edit .env dengan:
# - GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET (buat di https://github.com/settings/developers)
# - GITHUB_TOKEN (Personal Access Token untuk sync repo)
# - GITHUB_ORG (nama org GitHub, optional)
# - JWT_SECRET (random string panjang)
```

### 2. Buat GitHub OAuth App

1. Buka https://github.com/settings/developers
2. Klik **"New OAuth App"**
3. Isi:
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:5000/api/auth/github/callback`
4. Copy **Client ID** dan **Client Secret** ke `.env`

### 2. Persiapkan GitHub Secrets

Aplikasi ini menggunakan repo pusat (biasanya repo ini sendiri) untuk menjalankan workflow deployment. Anda perlu menambahkan secrets berikut di repositori GitHub Anda (**Settings > Secrets and variables > Actions**):

| Secret Name | Deskripsi |
|-------------|-----------|
| `GIT_TOKEN` | Personal Access Token (PAT) dengan akses `repo` (sama dengan `GITHUB_TOKEN` di `.env`) |
| `DOCKERHUB_USERNAME` | Username Docker Hub Anda (untuk push/pull image) |
| `DOCKERHUB_TOKEN` | Access Token Docker Hub Anda |
| `SSH_KEY_PRODUCTION` | SSH Private Key untuk akses ke server Production |
| `SSH_KEY_STAGING` | SSH Private Key untuk akses ke server Staging |

### 3. Jalankan dengan Docker

```bash
docker-compose up --build -d
```

### 4. Akses Aplikasi

| Service      | URL                              |
| ------------ | -------------------------------- |
| Frontend     | http://localhost:3000            |
| Backend API  | http://localhost:5000            |
| Health Check | http://localhost:5000/api/health |

## Docker Resources

| Resource  | Name                        |
| --------- | --------------------------- |
| Network   | `center-deployment-network` |
| DB Volume | `ccd-mysql-data`            |
| Frontend  | `ccd-frontend`              |
| Backend   | `ccd-backend`               |
| MySQL     | `ccd-mysql`                 |

## Features

- 🔐 **Login** via GitHub OAuth
- 📦 **Repos**: Sinkronisasi repositori dari GitHub API
- 🚀 **Deployment**: Alur 3-step (Setup → Konfigurasi → Review & Eksekusi) dengan accordion progress tracker
- ⚙️ **Configuration**: Manajemen Environment dan Server infrastruktur

## Project Structure

```
center-control-deployments/
├── docker-compose.yml
├── .env.example
├── mysql/init.sql
├── backend/         ← Node.js + Express API
│   ├── config/
│   ├── models/
│   ├── routes/
│   └── middleware/
└── frontend/        ← React + Vite + Tailwind
    └── src/
        ├── components/
        ├── pages/
        ├── context/
        └── services/
```

## Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f ccd-backend
docker-compose logs -f ccd-frontend

# Stop
docker-compose down

# Stop & remove volumes (reset DB)
docker-compose down -v
```
