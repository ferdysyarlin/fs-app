"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  CheckSquare, Plus, Trash2, RefreshCw, AlertCircle, Loader2,
  Circle, CheckCircle2, Calendar, AlignLeft, X, Star, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface GTask {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: "needsAction" | "completed";
  completed?: string;
}

// ─── LocalStorage helpers for starred tasks ───────────────────
const STARRED_KEY = "fs_starred_tasks";
function getStarred(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(STARRED_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function saveStarred(ids: Set<string>) {
  localStorage.setItem(STARRED_KEY, JSON.stringify([...ids]));
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<GTask[]>([]);
  const [tasklistId, setTasklistId] = useState("@default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(new Set());

  // New task inline form (like Google Tasks)
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDue, setNewDue] = useState("");
  const [saving, setSaving] = useState(false);
  const newTitleRef = useRef<HTMLInputElement>(null);

  // Detail panel (right side, like Google Tasks)
  const [selectedTask, setSelectedTask] = useState<GTask | null>(null);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailNotes, setDetailNotes] = useState("");
  const [detailDue, setDetailDue] = useState("");
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailDirty, setDetailDirty] = useState(false);

  // ─── Init starred from localStorage ──────────────────────────
  useEffect(() => { setStarred(getStarred()); }, []);

  // ─── Fetch ───────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/google-tasks");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTasks(json.data ?? []);
      if (json.tasklistId) setTasklistId(json.tasklistId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Only active tasks, starred first
  const activeTasks = tasks.filter(t => t.status === "needsAction");
  const sortedTasks = [
    ...activeTasks.filter(t => starred.has(t.id)),
    ...activeTasks.filter(t => !starred.has(t.id)),
  ];
  const doneCnt = tasks.filter(t => t.status === "completed").length;

  // ─── Star toggle ──────────────────────────────────────────────
  const handleStar = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setStarred(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      saveStarred(next);
      return next;
    });
  };

  // ─── Toggle complete ─────────────────────────────────────────
  const handleToggle = async (e: React.MouseEvent, task: GTask) => {
    e.stopPropagation();
    const completing = task.status === "needsAction";
    // Optimistic: remove from active list immediately
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: completing ? "completed" : "needsAction" } : t
    ));
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

  // ─── Create task ─────────────────────────────────────────────
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
      // Keep form open for rapid entry (Google Tasks behavior)
      newTitleRef.current?.focus();
      toast.success("Task ditambahkan");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Open detail panel ───────────────────────────────────────
  const openDetail = (task: GTask) => {
    setSelectedTask(task);
    setDetailTitle(task.title);
    setDetailNotes(task.notes ?? "");
    setDetailDue(task.due ? task.due.split("T")[0] : "");
    setDetailDirty(false);
  };

  // ─── Save detail ─────────────────────────────────────────────
  const handleDetailSave = async () => {
    if (!selectedTask || !detailTitle.trim()) return;
    setDetailSaving(true);
    try {
      const res = await fetch(`/api/google-tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasklistId,
          title: detailTitle,
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

  // ─── Delete ──────────────────────────────────────────────────
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

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── LEFT: Task List ───────────────────────────────────── */}
      <div className={cn(
        "flex flex-col h-full transition-all duration-300 border-r border-border overflow-hidden",
        selectedTask ? "w-full md:w-[480px] lg:w-[520px]" : "w-full"
      )}>
        {/* Header */}
        <div className="px-6 pt-6 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckSquare size={20} className="text-primary" />
              Tasks
            </h1>
            <div className="flex items-center gap-1.5">
              <button onClick={fetchTasks} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Refresh">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                id="btn-add-task"
                onClick={() => { setShowNewForm(v => !v); setTimeout(() => newTitleRef.current?.focus(), 50); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
              >
                <Plus size={15} />
                <span>Tambah</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {activeTasks.length} aktif · {doneCnt} selesai
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 flex items-start gap-3 p-3 rounded-xl border border-destructive/40 bg-destructive/5 text-destructive text-xs">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
              {error.includes("token") && <p className="mt-1 opacity-80">→ Logout lalu login ulang.</p>}
            </div>
          </div>
        )}

        {/* New Task Form */}
        {showNewForm && (
          <form
            onSubmit={handleCreate}
            className="mx-4 mt-4 rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <input
              ref={newTitleRef}
              type="text"
              placeholder="Judul task..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") { setShowNewForm(false); setNewTitle(""); setNewNotes(""); setNewDue(""); } }}
              className="w-full px-4 py-3 text-sm outline-none bg-transparent font-medium placeholder:text-muted-foreground/60"
            />
            <div className="px-4 pb-3 flex items-center gap-2 border-t border-border/50 pt-3">
              <div className="flex items-center gap-1.5 flex-1">
                <Calendar size={13} className="text-muted-foreground" />
                <input
                  type="date"
                  value={newDue}
                  onChange={e => setNewDue(e.target.value)}
                  className="bg-transparent text-xs outline-none text-muted-foreground"
                />
              </div>
              <button type="button" onClick={() => { setShowNewForm(false); setNewTitle(""); setNewNotes(""); setNewDue(""); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Batal</button>
              <button type="submit" disabled={saving || !newTitle.trim()} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1 hover:bg-primary/90 transition-colors">
                {saving && <Loader2 size={12} className="animate-spin" />}
                Tambah
              </button>
            </div>
          </form>
        )}

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Memuat dari Google Tasks…</p>
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <CheckSquare size={40} className="opacity-20" />
              <p className="text-sm">Tidak ada task aktif</p>
              <button onClick={() => { setShowNewForm(true); setTimeout(() => newTitleRef.current?.focus(), 50); }} className="text-xs text-primary hover:underline">+ Tambah task pertama</button>
            </div>
          ) : (
            <>
              {sortedTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => openDetail(task)}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150",
                    selectedTask?.id === task.id
                      ? "bg-primary/5 border-primary/30 shadow-sm"
                      : "bg-card border-transparent hover:border-border hover:bg-muted/40"
                  )}
                >
                  {/* Circle checkbox */}
                  <button
                    onClick={e => handleToggle(e, task)}
                    className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    title="Tandai selesai"
                  >
                    <Circle size={20} />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    {(task.notes || task.due) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.notes && <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{task.notes}</span>}
                        {task.notes && task.due && <span className="text-muted-foreground/40 text-[10px]">·</span>}
                        {task.due && (
                          <span className={cn(
                            "text-[11px]",
                            new Date(task.due) < new Date() ? "text-red-500" : "text-muted-foreground"
                          )}>
                            {format(new Date(task.due), "d MMM", { locale: idLocale })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Star */}
                  <button
                    onClick={e => handleStar(e, task.id)}
                    className={cn(
                      "flex-shrink-0 p-1 rounded-md transition-all",
                      starred.has(task.id)
                        ? "text-yellow-500"
                        : "text-muted-foreground/0 group-hover:text-muted-foreground/50 hover:!text-yellow-400"
                    )}
                    title={starred.has(task.id) ? "Hapus bintang" : "Beri bintang"}
                  >
                    <Star size={15} fill={starred.has(task.id) ? "currentColor" : "none"} />
                  </button>

                  {/* Arrow indicator */}
                  <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0 transition-colors" />
                </div>
              ))}

              {/* Completed count */}
              {doneCnt > 0 && (
                <p className="text-xs text-muted-foreground text-center pt-4 pb-2">
                  {doneCnt} task selesai tidak ditampilkan
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail Panel (Google Tasks style) ──────────── */}
      {selectedTask && (
        <div className="hidden md:flex flex-col flex-1 h-full bg-background border-l border-border animate-in slide-in-from-right-4 duration-200">
          {/* Detail Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={e => handleToggle(e, selectedTask)}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Tandai selesai"
              >
                <Circle size={20} />
              </button>
              <span className="text-xs text-muted-foreground font-medium">Tandai selesai</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete(selectedTask.id)}
                className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Hapus task"
              >
                <Trash2 size={15} />
              </button>
              <button
                onClick={e => handleStar(e, selectedTask.id)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  starred.has(selectedTask.id)
                    ? "text-yellow-500 bg-yellow-500/10"
                    : "text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10"
                )}
                title={starred.has(selectedTask.id) ? "Hapus bintang" : "Beri bintang"}
              >
                <Star size={15} fill={starred.has(selectedTask.id) ? "currentColor" : "none"} />
              </button>
              <button onClick={() => setSelectedTask(null)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Tutup">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Detail Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Title */}
            <div>
              <input
                type="text"
                value={detailTitle}
                onChange={e => { setDetailTitle(e.target.value); setDetailDirty(true); }}
                className="w-full text-lg font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 leading-tight"
                placeholder="Judul task"
              />
            </div>

            {/* Notes */}
            <div className="flex items-start gap-3">
              <AlignLeft size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
              <textarea
                value={detailNotes}
                onChange={e => { setDetailNotes(e.target.value); setDetailDirty(true); }}
                placeholder="Tambahkan catatan"
                rows={4}
                className="flex-1 text-sm text-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed"
              />
            </div>

            {/* Due date */}
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Tenggat Waktu</p>
                <input
                  type="date"
                  value={detailDue}
                  onChange={e => { setDetailDue(e.target.value); setDetailDirty(true); }}
                  className="text-sm text-foreground bg-muted/60 border border-border rounded-lg px-3 py-1.5 outline-none focus:border-primary transition-all"
                />
                {detailDue && (
                  <button onClick={() => { setDetailDue(""); setDetailDirty(true); }} className="ml-2 text-xs text-muted-foreground hover:text-foreground">hapus</button>
                )}
              </div>
            </div>
          </div>

          {/* Detail Footer — Save */}
          <div className="px-6 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={handleDetailSave}
              disabled={!detailDirty || detailSaving || !detailTitle.trim()}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {detailSaving && <Loader2 size={14} className="animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
