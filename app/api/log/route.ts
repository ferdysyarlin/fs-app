import { createAdminClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);

  const q       = searchParams.get("q") || "";
  const status  = searchParams.get("status") || "";
  const dari    = searchParams.get("tanggal_dari") || "";
  const sampai  = searchParams.get("tanggal_sampai") || "";
  const page    = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("per_page") || "20");

  let query = supabase
    .from("log_kerja")
    .select(`
      id, tanggal, status, deskripsi, catatan, tautan, gambar, dokumen,
      jam_masuk, jam_pulang,
      created_at
    `, { count: "exact" })
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (q)      query = query.ilike("deskripsi", `%${q}%`);
  if (status) query = query.eq("status", status);
  if (dari)   query = query.gte("tanggal", dari);
  if (sampai) query = query.lte("tanggal", sampai);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message, data: null }, { status: 500 });
  }

  return NextResponse.json({ data, error: null, count });
}



export async function POST(request: NextRequest) {
  const supabase = await createAdminClient();

  const body = await request.json();
  const logData = body;

  // Check if a log already exists for this date
  const { data: existingLog } = await supabase
    .from("log_kerja")
    .select("id")
    .eq("tanggal", logData.tanggal)
    .maybeSingle();

  if (existingLog) {
    return NextResponse.json({ 
      error: "Anda sudah membuat log kerja untuk tanggal ini. Silakan edit log yang sudah ada." 
    }, { status: 400 });
  }

  const id = `LOG-${format(new Date(), "yyyyMMddHHmmss")}`;

  const { data: log, error } = await supabase
    .from("log_kerja")
    .insert({ ...logData, id, gambar: [], dokumen: [], updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, data: null }, { status: 500 });
  }

  return NextResponse.json({ data: log, error: null }, { status: 201 });
}
