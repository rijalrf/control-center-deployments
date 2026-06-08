# 📋 Git Workflow Rules

Aturan pengelolaan branch untuk project ini.

---

## Prinsip Utama

- **`main`** adalah branch production — **jangan langsung kerja di sini**
- Semua pekerjaan dilakukan di branch terpisah, lalu PR ke `main`
- Branch dihapus (lokal) setelah selesai dan sudah di-push

---

## Alur Kerja Branch

### 🔄 Konteks Berbeda → Branch Baru

Jika permintaan menyentuh **fitur, area, atau topik yang berbeda** dari yang sedang aktif, buat branch baru dari `main`:

```bash
git checkout main
git pull
git checkout -b <type>/<nama-deskriptif>
```

**Contoh konteks berbeda:**

- Sedang di `feature/auth-page`, lalu diminta perbaiki bug di halaman deployment → buat `fix/deployment-bug`
- Sedang di `refactor/types`, lalu diminta tambah fitur baru → buat `feature/nama-fitur`

---

### ♻️ Konteks Sama → Tetap di Branch Sebelumnya

Jika permintaan adalah **lanjutan, perbaikan, atau iterasi** dari pekerjaan yang sedang berjalan, **tetap di branch aktif saat ini** (bukan kembali ke `main`):

```bash
# Tidak perlu ganti branch
git add -A
git commit -m "..."
git push
```

**Contoh konteks sama:**

- Menambah fungsi baru ke fitur yang sedang dikerjakan
- Memperbaiki bug yang muncul dari perubahan yang baru dibuat
- Iterasi/revisi atas hasil kerja di branch aktif

---

## Konvensi Nama Branch

| Prefix      | Digunakan untuk                        |
| ----------- | -------------------------------------- |
| `feature/`  | Fitur baru                             |
| `fix/`      | Perbaikan bug                          |
| `refactor/` | Refactoring tanpa perubahan fungsional |
| `chore/`    | Update dependency, config, tooling     |
| `docs/`     | Perubahan dokumentasi saja             |

**Format:** `<prefix>/<nama-singkat-dengan-dash>`

```plan
feature/user-authentication
fix/deployment-status-polling
refactor/remove-any-types
chore/update-dependencies
docs/improve-readme
```

---

## Siklus Lengkap

```bash
# 1. Mulai dari main yang fresh
git checkout main && git pull

# 2. Buat branch baru
git checkout -b feature/nama-fitur

# 3. Kerja, commit, push
git add -A
git commit -m "feat: deskripsi singkat"
git push -u origin feature/nama-fitur

# 4. Buat PR di GitHub ke main

# 5. Setelah PR merge, bersihkan branch lokal
git checkout main
git pull
git branch -d feature/nama-fitur
```

---

## Setelah Selesai Satu Sesi

```bash
# Kembali ke main, pull, hapus branch lokal yang sudah selesai
git checkout main
git pull
git branch -d <branch-yang-sudah-selesai>

# Buat branch baru untuk sesi berikutnya (jika sudah ada task selanjutnya)
git checkout -b <type>/<task-berikutnya>
```
