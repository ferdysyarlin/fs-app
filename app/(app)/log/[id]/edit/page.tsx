import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { LogForm } from "@/components/log/LogForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Edit Log Kerja" };
export const dynamic = "force-dynamic";

export default async function EditLogPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: log, error } = await supabase
    .from("log_kerja")
    .select(`
      *,
      kategori:kategori_id(id, nama, warna),
      program:program_id(id, nama),
      log_files(id, drive_file_id, nama_file, tipe_file, mime_type, ukuran_bytes, url_preview, urutan),
      tags:log_kerja_tag(tag:tag_id(id, nama))
    `)
    .eq("id", id)
    .single();

  if (error || !log) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/log/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Log Kerja</h1>
          <p className="text-sm mt-0.5 truncate max-w-md" style={{ color: "hsl(215,20%,55%)" }}>
            {log.judul}
          </p>
        </div>
      </div>

      <LogForm initialData={log as any} />
    </div>
  );
}
