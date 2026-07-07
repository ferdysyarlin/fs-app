import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  themeColor: "#6d28d9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "Log Kerja Harian | Ferdy Syarlin",
    template: "%s | Log Kerja",
  },
  description:
    "Aplikasi pencatatan aktivitas kerja harian dan dokumentasi personal Ferdy Syarlin.",
  keywords: ["log kerja", "pencatatan harian"],
  authors: [{ name: "Ferdy Syarlin" }],

  // Anti-indexing: blokir semua mesin pencari
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },

  // PWA Metadata
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Log Kerja",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* iOS PWA fullscreen support */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Log Kerja" />
      </head>
      <body style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
