# Tambah "Save as Plan" di Step 02 & 03, dan Perbaiki Bug Edit Plan

## Deskripsi Masalah

### Masalah 1: Tombol "Save as Plan" hanya ada di Step 03
Saat ini tombol "Save as Plan" hanya muncul di **Step 03 (Review)** pada area navigation buttons di [Deployment.tsx](file:///home/rijal/projects/center-control-deployments/frontend/src/pages/Deployment.tsx#L1641-L1668). Step 01 dan Step 02 tidak memiliki tombol ini. User meminta agar tombol "Save as Plan" juga ditambahkan di **Step 02 (Configuration)** dan **Step 03** (sudah ada).

### Masalah 2: Bug saat Edit Plan — gagal fetch data dari repo
Ketika user meng-edit plan yang sudah disimpan (draft), terjadi error pada bagian **versioning tag** di [Step02Config.tsx](file:///home/rijal/projects/center-control-deployments/frontend/src/components/Deployment/Step02Config.tsx). Ini menyebabkan:
- Tidak bisa memilih path Dockerfile
- Tidak bisa memilih path Docker Compose

**Root Cause Analysis:**

1. **`handleEditPlan`** di [Deployment.tsx:L1387-L1422](file:///home/rijal/projects/center-control-deployments/frontend/src/pages/Deployment.tsx#L1387-L1422) me-reset `isValidated = false` dan `validationResults = {}` saat load plan untuk diedit.

2. **`Step02Config.tsx`** membaca `validationMap` dari `localStorage('ccd_wizard_validation_results')` pada [line 48-55](file:///home/rijal/projects/center-control-deployments/frontend/src/components/Deployment/Step02Config.tsx#L48-L55) — ini hanya dibaca **sekali** saat mount (`useMemo` dengan `[]` dependency). Karena `handleEditPlan` sudah me-reset `validationResults` ke `{}` dan membersihkan localStorage, maka `validationMap` di Step02 selalu **kosong** saat edit plan.

3. Tanpa `validationMap`, beberapa hal gagal:
   - `getComposeDefaultPath()` tidak bisa mendapatkan path compose yang benar
   - `fetchComposeServices()` menggunakan `resolvedBranch` dari `validationMap` yang kosong — fallback ke `repo.default_branch` atau `'main'`, yang mungkin salah
   - `FileExplorerModal` menggunakan `branch` dari `validationMap[repo.id]?.resolved_branch` — juga kosong

4. **Flow yang salah saat edit plan:**
   - User klik "Edit Plan" → `handleEditPlan` dipanggil
   - `isValidated` = false, `validationResults` = `{}`
   - User dimulai dari **Step 01** — harus klik "Validate" dulu
   - Setelah Validate, validationResults terisi → `ccd_wizard_validation_results` di localStorage terisi
   - User klik "Next →" masuk Step 02
   - **TAPI**: `Step02Config` sudah di-mount dan `validationMap` memo sudah di-compute saat kosong
   - Karena `useMemo(() => ..., [])` — **tidak pernah re-compute** walaupun localStorage sudah berubah

5. **Masalah tambahan**: Ketika plan disimpan sebagai draft, data `config` sudah berisi `VERSION_TAG`, `COMPOSE_FILE`, `DOCKERFILE_PATH`, dll. Ketika di-edit, data ini dimuat kembali ke `formData.config`. **Tapi** karena `validationMap` kosong di Step02, `fetchComposeServices` tetap dipanggil dan bisa gagal karena branch tidak benar.

---

## Proposed Changes

### Komponen 1: Navigation Buttons — Tambah "Save as Plan" di Step 02

#### [MODIFY] [Deployment.tsx](file:///home/rijal/projects/center-control-deployments/frontend/src/pages/Deployment.tsx)

**Area: Navigation buttons (line ~1626-1640)**

Saat ini Step 02 hanya memiliki tombol "Next →". Tambahkan tombol "Save as Plan" di sampingnya.

```diff
 ) : currentStep === 2 ? (
-  <button
-    onClick={handleNext}
-    disabled={!canNext() || loadingKeys}
-    className="ccd-btn-primary flex items-center gap-2"
-  >
-    {loadingKeys ? (
-      <>
-        <div className="spinner w-4 h-4 border-t-transparent animate-spin" />
-        Loading variables...
-      </>
-    ) : (
-      <>Next →</>
-    )}
-  </button>
+  <>
+    <button
+      onClick={handleSavePlan}
+      disabled={submitting}
+      className="ccd-btn-secondary border border-ccd-border/50 text-xs py-2.5 px-4"
+    >
+      Save as Plan
+    </button>
+    <button
+      onClick={handleNext}
+      disabled={!canNext() || loadingKeys}
+      className="ccd-btn-primary flex items-center gap-2"
+    >
+      {loadingKeys ? (
+        <>
+          <div className="spinner w-4 h-4 border-t-transparent animate-spin" />
+          Loading variables...
+        </>
+      ) : (
+        <>Next →</>
+      )}
+    </button>
+  </>
 ) : (
```

---

### Komponen 2: Fix Bug — `validationMap` di Step02Config tidak pernah ter-update

#### [MODIFY] [Step02Config.tsx](file:///home/rijal/projects/center-control-deployments/frontend/src/components/Deployment/Step02Config.tsx)

**Perubahan 1: Terima `validationResults` sebagai prop dari parent, bukan baca dari localStorage**

Ubah interface `Step02ConfigProps` untuk menerima `validationResults` langsung dari parent Deployment.tsx, sehingga data selalu sinkron dan reactif.

```diff
 interface Step02ConfigProps {
   data: {
     environment_id: number | null;
     environment: Environment | null;
     repositories: Repository[];
     config: Record<string, Record<string, string>>;
   };
   onChange: (update: Partial<Step02ConfigProps['data']>) => void;
+  validationResults?: Record<number, {
+    resolved_branch: string;
+    desired_branch: string;
+    exists: boolean;
+    fallback_used: boolean;
+    dockerfile_exists: boolean;
+    dockerfile_path: string | null;
+    docker_compose_exists: boolean;
+    docker_compose_path: string | null;
+  }>;
 }
```

**Perubahan 2: Gunakan prop `validationResults` sebagai sumber utama, fallback ke localStorage**

```diff
- const validationMap = React.useMemo(() => {
-   try {
-     const validationSaved = localStorage.getItem('ccd_wizard_validation_results')
-     return validationSaved ? JSON.parse(validationSaved) : {}
-   } catch (e) {
-     return {}
-   }
- }, [])
+ const validationMap = React.useMemo(() => {
+   // Prioritas: prop dari parent (selalu up-to-date), fallback localStorage
+   if (validationResults && Object.keys(validationResults).length > 0) {
+     return validationResults;
+   }
+   try {
+     const validationSaved = localStorage.getItem('ccd_wizard_validation_results')
+     return validationSaved ? JSON.parse(validationSaved) : {}
+   } catch (e) {
+     return {}
+   }
+ }, [validationResults])
```

#### [MODIFY] [Deployment.tsx](file:///home/rijal/projects/center-control-deployments/frontend/src/pages/Deployment.tsx)

**Perubahan: Pass `validationResults` ke Step02Config**

```diff
- {currentStep === 2 && <Step02Config data={formData} onChange={updateData} />}
+ {currentStep === 2 && <Step02Config data={formData} onChange={updateData} validationResults={validationResults} />}
```

---

### Komponen 3: Fix `fetchComposeServices` branch resolution saat edit plan

#### [MODIFY] [Step02Config.tsx](file:///home/rijal/projects/center-control-deployments/frontend/src/components/Deployment/Step02Config.tsx)

Di `fetchComposeServices` (line 85-134), fallback branch juga harus mempertimbangkan `repo.branch` yang sudah tersimpan di plan:

```diff
  const fetchComposeServices = async (repo: Repository, customPath?: string) => {
    // ...
    const targetBranch = data.environment?.target_branch || (data.environment?.name?.toLowerCase() === 'production' ? 'main' : 'staging')
-   const resolvedBranch = validationMap[repo.id]?.resolved_branch || targetBranch || repo.default_branch || 'main'
+   const resolvedBranch = validationMap[repo.id]?.resolved_branch || repo.branch || targetBranch || repo.default_branch || 'main'
    // ...
  }
```

Dan juga di `FileExplorerModal` branch prop (line 738-742):

```diff
  branch={
-   validationMap[explorerTarget.repo.id]?.resolved_branch ||
+   validationMap[explorerTarget.repo.id]?.resolved_branch ||
+   explorerTarget.repo.branch ||
    explorerTarget.repo.default_branch ||
    'main'
  }
```

---

## Ringkasan Perubahan

| File | Perubahan |
|------|-----------|
| [Deployment.tsx](file:///home/rijal/projects/center-control-deployments/frontend/src/pages/Deployment.tsx) | Tambah tombol "Save as Plan" di Step 02, pass `validationResults` prop ke `Step02Config` |
| [Step02Config.tsx](file:///home/rijal/projects/center-control-deployments/frontend/src/components/Deployment/Step02Config.tsx) | Terima prop `validationResults`, gunakan sebagai sumber utama validationMap, perbaiki fallback branch di `fetchComposeServices` dan `FileExplorerModal` |

---

## Verification Plan

### Manual Verification
1. **Save as Plan di Step 02:**
   - Buat deployment baru → isi Step 01 → validate → Next ke Step 02
   - Pastikan tombol "Save as Plan" terlihat di sebelah "Next →"
   - Klik "Save as Plan" → harus berhasil simpan sebagai draft
   
2. **Save as Plan di Step 03:**
   - Lanjutkan sampai Step 03 → pastikan tombol "Save as Plan" tetap ada (tidak berubah)

3. **Edit Plan Bug:**
   - Simpan sebuah plan dari Step 02 atau Step 03
   - Klik "Edit" pada plan yang sudah disimpan dari daftar deployment
   - Masuk Step 01 → klik Validate → klik Next ke Step 02
   - Pastikan:
     - ✅ Version tag dropdown tampil dengan benar (bukan error)
     - ✅ Dockerfile path bisa diklik dan membuka file explorer
     - ✅ Docker Compose path (jika ada) bisa diklik dan membuka file explorer
     - ✅ Compose services ter-fetch dengan benar
