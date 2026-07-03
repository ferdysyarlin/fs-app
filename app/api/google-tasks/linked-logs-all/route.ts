import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("log_kerja")
      .select("id, deskripsi, tanggal, status, google_task_ids")
      .not("google_task_ids", "is", null);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 });
  }
}
