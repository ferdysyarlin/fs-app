import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/google-tasks/[taskId]/linked-logs
 * Mengambil daftar log_kerja yang terkait dengan sebuah taskId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const supabase = await createAdminClient();
    const { taskId } = await params;

    const { data, error } = await supabase
      .from("log_kerja")
      .select("id, tanggal, deskripsi")
      .contains("google_task_ids", [taskId])
      .order("tanggal", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 });
  }
}
