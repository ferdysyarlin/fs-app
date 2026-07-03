"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, FileText, Image, File, Loader2 } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { LogFile } from "@/types";

interface FileUploaderProps {
  logKerjaId: string;
  tanggal: string;
  deskripsi?: string;
  existingFiles?: LogFile[];
  onUploaded?: (file: LogFile) => void;
  onDeleted?: (fileId: string) => void;
}

interface UploadingFile {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  error?: string;
}

const ACCEPTED_TYPES = {
  "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

function FileIcon({ type }: { type: string }) {
  if (type === "image") return <Image size={14} className="text-blue-400" />;
  if (type === "pdf")   return <FileText size={14} className="text-red-400" />;
  if (type === "docx")  return <FileText size={14} className="text-blue-400" />;
  if (type === "xlsx")  return <FileText size={14} className="text-emerald-400" />;
  return <File size={14} className="text-[hsl(215,20%,55%)]" />;
}

export function FileUploader({
  logKerjaId,
  tanggal,
  deskripsi = "file",
  existingFiles = [],
  onUploaded,
  onDeleted,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [deleting, setDeleting] = useState<string[]>([]);

  const uploadFile = async (file: File, index: number, uploadId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("log_kerja_id", logKerjaId);
    formData.append("tanggal", tanggal);
    formData.append("deskripsi", deskripsi);
    formData.append("urutan", String(existingFiles.length + index));

    try {
      const res = await fetch("/api/files", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok || json.error) throw new Error(json.error || "Upload gagal");

      setUploading((prev) =>
        prev.map((u) => (u.id === uploadId ? { ...u, status: "done" } : u))
      );
      onUploaded?.(json.data);
      toast.success(`${file.name} berhasil diupload`);
    } catch (err: any) {
      setUploading((prev) =>
        prev.map((u) => (u.id === uploadId ? { ...u, status: "error", error: err.message } : u))
      );
      toast.error(`Gagal upload ${file.name}: ${err.message}`);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newUploads: UploadingFile[] = acceptedFiles.map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        status: "uploading",
      }));
      setUploading((prev) => [...prev, ...newUploads]);

      await Promise.all(
        acceptedFiles.map((f, i) => uploadFile(f, i, newUploads[i].id))
      );

      // Cleanup done/error uploads after 3s
      setTimeout(() => {
        setUploading((prev) => prev.filter((u) => u.status === "uploading"));
      }, 3000);
    },
    [logKerjaId, tanggal, deskripsi, existingFiles.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 25 * 1024 * 1024, // 25MB
  });

  const handleDelete = async (fileId: string) => {
    setDeleting((prev) => [...prev, fileId]);
    try {
      const res = await fetch(`/api/files?id=${fileId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error);
      onDeleted?.(fileId);
      toast.success("File dihapus");
    } catch (err: any) {
      toast.error(`Gagal hapus file: ${err.message}`);
    } finally {
      setDeleting((prev) => prev.filter((id) => id !== fileId));
    }
  };

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-blue-500 bg-blue-500/10"
            : "border-[hsl(222,47%,18%)] hover:border-blue-500/50 hover:bg-[hsl(222,47%,10%)]"
        )}
        id="file-dropzone"
      >
        <input {...getInputProps()} />
        <UploadCloud
          size={24}
          className={cn(
            "mx-auto mb-2 transition-colors",
            isDragActive ? "text-blue-400" : "text-[hsl(215,20%,40%)]"
          )}
        />
        <p className="text-sm font-medium text-white mb-1">
          {isDragActive ? "Lepaskan file di sini…" : "Drag & drop atau klik untuk upload"}
        </p>
        <p className="text-xs" style={{ color: "hsl(215,20%,45%)" }}>
          Foto (JPG, PNG, WebP), PDF, Word, Excel · Maks. 25MB
        </p>
      </div>

      {/* Uploading items */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: "hsl(222,47%,11%)", border: "1px solid hsl(222,47%,16%)" }}
            >
              {u.status === "uploading" ? (
                <Loader2 size={14} className="text-blue-400 animate-spin flex-shrink-0" />
              ) : u.status === "done" ? (
                <span className="text-emerald-400 text-xs">✓</span>
              ) : (
                <span className="text-red-400 text-xs">✗</span>
              )}
              <span className="text-xs text-white truncate flex-1">{u.file.name}</span>
              <span className="text-xs flex-shrink-0" style={{ color: "hsl(215,20%,45%)" }}>
                {formatFileSize(u.file.size)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          {existingFiles.map((f) => {
            const isDeleting = deleting.includes(f.id);
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg group"
                style={{ background: "hsl(222,47%,11%)", border: "1px solid hsl(222,47%,15%)" }}
              >
                <FileIcon type={f.tipe_file} />
                <div className="flex-1 min-w-0">
                  {f.url_preview ? (
                    <a
                      href={f.url_preview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white hover:text-blue-400 transition-colors truncate block"
                    >
                      {f.nama_file}
                    </a>
                  ) : (
                    <span className="text-xs text-white truncate block">{f.nama_file}</span>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="default" className="text-xs px-1 py-0">{f.tipe_file}</Badge>
                    {f.ukuran_bytes && (
                      <span className="text-xs" style={{ color: "hsl(215,20%,45%)" }}>
                        {formatFileSize(f.ukuran_bytes)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Image thumbnail */}
                {f.tipe_file === "image" && f.url_preview && (
                  <a href={f.url_preview} target="_blank" rel="noopener noreferrer">
                    <img
                      src={f.url_preview.replace("/view", "/thumbnail")}
                      alt={f.nama_file}
                      className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </a>
                )}
                <button
                  id={`btn-delete-file-${f.id}`}
                  onClick={() => handleDelete(f.id)}
                  disabled={isDeleting}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 hover:text-red-400 text-[hsl(215,20%,45%)] disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
