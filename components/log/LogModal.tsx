"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Calendar, ExternalLink, FileText, LinkIcon, X, Save, ArrowLeft, ImageIcon, Plus, Eye, Paperclip, FileSpreadsheet, Presentation, FileIcon, Trash2, ChevronLeft, ChevronRight, CheckSquare, Circle, CheckCircle2, Loader2 } from "lucide-react";
import { formatDateShort, cn } from "@/lib/utils";
import Link from "next/link";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import imageCompression from "browser-image-compression";

// Format item gambar sesuai standar
interface GambarItem {
  id: string;   // Google Drive File ID
  name: string;
  url: string;
  type: string;
  uploaded_at: string;
}

// Format item dokumen sesuai standar
interface DokumenItem {
  id: string;   // Google Drive File ID
  name: string;
  url: string;
  type: string;
  size: number;  // bytes
  uploaded_at: string;
}

interface LogData {
  id: string;
  tanggal: string;
  status: string;
  deskripsi?: string;
  catatan?: string;
  tautan?: string;
  gambar?: GambarItem[];
  dokumen?: DokumenItem[];
  tags?: string[];
  jam_masuk?: string;
  jam_pulang?: string;
  google_task_ids?: string[];
}

interface LogModalProps {
  log: LogData | null;
  loading?: boolean;
  onClose: () => void;
  onUpdate: (updatedLog: LogData) => void;
  isNew?: boolean;
  allGoogleTasks?: any[] | null;
  globalTasklistId?: string;
  readOnly?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Hadir: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
  Cuti: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
  Lembur: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900",
  Dinas: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900",
  Sakit: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
};

const STATUS_OPTIONS = ["Hadir", "Dinas", "Lembur", "Cuti", "Sakit"];

const getFileIcon = (type: string) => {
  if (type.includes("pdf")) return <FileText size={16} className="text-red-500" />;
  if (type.includes("sheet") || type.includes("excel")) return <FileSpreadsheet size={16} className="text-green-500" />;
  if (type.includes("presentation") || type.includes("powerpoint")) return <Presentation size={16} className="text-orange-500" />;
  if (type.includes("word") || type.includes("document")) return <FileText size={16} className="text-blue-500" />;
  return <FileIcon size={16} className="text-gray-500" />;
};

function AutoResizeTextarea({ value, onChange, placeholder, className, minRows = 1, readOnly }: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = textarea.value.substring(0, cursorPosition);
      const textAfterCursor = textarea.value.substring(cursorPosition);
      const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      const currentLine = textBeforeCursor.substring(currentLineStart);

      // Match list patterns up to the cursor
      const listMatch = currentLine.match(/^(\d+)\.\s(.*)/);
      const bulletMatch = currentLine.match(/^([-*])\s(.*)/);

      if (listMatch) {
        e.preventDefault();
        const isEmpty = listMatch[2].length === 0;
        if (isEmpty) {
          // Exit list: replace empty list item with a newline
          const newValue = textarea.value.substring(0, currentLineStart) + '\n' + textAfterCursor;
          onChange({ target: { value: newValue } } as any);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = currentLineStart + 1;
              textareaRef.current.selectionEnd = currentLineStart + 1;
            }
          }, 0);
        } else {
          // Add next number
          const nextNumber = parseInt(listMatch[1], 10) + 1;
          const prefix = `\n${nextNumber}. `;
          const newValue = textBeforeCursor + prefix + textAfterCursor;
          onChange({ target: { value: newValue } } as any);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = cursorPosition + prefix.length;
              textareaRef.current.selectionEnd = cursorPosition + prefix.length;
            }
          }, 0);
        }
      } else if (bulletMatch) {
        e.preventDefault();
        const isEmpty = bulletMatch[2].length === 0;
        if (isEmpty) {
          // Exit bullet list
          const newValue = textarea.value.substring(0, currentLineStart) + '\n' + textAfterCursor;
          onChange({ target: { value: newValue } } as any);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = currentLineStart + 1;
              textareaRef.current.selectionEnd = currentLineStart + 1;
            }
          }, 0);
        } else {
          // Add next bullet
          const prefix = `\n${bulletMatch[1]} `;
          const newValue = textBeforeCursor + prefix + textAfterCursor;
          onChange({ target: { value: newValue } } as any);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = cursorPosition + prefix.length;
              textareaRef.current.selectionEnd = cursorPosition + prefix.length;
            }
          }, 0);
        }
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={minRows}
      readOnly={readOnly}
      className={cn("w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-muted-foreground", className)}
    />
  );
}

const formatTimeInput = (val: string) => {
  const digits = val.replace(/\D/g, "");
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  return digits;
};

