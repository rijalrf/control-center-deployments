# 📖 Panduan Penggunaan & Setup Control Center Deployment (CCD)

Dokumen ini menjelaskan cara melakukan setup dan menggunakan aplikasi CCD untuk mengelola deployment repositori GitHub Anda secara terpusat.

---

## 🛠 1. Persiapan Awal (Setup)

### A. Konfigurasi Environment (`.env`)

Salin file `.env.example` menjadi `.env` di root project dan isi variabel berikut:

1. **GitHub OAuth**: Buat OAuth App di GitHub Settings untuk fitur Login.
2. **GITHUB_TOKEN**: Gunakan Personal Access Token (Classic) dengan scope `repo`, `workflow`, dan `read:org`.
3. **GITHUB_CENTRAL_OWNER & REPO**: Isi dengan owner dan nama repositori ini (tempat file `central-deploy.yml` berada).

### B. Konfigurasi GitHub Secrets

Buka repositori Anda di GitHub, lalu navigasi ke **Settings > Secrets and variables > Actions**. Tambahkan secret berikut:

| Secret Name          | Deskripsi                                              |
| :------------------- | :----------------------------------------------------- |
| `GIT_TOKEN`          | PAT GitHub yang sama dengan yang ada di `.env`.        |
| `DOCKERHUB_USERNAME` | Username Docker Hub Anda (Opsional, untuk push image). |
| `DOCKERHUB_TOKEN`    | Access Token Docker Hub (Opsional).                    |
| `SSH_KEY_PRODUCTION` | Private Key SSH untuk server Production.               |
| `SSH_KEY_STAGING`    | Private Key SSH untuk server Staging.                  |

### C. Struktur Branch

Sistem secara otomatis mendeteksi branch workflow berdasarkan Environment yang Anda pilih di dashboard:

- Environment **Production** → Menggunakan branch `main`.
- Environment **Lainnya (Staging, dll)** → Menggunakan branch `staging`.

**PENTING:** Pastikan branch `staging` sudah di-push ke GitHub sebelum mencoba melakukan deployment non-production.

---

## 🚀 2. Cara Melakukan Deployment

Deployment dilakukan melalui wizard 3-langkah di menu **Deployment**:

### Step 1: Setup

- **Select Environment**: Pilih target environment (misal: Staging).
- **Select Repositories**: Pilih satu atau lebih repositori yang ingin dideploy secara bersamaan.

### Step 2: Configuration

Sistem akan otomatis membaca `.env.example` dari repo target. Anda bisa mengisi nilainya di sini.

- **PORT**: (Opsional) Secara default container jalan di port 80. Tambahkan variabel `PORT` jika ingin menggunakan port lain (misal: `3000`).
- **DOCKERFILE_PATH**: (Opsional) Tambahkan variabel ini jika Dockerfile tidak berada di root (misal: `backend/Dockerfile`).

### Step 3: Review & Execute

Periksa kembali ringkasan deployment Anda.

- **Save as Plan**: Simpan konfigurasi sebagai draf tanpa menjalankan deployment.
- **Execute Deployment**: Langsung memicu pipeline GitHub Actions.

---

## 📊 3. Memantau Pipeline

Setelah eksekusi, Anda akan diarahkan ke **Active Deployment Dashboard**:

- **Real-time Steps**: Anda akan melihat status setiap langkah (Initializing, Fetching Code, Building Image, dsb) yang diperbarui secara otomatis.
- **Skipped Steps**: Jika Secret Docker Hub tidak diisi, sistem akan otomatis melewati (_skip_) langkah push dan melakukan deployment lokal di server.
- **Terminal Logs**: Bagian bawah dashboard menampilkan log mentah dari GitHub Actions untuk memudahkan debugging jika terjadi error.

---

## 💡 Tips & Troubleshooting

- **Error 422 (No ref found)**: Pastikan branch `staging` atau `main` sudah ada di GitHub.
- **Dockerfile not found**: Pastikan path sudah benar. Jika di dalam folder, gunakan `DOCKERFILE_PATH` di Step 2.
- **Permission Denied (SSH)**: Pastikan `SSH_KEY_...` di GitHub Secrets sudah sesuai dengan user SSH di server target dan user tersebut punya akses ke folder `/app`.
- **Port Conflict**: Jika mendeploy beberapa aplikasi di server yang sama, pastikan masing-masing menggunakan `PORT` yang berbeda.

---

Dokumentasi ini dibuat otomatis oleh Gemini CLI - Juni 2026
