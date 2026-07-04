import { NextRequest, NextResponse } from "next/server";
import { googleApiFetch } from "@/lib/google";

const TASKS_API = "https://www.googleapis.com/tasks/v1";

/**
 * GET /api/google-tasks
 * Ambil semua tasks dari tasklist default "My Tasks"
 */
export async function GET() {
  try {
    // 1. Ambil semua tasklists dulu untuk cari "@default"
    const listRes = await googleApiFetch(`${TASKS_API}/users/@me/lists?maxResults=20`);
    if (!listRes.ok) throw new Error("Gagal mengambil tasklists");
    const listData = await listRes.json();

    // Gunakan tasklist pertama (biasanya "My Tasks")
    const tasklistId = listData.items?.[0]?.id ?? "@default";

    // 2. Ambil tasks dari tasklist
    const tasksRes = await googleApiFetch(
      `${TASKS_API}/lists/${tasklistId}/tasks?showCompleted=true&showHidden=false&maxResults=100`
    );
    if (!tasksRes.ok) throw new Error("Gagal mengambil tasks");
    const tasksData = await tasksRes.json();

    return NextResponse.json({
      data: tasksData.items ?? [],
      tasklistId,
      error: null,
    });
  } catch (err: any) {
    const status = err.message.includes("token") ? 401 : 500;
    return NextResponse.json({ data: null, error: err.message }, { status });
  }
}

/**
 * POST /api/google-tasks
 * Buat task baru
 * Body: { title, notes?, due?, tasklistId }
 */
export async function POST(request: NextRequest) {
  try {
    const { title, notes, due, tasklistId = "@default" } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ data: null, error: "Judul task wajib diisi" }, { status: 400 });
    }

    const body: any = { title: title.trim() };
    if (notes) body.notes = notes;
    if (due) body.due = due; // RFC 3339 format

    const res = await googleApiFetch(`${TASKS_API}/lists/${tasklistId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message ?? "Gagal membuat task");
    }

    const task = await res.json();
    return NextResponse.json({ data: task, error: null }, { status: 201 });
  } catch (err: any) {
    const status = err.message.includes("token") ? 401 : 500;
    return NextResponse.json({ data: null, error: err.message }, { status });
  }
}