export function LogModal({ log, loading, onClose, onUpdate, isNew, allGoogleTasks, globalTasklistId, readOnly }: LogModalProps) {
  const [deskripsi, setDeskripsi] = useState(log?.deskripsi || "");
  const [catatan, setCatatan] = useState(log?.catatan || "");
  const [tautan, setTautan] = useState(log?.tautan || "");
  const [status, setStatus] = useState(log?.status || "Hadir");
  const [tanggal, setTanggal] = useState(log?.tanggal ? log.tanggal.split("T")[0] : new Date().toISOString().split("T")[0]);
  
  // New features state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [savedImages, setSavedImages] = useState<GambarItem[]>(log?.gambar ?? []);
  const [previewImage, setPreviewImage] = useState<GambarItem | null>(null);
  const [pendingDocs, setPendingDocs] = useState<File[]>([]);
  const [savedDocs, setSavedDocs] = useState<DokumenItem[]>(log?.dokumen ?? []);
  const [previewDoc, setPreviewDoc] = useState<DokumenItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const linkPickerRef = useRef<HTMLDivElement>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const confirmDialog = useConfirm();

  // Jam masuk/pulang
  const [jamMasuk, setJamMasuk] = useState(log?.jam_masuk || "");
  const [jamPulang, setJamPulang] = useState(log?.jam_pulang || "");

  // Google Tasks
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(log?.google_task_ids ?? []);
  const [linkedTaskDetails, setLinkedTaskDetails] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [tasklistId, setTasklistId] = useState("@default");
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const newTaskTitleRef = useRef<HTMLInputElement>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const taskPickerRef = useRef<HTMLDivElement>(null);

  const [selectedEditTask, setSelectedEditTask] = useState<any>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskNotes, setEditTaskNotes] = useState("");
  const [editTaskDue, setEditTaskDue] = useState("");
  const [editTaskSaving, setEditTaskSaving] = useState(false);

  // Fetch all tasks for picker
  const fetchAllTasks = useCallback(async () => {
    if (allGoogleTasks) {
      setAllTasks(allGoogleTasks);
      if (globalTasklistId) setTasklistId(globalTasklistId);
      setLinkedTaskDetails(allGoogleTasks.filter((t: any) => (log?.google_task_ids ?? []).includes(t.id)));
      return;
    }
    
    setTaskLoading(true);
    try {
      const res = await fetch("/api/google-tasks");
      const json = await res.json();
      if (res.ok && json.data) {
        setAllTasks(json.data);
        if (json.tasklistId) setTasklistId(json.tasklistId);
        // Resolve linked task details
        setLinkedTaskDetails(json.data.filter((t: any) => (log?.google_task_ids ?? []).includes(t.id)));
      }
    } catch {} finally {
      setTaskLoading(false);
    }
  }, [log?.google_task_ids, allGoogleTasks, globalTasklistId]);

  useEffect(() => {
    if (!isNew && log?.id) fetchAllTasks();
  }, [isNew, log?.id, fetchAllTasks]);

  // Sync state if log prop changes (e.g. from parent)
  useEffect(() => {
    if (log) {
      setDeskripsi(log.deskripsi || "");
      setCatatan(log.catatan || "");
      setTautan(log.tautan || "");
      setStatus(log.status || "Hadir");
      setTanggal(log.tanggal ? log.tanggal.split("T")[0] : "");
      setSavedImages(log.gambar ?? []);
      setSavedDocs(log.dokumen ?? []);
      setJamMasuk(log.jam_masuk || "");
      setJamPulang(log.jam_pulang || "");
      setLinkedTaskIds(log.google_task_ids ?? []);
      setPendingFiles([]);
      setPendingDocs([]);
    }
  }, [log]);

  // Auto-fill Jam Masuk & Pulang based on selected Date for new logs
  useEffect(() => {
    if (isNew && tanggal) {
      const dateObj = new Date(tanggal);
      const isFri = dateObj.getDay() === 5; // 0=Sun, 1=Mon... 5=Fri
      
      setJamMasuk((prev) => {
        if (!prev || prev === "07:30") return "07:30";
        return prev;
      });
      
      setJamPulang((prev) => {
        if (!prev || prev === "16:00" || prev === "16:30") {
          return isFri ? "16:30" : "16:00";
        }
        return prev;
      });
    }
  }, [tanggal, isNew]);

  const isDirty = isNew ? (
    deskripsi !== "" || catatan !== "" || tautan !== "" || status !== "Hadir" || pendingFiles.length > 0 || pendingDocs.length > 0 || jamMasuk !== "" || jamPulang !== ""
  ) : log && (
    deskripsi !== (log.deskripsi || "") ||
    catatan !== (log.catatan || "") ||
    tautan !== (log.tautan || "") ||
    status !== log.status ||
    tanggal !== (log.tanggal ? log.tanggal.split("T")[0] : "") ||
    jamMasuk !== (log.jam_masuk || "") ||
    jamPulang !== (log.jam_pulang || "") ||
    pendingFiles.length > 0 ||
    pendingDocs.length > 0
  );

  useEffect(() => {
    const handleKey = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDirty) {
          const ok = await confirmDialog({
            title: "Tutup?",
            message: "Ada perubahan yang belum disimpan. Yakin ingin menutup?",
            confirmText: "Tutup & Buang Perubahan",
          });
          if (ok) onClose();
        } else {
          onClose();
        }
      }
    };
    
    const handleClickOutside = (event: MouseEvent) => {
      if (linkPickerRef.current && !linkPickerRef.current.contains(event.target as Node)) {
        setShowLinkPicker(false);
      }
    };
    
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [onClose, isDirty, confirmDialog]);

  const handleSave = async () => {
    if (!isNew && !log) return;
    setSaving(true);
    try {
      const payload = {
        tanggal,
        status,
        deskripsi: deskripsi || null,
        catatan: catatan || null,
        tautan: tautan || null,
        jam_masuk: jamMasuk || null,
        jam_pulang: jamPulang || null,
      };

      const method = isNew ? "POST" : "PUT";
      const url = isNew ? "/api/log" : `/api/log/${log?.id}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (!res.ok || json.error) throw new Error(json.error || "Gagal menyimpan");
      
      const savedLog = isNew ? json.data : { ...log, ...payload, id: log?.id };

      let finalImages = [...savedImages];
      // Upload pending files
      if (pendingFiles.length > 0) {
        toast.loading("Mengunggah gambar...", { id: "upload" });
        try {
          const uploadedImages: GambarItem[] = [];
          for (const file of pendingFiles) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("log_kerja_id", savedLog.id);
            formData.append("tanggal", savedLog.tanggal || tanggal);
            formData.append("menu_name", "Kinerja");
            
            const upRes = await fetch("/api/files", { method: "POST", body: formData });
            if (!upRes.ok) {
              const errData = await upRes.json().catch(() => ({}));
              throw new Error(errData.error || `Gagal upload gambar ${file.name}`);
            }
            const upJson = await upRes.json();
            if (upJson.data) uploadedImages.push(upJson.data);
          }
          finalImages = [...finalImages, ...uploadedImages];
          setSavedImages(finalImages);
          setPendingFiles([]);
          toast.success("Gambar berhasil diunggah", { id: "upload" });
        } catch (e: any) {
          toast.error(e.message || "Gagal mengunggah gambar", { id: "upload" });
        }
      }

      let finalDocs = [...savedDocs];
      if (pendingDocs.length > 0) {
        toast.loading("Mengunggah dokumen...", { id: "upload-doc" });
        try {
          const uploadedDocs: DokumenItem[] = [];
          for (const file of pendingDocs) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("log_kerja_id", savedLog.id);
            formData.append("tanggal", savedLog.tanggal || tanggal);
            formData.append("menu_name", "Kinerja");
            formData.append("file_category", "dokumen");
            
            const upRes = await fetch("/api/files", { method: "POST", body: formData });
            if (!upRes.ok) {
              const errData = await upRes.json().catch(() => ({}));
              throw new Error(errData.error || `Gagal upload dokumen ${file.name}`);
            }
            const upJson = await upRes.json();
            if (upJson.data) uploadedDocs.push(upJson.data);
          }
          finalDocs = [...finalDocs, ...uploadedDocs];
          setSavedDocs(finalDocs);
          setPendingDocs([]);
          toast.success("Dokumen berhasil diunggah", { id: "upload-doc" });
        } catch (e: any) {
          toast.error(e.message || "Gagal mengunggah dokumen", { id: "upload-doc" });
        }
      }

      toast.success("Perubahan berhasil disimpan");
      const updatedDate = savedLog.tanggal.includes("T") ? savedLog.tanggal : savedLog.tanggal + "T00:00:00Z";
      onUpdate({ ...savedLog, gambar: finalImages, dokumen: finalDocs, tanggal: updatedDate });
      onClose(); // Menutup modal setelah berhasil disimpan
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={async () => {
          if (isDirty) {
            const ok = await confirmDialog({
              title: "Tutup?",
              message: "Ada perubahan yang belum disimpan. Yakin ingin menutup?",
              confirmText: "Tutup & Buang Perubahan",
            });
            if (ok) onClose();
          } else {
            onClose();
          }
        }}
      />

      {/* Modal Panel */}
      <div className="fixed inset-0 z-50 flex flex-col items-center sm:justify-center p-0 sm:p-4 pointer-events-none gap-0 sm:gap-4">
        <div
          className="pointer-events-auto relative w-full max-w-2xl h-screen sm:h-auto sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl bg-card border-0 sm:border border-border flex flex-col"
          onClick={(e) => {
            e.stopPropagation();
            if (showStatusDropdown) setShowStatusDropdown(false);
          }}
        >
          {/* Loading state */}
          {loading && (
            <div className="p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error/Not found state */}
          {!loading && !log && !isNew && (
            <div className="p-8 text-center">
              <FileText size={40} className="mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Log tidak ditemukan</p>
              <button onClick={onClose} className="mt-4 text-sm text-primary hover:underline">Tutup</button>
            </div>
          )}

          {/* Content */}
          {!loading && (log || isNew) && (
            <div className="p-4 sm:px-6 sm:pt-4 sm:pb-6 space-y-5 flex-1 pb-24">
              {/* Mobile Top bar */}
              <div className="flex sm:hidden items-center justify-between">
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (isDirty) {
                      const ok = await confirmDialog({
                        title: "Tutup?",
                        message: "Ada perubahan yang belum disimpan. Yakin ingin menutup?",
                        confirmText: "Tutup & Buang Perubahan",
                      });
                      if (ok) onClose();
                    } else {
                      onClose();
                    }
                  }}
                  className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                  title="Kembali"
                >
                  <ArrowLeft size={24} />
                </button>

                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); if (!readOnly) setShowStatusDropdown(!showStatusDropdown); }}
                    className={cn("px-4 py-1.5 rounded-full text-xs font-bold tracking-wider border transition-opacity flex items-center gap-2", STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border-gray-200", !readOnly && "hover:opacity-80")}
                  >
                    {status.toUpperCase()}
                  </button>

                  {/* Status Dropdown */}
                  {showStatusDropdown && (
                    <div className="absolute top-10 right-0 z-10 w-32 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors"
                          onClick={() => { setStatus(s); setShowStatusDropdown(false); }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Top bar */}
              <div className="hidden sm:flex items-start justify-between gap-4">
                <div className="flex-1 relative">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (!readOnly) setShowStatusDropdown(!showStatusDropdown); }}
                      className={cn("px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border transition-opacity", STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border-gray-200", !readOnly && "hover:opacity-80")}
                    >
                      {status.toUpperCase()}
                    </button>

                    {/* Status Dropdown */}
                    {showStatusDropdown && (
                      <div className="absolute top-8 left-0 z-10 w-32 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {STATUS_OPTIONS.map(s => (
                          <button
                            key={s}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors"
                            onClick={() => { setStatus(s); setShowStatusDropdown(false); }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                    <Calendar size={13} className="text-muted-foreground" />
                    <input 
                      type="date"
                      value={tanggal}
                      disabled={readOnly}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm text-muted-foreground cursor-pointer focus:text-foreground transition-colors disabled:opacity-80"
                    />
                  </div>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <AutoResizeTextarea
                  value={deskripsi}
                  onChange={(e: any) => setDeskripsi(e.target.value)}
                  placeholder="Tulis deskripsi log kerja di sini..."
                  className="text-sm text-foreground leading-relaxed"
                  minRows={3}
                  readOnly={readOnly}
                />
              </div>

              {/* Program & Jam Masuk/Pulang */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Jam Masuk */}
                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Jam Masuk</h3>
                  <input
                    type="text"
                    value={jamMasuk}
                    onChange={(e) => setJamMasuk(formatTimeInput(e.target.value))}
                    placeholder="07.30"
                    maxLength={5}
                    disabled={readOnly}
                    className="w-full bg-muted/50 border border-border/50 rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground disabled:opacity-80"
                  />
                </div>
                {/* Jam Pulang */}
                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Jam Pulang</h3>
                  <input
                    type="text"
                    value={jamPulang}
                    onChange={(e) => setJamPulang(formatTimeInput(e.target.value))}
                    placeholder="17.00"
                    maxLength={5}
                    disabled={readOnly}
                    className="w-full bg-muted/50 border border-border/50 rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground disabled:opacity-80"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <h3 className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Catatan</h3>
                <AutoResizeTextarea
                  value={catatan}
                  onChange={(e: any) => setCatatan(e.target.value)}
                  placeholder="Tambahkan catatan (opsional)"
                  className="text-sm text-foreground"
                  readOnly={readOnly}
                />
              </div>

              {/* Tasks Terkait — hanya tampil saat edit log yang sudah ada */}
              {!isNew && log?.id && (
                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckSquare size={10} />
                    Tasks Terkait
                    {taskLoading && <Loader2 size={10} className="animate-spin text-primary" />}
                  </h3>

                  {/* Linked tasks list */}
                  {linkedTaskDetails.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-2">
                      {linkedTaskDetails.map((task: any) => {
                        const isEditing = selectedEditTask?.id === task.id;
                        
                        if (isEditing) {
                          return (
                            <div key={task.id} className="mb-2 p-3 rounded-xl border border-primary/40 bg-card shadow-sm flex flex-col gap-2">
                              <input
                                type="text"
                                placeholder="Judul task..."
                                value={editTaskTitle}
                                onChange={e => setEditTaskTitle(e.target.value)}
                                className="w-full px-2 py-1 text-sm outline-none bg-transparent font-medium placeholder:text-muted-foreground/60 border-b border-border/50 focus:border-primary/50"
                              />
                              <textarea
                                placeholder="Catatan (opsional)"
                                value={editTaskNotes}
                                onChange={e => setEditTaskNotes(e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1 text-xs outline-none bg-transparent resize-none placeholder:text-muted-foreground/60 border-b border-border/50 focus:border-primary/50"
                              />
                              <div className="flex items-center gap-2 mt-1 justify-between">
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-muted-foreground" />
                                  <input
                                    type="date"
                                    value={editTaskDue}
                                    onChange={e => setEditTaskDue(e.target.value)}
                                    className="bg-transparent text-xs text-muted-foreground outline-none cursor-pointer"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setSelectedEditTask(null)} className="text-xs text-muted-foreground px-2 py-1 hover:bg-muted rounded">Batal</button>
                                  <button
                                    onClick={async () => {
                                      if (!editTaskTitle.trim()) return;
                                      setEditTaskSaving(true);
                                      try {
                                        const finalTitle = task.title.startsWith("⭐") ? `⭐ ${editTaskTitle.replace(/^⭐\s*/, "")}` : editTaskTitle;
                                        const res = await fetch(`/api/google-tasks/${task.id}`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            tasklistId,
                                            title: finalTitle,
                                            notes: editTaskNotes || undefined,
                                            due: editTaskDue ? new Date(editTaskDue).toISOString() : undefined,
                                          }),
                                        });
                                        const json = await res.json();
                                        if (!res.ok) throw new Error(json.error);
                                        setLinkedTaskDetails(prev => prev.map(t => t.id === task.id ? json.data : t));
                                        setSelectedEditTask(null);
                                        toast.success("Task diperbarui");
                                      } catch (err: any) {
                                        toast.error(err.message);
                                      } finally {
                                        setEditTaskSaving(false);
                                      }
                                    }}
                                    disabled={!editTaskTitle.trim() || editTaskSaving}
                                    className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded font-medium disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {editTaskSaving && <Loader2 size={10} className="animate-spin" />}
                                    Simpan
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/60 border border-border/50 group cursor-pointer" onClick={() => {
                            if (readOnly) return;
                            setSelectedEditTask(task);
                            setEditTaskTitle(task.title.replace(/^⭐\s*/, ""));
                            setEditTaskNotes(task.notes || "");
                            setEditTaskDue(task.due ? task.due.split("T")[0] : "");
                          }}>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (readOnly) return;
                                const isDone = task.status === "completed";
                                const res = await fetch(`/api/google-tasks/${task.id}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ tasklistId, completed: !isDone }),
                                });
                                if (res.ok) {
                                  const json = await res.json();
                                  setLinkedTaskDetails(prev => prev.map(t => t.id === task.id ? json.data : t));
                                }
                              }}
                              className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                            >
                              {task.status === "completed"
                                ? <CheckCircle2 size={16} className="text-primary" />
                                : <Circle size={16} />}
                            </button>
                            <span className={cn("flex-1 text-xs truncate", task.status === "completed" && "line-through text-muted-foreground")}>
                              {task.title}
                            </span>
                            {!readOnly && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const res = await fetch(`/api/google-tasks/link?log_kerja_id=${log.id}&task_id=${task.id}`, { method: "DELETE" });
                                  if (res.ok) {
                                    setLinkedTaskIds(prev => prev.filter(id => id !== task.id));
                                    setLinkedTaskDetails(prev => prev.filter(t => t.id !== task.id));
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-muted-foreground hover:text-red-500 transition-all p-0.5"
                                title="Lepas tautan"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* New task quick form */}
                  {showNewTaskForm && (
                    <div className="mb-3 rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <input
                        ref={newTaskTitleRef}
                        type="text"
                        placeholder="Judul task..."
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Escape") { setShowNewTaskForm(false); setNewTaskTitle(""); setNewTaskNotes(""); setNewTaskDue(""); } }}
                        className="w-full px-3 py-2 text-sm outline-none bg-transparent font-medium placeholder:text-muted-foreground/60"
                      />
                      <textarea
                        placeholder="Catatan (opsional)"
                        value={newTaskNotes}
                        onChange={e => setNewTaskNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1 text-xs outline-none bg-transparent resize-none placeholder:text-muted-foreground/50 leading-relaxed"
                      />
                      <div className="px-3 pb-2 flex items-center gap-2 border-t border-border/50 pt-2">
                        <div className="flex items-center gap-1.5 flex-1">
                          <Calendar size={13} className="text-muted-foreground" />
                          <input
                            type="date"
                            value={newTaskDue}
                            onChange={e => setNewTaskDue(e.target.value)}
                            className="bg-transparent text-xs outline-none text-muted-foreground"
                          />
                        </div>
                        <button type="button" onClick={() => { setShowNewTaskForm(false); setNewTaskTitle(""); setNewTaskNotes(""); setNewTaskDue(""); }} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">Batal</button>
                        <button
                          type="button"
                          disabled={taskSaving || !newTaskTitle.trim()}
                          onClick={async () => {
                            if (!newTaskTitle.trim()) return;
                            setTaskSaving(true);
                            try {
                              const createRes = await fetch("/api/google-tasks", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  title: newTaskTitle,
                                  notes: newTaskNotes || undefined,
                                  due: newTaskDue ? new Date(newTaskDue).toISOString() : undefined,
                                  tasklistId
                                }),
                              });
                              const createJson = await createRes.json();
                              if (!createRes.ok) throw new Error(createJson.error);
                              const newTask = createJson.data;
                              
                              const linkRes = await fetch("/api/google-tasks/link", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ log_kerja_id: log.id, task_id: newTask.id }),
                              });
                              if (!linkRes.ok) {
                                const linkJson = await linkRes.json();
                                throw new Error(linkJson.error);
                              }
                              
                              setLinkedTaskIds(prev => [...prev, newTask.id]);
                              setLinkedTaskDetails(prev => [...prev, newTask]);
                              setAllTasks(prev => [newTask, ...prev]);
                              setNewTaskTitle(""); setNewTaskNotes(""); setNewTaskDue("");
                              // keep form open for rapid input or close it? Let's close it
                              setShowNewTaskForm(false);
                            } catch (err: any) {
                              toast.error(err.message);
                            } finally {
                              setTaskSaving(false);
                            }
                          }}
                          className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1 hover:bg-primary/90 transition-colors"
                        >
                          {taskSaving && <Loader2 size={12} className="animate-spin" />}
                          Buat & Tautkan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Task picker dropdown */}
                  <div className="relative" ref={taskPickerRef}>
                    {showTaskPicker && (
                      <div className="absolute bottom-8 left-0 z-20 w-64 bg-popover border border-border rounded-lg shadow-xl p-2 animate-in fade-in zoom-in-95 duration-100">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Pilih Task</p>
                        <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                          {allTasks
                            .filter(t => !linkedTaskIds.includes(t.id))
                            .map(task => (
                              <button
                                key={task.id}
                                className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left w-full"
                                onClick={async () => {
                                  setShowTaskPicker(false);
                                  const res = await fetch("/api/google-tasks/link", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ log_kerja_id: log.id, task_id: task.id }),
                                  });
                                  if (res.ok) {
                                    setLinkedTaskIds(prev => [...prev, task.id]);
                                    setLinkedTaskDetails(prev => [...prev, task]);
                                  }
                                }}
                              >
                                {task.status === "completed"
                                  ? <CheckCircle2 size={12} className="text-primary flex-shrink-0" />
                                  : <Circle size={12} className="text-muted-foreground flex-shrink-0" />}
                                <span className={cn("truncate", task.status === "completed" && "line-through text-muted-foreground")}>{task.title}</span>
                              </button>
                            ))}
                          {allTasks.filter(t => !linkedTaskIds.includes(t.id)).length === 0 && (
                            <p className="text-[10px] text-muted-foreground text-center py-3">Semua task sudah ditautkan</p>
                          )}
                        </div>
                      </div>
                    )}
                    {!readOnly && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => { setShowTaskPicker(v => !v); setShowNewTaskForm(false); }}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                        >
                          <Plus size={14} /> Tautkan Task
                        </button>
                        <span className="text-muted-foreground/40 text-xs mx-1">·</span>
                        <button
                          onClick={() => { setShowNewTaskForm(v => !v); setShowTaskPicker(false); setTimeout(() => newTaskTitleRef.current?.focus(), 50); }}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                        >
                          <Plus size={14} /> Buat & Tautkan
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {savedImages.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-widest">Gambar</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {savedImages.map((img) => (
                      <div 
                        key={img.id} 
                        className="group relative overflow-hidden rounded-lg border border-border bg-muted aspect-video cursor-zoom-in"
                        onClick={(e) => { e.stopPropagation(); setPreviewImage(img); }}
                      >
                        <img
                          src={`/api/image/${img.id}`}
                          alt={img.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Hover overlay: open + delete */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center gap-3 transition-colors">
                          {/* Buka di Drive */}
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors opacity-0 group-hover:opacity-100"
                            title="Buka di Drive"
                          >
                            <ExternalLink size={16} />
                          </a>
                          {/* Hapus */}
                          {!readOnly && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const ok = await confirmDialog({
                                  title: "Hapus Gambar?",
                                  message: `Gambar "${img.name}" akan dihapus permanen dari Drive dan tidak bisa dikembalikan.`,
                                  confirmText: "Hapus",
                                });
                                if (!ok) return;
                                const delRes = await fetch(`/api/files?log_kerja_id=${log?.id}&drive_file_id=${img.id}`, { method: "DELETE" });
                                if (delRes.ok) {
                                  setSavedImages(prev => prev.filter(i => i.id !== img.id));
                                  toast.success("Gambar berhasil dihapus");
                                } else {
                                  toast.error("Gagal menghapus gambar");
                                }
                              }}
                              className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors opacity-0 group-hover:opacity-100"
                              title="Hapus Gambar"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dokumen Tersimpan */}
              {savedDocs.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-widest">Dokumen</h3>
                  <div className="flex flex-col gap-2">
                    {savedDocs.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="group relative flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="flex-shrink-0 p-2 bg-background rounded-md shadow-sm border border-border/50">
                            {getFileIcon(doc.type)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}>
                              {doc.name}
                            </span>
                            <span className="hidden sm:inline text-xs text-muted-foreground">
                              {(doc.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hidden sm:inline-block p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                            title="Buka di Drive"
                          >
                            <ExternalLink size={16} />
                          </a>
                          {!readOnly && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const ok = await confirmDialog({
                                  title: "Hapus Dokumen?",
                                  message: `Dokumen "${doc.name}" akan dihapus permanen dari Drive dan tidak bisa dikembalikan.`,
                                  confirmText: "Hapus",
                                });
                                if (!ok) return;
                                const delRes = await fetch(`/api/files?log_kerja_id=${log?.id}&drive_file_id=${doc.id}&file_category=dokumen`, { method: "DELETE" });
                                if (delRes.ok) {
                                  setSavedDocs(prev => prev.filter(i => i.id !== doc.id));
                                  toast.success("Dokumen berhasil dihapus");
                                } else {
                                  toast.error("Gagal menghapus dokumen");
                                }
                              }}
                              className="p-1.5 rounded-md hover:bg-red-500/20 text-red-500 transition-colors"
                              title="Hapus Dokumen"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {/* Action Bar (Tags & Image & Link) */}
              {!readOnly && (
                <div className="flex flex-col gap-3 pt-3 border-t border-border">
                  {/* Preview Pending Files (sebelum di-upload) */}
                  {(pendingFiles.length > 0 || pendingDocs.length > 0) && (
                    <div className="flex flex-col gap-2 mb-2">
                      {/* Images */}
                      {pendingFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pendingFiles.map((f, i) => (
                            <div key={i} className="relative group rounded-md overflow-hidden border border-border w-16 h-16">
                              <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                                className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Docs */}
                      {pendingDocs.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {pendingDocs.map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-1.5 pl-2.5 rounded-md bg-muted text-xs border border-border">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {getFileIcon(f.type)}
                                <span className="truncate max-w-[200px] font-medium">{f.name}</span>
                                <span className="text-muted-foreground">({(f.size / 1024).toFixed(1)} KB)</span>
                              </div>
                              <button 
                                onClick={() => setPendingDocs(prev => prev.filter((_, idx) => idx !== i))}
                                className="text-muted-foreground hover:text-red-500 p-1"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Link Display (if any) */}
                  {tautan && (
                    <div className="flex items-center gap-1.5 mb-1 text-xs">
                      <LinkIcon size={12} className="text-muted-foreground" />
                      <a href={tautan} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[250px]">
                        {tautan}
                      </a>
                      <button onClick={() => setTautan("")} className="hover:text-red-500 text-muted-foreground ml-1">
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-4 relative w-full">

                    {/* Link Button */}
                    <div className="relative" ref={linkPickerRef}>
                      <button 
                        onClick={() => setShowLinkPicker(!showLinkPicker)}
                        className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-foreground", showLinkPicker || tautan ? "text-primary" : "text-muted-foreground")}
                        title="Tambahkan Tautan"
                      >
                        <LinkIcon size={16} />
                      </button>
                      
                      {/* Link Popover */}
                      {showLinkPicker && (
                        <div className="absolute bottom-8 left-0 z-20 w-64 bg-popover border border-border rounded-lg shadow-xl p-2 animate-in fade-in zoom-in-95 duration-100 flex items-center gap-2">
                          <input 
                            type="url" 
                            placeholder="https://..." 
                            value={tautan}
                            onChange={(e) => setTautan(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setShowLinkPicker(false);
                              }
                            }}
                            className="w-full bg-muted border-none outline-none text-xs p-2 rounded-md" 
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    {/* Image Upload Button */}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-foreground", pendingFiles.length > 0 ? "text-primary" : "text-muted-foreground")}
                      title="Tambahkan Gambar"
                    >
                      <ImageIcon size={16} />
                    </button>
                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png,.webp" 
                      multiple
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={async (e) => {
                        if (!e.target.files || e.target.files.length === 0) return;
                        
                        const files = Array.from(e.target.files);
                        const validFiles: File[] = [];
                        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

                        setIsCompressing(true);
                        const toastId = toast.loading("Memproses gambar...");

                        try {
                          for (const file of files) {
                            if (!allowedTypes.includes(file.type)) {
                              toast.error(`File ${file.name} ditolak. Hanya menerima JPG, PNG, atau WebP.`);
                              continue;
                            }

                            // Selalu kompres semua gambar ke target < 500 KB
                            // initialQuality: 0.85 → library mulai dari kualitas tinggi,
                            // lalu turun perlahan hanya jika perlu mencapai target ukuran
                            try {
                              const options = {
                                maxSizeMB: 0.5,           // Target maksimal 500 KB
                                maxWidthOrHeight: 1920,   // Full HD — resolusi cukup tajam
                                initialQuality: 0.85,     // Mulai di kualitas 85%, turun hanya jika perlu
                                useWebWorker: true,
                              };
                              const compressedBlob = await imageCompression(file, options);
                              const compressedFile = new File([compressedBlob], file.name, {
                                type: compressedBlob.type,
                                lastModified: Date.now(),
                              });
                              validFiles.push(compressedFile);
                            } catch (err) {
                              console.error("Gagal kompresi:", err);
                              toast.error(`Gagal memproses gambar ${file.name}`);
                            }
                          }

                          if (validFiles.length > 0) {
                            setPendingFiles(prev => [...prev, ...validFiles]);
                            toast.success(`${validFiles.length} gambar berhasil ditambahkan`, { id: toastId });
                          } else {
                            toast.dismiss(toastId);
                          }
                        } finally {
                          setIsCompressing(false);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }
                      }}
                    />

                    {/* Document Upload Button */}
                    <button 
                      onClick={() => docInputRef.current?.click()}
                      className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-foreground", pendingDocs.length > 0 ? "text-primary" : "text-muted-foreground")}
                      title="Tambahkan Dokumen"
                    >
                      <Paperclip size={16} />
                    </button>
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" 
                      multiple
                      className="hidden" 
                      ref={docInputRef}
                      onChange={(e) => {
                        if (!e.target.files || e.target.files.length === 0) return;
                        
                        const files = Array.from(e.target.files);
                        const validDocs: File[] = [];
                        const allowedTypes = [
                          "application/pdf",
                          "application/msword",
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                          "application/vnd.ms-excel",
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                          "application/vnd.ms-powerpoint",
                          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        ];

                        for (const file of files) {
                          if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) {
                            toast.error(`File ${file.name} ditolak. Hanya PDF/Word/Excel/PowerPoint.`);
                            continue;
                          }
                          if (file.size > 1024 * 1024) {
                            toast.error(`Ukuran file ${file.name} terlalu besar (Max 1 MB)`);
                            continue;
                          }
                          validDocs.push(file);
                        }

                        if (validDocs.length > 0) {
                          setPendingDocs(prev => [...prev, ...validDocs]);
                        }
                        
                        if (docInputRef.current) docInputRef.current.value = '';
                      }}
                    />

                    {/* Mobile Date (Moved to action bar) */}
                    <div className="flex sm:hidden items-center gap-2 bg-muted/50 px-2.5 py-1.5 rounded-md border border-border/50 ml-auto">
                      <Calendar size={13} className="text-muted-foreground" />
                      <input 
                        type="date"
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-muted-foreground cursor-pointer focus:text-foreground transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save Footer - Outside the box */}
        {(isDirty || isNew) && !loading && (log || isNew) && !readOnly && (
          <div className="pointer-events-auto absolute bottom-4 right-4 sm:static sm:flex sm:justify-end sm:w-full sm:max-w-2xl animate-in slide-in-from-bottom-2 duration-200">
            <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-xl rounded-full px-6 hover:scale-105 transition-all">
              {saving ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Simpan
            </Button>
          </div>
        )}
      </div>    {/* Lightbox Preview */}
    {previewImage && typeof document !== "undefined" && createPortal(
      <div
        className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4"
        onClick={() => setPreviewImage(null)}
      >
        <button
          onClick={() => setPreviewImage(null)}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <X size={20} />
        </button>
        <img
          src={`/api/image/${previewImage.id}`}
          alt={previewImage.name}
          className="max-w-[95vw] md:max-w-[80vw] lg:max-w-[70vw] max-h-[70vh] md:max-h-[80vh] rounded-lg object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {(() => {
          const currentIndex = savedImages.findIndex((img) => img.id === previewImage.id);
          if (currentIndex === -1) return null;
          const hasPrev = currentIndex > 0;
          const hasNext = currentIndex < savedImages.length - 1;
          
          return (
            <>
              {hasPrev && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(savedImages[currentIndex - 1]);
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
                    setPreviewImage(savedImages[currentIndex + 1]);
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
          <span className="text-white/60 text-xs">{previewImage.name}</span>
          <a
            href={previewImage.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-white/80 hover:text-white text-xs flex items-center gap-1 underline"
          >
            <ExternalLink size={12} /> Buka di Drive
          </a>
        </div>
      </div>,
      document.body
    )}

    {/* Document Preview Lightbox */}
    {previewDoc && typeof document !== "undefined" && createPortal(
      <div
        className="fixed inset-0 z-[999] bg-black/90 flex flex-col items-center justify-center sm:p-8"
        onClick={() => setPreviewDoc(null)}
      >
        <button
          onClick={() => setPreviewDoc(null)}
          className="hidden sm:block absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <X size={20} />
        </button>
        <div className="w-full h-full sm:max-w-5xl bg-white sm:rounded-lg overflow-hidden shadow-2xl relative flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex-1 w-full relative">
            <iframe 
              src={previewDoc.url.replace(/\/view(.*)/, "/preview")} 
              className="absolute inset-0 w-full h-full border-none" 
              title={previewDoc.name}
              allow="autoplay"
            ></iframe>
          </div>
          {/* Mobile Footer Buttons */}
          <div className="sm:hidden flex items-center justify-between p-3 bg-[#0f0f0f] text-white border-t border-white/10">
            <span className="text-xs text-white/70 truncate flex-1 pr-2">{previewDoc.name}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium flex items-center gap-1.5"
              >
                <ExternalLink size={14} /> Tab Baru
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium flex items-center gap-1.5"
              >
                <X size={14} /> Tutup
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop Footer Text */}
        <div className="hidden sm:flex absolute bottom-2 left-1/2 -translate-x-1/2 items-center gap-3">
          <span className="text-white/60 text-xs">{previewDoc.name}</span>
          <a
            href={previewDoc.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-white/80 hover:text-white text-xs flex items-center gap-1 underline"
          >
            <ExternalLink size={12} /> Buka di Drive
          </a>
        </div>
      </div>,
      document.body
    )}
  </>
  );
}
