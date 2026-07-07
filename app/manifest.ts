import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Log Kerja Harian – Ferdy Syarlin",
    short_name: "Log Kerja",
    description:
      "Aplikasi pencatatan aktivitas kerja harian dan dokumentasi personal Ferdy Syarlin.",
    start_url: "/log",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#6d28d9",
    orientation: "portrait-primary",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Tambah Log Baru",
        short_name: "Log Baru",
        description: "Buka halaman untuk membuat log kerja baru",
        url: "/log",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Arsip Kinerja",
        short_name: "Arsip",
        description: "Lihat arsip kinerja dari Google Sheets",
        url: "/arsip-kinerja",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
