import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/tags
 * Returns all unique tags ever used across all log_kerja records.
 */
export async function GET() {
  const supabase = await createAdminClient();

  // Use unnest to flatten all tags arrays into distinct values
  const { data, error } = await supabase
    .from("log_kerja")
    .select("tags")
    .not("tags", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message, data: null }, { status: 500 });
  }

  // Flatten and deduplicate all tags
  const allTags = data
    ?.flatMap((row: any) => row.tags ?? [])
    .filter(Boolean);

  const uniqueTags = Array.from(new Set(allTags)).sort() as string[];

  return NextResponse.json({ data: uniqueTags, error: null });
}
