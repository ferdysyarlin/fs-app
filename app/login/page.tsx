"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: [
          "https://www.googleapis.com/auth/drive",
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/tasks",
          "https://www.googleapis.com/auth/spreadsheets",
        ].join(" "),
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background transition-colors duration-300">
      
      {/* Ambient background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-30 dark:opacity-10 blur-3xl bg-primary" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full opacity-30 dark:opacity-8 blur-3xl bg-blue-500" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-10 dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Card */}
        <div className="rounded-3xl p-8 shadow-xl dark:shadow-2xl animate-fade-in bg-card/80 dark:bg-white/5 backdrop-blur-2xl border border-border/50 dark:border-white/10 transition-colors duration-300">

          {/* Logo & branding */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Ferdy Syarlin</h1>
            <p className="text-sm font-medium text-muted-foreground">
              Sistem pencatatan kerja harian
            </p>
          </div>

          {/* Google Sign-in Button */}
          <button
            id="btn-google-login"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed bg-background dark:bg-white text-foreground dark:text-gray-900 border border-border dark:border-transparent shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Mengarahkan…</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Masuk dengan Google
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
