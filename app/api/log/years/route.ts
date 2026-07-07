import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("log_kerja")
    .select("tanggal");

  if (error) {
    return NextResponse.json({ error: error.message, data: [] }, { status: 500 });
  }

  // Extract unique years
  const years = Array.from(
    new Set(data.map((row: any) => row.tanggal.substring(0, 4)))
  ).sort((a: any, b: any) => b - a); // Sort descending

  return NextResponse.json({ data: years, error: null });
}
