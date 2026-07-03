# Rencana Penambahan Tab "Daftar" di Halaman Laporan

Anda ingin memiliki tempat untuk menyimpan dan melihat arsip PDF laporan (yang sudah dicetak/ditandatangani dan di-*scan* ulang).

## Fitur Utama
1. **Tab Baru "Daftar"**: Tab ketiga setelah WFH dan Bulan, menampilkan tabel berisi daftar laporan PDF yang pernah diunggah.
2. **Upload ke Google Drive**: File PDF yang diunggah akan masuk ke folder "Laporan" di Google Drive menggunakan integrasi Google Apps Script (GAS) yang sudah ada.
3. **Penamaan File & ID Spesifik**: File PDF akan dinamakan dengan format `LAPORAN-(WFH/BULAN)-(TAHUN)-(BULAN).pdf`, misalnya `LAPORAN-WFH-2026-07.pdf`. ID di database juga akan menggunakan format yang sama untuk mencegah duplikasi laporan di bulan yang sama.

## Proposed Changes

### 1. Database (Supabase)

#### [NEW] Migration Script
- Saya akan membuat tabel baru bernama `laporan` di Supabase dengan skema:
  - `id`: `VARCHAR` (Primary Key, misal: `LAPORAN-WFH-2026-07`)
  - `tipe_laporan`: `VARCHAR` (Nilainya: "WFH" atau "Bulan")
  - `tahun`: `INTEGER`
  - `bulan`: `INTEGER`
  - `tanggal_upload`: `TIMESTAMP`
  - `file_id`: `TEXT` (ID dari Google Drive)
  - `file_url`: `TEXT` (Tautan akses dokumen)
  - `file_size`: `BIGINT`

### 2. Backend (API Handler)

#### [NEW] [api/laporan/route.ts](file:///d:/fs-app/app/api/laporan/route.ts)
- **GET**: Mengambil seluruh arsip laporan dari database (diurutkan dari yang terbaru).
- **POST**: Endpoint upload.
  - Menerima `tipe_laporan`, `bulan`, `tahun`, dan file `PDF`.
  - Mengirim file tersebut ke GAS (*Google Apps Script*) dengan instruksi menyimpannya ke folder "Laporan" dengan nama `LAPORAN-...pdf`.
  - Menyimpan metadatanya (URL dan Drive ID) ke tabel `laporan`.
- **DELETE**: Menghapus laporan dari database dan menghapus file fisiknya dari Google Drive.

### 3. Frontend (User Interface)

#### [MODIFY] [laporan/page.tsx](file:///d:/fs-app/app/(app)/laporan/page.tsx)
- Menambahkan tab "Daftar" (`activeTab` bisa "wfh", "bulanan", atau "daftar").
- Saat tab "Daftar" aktif, halaman menampilkan **tabel arsip laporan** dan tombol **"Unggah PDF Laporan"**.
- Membuat modal *Upload*:
  - Form pilihan tipe (WFH / Bulan).
  - Form pilihan Bulan dan Tahun.
  - Area unggah *Drag and Drop* file PDF (hanya dibatasi ekstensi `.pdf`).
  - Saat proses *upload* berjalan, akan ada indikator *loading* hingga selesai.
- Tabel daftar laporan akan memiliki tombol "Buka PDF" (yang langsung melompat ke Drive) dan tombol hapus (ikon tong sampah).

## Open Questions
- Jika Anda mengunggah laporan `WFH` untuk `Juli 2026` tapi ternyata sebelumnya sudah ada file dengan format yang persis sama, apakah sistem harus **menimpa (*replace*)** laporan lama tersebut, atau **menolak (memunculkan error)**?

## Verification Plan
1. Membuat tabel `laporan` di Supabase SQL Editor.
2. Menulis seluruh kode antarmuka dan *backend*.
3. Masuk ke halaman Laporan, klik tab "Daftar".
4. Mencoba unggah file `PDF` sembarang dengan nama tipe "WFH" bulan Juli 2026.
5. Memastikan file benar-benar masuk ke Google Drive dan tampil di tabel daftar laporan aplikasi.
6. Memastikan bisa membuka dan menghapus laporan tersebut.
