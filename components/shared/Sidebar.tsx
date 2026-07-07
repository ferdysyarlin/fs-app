"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText, BarChart2, CheckSquare,
  Settings, LogOut, Menu, X, Sun, Moon, Database
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { PWAInstallButton } from "./PWAInstallButton";

type NavItem = {
  href: string;
  icon: any;
  label: string;
  highlight?: boolean;
};

const navItems: NavItem[] = [
  { href: "/log", icon: FileText, label: "Kinerja" },
  { href: "/arsip-kinerja", icon: Database, label: "Arsip Kinerja" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/laporan", icon: BarChart2, label: "Laporan" },
  { href: "/settings", icon: Settings, label: "Pengaturan" },
];

interface SidebarProps {
  userEmail?: string;
  userAvatar?: string;
  userName?: string;
}

export function Sidebar({ userEmail, userAvatar, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar-bg">
      {/* Hamburger / Logo */}
      <div className={cn("px-4 py-5 flex items-center h-[72px]", isExpanded ? "justify-between" : "justify-center")}>
        {isExpanded && (
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground leading-none">Ferdy Syarlin</h2>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn("p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors", !isExpanded && "mx-auto")}
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="px-3 mb-2">
        <div className="h-px bg-border" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === "/log"
            ? pathname === "/log"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => setMobileOpen(false)}
              title={!isExpanded ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                item.highlight && !isActive
                  ? "text-primary bg-primary/10 border border-primary/20"
                  : isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                !isExpanded && "justify-center px-0"
              )}
            >
              <item.icon
                size={isExpanded ? 16 : 20}
                className="flex-shrink-0 transition-colors"
              />
              {isExpanded && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Theme & User Profile */}
      <div className="p-3 mt-auto space-y-3">
        {/* PWA Install Button - desktop */}
        {isExpanded && <PWAInstallButton />}

        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-muted/50",
              !isExpanded && "justify-center px-0"
            )}
            title={!isExpanded ? "Toggle Theme" : undefined}
          >
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon size={isExpanded ? 16 : 20} /> : <Sun size={isExpanded ? 16 : 20} />}
              {isExpanded && <span className="flex-1 text-left whitespace-nowrap">Mode Gelap</span>}
            </div>
            {isExpanded && (
              <div className={cn(
                "w-9 h-5 rounded-full transition-colors flex items-center relative shadow-inner flex-shrink-0",
                theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"
              )}>
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white absolute transition-transform duration-200 shadow-sm",
                  theme === "dark" ? "translate-x-[18px]" : "translate-x-0.5"
                )} />
              </div>
            )}
          </button>
        )}
        
        <div className="h-px bg-border" />
        
        <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border", !isExpanded && "justify-center px-2")}>
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(262,83%,60%))" }}>
              {userName?.[0] || "F"}
            </div>
          )}
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{userName || "Ferdy Syarlin"}</p>
              <p className="text-xs truncate text-muted-foreground">{userEmail}</p>
            </div>
          )}
          {(isExpanded) && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md transition-colors hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
              title="Keluar"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 flex-shrink-0 transition-all duration-300 border-r border-sidebar-border z-20",
          isExpanded ? "w-64" : "w-[72px]"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile: Top bar + drawer */}
      <div className="lg:hidden">
        {/* Mobile header */}
        <div 
          className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-3 border-b border-sidebar-border gap-2 isolate"
          style={{ background: "hsl(var(--sidebar-bg))" }}
        >
          {/* Hamburger Menu Left */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Center portal target */}
          <div id="mobile-header-center" className="flex-1 flex items-center w-full min-w-0"></div>

          {/* Profile Picture Right */}
          <div className="relative flex-shrink-0">
            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(262,83%,60%))" }}>
                  {userName?.[0] || "F"}
                </div>
              )}
            </button>
            {profileOpen && (
              <div className="absolute top-10 right-0 bg-popover border border-border rounded-lg shadow-lg py-2 w-48 z-50">
                <div className="px-4 py-2 border-b border-border mb-2">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted flex items-center gap-2"
                >
                  <LogOut size={14} /> Keluar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile drawer overlay */}
        {(mobileOpen || profileOpen) && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => { setMobileOpen(false); setProfileOpen(false); }}
          />
        )}

        {/* Mobile drawer */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-40 w-64 h-screen transition-transform duration-300 border-r border-sidebar-border isolate",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{ background: "hsl(var(--sidebar-bg))" }}
        >
          {/* Always expanded on mobile */}
          <div className="flex flex-col h-full">
            {/* Same as SidebarContent but hardcoded isExpanded=true */}
            <div className="px-4 py-5 flex items-center justify-between h-[72px]">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground leading-none">Ferdy Syarlin</h2>
                </div>
              </div>
            </div>

            <div className="px-3 mb-2">
              <div className="h-px bg-border" />
            </div>

            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = item.href === "/log" ? pathname === "/log" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                      item.highlight && !isActive
                        ? "text-primary bg-primary/10 border border-primary/20"
                        : isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon size={16} className="flex-shrink-0 transition-colors" />
                    <span className="flex-1 whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 mt-auto space-y-2">
              {/* PWA Install Button - mobile */}
              <PWAInstallButton />

              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex items-center justify-between px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
                    <span className="text-left whitespace-nowrap">Mode Gelap</span>
                  </div>
                  <div className={cn(
                    "w-9 h-5 rounded-full transition-colors flex items-center relative shadow-inner flex-shrink-0",
                    theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"
                  )}>
                    <div className={cn(
                      "w-4 h-4 rounded-full bg-white absolute transition-transform duration-200 shadow-sm",
                      theme === "dark" ? "translate-x-[18px]" : "translate-x-0.5"
                    )} />
                  </div>
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
