# Product Requirements Document (PRD)
## Aplikasi Pencatatan Kerja Harian
**Pemilik Produk:** Ferdy Syarlin  
**Versi:** 2.0.0  
**Tanggal:** 1 Juli 2026  
**Status:** Active Development

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
| Frontend | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 + Custom CSS Variables |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) |
| File Storage Log | Google Drive via Google Apps Script (GAS) |
| File Storage Profil | Supabase Storage (bucket: `fs-storage`) |
| Image Compression | browser-image-compression |
| Hosting | Vercel / Lokal (Next.js dev server) |
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

## 6. Skema Database (Supabase)

### Tabel Master

```sql
-- Kategori kegiatan
CREATE TABLE kategori (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama     TEXT NOT NULL,
  warna    TEXT,
  icon     TEXT
);

-- Program / Proyek
CREATE TABLE program (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        TEXT NOT NULL,
  deskripsi   TEXT,
  tahun       INTEGER,
  aktif       BOOLEAN DEFAULT true
);
```

### Tabel Inti

```sql
-- Log kerja harian
CREATE TABLE log_kerja (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal       DATE NOT NULL,
  judul         TEXT NOT NULL,
  deskripsi     TEXT,
  konten        JSONB,           -- isi editor Tiptap (format JSON)
  konten_teks   TEXT,            -- versi plain text untuk full-text search
  konten_fts    TSVECTOR         -- generated column untuk FTS PostgreSQL
                GENERATED ALWAYS AS (to_tsvector('indonesian', coalesce(konten_teks, ''))) STORED,
  kategori_id   UUID REFERENCES kategori(id),
  program_id    UUID REFERENCES program(id),
  durasi_jam    NUMERIC,
  lokasi        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index untuk full-text search
CREATE INDEX log_kerja_fts_idx ON log_kerja USING GIN (konten_fts);

-- File lampiran per laporan
CREATE TABLE log_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_kerja_id    UUID REFERENCES log_kerja(id) ON DELETE CASCADE,
  drive_file_id   TEXT NOT NULL,
  drive_folder_id TEXT,
  nama_file       TEXT NOT NULL,
  tipe_file       TEXT,        -- 'image' | 'pdf' | 'docx' | dll
  mime_type       TEXT,
  ukuran_bytes    BIGINT,
  url_preview     TEXT,
  urutan          INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### Tabel Kinerja

```sql
-- Indikator kinerja (SKP / target)
CREATE TABLE kinerja_indikator (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        TEXT NOT NULL,
  target      TEXT,
  satuan      TEXT,
  bobot       NUMERIC,
  periode     TEXT,
  tahun       INTEGER,
  program_id  UUID REFERENCES program(id)
);

-- Realisasi kinerja (relasi ke log_kerja)
CREATE TABLE kinerja_realisasi (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_kerja_id          UUID REFERENCES log_kerja(id) ON DELETE CASCADE,
  kinerja_indikator_id  UUID REFERENCES kinerja_indikator(id),
  kontribusi            TEXT,
  nilai_realisasi       NUMERIC,
  created_at            TIMESTAMPTZ DEFAULT now()
);
```

### Tabel Ekstensi (Siap Dikembangkan)

```sql
-- Tag bebas per log kerja
CREATE TABLE tag (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama  TEXT NOT NULL
);

CREATE TABLE log_kerja_tag (
  log_kerja_id  UUID REFERENCES log_kerja(id) ON DELETE CASCADE,
  tag_id        UUID REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (log_kerja_id, tag_id)
);

-- Internal link antar log kerja ([[...]] Obsidian-like)
CREATE TABLE log_kerja_link (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dari_id       UUID REFERENCES log_kerja(id) ON DELETE CASCADE,  -- log yang menyebut
  ke_id         UUID REFERENCES log_kerja(id) ON DELETE CASCADE,  -- log yang disebut
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (dari_id, ke_id)
);
-- Query backlink: SELECT dari_id FROM log_kerja_link WHERE ke_id = '<target>'

-- Rekap bulanan (generated)
CREATE TABLE laporan_bulanan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulan           INTEGER,
  tahun           INTEGER,
  total_kegiatan  INTEGER,
  total_jam       NUMERIC,
  catatan         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
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

## 8. Arsitektur Aplikasi

```
Next.js (Vercel)
├── app/
│   ├── (auth)/           → halaman login Google OAuth
│   ├── dashboard/        → ringkasan & statistik
│   ├── log/
│   │   ├── page.tsx      → daftar log kerja
│   │   ├── [id]/         → detail log kerja
│   │   └── new/          → form tambah log
│   ├── kinerja/          → manajemen indikator & realisasi
│   ├── laporan/          → rekap & export
│   ├── arsip/            → data tahun lalu (Google Sheets)
│   ├── search/           → full-text search seluruh log kerja
│   └── api/
│       ├── log/          → CRUD log kerja
│       ├── files/        → upload, hapus, replace file Drive
│       ├── calendar/     → Google Calendar sync
│       ├── tasks/        → Google Tasks sync
│       ├── links/        → kelola internal link antar log
│       └── ping/         → endpoint untuk cron-job.org
```

