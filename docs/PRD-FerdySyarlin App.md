# Product Requirements Document (PRD)
## Aplikasi Pencatatan Kerja Harian
**Pemilik Produk:** Ferdy Syarlin  
**Versi:** 2.1.0  
**Tanggal:** 3 Juli 2026  
**Status:** Production (deployed ke Vercel)

---

## 1. Latar Belakang

Aplikasi ini dibangun untuk kebutuhan pencatatan aktivitas kerja harian secara personal, dilengkapi dengan lampiran file bukti kerja, sinkronisasi dengan Google Workspace, dan koneksi ke sistem kinerja pribadi. Tujuan utamanya adalah memudahkan dokumentasi, pelaporan, dan evaluasi kinerja secara mandiri dan efisien.

---

## 2. Tujuan Produk

- Mencatat log kerja harian secara terstruktur
- Menyimpan bukti kerja berupa foto dan dokumen
- Menghasilkan laporan WFH dan laporan kinerja bulanan
- Mengelola data profil pegawai termasuk foto profil
- Akses cepat dan responsif di desktop dan mobile

---

## 3. Pengguna

| Atribut | Detail |
|---|---|
| Target pengguna | Ferdy Syarlin (personal, single user) |
| Lingkungan kerja | IAIN Bone, Sulawesi Selatan |
| Perangkat | Desktop & Mobile (web responsive) |

---

## 4. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15.5.20 (App Router) |
| Styling | Tailwind CSS v4 + Custom CSS Variables |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) |
| File Storage Log | Google Drive via Google Apps Script (GAS) |
| File Storage Profil | Supabase Storage (bucket: `fs-storage`) |
| Image Compression | browser-image-compression |
| Hosting | Vercel (production) |
| Repository | GitHub — ferdysyarlin/fs-app |
| Ikon | Lucide React |
| Toast | Sonner |
| Theme | next-themes (dark/light) |

---

## 5. Fitur Utama (Implemented)

### 5.1 Log Kerja Harian

- Input deskripsi, catatan, tautan referensi, status kehadiran, tanggal
- Jam masuk & jam pulang dengan format otomatis `HH:MM`
- Tag bebas untuk pelabelan non-hierarkis
- Satu log dapat memuat banyak gambar (JPG/PNG/WebP) dan dokumen (PDF/Word/Excel)
- Edit inline langsung dari modal tanpa berpindah halaman
- Tampilan Masonry View (kartu) dan Gallery View (foto saja)
- Pencarian full-text dengan debounce 400ms

### 5.2 Manajemen File (Google Drive)

- Upload gambar & dokumen ke Google Drive via Google Apps Script (GAS)
- Gambar ditampilkan melalui proxy internal `/api/image/[id]` (bypass CORS Drive)
- Lightbox slider antar gambar dalam satu log
- Hapus file individual → otomatis terhapus dari Google Drive

### 5.3 Laporan Cetak

- **Laporan WFH**: Rekap hari Jumat dalam satu bulan, format A4 print-ready
- **Laporan Kinerja Bulanan**: Seluruh log dalam satu bulan, format A4 print-ready
- Data profil (nama, NIP, jabatan, unit kerja, penilai) diambil dari `user_settings`

### 5.4 Pengaturan Profil

- Form profil pegawai: nama, NIP, pangkat/golongan, jabatan, unit kerja
- Form data pejabat penilai: nama & NIP atasan
- **Upload foto profil**: avatar bulat, dikompres otomatis, disimpan ke Supabase Storage (`fs-storage/avatars/`)
- Foto profil tersinkron ke avatar Sidebar dan user metadata Supabase Auth

### 5.5 Halaman Publik (vCard)

- Halaman publik di `/` yang menampilkan kartu profil digital Ferdy Syarlin
- Dapat diakses tanpa login
- Mendukung tema terang/gelap

> [!NOTE]
> Fitur **Kinerja**, **Arsip**, **Pencarian global**, **Integrasi Google Calendar/Tasks**, dan **Internal Link (Obsidian-like)** telah dihapus dari scope aktif. Dapat dikembangkan kembali di versi mendatang.

