"use client";

import { useState, useEffect } from "react";
import { Download, Share, X } from "lucide-react";

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Cek apakah sudah terinstal (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Deteksi iOS
    const iosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(iosDevice);

    if (iosDevice) {
      // iOS tidak support beforeinstallprompt — tampilkan tombol panduan manual
      setShowInstall(true);
      return;
    }

    // Android/Desktop: tangkap event beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Jika sudah diinstal dari beforeinstallprompt
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowInstall(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !showInstall) return null;

  return (
    <>
      {/* Tombol Install */}
      <button
        onClick={handleInstall}
        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium transition-all duration-150 text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20"
      >
        {isIOS ? <Share size={16} className="flex-shrink-0" /> : <Download size={16} className="flex-shrink-0" />}
        <span className="flex-1 text-left whitespace-nowrap">
          {isIOS ? "Tambah ke Layar Utama" : "Instal Aplikasi"}
        </span>
      </button>

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[999] bg-black/70 flex items-end justify-center" onClick={() => setShowIOSGuide(false)}>
          <div
            className="bg-card border border-border rounded-t-2xl w-full max-w-md p-6 pb-10 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Instal Aplikasi di iPhone/iPad</h3>
              <button onClick={() => setShowIOSGuide(false)} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <span>Ketuk tombol <strong className="text-foreground">Bagikan</strong> (ikon kotak dengan panah ke atas) di bagian bawah Safari.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <span>Gulir ke bawah dan ketuk <strong className="text-foreground">"Tambah ke Layar Utama"</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <span>Ketuk <strong className="text-foreground">"Tambah"</strong> di pojok kanan atas.</span>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground mt-4 bg-muted/50 p-3 rounded-lg">
              💡 Pastikan Anda membuka halaman ini menggunakan browser <strong>Safari</strong>. Browser lain di iOS tidak mendukung fitur ini.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
