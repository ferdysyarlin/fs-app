import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "tag";

  if (type === "tag") {
    const { data, error } = await supabase.from("tag").select("*").order("nama");
    return NextResponse.json({ data, error: error?.message ?? null });
  }

  return NextResponse.json({ error: "Unknown type", data: null }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const supabase = await createAdminClient();
  const body = await request.json();
  const { type, ...data } = body;

  if (!["tag"].includes(type)) {
    return NextResponse.json({ error: "Unknown type", data: null }, { status: 400 });
  }

  const { data: result, error } = await supabase.from(type).insert(data).select().single();
  if (error) return NextResponse.json({ error: error.message, data: null }, { status: 500 });
  return NextResponse.json({ data: result, error: null }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = await createAdminClient();
  const body = await request.json();
  const { type, id, ...updates } = body;

  if (!["tag"].includes(type)) {
    return NextResponse.json({ error: "Unknown type", data: null }, { status: 400 });
  }

  const { data: result, error } = await supabase.from(type).update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message, data: null }, { status: 500 });
  return NextResponse.json({ data: result, error: null });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id   = searchParams.get("id");

  if (!type || !id) return NextResponse.json({ error: "Type and ID required", data: null }, { status: 400 });

  const { error } = await supabase.from(type).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message, data: null }, { status: 500 });
  return NextResponse.json({ data: { deleted: true }, error: null });
}
