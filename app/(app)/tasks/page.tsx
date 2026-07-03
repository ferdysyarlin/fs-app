"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  CheckSquare, Plus, Trash2, RefreshCw, AlertCircle, Loader2,
  Circle, CheckCircle2, Calendar, StickyNote, X
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

type FilterType = "all" | "active" | "done";

export default function TasksPage() {
  const [tasks, setTasks] = useState<GTask[]>([]);
  const [tasklistId, setTasklistId] = useState("@default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("active");

  // New task form
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDue, setNewDue] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // ─── Fetch ────────────────────────────────────────────
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

  // ─── Filtered tasks ────────────────────────────────────
  const filtered = tasks.filter(t => {
    if (filter === "active") return t.status === "needsAction";
    if (filter === "done") return t.status === "completed";
    return true;
  });

  const activeCnt = tasks.filter(t => t.status === "needsAction").length;
  const doneCnt   = tasks.filter(t => t.status === "completed").length;

  // ─── Toggle complete ───────────────────────────────────
  const handleToggle = async (task: GTask) => {
    const optimistic = tasks.map(t =>
      t.id === task.id
        ? { ...t, status: t.status === "completed" ? "needsAction" : "completed" } as GTask
        : t
    );
    setTasks(optimistic);

    try {
      const res = await fetch(`/api/google-tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasklistId,
          completed: task.status === "needsAction",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTasks(prev => prev.map(t => t.id === task.id ? json.data : t));
    } catch (err: any) {
      toast.error("Gagal mengubah status: " + err.message);
      setTasks(tasks); // rollback
    }
  };

  // ─── Create task ──────────────────────────────────────
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
      setShowNewForm(false);
      toast.success("Task berhasil dibuat");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit title (inline) ──────────────────────────────
  const handleEditSave = async (task: GTask) => {
    if (!editTitle.trim() || editTitle === task.title) {
      setEditingId(null);
      return;
    }
    const prev = tasks;
    setTasks(tasks.map(t => t.id === task.id ? { ...t, title: editTitle } : t));
    setEditingId(null);
    try {
      const res = await fetch(`/api/google-tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasklistId, title: editTitle }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTasks(tasks.map(t => t.id === task.id ? json.data : t));
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
      setTasks(prev);
    }
  };

  // ─── Delete ───────────────────────────────────────────
  const handleDelete = async (taskId: string) => {
    const prev = tasks;
    setTasks(tasks.filter(t => t.id !== taskId));
    try {
      const res = await fetch(`/api/google-tasks/${taskId}?tasklistId=${tasklistId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast.success("Task dihapus");
    } catch (err: any) {
      toast.error(err.message);
      setTasks(prev);
    }
  };

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <CheckSquare size={22} className="text-primary" />
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Google Tasks — {activeCnt} aktif · {doneCnt} selesai
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            id="btn-add-task"
            onClick={() => setShowNewForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Tambah Task</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-xl border border-destructive/40 bg-destructive/5 text-destructive text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Tidak dapat memuat Tasks</p>
            <p className="text-xs opacity-80">{error}</p>
            {error.includes("token") && (
              <p className="text-xs mt-2 font-medium">→ Silakan <strong>logout → login ulang</strong> untuk memperbarui akses Google.</p>
            )}
          </div>
        </div>
      )}

      {/* New Task Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="mb-5 p-4 rounded-xl border border-border bg-card shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <input
            autoFocus
            type="text"
            placeholder="Judul task..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full bg-muted/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          <textarea
            placeholder="Catatan (opsional)"
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            rows={2}
            className="w-full bg-muted/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
          />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
                className="bg-muted/60 border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setNewTitle(""); setNewNotes(""); setNewDue(""); }}
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !newTitle.trim()}
              className="px-4 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-muted rounded-xl w-fit">
        {([["active", "Aktif"], ["all", "Semua"], ["done", "Selesai"]] as [FilterType, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === val
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Memuat dari Google Tasks…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <CheckSquare size={40} className="opacity-20" />
          <p className="text-sm">
            {filter === "active" ? "Tidak ada task aktif" : filter === "done" ? "Belum ada task selesai" : "Belum ada task"}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(task => (
            <div
              key={task.id}
              className={cn(
                "group flex items-start gap-3 p-3 rounded-xl border transition-all duration-150",
                task.status === "completed"
                  ? "bg-muted/40 border-border/50 opacity-60"
                  : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(task)}
                className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                title={task.status === "completed" ? "Tandai belum selesai" : "Tandai selesai"}
              >
                {task.status === "completed"
                  ? <CheckCircle2 size={20} className="text-primary" />
                  : <Circle size={20} />
                }
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {editingId === task.id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => handleEditSave(task)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleEditSave(task);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full bg-muted border border-primary rounded px-2 py-0.5 text-sm outline-none"
                  />
                ) : (
                  <p
                    onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
                    className={cn(
                      "text-sm font-medium cursor-text hover:text-primary transition-colors break-words",
                      task.status === "completed" && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </p>
                )}

                {task.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <StickyNote size={10} />
                    {task.notes}
                  </p>
                )}

                {task.due && (
                  <p className={cn(
                    "text-[10px] mt-1 flex items-center gap-1",
                    new Date(task.due) < new Date() && task.status !== "completed"
                      ? "text-red-500 font-medium"
                      : "text-muted-foreground"
                  )}>
                    <Calendar size={10} />
                    {format(new Date(task.due), "EEEE, d MMM yyyy", { locale: idLocale })}
                  </p>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                title="Hapus task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Completed tasks count footer */}
      {filter === "active" && doneCnt > 0 && (
        <button
          onClick={() => setFilter("done")}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-2"
        >
          {doneCnt} task selesai tersembunyi — klik untuk lihat
        </button>
      )}
    </div>
  );
}
