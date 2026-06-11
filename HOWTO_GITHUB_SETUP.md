# Panduan Setup GitHub OAuth & Personal Access Token (PAT)

Dokumen ini menjelaskan cara mengatur integrasi GitHub untuk aplikasi Control Center Deployments (CCD). Aplikasi ini menggunakan dua jenis token GitHub yang berbeda fungsi:

1.  **OAuth App:** Digunakan agar pengguna bisa login ke aplikasi web CCD dan mensinkronisasikan daftar repositori mereka sendiri (Sync Repos).
2.  **Personal Access Token (PAT):** Digunakan oleh backend (sebagai *Global Token*) untuk memicu dan memonitor proses deployment melalui GitHub Actions.

---

## 1. Setup GitHub OAuth App (Untuk Login & Sync)

Langkah ini diperlukan agar aplikasi Anda memiliki `GITHUB_CLIENT_ID` dan `GITHUB_CLIENT_SECRET`.

### Langkah-langkah:
1. Buka akun GitHub Anda.
2. Di pojok kanan atas, klik foto profil Anda, lalu pilih **Settings**.
3. Scroll ke bawah pada menu sebelah kiri, lalu klik **Developer settings** (berada di paling bawah).
4. Di panel kiri, klik **OAuth Apps**, kemudian klik tombol **New OAuth App**.
5. Isi formulir pendaftaran aplikasi:
   - **Application name:** `Control Center Deployments` (atau nama lain sesuai keinginan).
   - **Homepage URL:** URL utama aplikasi Anda (contoh saat pengembangan lokal: `http://localhost:3000`).
   - **Application description:** (Opsional) Penjelasan singkat aplikasi.
   - **Authorization callback URL:** URL endpoint callback backend Anda. Secara default untuk lokal ini adalah `http://localhost:5000/api/auth/github/callback`. *(Sangat Penting: Sesuaikan dengan domain server/backend Anda saat di production).*
6. Klik **Register application**.
7. Setelah berhasil dibuat, Anda akan melihat **Client ID**. Salin ID tersebut ke `.env` Anda sebagai `GITHUB_CLIENT_ID`.
8. Klik tombol **Generate a new client secret**. Salin Secret yang muncul ke `.env` Anda sebagai `GITHUB_CLIENT_SECRET`. *(Catatan: Secret ini hanya akan ditampilkan sekali).*

---

## 2. Setup GitHub Personal Access Token (PAT) (Untuk Deployment)

Token ini diperlukan sebagai identitas tunggal aplikasi CCD saat memicu (trigger) *Central Deployment Workflow* di GitHub Actions dan membaca konfigurasi deployment.

### Langkah-langkah:
1. Buka akun GitHub Anda (disarankan akun "mesin" atau akun administrator repositori sentral).
2. Pergi ke **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**.
3. Klik **Generate new token** (pilih *Generate new token (classic)*).
4. Beri nama token di kolom **Note**, misal: `CCD Global Deployment Token`.
5. Atur **Expiration** sesuai kebijakan keamanan Anda (misal: *No expiration* untuk kemudahan, atau atur waktu tertentu lalu perbarui jika kedaluwarsa).
6. Centang *scopes* (hak akses) berikut:
   - `repo` (Full control of private repositories) - *Dibutuhkan untuk memicu workflow dan membaca isi file (seperti Dockerfile/.env.example) di repository target.*
   - `workflow` (Update GitHub Action workflows) - *Dibutuhkan untuk menjalankan `workflow_dispatch`.*
7. Klik **Generate token** di bagian bawah.
8. Salin token (dimulai dengan `ghp_...`) dan tempelkan ke file `.env` Anda sebagai `GITHUB_TOKEN`.

---

## 3. Konfigurasi File `.env`

Setelah mendapatkan kredensial di atas, perbarui file `.env` (atau buat dari `.env.example`) di root proyek Anda:

```env
# ... (konfigurasi lain)

# ── GITHUB OAUTH (Untuk Login User & Sync Repos) ──
GITHUB_CLIENT_ID=isi_dengan_client_id_anda
GITHUB_CLIENT_SECRET=isi_dengan_client_secret_anda
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# ── GITHUB GLOBAL TOKEN (Untuk memicu GitHub Actions & validasi) ──
# Token PAT (Classic) dengan scope: repo, workflow
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── CENTRAL DEPLOYMENT WORKFLOW (Target eksekusi) ──
GITHUB_CENTRAL_OWNER=username_atau_organisasi_pemilik_repo_sentral
GITHUB_CENTRAL_REPO=nama_repo_sentral_ccd
GITHUB_CENTRAL_WORKFLOW=central-deploy.yml
GITHUB_CENTRAL_REF=main
```

### Penting Diketahui:
- Fitur **Sinkronisasi Repositori (Sync Repos)** di aplikasi web *hanya akan mengambil repositori yang bisa diakses oleh user yang sedang login* (menggunakan OAuth).
- Fitur **Deployment** *hanya akan berhasil jika Global PAT (`GITHUB_TOKEN`) memiliki akses untuk mengkloning dan membaca repositori tersebut*. Oleh karena itu, sistem saat ini secara default memblokir repositori berstatus *Private* saat proses validasi (kecuali PAT yang Anda atur memang memiliki akses eksplisit ke repositori private pengguna tersebut).