---

## 6. Skema Database (Supabase) — Aktual

> [!IMPORTANT]
> Skema di bawah ini adalah skema **aktual yang berjalan saat ini**. Tabel-tabel lama (`kategori`, `program`, `log_files`, `kinerja_indikator`, `kinerja_realisasi`, `laporan_bulanan`, `log_kerja_link`) telah **dihapus** dari database.

### Tabel Inti

```sql
-- Log kerja harian (skema aktual)
CREATE TABLE log_kerja (
  id           TEXT PRIMARY KEY,             -- Format: LOG-{timestamp}
  user_id      UUID REFERENCES auth.users,
  tanggal      DATE NOT NULL,
  status       TEXT,                         -- Hadir / Dinas / Lembur / Cuti / Sakit
  deskripsi    TEXT,
  catatan      TEXT,
  tautan       TEXT,
  tags         TEXT[],                       -- Array tag bebas
  gambar       JSONB DEFAULT '[]',           -- Array objek gambar dari Google Drive
  dokumen      JSONB DEFAULT '[]',           -- Array objek dokumen dari Google Drive
  jam_masuk    TEXT,                         -- Format HH:MM
  jam_pulang   TEXT,                         -- Format HH:MM
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

### Tabel Pengaturan

```sql
-- Profil pegawai & penilai (key-value)
CREATE TABLE user_settings (
  key      TEXT NOT NULL,
  value    TEXT,
  user_id  UUID REFERENCES auth.users,
  PRIMARY KEY (user_id, key)
);
```

### Tabel Tag

```sql
-- Tag/label kustom
CREATE TABLE tag (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama  TEXT NOT NULL
);
```

### Format JSONB `gambar`

```json
[
  {
    "id": "drive_file_id",
    "name": "KINERJA-20260701.jpg",
    "url": "https://drive.google.com/file/d/...",
    "type": "image/jpeg",
    "uploaded_at": "2026-07-01T00:00:00.000Z"
  }
]
```

### Format JSONB `dokumen`

```json
[
  {
    "id": "drive_file_id",
    "name": "LAPORAN.pdf",
    "url": "https://drive.google.com/file/d/...",
    "type": "application/pdf",
    "size": 1048576,
    "uploaded_at": "2026-07-01T10:00:00.000Z"
  }
]
```

---

## 7. Struktur Google Drive

```
My Drive/
└── LogKerja/
    ├── 2025-01/
    │   ├── 20250115_foto_rapat_ppid_1.jpg
    │   ├── 20250115_foto_rapat_ppid_2.jpg
    │   └── 20250115_notulen_rapat.pdf
    ├── 2025-02/
    └── 2026-06/
