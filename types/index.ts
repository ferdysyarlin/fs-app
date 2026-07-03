// Database types matching Supabase schema

export interface LogKerja {
  id: string;
  tanggal: string; // DATE as ISO string YYYY-MM-DD
  status: 'Lembur' | 'Cuti' | 'Hadir' | 'Dinas' | 'Sakit' | string;
  deskripsi: string | null;
  catatan: string | null;
  tautan: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  log_files?: LogFile[];
}

export interface LogFile {
  id: string;
  log_kerja_id: string;
  drive_file_id: string;
  drive_folder_id: string | null;
  nama_file: string;
  tipe_file: 'image' | 'pdf' | 'docx' | 'xlsx' | 'other';
  mime_type: string | null;
  ukuran_bytes: number | null;
  url_preview: string | null;
  urutan: number | null;
  created_at: string;
}




export interface LogKerjaLink {
  id: string;
  dari_id: string;
  ke_id: string;
  created_at: string;
  dari?: LogKerja;
  ke?: LogKerja;
}

export interface LaporanBulanan {
  id: string;
  bulan: number;
  tahun: number;
  total_kegiatan: number;
  total_jam: number;
  catatan: string | null;
  created_at: string;
}

// Form types
export interface LogKerjaFormData {
  tanggal: string;
  status: string;
  deskripsi?: string;
  catatan?: string;
  tautan?: string;
}

// Dashboard stats
export interface DashboardStats {
  total_hari_ini: number;
  total_minggu: number;
  total_bulan: number;
  jam_hari_ini: number;
  jam_minggu: number;
  jam_bulan: number;
  recent_logs: LogKerja[];
}

// Filter/search params
export interface LogFilter {
  q?: string;
  kategori_id?: string;
  program_id?: string;
  tanggal_dari?: string;
  tanggal_sampai?: string;
  page?: number;
  per_page?: number;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

// Google Drive file
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  size?: string;
}
