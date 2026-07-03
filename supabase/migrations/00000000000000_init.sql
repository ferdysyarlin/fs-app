-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hapus tabel lama jika sudah ada (mencegah error "relation already exists")
DROP TABLE IF EXISTS laporan_bulanan CASCADE;
DROP TABLE IF EXISTS log_kerja_link CASCADE;
DROP TABLE IF EXISTS log_kerja_tag CASCADE;
DROP TABLE IF EXISTS tag CASCADE;
DROP TABLE IF EXISTS kinerja_realisasi CASCADE;
DROP TABLE IF EXISTS kinerja_indikator CASCADE;
DROP TABLE IF EXISTS log_files CASCADE;
DROP TABLE IF EXISTS log_kerja CASCADE;
DROP TABLE IF EXISTS program CASCADE;
DROP TABLE IF EXISTS kategori CASCADE;


-- 1. Tabel Kategori
CREATE TABLE kategori (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama     TEXT NOT NULL,
  warna    TEXT,
  icon     TEXT
);

-- 2. Tabel Program / Proyek
CREATE TABLE program (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        TEXT NOT NULL,
  deskripsi   TEXT,
  tahun       INTEGER,
  aktif       BOOLEAN DEFAULT true
);

-- 3. Tabel Log Kerja Harian
CREATE TABLE log_kerja (
  id            VARCHAR(50) PRIMARY KEY,
  tanggal       DATE NOT NULL,
  status        VARCHAR(50) NOT NULL,
  deskripsi     TEXT,
  catatan       TEXT,
  tautan        TEXT,
  kategori_id   UUID REFERENCES kategori(id),
  program_id    UUID REFERENCES program(id),
  created_at    TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Asia/Makassar')::TIMESTAMP(0),
  updated_at    TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Asia/Makassar')::TIMESTAMP(0)
);

-- 4. Tabel File Lampiran
CREATE TABLE log_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_kerja_id    VARCHAR(50) REFERENCES log_kerja(id) ON DELETE CASCADE,
  drive_file_id   TEXT NOT NULL,
  drive_folder_id TEXT,
  nama_file       TEXT NOT NULL,
  tipe_file       TEXT,        -- 'image' | 'pdf' | 'docx' | dll
  mime_type       TEXT,
  ukuran_bytes    BIGINT,
  url_preview     TEXT,
  urutan          INTEGER,
  created_at      TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Asia/Makassar')::TIMESTAMP(0)
);

-- 5. Tabel Indikator Kinerja (SKP)
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

-- 6. Tabel Realisasi Kinerja
CREATE TABLE kinerja_realisasi (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_kerja_id          VARCHAR(50) REFERENCES log_kerja(id) ON DELETE CASCADE,
  kinerja_indikator_id  UUID REFERENCES kinerja_indikator(id) ON DELETE CASCADE,
  kontribusi            TEXT,
  nilai_realisasi       NUMERIC,
  created_at            TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Asia/Makassar')::TIMESTAMP(0)
);

-- 7. Tabel Tag (Opsional)
CREATE TABLE tag (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama  TEXT NOT NULL
);

CREATE TABLE log_kerja_tag (
  log_kerja_id  VARCHAR(50) REFERENCES log_kerja(id) ON DELETE CASCADE,
  tag_id        UUID REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (log_kerja_id, tag_id)
);

-- 8. Tabel Internal Link
CREATE TABLE log_kerja_link (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dari_id       VARCHAR(50) REFERENCES log_kerja(id) ON DELETE CASCADE,
  ke_id         VARCHAR(50) REFERENCES log_kerja(id) ON DELETE CASCADE,
  created_at    TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Asia/Makassar')::TIMESTAMP(0),
  UNIQUE (dari_id, ke_id)
);

-- 9. Laporan Bulanan (cache/arsip)
CREATE TABLE laporan_bulanan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulan           INTEGER,
  tahun           INTEGER,
  total_kegiatan  INTEGER,
  total_jam       NUMERIC,
  catatan         TEXT,
  created_at      TIMESTAMP(0) DEFAULT (now() AT TIME ZONE 'Asia/Makassar')::TIMESTAMP(0)
);
