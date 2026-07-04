import { NextRequest, NextResponse } from "next/server";
import { googleApiFetch } from "@/lib/google";

const TASKS_API = "https://www.googleapis.com/tasks/v1";

type Params = { params: Promise<{ taskId: string }> };

/**
 * PUT /api/google-tasks/[taskId]
 * Update task: title, notes, due, status (completed)
 * Body: { tasklistId, title?, notes?, due?, status? }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { taskId } = await params;
    const { tasklistId = "@default", ...updates } = await request.json();

    // Fetch current task first to merge
    const currentRes = await googleApiFetch(`${TASKS_API}/lists/${tasklistId}/tasks/${taskId}`);
    if (!currentRes.ok) throw new Error("Task tidak ditemukan");
    const current = await currentRes.json();

    const body = {
      ...current,
      ...updates,
      // Toggle: if status passed as boolean
      ...(updates.completed !== undefined
        ? { status: updates.completed ? "completed" : "needsAction", completed: updates.completed ? new Date().toISOString() : null }
        : {}),
    };
    delete body.completed; // Remove our custom boolean key

    const res = await googleApiFetch(`${TASKS_API}/lists/${tasklistId}/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message ?? "Gagal mengupdate task");
    }

    const task = await res.json();
    return NextResponse.json({ data: task, error: null });
  } catch (err: any) {
    const status = err.message.includes("token") ? 401 : 500;
    return NextResponse.json({ data: null, error: err.message }, { status });
  }
}

/**
 * DELETE /api/google-tasks/[taskId]
 * Hapus task dari Google Tasks
 * Query: ?tasklistId=xxx
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const tasklistId = searchParams.get("tasklistId") ?? "@default";

    const res = await googleApiFetch(`${TASKS_API}/lists/${tasklistId}/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (!res.ok && res.status !== 204) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message ?? "Gagal menghapus task");
    }

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    const status = err.message.includes("token") ? 401 : 500;
    return NextResponse.json({ data: null, error: err.message }, { status });
  }
}
