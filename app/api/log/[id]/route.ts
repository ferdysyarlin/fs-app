import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("log_kerja")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, data: null }, { status: 404 });
  }

  return NextResponse.json({ data, error: null });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();
  const body = await request.json();

  // tags is now a TEXT[] column directly in log_kerja
  const { data, error } = await supabase
    .from("log_kerja")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, data: null }, { status: 500 });
  }

  return NextResponse.json({ data, error: null });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  // Ambil gambar untuk cleanup Drive
  const { data: logData } = await supabase
    .from("log_kerja")
    .select("gambar, dokumen")
    .eq("id", id)
    .single();

  const gambarIds: string[] = (logData?.gambar ?? []).map((img: any) => img.id).filter(Boolean);
  const dokumenIds: string[] = (logData?.dokumen ?? []).map((doc: any) => doc.id).filter(Boolean);
  const driveFileIds = [...gambarIds, ...dokumenIds];

  // Hapus log (dan semua data terkait)
  const { error } = await supabase.from("log_kerja").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Kembalikan Drive file IDs agar client bisa hapus dari Drive
  return NextResponse.json({
    data: { deleted: true, drive_file_ids: driveFileIds },
    error: null,
  });
}
