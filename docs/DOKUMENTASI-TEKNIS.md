# Dokumentasi Teknis – FerdySyarlin App

> Dibuat: 30 Juni 2026  
> Terakhir diperbarui: 3 Juli 2026 (upgrade Next.js 15.5.20, deployment Vercel, fix parallel route & API route)

---

## Daftar Isi

1. [Gambaran Umum](#gambaran-umum)
2. [Stack Teknologi](#stack-teknologi)
3. [Struktur Folder](#struktur-folder)
4. [Database (Supabase)](#database-supabase)
5. [Sistem Tema (Light / Dark)](#sistem-tema)
6. [Komponen UI](#komponen-ui)
7. [Providers Global](#providers-global)
8. [Halaman Utama](#halaman-utama)
9. [API Routes](#api-routes)
10. [Fitur Modal Log (Google Keep Style)](#fitur-modal-log)
11. [Manajemen Gambar (Google Drive)](#manajemen-gambar-google-drive)
12. [Sidebar & Navigasi](#sidebar--navigasi)
13. [Tampilan Mobile (Responsive)](#tampilan-mobile-responsive)
14. [Halaman Laporan](#halaman-laporan)
15. [Deployment (Vercel + GitHub)](#deployment-vercel--github)

---

## Gambaran Umum

Aplikasi **FerdySyarlin** adalah aplikasi produktivitas personal berbasis web untuk mencatat **log kerja harian**, membuat **laporan WFH & Bulanan**, serta mendokumentasikan file pendukung. Aplikasi mendukung tema terang dan gelap secara penuh, serta dioptimalkan untuk tampilan desktop dan mobile.

---

## Stack Teknologi

| Layer | Teknologi |
|---|---|
| Framework | [Next.js 15.5.20](https://nextjs.org/) (App Router) |
| Backend / DB | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage) |
| Styling | Tailwind CSS v4 + Custom CSS Variables |
| Ikon | [Lucide React](https://lucide.dev/) |
| Toast | [Sonner](https://sonner.emilkowal.ski/) |
| Auth | Supabase Auth (OAuth Google) |
| Integrasi API | Google Tasks API (REST v1) |
| Theme | [next-themes](https://github.com/pacocoursey/next-themes) |
| Image Compression | [browser-image-compression](https://www.npmjs.com/package/browser-image-compression) |
| File Storage Log | Google Drive via Google Apps Script (GAS) Web App |
| File Storage Profil | Supabase Storage (bucket: `fs-storage`) |
| Date Utilities | [date-fns](https://date-fns.org/) |
| Hosting | [Vercel](https://vercel.com) (production) |
| Repository | [GitHub — ferdysyarlin/fs-app](https://github.com/ferdysyarlin/fs-app) |

---

## Struktur Folder

```
fs-app/
├── app/
│   ├── (app)/               # Layout utama dengan Sidebar (memerlukan login)
│   │   ├── log/             # Daftar Log Kerja (masonry cards + modal)
│   │   │   ├── @modal/      # Parallel route slot untuk modal log
│   │   │   ├── [id]/        # Halaman detail log
│   │   │   └── new/         # Form log baru
│   │   ├── tasks/           # Manajemen Tasks (To-Do) tersinkron Google Tasks
│   │   ├── laporan/         # Halaman Laporan (WFH & Bulanan) + Cetak Preview
│   │   └── settings/        # Pengaturan profil pegawai untuk laporan
│   ├── api/                 # API Routes (Next.js Route Handlers)
│   │   ├── log/             # CRUD Log Kerja
│   │   ├── log/[id]/        # Detail, Update, Delete log
│   │   ├── google-tasks/    # API endpoints sinkronisasi Google Tasks
│   │   ├── settings/        # CRUD tag
│   │   ├── files/           # Upload/delete file via Google Apps Script (GAS)
│   │   ├── image/[id]/      # Proxy endpoint untuk streaming gambar dari Google Drive
│   │   ├── tags/            # Daftar semua tag
│   │   ├── ping/            # Health check endpoint
│   │   └── user-settings/   # CRUD pengaturan profil pegawai (key-value)
│   ├── auth/                # Callback OAuth Supabase
│   ├── login/               # Halaman Login
│   ├── page.tsx             # Halaman publik (vCard profil)
│   └── globals.css          # Variabel tema + custom utility classes
├── components/
│   ├── ui/                  # Komponen UI dasar (Button, Card, Input, dll)
│   ├── shared/              # Komponen bersama (Sidebar)
│   ├── log/                 # Komponen khusus Log (LogModal, LogForm, FileUploader, dll)
│   └── providers/           # Context providers (ConfirmProvider)
├── lib/
│   ├── supabase/            # Client/server Supabase helpers
│   └── utils.ts             # Utility functions (cn, formatDate, dll)
├── types/                   # TypeScript type definitions
├── supabase/
│   └── migrations/          # SQL migration scripts
└── docs/                    # Dokumentasi proyek (folder ini)
```

---

## Database (Supabase)

### Tabel Utama: `log_kerja`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `text` (PK) | Format: `LOG-{timestamp}` |
| `user_id` | `uuid` | FK ke auth.users |
| `tanggal` | `date` | Tanggal log dibuat |
| `status` | `text` | Hadir / Dinas / Lembur / Cuti / Sakit |
| `deskripsi` | `text` | Isi utama log (opsional) |
| `catatan` | `text` | Catatan tambahan (opsional) |
| `tautan` | `text` | URL referensi (opsional) |
| `tags` | `text[]` | Array tag/label |
| `gambar` | `jsonb` | Array objek gambar (JPG/PNG/WebP) |
| `dokumen` | `jsonb` | Array objek dokumen (PDF/Word/Excel/PPT) |
| `google_task_ids` | `text[]` | Array ID task dari Google Tasks yang ditautkan ke log ini |
| `jam_masuk` | `text` | Jam masuk kerja, format `HH:MM` (contoh: `07:30`) |
| `jam_pulang` | `text` | Jam pulang kerja, format `HH:MM` (contoh: `16:00`) |
| `created_at` | `timestamptz` | Otomatis |

> [!NOTE]
> **Tabel `log_files`, `kategori`, `program`, `log_kerja_link` sudah dihapus.** Data lampiran gambar kini disimpan secara denormalisasi dalam kolom `gambar` dan `dokumen` (JSONB) di tabel `log_kerja`. Kolom `kategori_id` dan `program_id` telah dihapus dari skema.

### Format Kolom `gambar` (JSONB)

```json
[
  {
    "id": "1P4C-WdszKy676R5qCIqmTX1y-lNIfjsh",
    "name": "KINERJA-20260701-6DNXX.jpg",
    "url": "https://drive.google.com/file/d/1P4C.../view?usp=drivesdk",
    "type": "image/jpeg",
    "uploaded_at": "2026-07-01T00:00:00.000Z"
  }
]
```

### Format Kolom `dokumen` (JSONB)

```json
[
  {
    "id": "2X9F-QrstUvWxyZ1234567890abcdefgh",
    "name": "LAPORAN-BULANAN.pdf",
    "url": "https://drive.google.com/file/d/2X9F.../view?usp=drivesdk",
    "type": "application/pdf",
    "size": 1048576,
    "uploaded_at": "2026-07-01T10:00:00.000Z"
  }
]
```

### Tabel: `tag`

Label/tag bebas yang dapat ditambahkan ke log kerja.

### Tabel Master Data

- `tag` — Tag/label kustom (satu-satunya tabel master yang tersisa)

> [!NOTE]
> **Tabel `kategori`, `program`, `log_kerja_link`, `kinerja_indikator`, `kinerja_realisasi`, dan `laporan_bulanan` telah dihapus.**

### Tabel: `user_settings`

Tabel bersifat **key-value** untuk fleksibilitas penyimpanan data profil pegawai yang digunakan di laporan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `key` | `text` (PK) | Nama pengaturan |
| `value` | `text` | Nilai pengaturan |
| `user_id` | `uuid` | FK ke auth.users |

**Key yang digunakan:**

| Key | Keterangan |
|---|---|
| `nama_lengkap` | Nama pegawai yang dinilai |
| `nip` | NIP pegawai |
| `pangkat_golongan` | Pangkat dan Golongan Ruang |
| `jabatan` | Jabatan pegawai |
| `unit_kerja` | Unit kerja |
| `nama_penilai` | Nama Pejabat Penilai Kinerja |
| `nip_penilai` | NIP Pejabat Penilai Kinerja |
| `profil_gambar` | URL publik foto profil pegawai (disimpan di Supabase Storage `fs-storage/avatars/`) |

> [!NOTE]
> **Tabel `laporan_bulanan` sudah dihapus.** Laporan bulanan kini dibuat secara dinamis dengan menarik data langsung dari tabel `log_kerja`.

---

## Sistem Tema

Tema dikelola melalui **CSS Custom Properties** yang didefinisikan di [`app/globals.css`](../app/globals.css).

### Cara Kerja

- Variabel `--background`, `--foreground`, `--card`, `--muted`, `--border`, `--primary`, dll. didefinisikan di `:root` (terang) dan `.dark` (gelap).
- Toggle tema dilakukan melalui **tombol switch toggle** di Sidebar menggunakan `next-themes`.
- Toggle menampilkan label "Mode Gelap" dengan visual *pill switch* yang bergerak.
- Toaster menggunakan `resolvedTheme` agar warna toast otomatis ikut tema.

### Aturan Kode

> [!IMPORTANT]
> **Jangan gunakan warna HSL hardcoded** seperti `style={{ color: "hsl(215,20%,55%)" }}` di dalam komponen.  
> Selalu gunakan kelas Tailwind semantik seperti `text-muted-foreground`, `bg-card`, `border-border`, `text-foreground`, dll.

---

## Komponen UI

Semua komponen dasar ada di `components/ui/`:

| Komponen | File | Keterangan |
|---|---|---|
| `Button` | `button.tsx` | Variant: `primary`, `secondary`, `ghost`, `outline`, `destructive` |
| `Input` | `input.tsx` | Mendukung `label`, `icon`, `error` |
| `Textarea` | `input.tsx` | Auto-resize tersedia via komponen `AutoResizeTextarea` di LogModal |
| `Select` | `input.tsx` | Dropdown yang disesuaikan temanya |
| `Card` | `card.tsx` | Tanpa padding default (`p-0`); padding diatur via `CardContent` |
| `Badge` | `badge.tsx` | Variant + warna kustom via prop `color` |
| `Progress` | `progress.tsx` | Bar + Tabs component |
| `Dialog` | `dialog.tsx` | Modal dengan backdrop blur |
| `Toast` | `toast.tsx` | Wrapper Sonner, mengikuti tema otomatis |

---

## Providers Global

### `ConfirmProvider`

File: [`components/providers/ConfirmProvider.tsx`](../components/providers/ConfirmProvider.tsx)

Menggantikan `window.confirm()` bawaan browser dengan dialog kustom berdesain konsisten.

---

## Halaman Utama

### `/log` — Daftar Log Kerja

- **Dua Mode Tampilan**:
  - **Masonry View** (Default): Menampilkan kartu log lengkap dengan deskripsi, status, dan thumbnail gambar.
  - **Gallery View**: Menampilkan seluruh foto dari semua log dalam tata letak masonry murni.
- Pencarian full-text dengan debounce 400ms.
- Klik kartu membuka **LogModal** (inline editable).
- **Lightbox Slider**: Memiliki panah Kiri/Kanan jika log memiliki lebih dari satu gambar.
- Teks deskripsi pada kartu menggunakan ukuran `text-[10px] lg:text-xs` (kompak).

### `/log?id=[id]` — Modal Log

- URL berubah ke `?id=LOG-xxx` ketika modal dibuka via klik kartu.
- Modal langsung bisa diedit (deskripsi, catatan, tautan, status, tanggal, tags, jam masuk/pulang).
- Tombol **"Simpan"** muncul otomatis ketika ada perubahan (*isDirty*).
- Di **desktop**: Muncul sebagai modal pop-up di tengah layar (max-w-2xl, max-h-85vh).
- Di **mobile**: Muncul sebagai **full-page** (layar penuh, seperti berpindah halaman).
- **Jam Masuk & Pulang**: Input text dengan format otomatis `HH:MM`. Mengetik `0730` akan otomatis diformat menjadi `07:30`.
- **Isi Otomatis Jam**: Saat membuat log baru, jam masuk otomatis terisi `07:30`, jam pulang terisi `16:00` (Senin-Kamis) atau `16:30` (Jumat) berdasarkan tanggal yang dipilih.
- **Tautan Task (Google Tasks)**: Task yang ditautkan ke log ini akan muncul secara instan di bagian bawah form berkat mekanisme *background prefetching*. Pengguna dapat mengedit task (judul, catatan, tenggat waktu) atau menandainya selesai langsung dari dalam modal log.

### `/tasks` — Daftar Tasks (To-Do)

- Menampilkan daftar task yang tersinkron langsung dengan Google Tasks pengguna.
- Layout full-width (100%) dengan UI *accordion* yang akan terbuka memunculkan detail saat diklik.
- Menggunakan *Floating Action Button (FAB)* untuk menambah task baru atau *refresh* data.
- **Indikator Bintang**: Task berbintang (Prioritas) disinkronisasikan menggunakan *prefix* emoji ⭐ pada judul task agar terbaca di lintas platform (aplikasi web maupun aplikasi mobile Google Tasks).

### `/settings` — Pengaturan

Formulir **Profil Pegawai & Penilai** lengkap dengan:
- **Unggah Foto Profil**: Avatar lingkaran dengan tombol upload. Gambar dikompres otomatis, lalu disimpan ke Supabase Storage (`fs-storage/avatars/`). URL publik tersimpan di `user_settings` (key: `profil_gambar`) dan user metadata Supabase Auth diperbarui agar avatar Sidebar ikut berubah.
- Form data pegawai: nama, NIP, pangkat/golongan, jabatan, unit kerja.
- Form data pejabat penilai: nama penilai, NIP penilai.

> [!NOTE]
> Tab **Kategori** dan **Program** telah dihapus sepenuhnya dari halaman Pengaturan.

---

## API Routes

Semua route ada di `app/api/`:

| Endpoint | Method | Keterangan |
|---|---|---|
| `/api/log` | GET | Daftar log (filter, pagination, full-text search) |
| `/api/log` | POST | Buat log baru (ID format: `LOG-{timestamp}`) |
| `/api/log/[id]` | GET | Detail log (termasuk kolom `gambar`, `dokumen`, `jam_masuk`, `jam_pulang`) |
| `/api/log/[id]` | PUT | Update log |
| `/api/log/[id]` | DELETE | Hapus log |
| `/api/google-tasks` | GET/POST/PUT | Ambil daftar, buat, dan update task dari Google Tasks API |
| `/api/google-tasks/link` | POST/DELETE | Tautkan atau lepas tautan antara Task dan Log Kerja |
| `/api/google-tasks/linked-logs-all` | GET | Ambil mapping *prefetch* semua log yang memiliki tautan task untuk *instant loading* |
| `/api/settings` | GET/POST/PUT/DELETE | CRUD tag |
| `/api/files` | POST | Upload gambar/dokumen ke Google Drive, update JSONB `gambar`/`dokumen` di `log_kerja` |
| `/api/files` | DELETE | Hapus file dari Drive, update JSONB di `log_kerja` |
| `/api/image/[id]` | GET | **Proxy** streaming gambar dari Google Drive (bypass CORS/embedding restriction) |
| `/api/tags` | GET | Daftar semua tag yang tersedia |
| `/api/ping` | GET | Health check endpoint |
| `/api/user-settings` | GET | Ambil semua pengaturan profil pegawai |
| `/api/user-settings` | PATCH | Simpan/update pengaturan profil pegawai |

> [!IMPORTANT]
> Next.js App Router hanya mengizinkan export HTTP method standar di Route Handler: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. Jangan menggunakan nama fungsi kustom seperti `GET_TAGS` — ini akan menyebabkan build error di Vercel.

---

## Fitur Modal Log (Google Keep Style)

Fitur ini diimplementasikan di [`components/log/LogModal.tsx`](../components/log/LogModal.tsx).

### Cara Kerja

1. Pengguna klik kartu log → fungsi `openModal(log)` dipanggil → URL berubah menjadi `/log?id=xxx`.
2. State `modalLog` di-set dengan data log yang diklik.
3. `LogModal` muncul dengan animasi *fade-in*.
4. Semua field (deskripsi, catatan, tautan, status, tanggal, tags, jam masuk/pulang) langsung dapat diedit.
5. Sistem mendeteksi perubahan (`isDirty`) dan menampilkan tombol **Simpan**.
6. Saat disimpan, API `PUT /api/log/[id]` dipanggil, lalu daftar kartu diperbarui *in-place* tanpa reload.

### Tambah Log Baru

- FAB tombol `+` membuka `LogModal` dengan prop `isNew={true}`.
- Modal kosong (tanggal otomatis hari ini, status default "Hadir").
- **Jam masuk otomatis `07:30`**, **jam pulang otomatis `16:00`** (atau `16:30` jika hari Jumat).
- Saat disimpan, API `POST /api/log` dipanggil → log baru ditambahkan di awal daftar.

### Input Format Jam

Fungsi `formatTimeInput(val)` digunakan untuk memformat input waktu secara otomatis:
- Hanya angka yang diproses (karakter non-digit dihapus).
- Jika pengguna mengetik ≥ 3 digit, format otomatis menjadi `HH:MM` (contoh: `0730` → `07:30`).
- Angka `0` di awal dijamin tidak hilang karena disimpan sebagai tipe `TEXT` di database.

---

## Manajemen Gambar (Google Drive)

Gambar log kerja disimpan di **Google Drive** melalui perantara **Google Apps Script (GAS) Web App**.

### Proxy Gambar (`/api/image/[id]`)

Google Drive **memblokir embedding langsung** gambar di website eksternal. Semua tampilan gambar menggunakan endpoint proxy internal:
`Browser → GET /api/image/{driveFileId} → Server → Google Drive → Stream ke Browser`

### Lightbox

- Background hitam gelap, gambar resolusi penuh via proxy.
- Footer menampilkan nama file dan tautan "Buka di Drive".
- **Slider navigasi**: Jika ada lebih dari 1 gambar dalam 1 log, muncul tombol panah kiri/kanan untuk berpindah antar gambar tanpa menutup lightbox.

---

## Sidebar & Navigasi

File: [`components/shared/Sidebar.tsx`](../components/shared/Sidebar.tsx)

### Navigasi Utama

| Menu | Route | Ikon |
|---|---|---|
| Log Kerja | `/log` | FileText |
| Tasks | `/tasks` | CheckSquare |
| Laporan | `/laporan` | BarChart2 |
| Pengaturan | `/settings` | Settings |

### Optimasi Performa Navigasi

- Semua `<Link>` di Sidebar menggunakan `prefetch={true}` agar halaman tujuan dimuat di latar belakang sebelum diklik.
- `app/(app)/loading.tsx` berfungsi sebagai *Suspense boundary* global: transisi antar halaman terasa **instan** karena browser langsung merespons klik sambil konten dimuat di balik layar.

> [!NOTE]
> Menu **Kinerja** (`/kinerja`), **Arsip** (`/arsip`), dan **Pencarian** (`/search`) telah **dihapus** dari sidebar.

---

## Tampilan Mobile (Responsive)

### Detail Log (Mobile)

- Membuka **halaman penuh** (bukan pop-up modal).
- Top bar: Tombol panah kembali (kiri, besar 24px) + Label Status (kanan).
- Tanggal dipindah ke bagian bawah konten.
- Tombol Simpan floating di pojok kanan bawah.
- Menutup dengan tombol panah kembali (bukan mengeklik area luar).

---

## Supabase Storage

Bucket bernama **`fs-storage`** digunakan untuk menyimpan foto profil pegawai.

| Path | Keterangan |
|---|---|
| `fs-storage/avatars/{user_id}-{timestamp}.{ext}` | Foto profil pegawai |

- Bucket bersifat **publik** — URL gambar dapat langsung ditampilkan di `<img src>` tanpa proxy.
- Kompresi otomatis menggunakan `browser-image-compression` (max 0.5MB, 800px) sebelum upload.
- Setelah upload berhasil, URL publik disimpan ke `user_settings` (key: `profil_gambar`) **dan** ke `supabase.auth.updateUser({ data: { avatar_url } })` agar avatar di Sidebar ikut diperbarui.

> [!IMPORTANT]
> Jalankan script SQL `setup_storage.sql` di Supabase SQL Editor untuk membuat bucket dan kebijakan akses (RLS) yang dibutuhkan.

---

## Halaman Laporan

File: [`app/(app)/laporan/page.tsx`](../app/(app)/laporan/page.tsx)

Halaman laporan menggunakan tampilan **tabbed interface** dengan dua tab: **WFH** dan **Bulan**.

### Fitur UI & Mobile

- **Tampilan Mobile (Card View)**: Data log ditampilkan sebagai tumpukan Card, bukan tabel, untuk kemudahan membaca di layar sempit.
- **Top Controls Mobile**: Tombol tab menyatu ke header atas layar. Dropdown bulan/tahun merentang 100% membagi lebar layar.
- **Read-Only**: Kolom Masuk, Pulang, Realisasi, dan Tautan bersifat *read-only* pada halaman Laporan. Teks tanggal dapat diklik untuk melompat langsung ke halaman Log terkait dengan filter tanggal tersebut.
- **Preview Auto-Fit**: Pada mobile, dokumen cetak di area preview otomatis diperkecil (zoom-out) agar pas di layar.

### Jenis Laporan

| Tab | Judul Dokumen | Sumber Data |
|---|---|---|
| Laporan WFH | Rekapitulasi Pelaksanaan Work From Home | Hanya hari Jumat dalam bulan |
| Laporan Bulanan | Laporan Kinerja Bulanan | Semua entri log kerja dalam bulan |

### Format Dokumen Cetak

- **Ukuran Kertas**: A4.
- **Print CSS**: Menggunakan `@media print` dengan selector `#print-document` untuk memastikan hanya konten dokumen yang dicetak.
- **Data Profil**: Diambil dari `user_settings` via endpoint `/api/user-settings`.
- **Area Tanda Tangan**: Blok kiri (Pegawai) dan kanan (Pejabat Penilai) menggunakan `flex-col justify-between`.

### Kolom Bukti Dukung

Semua URL dari kolom `gambar` (JSONB) **dan** `dokumen` (JSONB) dikumpulkan, dipisahkan dengan baris baru, dan ditampilkan sebagai kumpulan link di kolom Bukti Dukung pada dokumen cetak.

---

## Deployment (Vercel + GitHub)

### Repository

| Atribut | Nilai |
|---|---|
| Platform | GitHub |
| URL | https://github.com/ferdysyarlin/fs-app |
| Branch default | `main` |
| Git user (lokal) | `ferdysyarlin` / `syarlin.id@gmail.com` |

> [!NOTE]
> Git dikonfigurasi dengan identity **lokal** (`git config --local`) di folder `d:\fs-app` agar tidak bertabrakan dengan akun GitHub lain yang terdaftar secara global di mesin.

### Hosting

| Atribut | Nilai |
|---|---|
| Platform | Vercel |
| Account | `ferdy-syarlins-projects` |
| Auto-deploy | Ya — setiap push ke branch `main` |

### Environment Variables (Wajib di Vercel)

| Variable | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GAS_WEBAPP_URL` | URL Google Apps Script Web App |
| `NEXT_PUBLIC_APP_URL` | URL publik aplikasi (misal: `https://fs-app.vercel.app`) |

> [!CAUTION]
> **Jangan commit `.env.local` ke Git.** File ini sudah masuk `.gitignore`. Semua environment variables harus dimasukkan secara manual melalui **Vercel Dashboard → Settings → Environment Variables**.

> [!IMPORTANT]
> `NEXT_PUBLIC_APP_URL` di Vercel harus diisi URL production (bukan `http://localhost:3001`), karena digunakan sebagai redirect URI untuk Google OAuth callback.

### Riwayat Perbaikan Deploy

| Commit | Fix |
|---|---|
| `ce98171` | Tambah prop `modal` di `LogLayout` untuk parallel route `@modal` |
| `d2706da` | Hapus export `GET_TAGS` yang tidak valid dari `app/api/log/route.ts` |
| `bf4a68c` | Upgrade Next.js `15.3.4` → `15.5.20` (patch CVE-2025-66478) |

### Alur Deploy Baru

```
git add .
git commit -m "feat/fix: <deskripsi>"
git push
# → Vercel otomatis build & deploy dari branch main
```
