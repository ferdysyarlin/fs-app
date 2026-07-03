"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploader } from "@/components/log/FileUploader";
import { toast } from "sonner";
import { Save, X, Calendar, Link as LinkIcon } from "lucide-react";
import type { LogKerja, LogFile } from "@/types";

interface LogFormProps {
  initialData?: LogKerja;
  onSuccess?: (log: LogKerja) => void;
}

const STATUS_OPTIONS = ["Hadir", "Dinas", "Lembur", "Cuti", "Sakit"];

export function LogForm({ initialData, onSuccess }: LogFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  // Form state
  const [tanggal, setTanggal]   = useState(initialData?.tanggal || new Date().toISOString().split("T")[0]);
  const [status, setStatus]     = useState(initialData?.status || "Hadir");
  const [deskripsi, setDeskripsi] = useState(initialData?.deskripsi || "");
  const [catatan, setCatatan]   = useState(initialData?.catatan || "");
  const [tautan, setTautan]     = useState(initialData?.tautan || "");
  const [files, setFiles]       = useState<LogFile[]>(initialData?.log_files || []);
  const [savedLogId, setSavedLogId] = useState<string | null>(initialData?.id || null);
  const [saving, setSaving]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal) { toast.error("Tanggal wajib diisi"); return; }
    if (!status)  { toast.error("Status wajib diisi"); return; }

    setSaving(true);
    try {
      const payload = {
        tanggal,
        status,
        deskripsi: deskripsi || null,
        catatan: catatan || null,
        tautan: tautan || null,
      };

      let res, json;
      if (isEdit) {
        res  = await fetch(`/api/log/${initialData.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        json = await res.json();
      } else {
        res  = await fetch("/api/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        json = await res.json();
        if (json.data?.id) setSavedLogId(json.data.id);
      }

      if (!res.ok || json.error) throw new Error(json.error || "Gagal menyimpan");

      toast.success(isEdit ? "Log kerja diperbarui" : "Log kerja disimpan");
      onSuccess?.(json.data);
      router.push(`/log/${json.data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informasi Dasar */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Dasar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tanggal */}
          <Input
            id="input-tanggal"
            label="Tanggal *"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            icon={<Calendar size={14} />}
            required
          />

          {/* Status Tombol */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "hsl(213,31%,91%)" }}>
              Status *
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    status === s
                      ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                      : "bg-[hsl(222,47%,14%)] text-[hsl(215,20%,65%)] border border-[hsl(222,47%,20%)] hover:text-white hover:border-blue-500/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Deskripsi */}
          <Textarea
            id="input-deskripsi"
            label="Deskripsi"
            placeholder="Tuliskan uraian kegiatan..."
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={4}
          />

          {/* Catatan */}
          <Textarea
            id="input-catatan"
            label="Catatan Tambahan"
            placeholder="Catatan tambahan jika ada..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={2}
          />

          {/* Tautan */}
          <Input
            id="input-tautan"
            label="Tautan / Link"
            type="url"
            placeholder="https://..."
            value={tautan}
            onChange={(e) => setTautan(e.target.value)}
            icon={<LinkIcon size={14} />}
          />
        </CardContent>
      </Card>

      {/* File Lampiran */}
      <Card>
        <CardHeader>
          <CardTitle>File Lampiran</CardTitle>
        </CardHeader>
        <CardContent>
          {savedLogId ? (
            <FileUploader
              logKerjaId={savedLogId}
              tanggal={tanggal}
              deskripsi={status}
              existingFiles={files}
              onUploaded={(f) => setFiles((prev) => [...prev, f])}
              onDeleted={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
            />
          ) : (
            <div
              className="rounded-xl border-2 border-dashed p-6 text-center"
              style={{ borderColor: "hsl(222,47%,18%)" }}
            >
              <p className="text-sm" style={{ color: "hsl(215,20%,50%)" }}>
                💡 Simpan log terlebih dahulu, lalu Anda bisa upload file lampiran di halaman detail.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          id="btn-cancel-log"
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <X size={16} /> Batal
        </Button>
        <Button
          id="btn-save-log"
          type="submit"
          loading={saving}
          className="gap-2"
        >
          <Save size={16} />
          {isEdit ? "Perbarui Log" : "Simpan Log"}
        </Button>
      </div>
    </form>
  );
}