---

## 9. Alur Kerja Utama

### Tambah Log Kerja
```
1. Buka form → isi judul, tanggal, kategori, deskripsi, durasi
2. Upload foto/dokumen → tersimpan ke Google Drive (folder bulan)
3. Pilih indikator kinerja terkait → isi kontribusi & realisasi
4. Simpan → data masuk ke Supabase (log_kerja + log_files + kinerja_realisasi)
```

### Hapus File
```
1. Klik hapus pada file tertentu
2. API Route: ambil drive_file_id dari Supabase
3. Hapus dari Google Drive (files.delete)
4. Hapus row dari log_files di Supabase
```

### Hapus Laporan
```
1. Klik hapus laporan
2. API Route: ambil semua drive_file_id terkait
3. Hapus seluruh file dari Google Drive (batch)
4. Hapus log_kerja → CASCADE hapus log_files & kinerja_realisasi
```

### Arsip Tahunan (Akhir Tahun)
```
1. Jalankan script export
2. Ambil semua data tahun X dari Supabase
3. Append ke Google Sheets (tab per tahun)
4. Hapus data tahun X dari Supabase (opsional)
```

### Internal Link & Backlink (Obsidian-like)
```
Saat user menulis [[judul laporan]] di editor Tiptap:
  → Autocomplete muncul → user pilih log yang dimaksud
  → Saat simpan: parse semua [[...]] dalam konten
  → Upsert ke tabel log_kerja_link (dari_id → ke_id)
  → Hapus link lama yang sudah tidak ada di konten

Saat buka detail log kerja:
  → Query log_kerja_link WHERE ke_id = log ini
  → Tampilkan daftar backlinks (laporan yang merujuk ke sini)
```

---

## 10. Komponen UI (shadcn/ui)

| Komponen | Digunakan untuk |
|---|---|
| `Card` | Tampilan log kerja per item |
| `Dialog` | Form tambah/edit log, konfirmasi hapus |
| `Form` + `Input` | Input data log kerja |
| `Calendar` | Date picker tanggal log |
| `Badge` | Label kategori dan tipe file |
| `Table` | Daftar log kerja, indikator kinerja |
| `Tabs` | Navigasi detail laporan (info, file, kinerja) |
| `Progress` | Capaian indikator kinerja |
| `Dropzone` | Area upload file (foto + dokumen) |
| `Toast` | Notifikasi sukses/gagal operasi |
| `Sheet` | Sidebar filter & navigasi mobile |
| `Tiptap Editor` | Rich text editor isi log kerja |
| `Command` | Autocomplete `[[...]]` internal link |

---

## 11. Halaman Aplikasi (Implemented)

| Halaman | Path | Deskripsi |
|---|---|---|
| vCard Publik | `/` | Profil digital Ferdy Syarlin, dapat diakses tanpa login |
| Login | `/login` | Autentikasi via Google OAuth |
| Log Kerja | `/log` | Daftar log + masonry cards + modal inline edit |
| Laporan | `/laporan` | Laporan WFH & Bulanan (cetak A4) |
| Pengaturan | `/settings` | Profil pegawai + upload foto profil |
| 404 | `/*` | Halaman tidak ditemukan |

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
- Google Keep tidak diintegrasikan
- Arsip tahunan dilakukan manual (bukan otomatis) untuk kontrol penuh
- File storage sepenuhnya di Google Drive (tidak ada local storage / Supabase storage)

---

## 14. Milestones Pengembangan

| Fase | Scope | Estimasi |
|---|---|---|
| **Fase 1** | Setup project, auth Google OAuth, CRUD log kerja dasar | Minggu 1–2 |
| **Fase 2** | Upload/hapus/replace file ke Google Drive | Minggu 3 |
| **Fase 3** | Modul kinerja (indikator + realisasi) | Minggu 4 |
| **Fase 4** | Integrasi Google Calendar & Tasks | Minggu 5 |
| **Fase 5** | Laporan, export PDF/Excel, arsip Sheets | Minggu 6–7 |
| **Fase 6** | Tiptap editor, internal link `[[...]]`, backlinks, FTS | Minggu 8–9 |
| **Fase 7** | Polish UI, mobile responsiveness, testing | Minggu 10 |

---

## 15. Referensi

- [Supabase Docs](https://supabase.com/docs)
- [Google Drive API](https://developers.google.com/drive/api)
- [Google Calendar API](https://developers.google.com/calendar)
- [Google Tasks API](https://developers.google.com/tasks)
- [shadcn/ui](https://ui.shadcn.com)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel Deployment](https://vercel.com/docs)
- [Tiptap Editor](https://tiptap.dev/docs)

---

*Dokumen ini akan diperbarui seiring perkembangan proyek.*