```

**Konvensi nama file:** `YYYYMMDD_deskripsi_singkat_urutan.ekstensi`

---

## 8. Arsitektur Aplikasi (Aktual)

```
Next.js (Vercel)
├── app/
│   ├── /                 → vCard publik (tanpa login)
│   ├── login/            → halaman login Google OAuth
│   ├── auth/callback/    → OAuth callback Supabase
│   ├── (app)/            → layout dengan Sidebar (memerlukan login)
│   │   ├── log/          → daftar log kerja (masonry + modal)
│   │   │   ├── @modal/   → parallel route slot modal
│   │   │   ├── [id]/     → detail log
│   │   │   └── new/      → form tambah log baru
│   │   ├── laporan/      → laporan WFH & bulanan (cetak A4)
│   │   └── settings/     → profil pegawai + foto profil
│   └── api/
│       ├── log/          → CRUD log kerja
│       ├── log/[id]/     → detail, update, hapus log
│       ├── files/        → upload & hapus file Drive
│       ├── image/[id]/   → proxy streaming gambar Drive
│       ├── tags/         → daftar semua tag
│       ├── settings/     → CRUD tag
│       ├── user-settings/→ profil pegawai (key-value)
│       └── ping/         → health check
```

---

## 9. Alur Kerja Utama

### Tambah Log Kerja
```
1. Klik FAB "+" → LogModal terbuka (isNew=true)
2. Isi tanggal, status, deskripsi, jam masuk/pulang, tags
3. Upload foto/dokumen → tersimpan ke Google Drive (folder bulan)
4. Simpan → POST /api/log → log baru muncul di daftar tanpa reload
```

### Edit Log Kerja
```
1. Klik kartu log → LogModal terbuka (mode edit)
2. URL berubah ke /log?id=LOG-xxx
3. Edit field → tombol Simpan muncul otomatis (isDirty detection)
4. Simpan → PUT /api/log/[id] → kartu diperbarui in-place
```

### Hapus File
```
1. Klik hapus pada file tertentu
2. API DELETE /api/files: hapus dari Google Drive via GAS
3. Update JSONB gambar/dokumen di log_kerja di Supabase
```

### Hapus Log
```
1. Klik hapus log → dialog konfirmasi kustom (ConfirmProvider)
2. API DELETE /api/log/[id]: hapus log dari Supabase
3. Kartu dihapus dari daftar tanpa reload
```

---

## 10. Komponen UI

| Komponen | Digunakan untuk |
|---|---|
| `Card` | Tampilan log kerja per item |
| `Dialog` | Konfirmasi hapus (via ConfirmProvider) |
| `Input` / `Textarea` | Input data log kerja |
| `Badge` | Label status dan tag |
| `Tabs` | Navigasi laporan (WFH vs Bulanan) |
| `Progress` | Indikator upload file |
| `Button` | Aksi utama (simpan, hapus, upload) |
| `Toast` (Sonner) | Notifikasi sukses/gagal operasi |
| `LogModal` | Modal edit/tambah log (Google Keep style) |
| `FileUploader` | Area upload file (foto + dokumen) |
| `Sidebar` | Navigasi utama + toggle tema |

---

## 11. Halaman Aplikasi

| Halaman | Path | Status |
|---|---|---|
| vCard Publik | `/` | ✅ Live |
| Login | `/login` | ✅ Live |
| Log Kerja | `/log` | ✅ Live |
| Laporan | `/laporan` | ✅ Live |
| Pengaturan | `/settings` | ✅ Live |
| 404 | `/*` | ✅ Live |

---

## 12. Non-Functional Requirements

| Aspek | Target |
|---|---|
| Performance | Halaman utama load < 2 detik |
| Responsive | Mobile-first, support layar 375px ke atas |
| Auth | Google OAuth, hanya akun Ferdy yang bisa login |
| Security | Semua API key di server-side (API Routes), tidak terekspos ke client |
| Availability | Supabase tetap aktif via cron-job.org ping setiap 3 hari |
| Storage | Google Drive 15GB (estimasi cukup untuk bertahun-tahun) |

---

## 13. Batasan & Asumsi

- Aplikasi hanya untuk satu pengguna (tidak ada multi-user / kolaborasi)
- Tidak ada fitur offline
- Arsip tahunan dilakukan manual (bukan otomatis) untuk kontrol penuh
- File storage log di Google Drive; file profil di Supabase Storage

---

## 14. Milestones Pengembangan

| Fase | Scope | Status |
|---|---|---|
| **Fase 1** | Setup project, auth Google OAuth, CRUD log kerja dasar | ✅ Selesai |
| **Fase 2** | Upload/hapus/replace file ke Google Drive | ✅ Selesai |
| **Fase 3** | Laporan WFH & Bulanan cetak A4 | ✅ Selesai |
| **Fase 4** | Pengaturan profil + upload foto profil | ✅ Selesai |
| **Fase 5** | Mobile responsive + dark mode | ✅ Selesai |
| **Fase 6** | Deployment Vercel + GitHub CI/CD | ✅ Selesai (3 Juli 2026) |
| **Fase 7** *(opsional)* | Modul kinerja, arsip, internal link | 🔲 Belum dimulai |

---

## 15. Referensi

- [Supabase Docs](https://supabase.com/docs)
- [Google Drive API](https://developers.google.com/drive/api)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel Deployment](https://vercel.com/docs)
- [GitHub Repository](https://github.com/ferdysyarlin/fs-app)

---

*Dokumen ini akan diperbarui seiring perkembangan proyek.*