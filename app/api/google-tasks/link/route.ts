import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/google-tasks/link
 * Tautkan satu task ke log_kerja
 * Body: { log_kerja_id, task_id }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { log_kerja_id, task_id } = await request.json();

    if (!log_kerja_id || !task_id) {
      return NextResponse.json({ error: "log_kerja_id dan task_id wajib diisi" }, { status: 400 });
    }

    // Ambil google_task_ids saat ini
    const { data: log, error: fetchError } = await supabase
      .from("log_kerja")
      .select("google_task_ids")
      .eq("id", log_kerja_id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const currentIds: string[] = log?.google_task_ids ?? [];
    if (currentIds.includes(task_id)) {
      return NextResponse.json({ data: { already_linked: true }, error: null });
    }

    const { error: updateError } = await supabase
      .from("log_kerja")
      .update({ google_task_ids: [...currentIds, task_id] })
      .eq("id", log_kerja_id);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ data: { linked: true, task_id }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/google-tasks/link
 * Lepas tautan task dari log_kerja
 * Query: ?log_kerja_id=xxx&task_id=yyy
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const log_kerja_id = searchParams.get("log_kerja_id");
    const task_id = searchParams.get("task_id");

    if (!log_kerja_id || !task_id) {
      return NextResponse.json({ error: "log_kerja_id dan task_id wajib diisi" }, { status: 400 });
    }

    const { data: log, error: fetchError } = await supabase
      .from("log_kerja")
      .select("google_task_ids")
      .eq("id", log_kerja_id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const newIds = (log?.google_task_ids ?? []).filter((id: string) => id !== task_id);

    const { error: updateError } = await supabase
      .from("log_kerja")
      .update({ google_task_ids: newIds })
      .eq("id", log_kerja_id);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ data: { unlinked: true, task_id }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 });
  }
}
