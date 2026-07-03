"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { formatDateShort, cn } from "@/lib/utils";
import {
  Search, Plus, FileText, Calendar, Trash2, Pin, Link2, Eye, X as XIcon, ExternalLink,
  RefreshCw, ChevronLeft, ChevronRight, Filter, Paperclip, LayoutGrid, LayoutDashboard, CheckSquare
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { LogKerja } from "@/types";
import { LogModal } from "@/components/log/LogModal";
import { useConfirm } from "@/components/providers/ConfirmProvider";

const PER_PAGE = 20;

export default function LogListPage() {
  const [logs, setLogs] = useState<LogKerja[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [modalLog, setModalLog] = useState<any>(null);
  const confirmDialog = useConfirm();
  const [previewImg, setPreviewImg] = useState<{ id: string; url: string; name: string; log?: any } | null>(null);
  const [viewMode, setViewMode] = useState<"masonry" | "gallery">("masonry");
  const [globalTasks, setGlobalTasks] = useState<any[] | null>(null);
  const [globalTasklistId, setGlobalTasklistId] = useState("@default");

  // Open modal: change URL to /log?id=ID
  const openModal = (log: any) => {
    router.replace(`/log?id=${log.id}`, { scroll: false });
    setModalLog(log);
  };

  const closeModal = () => {
    router.replace("/log", { scroll: false });
    setModalLog(null);
  };

  const handleUpdateLog = (updatedLog: any) => {
    setLogs(prev => {
      const exists = prev.find(l => l.id === updatedLog.id);
      if (exists) {
        return prev.map(l => l.id === updatedLog.id ? { ...l, ...updatedLog } : l);
      }
      return [updatedLog, ...prev].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    });
  };

  // If page loaded with ?id=ID directly
  const mid = searchParams.get("id");
  useEffect(() => {
    // We only fetch if it's a direct URL load and the log isn't already loaded
    if (mid && !modalLog) {
      const existing = logs.find(l => l.id === mid);
      if (existing) {
        setModalLog(existing);
      } else {
        // Fallback fetch if not in the current page of logs
        fetch(`/api/log/${mid}`)
          .then((r) => r.json())
          .then((json) => { if (json.data) setModalLog(json.data); });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mid]);

  // Filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bulanFilter, setBulanFilter] = useState("");
  const [tahunFilter, setTahunFilter] = useState("");
  const [tanggalFilter, setTanggalFilter] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setMounted(true);

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(PER_PAGE),
    });
    if (debouncedQ) params.set("q", debouncedQ);
    if (statusFilter) params.set("status", statusFilter);
    if (tanggalFilter) {
      params.set("tanggal_dari", tanggalFilter);
      params.set("tanggal_sampai", tanggalFilter);
    } else {
      if (bulanFilter) {
        const y = tahunFilter || new Date().getFullYear().toString();
        const lastDay = new Date(parseInt(y), parseInt(bulanFilter), 0).getDate();
        params.set("tanggal_dari", `${y}-${bulanFilter.padStart(2, '0')}-01`);
        params.set("tanggal_sampai", `${y}-${bulanFilter.padStart(2, '0')}-${lastDay}`);
      } else if (tahunFilter) {
        params.set("tanggal_dari", `${tahunFilter}-01-01`);
        params.set("tanggal_sampai", `${tahunFilter}-12-31`);
      }
    }

    try {
      const res = await fetch(`/api/log?${params}`);
      const json = await res.json();
      setLogs(json.data || []);
      setTotal(json.count || 0);
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengambil data log");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, statusFilter, bulanFilter, tahunFilter, tanggalFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    // Background fetch for instant task load in LogModal
    fetch("/api/google-tasks")
      .then(r => r.json())
      .then(json => {
        if (json.data) setGlobalTasks(json.data);
        if (json.tasklistId) setGlobalTasklistId(json.tasklistId);
      })
      .catch(() => {});
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ok = await confirmDialog({
      title: "Hapus Log?",
      message: "Yakin ingin menghapus log ini? Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, Hapus",
    });
    if (!ok) return;

    const logToDelete = logs.find(l => l.id === id);
    // Optimistic update: hapus dari state langsung agar UI langsung merespon
    setLogs(prev => prev.filter(l => l.id !== id));
    setTotal(prev => Math.max(0, prev - 1));

    const toastId = toast.loading("Sedang menghapus...");

    try {
      const res = await fetch(`/api/log/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Gagal menghapus");

      toast.success("Log berhasil dihapus", { id: toastId });
    } catch (err: any) {
      // Rollback jika gagal
      if (logToDelete) {
        setLogs(prev => {
          const newLogs = [...prev, logToDelete];
          return newLogs.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        });
        setTotal(prev => prev + 1);
      }
      toast.error(err.message || "Gagal menghapus log", { id: toastId });
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  // Group logs by Year for UI display
  const groupedLogs = logs.reduce((acc, log) => {
    const year = new Date(log.tanggal).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(log);
    return acc;
  }, {} as Record<string, LogKerja[]>);

  // Gallery: flatten all images from all logs (with reference to parent log)
  const galleryImages = logs
    .filter((log: any) => log.gambar && log.gambar.length > 0)
    .flatMap((log: any) => (log.gambar as any[]).map((img: any) => ({ ...img, log })));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Hadir": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900";
      case "Cuti": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900";
      case "Lembur": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900";
      case "Dinas": return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900";
      case "Sakit": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900";
      default: return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
  };

  const getCardBgColor = (status: string) => {
    switch (status) {
      case "Hadir": return "bg-green-50/50 dark:bg-green-950/20";
      case "Cuti": return "bg-blue-50/50 dark:bg-blue-950/20";
      case "Lembur": return "bg-yellow-50/50 dark:bg-yellow-950/20";
      case "Dinas": return "bg-purple-50/50 dark:bg-purple-950/20";
      case "Sakit": return "bg-red-50/50 dark:bg-red-950/20";
      default: return "bg-card";
    }
  };

  const mobileHeader = typeof document !== "undefined" ? document.getElementById("mobile-header-center") : null;

  const hasActiveFilters = Boolean(q || statusFilter || bulanFilter || tahunFilter || tanggalFilter);

  const clearFilters = () => {
    setQ("");
    setStatusFilter("");
    setBulanFilter("");
    setTahunFilter("");
    setTanggalFilter("");
  };

  const SearchFilterMobile = () => (
    <div className="flex items-center gap-2 w-full px-1">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <input
          type="text"
          placeholder="Cari log..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full h-8 pl-8 pr-3 rounded-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs transition-all"
        />
      </div>
      {hasActiveFilters && (
        <button onClick={clearFilters} className="w-8 h-8 flex items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/20 flex-shrink-0 transition-colors">
          <X size={14} />
        </button>
      )}
      <button
        onClick={() => setShowMobileFilter(!showMobileFilter)}
        className={cn("w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0", showMobileFilter ? "bg-primary text-primary-foreground" : hasActiveFilters ? "bg-primary/20 text-primary border border-primary/30" : "bg-background border border-border text-foreground")}
      >
        <Filter size={14} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative pb-24">
      {mounted && mobileHeader && createPortal(<SearchFilterMobile />, mobileHeader)}

      {/* Top Navigation / Filter Bar (Desktop) */}
      <div className="hidden lg:block sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-1/3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Cari di deskripsi, catatan..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-muted border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
            />
          </div>

          <div className="w-full md:w-auto flex flex-wrap gap-2 items-center">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto h-9 text-xs rounded-full">
              <option value="">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Dinas">Dinas</option>
              <option value="Lembur">Lembur</option>
              <option value="Cuti">Cuti</option>
              <option value="Sakit">Sakit</option>
            </Select>
            <Select value={bulanFilter} onChange={(e) => setBulanFilter(e.target.value)} className="w-auto h-9 text-xs rounded-full">
              <option value="">Semua Bulan</option>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id', { month: 'long' })}</option>
              ))}
            </Select>
            <Select value={tahunFilter} onChange={(e) => setTahunFilter(e.target.value)} className="w-auto h-9 text-xs rounded-full">
              <option value="">Semua Tahun</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </Select>
            <Input
              type="date"
              value={tanggalFilter}
              onChange={(e) => setTanggalFilter(e.target.value)}
              className="w-auto h-9 text-xs rounded-full"
            />
            {hasActiveFilters && (
              <button onClick={clearFilters} className="h-9 px-3 flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 text-xs font-medium transition-colors">
                <X size={14} /> Bersihkan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Dropdown */}
      {showMobileFilter && (
        <div className="lg:hidden sticky top-14 z-20 bg-background border-b border-border p-4 shadow-sm animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 text-xs">
              <option value="">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Dinas">Dinas</option>
              <option value="Lembur">Lembur</option>
              <option value="Cuti">Cuti</option>
              <option value="Sakit">Sakit</option>
            </Select>
            <Select value={bulanFilter} onChange={(e) => setBulanFilter(e.target.value)} className="h-9 text-xs">
              <option value="">Semua Bulan</option>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id', { month: 'short' })}</option>
              ))}
            </Select>
            <Select value={tahunFilter} onChange={(e) => setTahunFilter(e.target.value)} className="h-9 text-xs">
              <option value="">Semua Tahun</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </Select>
            <Input
              type="date"
              value={tanggalFilter}
              onChange={(e) => setTanggalFilter(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>
      )}

      <div className="p-3 lg:p-4">
        {loading ? (
          <div className="columns-2 lg:columns-3 xl:columns-4 gap-2 lg:gap-4 space-y-2 lg:space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`h-${((i % 3) + 3) * 10} rounded-xl shimmer break-inside-avoid w-full`} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <FileText size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg font-medium text-foreground mb-2">Belum ada log kerja</p>
            <p className="text-sm text-muted-foreground">Silakan sesuaikan filter atau tambahkan log baru.</p>
          </div>
        ) : (
          Object.entries(groupedLogs).map(([year, yearLogs]) => (
            <div key={year} className="mb-10">
              <div className="sticky top-[56px] lg:top-[68px] z-10 bg-background/95 backdrop-blur py-2 flex items-center gap-2 mb-2 lg:mb-4">
                <div className="w-1 h-4 bg-primary rounded-full"></div>
                <h2 className="text-[11px] lg:text-sm font-semibold text-muted-foreground uppercase tracking-widest">{year}</h2>
                <div className="flex-1 border-t border-border mx-2"></div>
                <span className="text-[10px] lg:text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{yearLogs.length} Log</span>
              </div>

              <div className={cn(
                viewMode === "masonry"
                  ? "columns-2 lg:columns-3 xl:columns-4 gap-2 lg:gap-4 space-y-2 lg:space-y-4"
                  : "columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-0.5 lg:gap-1 space-y-0.5 lg:space-y-1"
              )}>
                {viewMode === "masonry" ? yearLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="block break-inside-avoid cursor-pointer"
                    onClick={() => openModal(log)}
                  >
                    <Card className={cn("hover:shadow-md transition-shadow group overflow-hidden border-2", getCardBgColor(log.status))}>
                      {log.gambar && log.gambar.length > 0 && (
                        <div className={cn("grid gap-0.5 bg-background",
                          log.gambar.length === 1 ? 'grid-cols-1' :
                            log.gambar.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                        )}>
                          {log.gambar.slice(0, 3).map((img: any, idx: number) => (
                            <div
                              key={img.id}
                              className="w-full h-24 lg:h-32 bg-muted relative overflow-hidden cursor-zoom-in group/img"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImg({ id: img.id, url: img.url, name: img.name, log });
                              }}
                            >
                              <img
                                src={`/api/image/${img.id}`}
                                alt={img.name}
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center">
                                <Eye size={18} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                              </div>
                              {idx === 2 && log.gambar.length > 3 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-white font-medium text-xs lg:text-sm">+{log.gambar.length - 3}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <CardContent className="p-2.5 lg:p-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] lg:text-xs font-medium">
                          <Calendar size={10} className="lg:w-3 lg:h-3" />
                          {formatDateShort(log.tanggal)}
                        </div>

                        <div className="text-xs lg:text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {log.deskripsi || <span className="italic opacity-50">Tanpa deskripsi</span>}
                        </div>

                        {log.catatan && (
                          <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/50 hidden">
                            <strong>Catatan:</strong> {log.catatan}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-1 pt-1.5 border-t border-border/50 gap-2 sm:gap-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("px-2 py-0.5 rounded-full text-[9px] lg:text-[10px] font-bold tracking-wider border", getStatusColor(log.status))}>
                              {log.status.toUpperCase()}
                            </span>
                            {new Date(log.tanggal).getDay() === 5 && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] lg:text-[10px] font-bold tracking-wider border bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30">
                                <span>JUMAT</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {log.dokumen && log.dokumen.length > 0 && (
                              <button className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-primary transition-colors cursor-default" title={`${log.dokumen.length} Dokumen`}>
                                <Paperclip size={14} />
                              </button>
                            )}
                            {log.tautan && (
                              <a
                                href={log.tautan}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-primary transition-colors"
                                title="Buka Tautan"
                              >
                                <Link2 size={14} />
                              </a>
                            )}
                            <button className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors" title="Pin (Coming Soon)">
                              <Pin size={14} />
                            </button>
                            {log.google_task_ids && log.google_task_ids.length > 0 && (
                              <button className="p-1.5 rounded hover:bg-background text-primary transition-colors cursor-default" title={`${log.google_task_ids.length} Task Terkait`}>
                                <CheckSquare size={14} />
                              </button>
                            )}
                            <button
                              className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(e, log.id);
                              }}
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )) : (
                  // Gallery mode: filter logs with images, flatten images
                  yearLogs
                    .filter((log: any) => log.gambar && log.gambar.length > 0)
                    .flatMap((log: any) => (log.gambar as any[]).map((img: any) => ({ ...img, log })))
                    .map((item: any) => (
                      <div
                        key={item.id}
                        className="break-inside-avoid relative overflow-hidden rounded-xl group cursor-pointer bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImg({ id: item.id, url: item.url, name: item.name, log: item.log });
                        }}
                      >
                        <img
                          src={`/api/image/${item.id}`}
                          alt={item.name}
                          className="w-full h-auto block group-hover:brightness-90 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2">
                          <span className="text-white text-[9px] font-medium leading-tight">{formatDateShort(item.log.tanggal)}</span>
                          <span className={cn("text-[8px] font-bold uppercase tracking-wider mt-0.5",
                            item.log.status === 'Hadir' ? 'text-green-400' :
                              item.log.status === 'Lembur' ? 'text-yellow-400' :
                                item.log.status === 'Dinas' ? 'text-purple-400' :
                                  item.log.status === 'Cuti' ? 'text-blue-400' :
                                    item.log.status === 'Sakit' ? 'text-red-400' : 'text-white/80'
                          )}>{item.log.status}</span>
                          {new Date(item.log.tanggal).getDay() === 5 && (
                            <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5 text-orange-400">
                              <span>JUMAT</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-full px-4">
              <ChevronLeft size={14} className="mr-1" /> Prev
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-full px-4">
              Next <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-30">
        {/* Toggle View Mode */}
        <button
          title={viewMode === "masonry" ? "Beralih ke Gallery" : "Beralih ke Masonry"}
          onClick={() => setViewMode(v => v === "masonry" ? "gallery" : "masonry")}
          className="w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:scale-110 transition-all"
        >
          {viewMode === "masonry" ? <LayoutGrid size={16} /> : <LayoutDashboard size={16} />}
        </button>
        <button
          title="Refresh"
          onClick={fetchLogs}
          className="w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:scale-110 transition-transform"
        >
          <RefreshCw size={16} />
        </button>
        <button
          title="Tambah Log"
          onClick={() => setModalLog({})}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30 flex items-center justify-center hover:scale-110 hover:shadow-lg transition-all"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Log Detail Modal */}
      {modalLog && (
        <LogModal
          log={Object.keys(modalLog).length > 0 ? modalLog : null}
          isNew={Object.keys(modalLog).length === 0}
          loading={loading && modalLog === "loading"}
          onClose={closeModal}
          onUpdate={handleUpdateLog}
          allGoogleTasks={globalTasks}
          globalTasklistId={globalTasklistId}
        />
      )}

      {/* Lightbox Preview */}
      {previewImg && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <XIcon size={20} />
          </button>
          <img
            src={`/api/image/${previewImg.id}`}
            alt={previewImg.name}
            className="max-w-[95vw] md:max-w-[80vw] lg:max-w-[70vw] max-h-[70vh] md:max-h-[80vh] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {(() => {
            const images = previewImg.log?.gambar || [];
            const currentIndex = images.findIndex((img: any) => img.id === previewImg.id);
            if (currentIndex === -1) return null;
            const hasPrev = currentIndex > 0;
            const hasNext = currentIndex < images.length - 1;

            return (
              <>
                {hasPrev && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const prevImg = images[currentIndex - 1];
                      setPreviewImg({ id: prevImg.id, url: prevImg.url, name: prevImg.name, log: previewImg.log });
                    }}
                    className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors z-10"
                  >
                    <ChevronLeft size={24} className="md:w-8 md:h-8" />
                  </button>
                )}
                {hasNext && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextImg = images[currentIndex + 1];
                      setPreviewImg({ id: nextImg.id, url: nextImg.url, name: nextImg.name, log: previewImg.log });
                    }}
                    className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors z-10"
                  >
                    <ChevronRight size={24} className="md:w-8 md:h-8" />
                  </button>
                )}
              </>
            );
          })()}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 flex-wrap justify-center">
            <span className="text-white/60 text-xs">{previewImg.name}</span>
            <a
              href={previewImg.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-white/80 hover:text-white text-xs flex items-center gap-1 underline"
            >
              <ExternalLink size={12} /> Buka di Drive
            </a>
            {previewImg.log && (
              <button
                onClick={(e) => { e.stopPropagation(); setPreviewImg(null); openModal(previewImg.log); }}
                className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-primary/80 transition-colors"
              >
                <FileText size={12} /> Lihat Detail Log
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
