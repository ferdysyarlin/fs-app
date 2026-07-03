"use client";

import Link from "next/link";
import { MapPin, Building, Briefcase, LogIn, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function RootPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30 relative overflow-hidden">
      {/* Theme toggle at top right */}
      <div className="absolute top-6 right-6 z-50">
        {mounted && (
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
      </div>

      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl overflow-hidden z-10 border border-border/50 backdrop-blur-sm">
        
        {/* Header Cover */}
        <div className="h-32 bg-gradient-to-r from-primary/80 to-blue-600/80 relative">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-full border-4 border-card bg-muted flex items-center justify-center shadow-md overflow-hidden">
              <span className="text-3xl font-black text-muted-foreground/50 tracking-tighter">FS</span>
              {/* If there's an actual photo, put it here */}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 pb-8 px-6 text-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Ferdy Syarlin, S.Sos</h1>
          <p className="text-primary font-medium text-sm mt-1 mb-6">Arsiparis Ahli Pertama</p>

          <div className="space-y-4 text-left">


            <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 border border-border/50">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center flex-shrink-0 shadow-sm">
                <Building className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Unit Kerja</p>
                <p className="text-sm font-semibold text-foreground leading-tight">Bagian Umum dan Layanan Akademik</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 border border-border/50">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center flex-shrink-0 shadow-sm">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Instansi</p>
                <p className="text-sm font-semibold text-foreground">IAIN Bone</p>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
