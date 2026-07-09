"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

/**
 * Global SWR provider — dipasang di root app agar cache SWR
 * TIDAK hilang saat berpindah halaman (Next.js App Router unmount/remount).
 *
 * Konfigurasi:
 * - revalidateOnFocus: false   → tidak re-fetch saat user kembali ke tab
 * - revalidateOnReconnect: false → tidak re-fetch saat reconnect internet
 * - dedupingInterval: 30_000   → request duplikat dalam 30 detik diabaikan
 * - focusThrottleInterval: 60_000 → throttle revalidasi focus 60 detik
 * - keepPreviousData: true     → tampilkan data lama selagi fetch baru berjalan
 * - provider: () => new Map()  → shared in-memory cache untuk semua hook
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 30_000,
        focusThrottleInterval: 60_000,
        keepPreviousData: true,
        // Provider shared Map memastikan cache dibagi lintas komponen/halaman
        // selama sesi browser (tidak direset saat navigasi)
        provider: () => new Map(),
      }}
    >
      {children}
    </SWRConfig>
  );
}
