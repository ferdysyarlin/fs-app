# Implementasi Fitur Offline Access & Refresh Token Google

Fitur ini akan mengatasi masalah kedaluwarsanya akses Google Tasks setelah 1 jam, sehingga Anda tidak perlu lagi melakukan logout dan login berulang kali. Sistem akan secara otomatis memperpanjang (*refresh*) token Anda di latar belakang.

> [!IMPORTANT]
> **Kebutuhan Environment Variables:**
> Apakah Anda sudah memiliki `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di *Environment Variables* Vercel? Kita memerlukan keduanya agar server bisa menukar *refresh token* baru ke Google tanpa intervensi pengguna. *(Ini penting karena refresh token hanya bisa ditukar secara aman di server menggunakan client secret).*

## Proposed Changes

### Autentikasi

#### [MODIFY] [login/page.tsx](file:///d:/fs-app/app/login/page.tsx)
- Menambahkan parameter `access_type: "offline"` dan `prompt: "consent"` pada opsi `signInWithOAuth`. Hal ini akan memaksa Google untuk selalu memberikan `provider_refresh_token` pada saat pengguna memberikan persetujuan login.

#### [MODIFY] [auth/callback/route.ts](file:///d:/fs-app/app/auth/callback/route.ts)
- Mengambil nilai `provider_refresh_token` dari sesi yang dikembalikan oleh Supabase `exchangeCodeForSession`.
- Menyimpan nilai `provider_refresh_token` ini dengan aman ke dalam tabel `user_settings` dengan `key = 'google_refresh_token'`.

### Google API Helper

#### [NEW] [lib/google.ts](file:///d:/fs-app/lib/google.ts)
- Membuat fungsi *helper* bernama `getValidGoogleToken()`.
- Alur kerja helper:
  1. Mengambil sesi dari Supabase.
  2. Mengecek apakah `provider_token` (Access Token bawaan Supabase) ada.
  3. Memiliki pembungkus (*wrapper*) untuk mengeksekusi request ke Google.
  4. Jika Google membalas dengan status `401 Unauthorized` (token kedaluwarsa), fungsi ini akan menarik `google_refresh_token` dari database `user_settings`.
  5. Menembak server Google OAuth (`https://oauth2.googleapis.com/token`) untuk mendapatkan Access Token baru.
  6. Mengulang (*retry*) otomatis request API yang tadi gagal dengan menggunakan Access Token yang baru, sehingga request ke Google Tasks bisa dilanjutkan secara transparan tanpa error ke pengguna.

### Google Tasks API

#### [MODIFY] [api/google-tasks/route.ts](file:///d:/fs-app/app/api/google-tasks/route.ts)
- Menghapus fungsi internal `getGoogleToken()`.
- Menggunakan pembungkus atau *helper* dari `lib/google.ts` untuk memastikan panggilan API aman dari kedaluwarsa.

#### [MODIFY] [api/google-tasks/[taskId]/route.ts](file:///d:/fs-app/app/api/google-tasks/[taskId]/route.ts)
- Hal yang sama, menggunakan helper baru untuk semua operasi *fetch* Google Tasks.

## Verification Plan

### Manual Verification
1. Mengubah kode sesuai rencana.
2. Logout dari aplikasi.
3. Login kembali menggunakan Google (halaman Consent Google harus muncul dan meminta persetujuan akses sekali lagi).
4. Cek database Supabase (`user_settings`) untuk memastikan `google_refresh_token` berhasil tersimpan.
5. Jalankan aplikasi, gunakan fitur *Tasks* seperti biasa.
6. Biarkan aplikasi menyala atau sesi aktif selama lebih dari 1 jam. Saat pengguna kembali dan mencoba menambah/mengedit task, aplikasi tidak boleh menampilkan pesan "Google token tidak tersedia...", melainkan harus berhasil melakukan tugasnya setelah secara mulus me-refresh token di belakang layar.
