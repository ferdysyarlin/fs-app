import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, formatFileSize } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Calendar, Edit,
  Paperclip, FileText, Image, File, Link2, ExternalLink
} from "lucide-react";
import { LogDetailActions } from "@/components/log/LogDetailActions";
import Link from "next/link";
import { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createAdminClient();
  const { data } = await supabase.from("log_kerja").select("status, tanggal").eq("id", id).single();
  return { title: data ? `${data.status} – ${data.tanggal}` : "Detail Log" };
}

export const dynamic = "force-dynamic";

function FileIcon({ type }: { type: string }) {
  if (type === "image") return <Image size={14} className="text-blue-400" />;
  if (type === "pdf")   return <FileText size={14} className="text-red-400" />;
  return <File size={14} className="text-[hsl(215,20%,55%)]" />;
}

export default async function LogDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: log, error } = await supabase
    .from("log_kerja")
    .select(`
      *,
      log_files(id, drive_file_id, nama_file, tipe_file, mime_type, ukuran_bytes, url_preview, urutan)
    `)
    .eq("id", id)
    .single();

  if (error || !log) {
    console.error("[LogDetailPage] error fetching id:", id, error?.message);
    notFound();
  }

  const images   = log.log_files?.filter((f: any) => f.tipe_file === "image") ?? [];
  const docs     = log.log_files?.filter((f: any) => f.tipe_file !== "image") ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <Link href="/log">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {log.status}
              {log.status === "Lembur" && <Badge variant="danger" className="ml-2">LEMBUR</Badge>}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(215,20%,55%)" }}>
                <Calendar size={13} />
                {formatDate(log.tanggal, "d MMM yyyy, HH:mm")}
              </span>
              <span className="text-sm text-white opacity-50">|</span>
              <span className="text-sm font-mono text-blue-400">
                {log.id}
              </span>
            </div>
          </div>
        </div>

        {/* Actions (client component for delete) */}
        <LogDetailActions logId={id} logJudul={log.status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deskripsi */}
          {log.deskripsi && (
            <Card>
              <CardHeader><CardTitle>Deskripsi</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(215,20%,70%)" }}>
                  {log.deskripsi}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Catatan */}
          {log.catatan && (
            <Card>
              <CardHeader><CardTitle>Catatan Tambahan</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(215,20%,70%)" }}>
                  {log.catatan}
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Tautan */}
          {log.tautan && (
            <Card>
              <CardContent className="pt-6">
                <a 
                  href={log.tautan} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-2 text-blue-400 hover:underline text-sm font-medium"
                >
                  <Link2 size={16} />
                  {log.tautan}
                </a>
              </CardContent>
            </Card>
          )}

          {/* File lampiran */}
          {log.log_files && log.log_files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip size={16} className="text-blue-400" />
                  File Lampiran ({log.log_files.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image gallery */}
                {images.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: "hsl(215,20%,55%)" }}>
                      Foto ({images.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {images.map((f: any) => (
                        <a
                          key={f.id}
                          href={f.url_preview}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block rounded-lg overflow-hidden aspect-video"
                          style={{ background: "hsl(222,47%,12%)" }}
                        >
                          <img
                            src={f.url_preview}
                            alt={f.nama_file}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "";
                              (e.target as HTMLImageElement).parentElement!.innerHTML =
                                `<div class="flex items-center justify-center h-full text-xs text-gray-500">${f.nama_file}</div>`;
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {docs.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: "hsl(215,20%,55%)" }}>
                      Dokumen ({docs.length})
                    </p>
                    <div className="space-y-2">
                      {docs.map((f: any) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 p-3 rounded-lg"
                          style={{ background: "hsl(222,47%,11%)", border: "1px solid hsl(222,47%,15%)" }}
                        >
                          <FileIcon type={f.tipe_file} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{f.nama_file}</p>
                            {f.ukuran_bytes && (
                              <p className="text-xs mt-0.5" style={{ color: "hsl(215,20%,45%)" }}>
                                {formatFileSize(f.ukuran_bytes)}
                              </p>
                            )}
                          </div>
                          {f.url_preview && (
                            <a href={f.url_preview} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon">
                                <ExternalLink size={13} />
                              </Button>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Edit button */}
          <Link href={`/log/${id}/edit`}>
            <Button id="btn-edit-log" variant="outline" className="w-full gap-2">
              <Edit size={14} /> Edit Log
            </Button>
          </Link>

          {/* Metadata */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Info</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Dibuat", value: formatDate(log.created_at, "d MMM yyyy, HH:mm") },
                { label: "Diperbarui", value: formatDate(log.updated_at, "d MMM yyyy, HH:mm") },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-xs" style={{ color: "hsl(215,20%,50%)" }}>{item.label}</span>
                  <span className="text-xs text-white">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
