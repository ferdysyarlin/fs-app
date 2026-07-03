import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/google-tasks/linked-ids
 * Mengambil semua ID task yang sudah tertaut ke setidaknya satu log kerja
 */
export async function GET() {
  try {
    const supabase = await createAdminClient();

    // Ambil log yang punya google_task_ids tidak kosong
    const { data, error } = await supabase
      .from("log_kerja")
      .select("google_task_ids")
      .not("google_task_ids", "is", null);

    if (error) {
      throw new Error(error.message);
    }

    // Gabungkan semua ID jadi satu Set untuk menghilangkan duplikat
    const allIds = new Set<string>();
    data?.forEach(log => {
      (log.google_task_ids || []).forEach((id: string) => allIds.add(id));
    });

    return NextResponse.json({ data: Array.from(allIds), error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 });
  }
}
