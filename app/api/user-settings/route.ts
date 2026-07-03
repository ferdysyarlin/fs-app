import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/user-settings
// Returns all settings for the authenticated user as a flat object { key: value }
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Convert array to flat object: { nama_lengkap: "...", nip: "..." }
  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value ?? "";
  }

  return NextResponse.json({ data: settings, error: null });
}

// PATCH /api/user-settings
// Body: { key: string, value: string } or { settings: { [key]: value } }
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Accept either { key, value } or { settings: { key: value, ... } }
  const pairs: { key: string; value: string }[] = [];

  if (body.settings && typeof body.settings === "object") {
    for (const [key, value] of Object.entries(body.settings)) {
      pairs.push({ key, value: String(value ?? "") });
    }
  } else if (body.key) {
    pairs.push({ key: body.key, value: String(body.value ?? "") });
  } else {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const rows = pairs.map(p => ({ user_id: user.id, key: p.key, value: p.value }));

  const { error } = await supabase
    .from("user_settings")
    .upsert(rows, { onConflict: "user_id,key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { ok: true }, error: null });
}
