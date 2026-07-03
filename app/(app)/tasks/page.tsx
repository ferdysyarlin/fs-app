"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  CheckSquare, Plus, Trash2, RefreshCw, AlertCircle, Loader2,
  Circle, CheckCircle2, Calendar, AlignLeft, X, Star, ChevronDown, ChevronRight, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface GTask {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: "needsAction" | "completed";
  completed?: string;
}

// Star logic is now synced directly with Google Tasks by prefixing "⭐ " to the title.

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<GTask[]>([]);
  const [tasklistId, setTasklistId] = useState("@default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New task form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDue, setNewDue] = useState("");
  const [saving, setSaving] = useState(false);
  const newTitleRef = useRef<HTMLInputElement>(null);

  // Global linked tasks
  const [globalLinkedIds, setGlobalLinkedIds] = useState<Set<string>>(new Set());

  // Detail inline accordion
  const [selectedTask, setSelectedTask] = useState<GTask | null>(null);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailNotes, setDetailNotes] = useState("");
  const [detailDue, setDetailDue] = useState("");
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailDirty, setDetailDirty] = useState(false);
  const [linkedLogs, setLinkedLogs] = useState<any[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);



  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resTasks, resLinked] = await Promise.all([
        fetch("/api/google-tasks"),
        fetch("/api/google-tasks/linked-ids")
      ]);
      const jsonTasks = await resTasks.json();
      if (!resTasks.ok) throw new Error(jsonTasks.error);
      
      setTasks(jsonTasks.data ?? []);
      if (jsonTasks.tasklistId) setTasklistId(jsonTasks.tasklistId);
      
      if (resLinked.ok) {
        const jsonLinked = await resLinked.json();
        setGlobalLinkedIds(new Set(jsonLinked.data ?? []));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const isTaskStarred = (title: string) => title.startsWith("⭐");
  
  const activeTasks = tasks.filter(t => t.status === "needsAction");
  const sortedTasks = [
    ...activeTasks.filter(t => isTaskStarred(t.title)),
    ...activeTasks.filter(t => !isTaskStarred(t.title)),
  ];
  const doneCnt = tasks.filter(t => t.status === "completed").length;

  const handleStar = async (e: React.MouseEvent, task: GTask) => {
    e.stopPropagation();
    const starredNow = isTaskStarred(task.title);
    const newTitle = starredNow 
      ? task.title.replace(/^⭐\s*/, "") 
      : `⭐ ${task.title}`;
      
    // Optimistic
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: newTitle } : t));
    
    try {
      const res = await fetch(`/api/google-tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasklistId, title: newTitle }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTasks(prev => prev.map(t => t.id === task.id ? json.data : t));
    } catch (err: any) {
      toast.error("Gagal mengubah bintang: " + err.message);
      fetchTasks();
    }
  };

  const handleToggle = async (e: React.MouseEvent, task: GTask) => {
    e.stopPropagation();
    const completing = task.status === "needsAction";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: completing ? "completed" : "needsAction" } : t));
    if (selectedTask?.id === task.id) setSelectedTask(null);
    try {
      const res = await fetch(`/api/google-tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasklistId, completed: completing }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTasks(prev => prev.map(t => t.id === task.id ? json.data : t));
      if (completing) toast.success("Task selesai! ✓");
    } catch (err: any) {
      toast.error(err.message);
      fetchTasks();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/google-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          notes: newNotes || undefined,
          due: newDue ? new Date(newDue).toISOString() : undefined,
          tasklistId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTasks(prev => [json.data, ...prev]);
      setNewTitle(""); setNewNotes(""); setNewDue("");
      newTitleRef.current?.focus();
      toast.success("Task ditambahkan");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (task: GTask) => {
    if (selectedTask?.id === task.id) {
      setSelectedTask(null); // Toggle close
      return;
    }
    setSelectedTask(task);
    setDetailTitle(task.title.replace(/^⭐\s*/, ""));

    setDetailNotes(task.notes ?? "");
    setDetailDue(task.due ? task.due.split("T")[0] : "");
    setDetailDirty(false);
    setLinkedLogs([]);
    
    // Fetch linked logs
    setLinkedLoading(true);
    try {
      const res = await fetch(`/api/google-tasks/${task.id}/linked-logs`);
      const json = await res.json();
      if (res.ok) setLinkedLogs(json.data ?? []);
    } catch {}
    setLinkedLoading(false);
  };

  const handleDetailSave = async () => {
    if (!selectedTask || !detailTitle.trim()) return;
    setDetailSaving(true);
    try {
      const finalTitle = isTaskStarred(selectedTask.title) ? `⭐ ${detailTitle}` : detailTitle;
      const res = await fetch(`/api/google-tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasklistId,
          title: finalTitle,
          notes: detailNotes || undefined,
          due: detailDue ? new Date(detailDue).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? json.data : t));
      setSelectedTask(json.data);
      setDetailDirty(false);
      toast.success("Tersimpan");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDetailSaving(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTask?.id === taskId) setSelectedTask(null);
    try {
      const res = await fetch(`/api/google-tasks/${taskId}?tasklistId=${tasklistId}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      toast.success("Task dihapus");
    } catch (err: any) {
      toast.error(err.message);
      fetchTasks();
    }
  };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare size={24} className="text-primary" />
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTasks.length} aktif · {doneCnt} selesai
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTasks} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            id="btn-add-task"
            onClick={() => { setShowNewForm(v => !v); setTimeout(() => newTitleRef.current?.focus(), 50); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Tambah Task</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-xl border border-destructive/40 bg-destructive/5 text-destructive text-sm flex-shrink-0">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{error}</p>
            {error.includes("token") && <p className="mt-1 opacity-80">→ Logout lalu login ulang.</p>}
          </div>
        </div>
      )}

      {/* List Container */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-20">
        {showNewForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 mb-4"
          >
            <input
              ref={newTitleRef}
              type="text"
              placeholder="Judul task..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") { setShowNewForm(false); setNewTitle(""); setNewNotes(""); setNewDue(""); } }}
              className="w-full px-5 py-4 text-base outline-none bg-transparent font-medium placeholder:text-muted-foreground/60"
            />
            <div className="px-5 pb-4 flex items-center gap-3 border-t border-border/50 pt-3">
              <div className="flex items-center gap-2 flex-1">
                <Calendar size={16} className="text-muted-foreground" />
                <input
                  type="date"
                  value={newDue}
                  onChange={e => setNewDue(e.target.value)}
                  className="bg-transparent text-sm outline-none text-muted-foreground"
                />
              </div>
              <button type="button" onClick={() => { setShowNewForm(false); setNewTitle(""); setNewNotes(""); setNewDue(""); }} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Batal</button>
              <button type="submit" disabled={saving || !newTitle.trim()} className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1.5 hover:bg-primary/90 transition-colors">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Simpan
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 size={32} className="animate-spin" />
            <p>Memuat dari Google Tasks…</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <CheckSquare size={48} className="opacity-20" />
            <p>Tidak ada task aktif</p>
            <button onClick={() => { setShowNewForm(true); setTimeout(() => newTitleRef.current?.focus(), 50); }} className="text-sm text-primary hover:underline font-medium">+ Tambah task pertama</button>
          </div>
        ) : (
          sortedTasks.map(task => {
            const isSelected = selectedTask?.id === task.id;
            return (
              <div
                key={task.id}
                className={cn(
                  "group rounded-xl border transition-all duration-200 overflow-hidden",
                  isSelected
                    ? "bg-card border-primary/40 shadow-md my-4"
                    : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                )}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => openDetail(task)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer",
                    isSelected ? "bg-muted/30" : ""
                  )}
                >
                  <button onClick={e => handleToggle(e, task)} className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors" title="Tandai selesai">
                    <Circle size={20} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title.replace(/^⭐\s*/, "")}</p>
                    {!isSelected && (task.notes || task.due || globalLinkedIds.has(task.id)) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.notes && <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">{task.notes}</span>}
                        {task.notes && task.due && <span className="text-muted-foreground/40 text-[10px]">·</span>}
                        {task.due && (
                          <span className={cn("text-[11px]", new Date(task.due) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground")}>
                            {format(new Date(task.due), "d MMM yyyy", { locale: idLocale })}
                          </span>
                        )}
                        {((task.notes || task.due) && globalLinkedIds.has(task.id)) && <span className="text-muted-foreground/40 text-[10px]">·</span>}
                        {globalLinkedIds.has(task.id) && (
                          <span className="flex items-center gap-1 text-[11px] text-primary/70 font-medium bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10">
                            <FileText size={10} /> Terkait Log
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={e => handleStar(e, task)} className={cn("flex-shrink-0 p-1.5 rounded-lg transition-all", isTaskStarred(task.title) ? "text-yellow-500" : "text-muted-foreground/0 group-hover:text-muted-foreground/50 hover:!text-yellow-400")} title={isTaskStarred(task.title) ? "Hapus bintang" : "Beri bintang"}>
                    <Star size={16} fill={isTaskStarred(task.title) ? "currentColor" : "none"} />
                  </button>
                  {isSelected ? <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0" />}
                </div>

                {/* Accordion Body */}
                {isSelected && (
                  <div className="px-4 py-4 border-t border-border/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <input type="text" value={detailTitle} onChange={e => { setDetailTitle(e.target.value); setDetailDirty(true); }} className="w-full text-base font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50 leading-tight" placeholder="Judul task" />
                    </div>
                    <div className="flex items-start gap-3">
                      <AlignLeft size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
                      <textarea value={detailNotes} onChange={e => { setDetailNotes(e.target.value); setDetailDirty(true); }} placeholder="Tambahkan catatan" rows={3} className="flex-1 text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex items-center gap-2">
                        <input type="date" value={detailDue} onChange={e => { setDetailDue(e.target.value); setDetailDirty(true); }} className="text-xs bg-muted/60 border border-border rounded-lg px-3 py-1.5 outline-none focus:border-primary transition-all" />
                        {detailDue && <button onClick={() => { setDetailDue(""); setDetailDirty(true); }} className="text-[10px] text-muted-foreground hover:text-foreground">hapus</button>}
                      </div>
                    </div>

                    {/* Linked Logs Section */}
                    <div className="flex items-start gap-3 pt-2">
                      <FileText size={18} className="text-muted-foreground flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2 text-foreground/80">Log Kerja Terkait</p>
                        {linkedLoading ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Memeriksa...</div>
                        ) : linkedLogs.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {linkedLogs.map(log => (
                              <button
                                key={log.id}
                                onClick={() => router.push(`/log?id=${log.id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20"
                                title={log.deskripsi}
                              >
                                <FileText size={12} />
                                {format(new Date(log.tanggal), "d MMM yyyy", { locale: idLocale })}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Tidak ada log kerja terkait.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <button onClick={() => handleDelete(task.id)} className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 text-sm font-medium">
                        <Trash2 size={16} /> Hapus
                      </button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedTask(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Tutup</button>
                        <button onClick={handleDetailSave} disabled={!detailDirty || detailSaving || !detailTitle.trim()} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center gap-2">
                          {detailSaving && <Loader2 size={14} className="animate-spin" />}
                          Simpan
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {doneCnt > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-4 pb-8 opacity-60">
            {doneCnt} task selesai tidak ditampilkan
          </p>
        )}
      </div>
    </div>
  );
}
