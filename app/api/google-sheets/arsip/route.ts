import { NextRequest, NextResponse } from "next/server";
import { googleApiFetch } from "@/lib/google";

export async function GET(request: NextRequest) {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ARSIP_ID;
    
    if (!sheetId) {
      return NextResponse.json({ 
        data: null, 
        error: "Google Sheet ID belum dikonfigurasi di server (GOOGLE_SHEET_ARSIP_ID)." 
      }, { status: 400 });
    }

    // Mengambil data dari sheet 'arsip-kinerja', asumsikan kolom A sampai N (14 kolom)
    const range = "arsip-kinerja!A:N";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;

    const res = await googleApiFetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || "Gagal mengambil data dari Google Sheets");
    }

    const data = await res.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      return NextResponse.json({ data: [], error: null });
    }

    // Baris pertama adalah header
    const headers = rows[0];
    const logData = [];

    // Fungsi pembantu untuk parsing JSON dengan aman
    const safeParseJson = (str: string) => {
      if (!str) return null;
      try {
        return JSON.parse(str);
      } catch (e) {
        return null;
      }
    };

    // Parsing baris sisanya
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Pastikan urutan persis seperti log_kerja
      // id, tanggal, status, deskripsi, catatan, tautan, tags, gambar, dokumen, jam_masuk, jam_pulang, google_task_ids, is_pinned, created_at
      const logItem: any = {};
      
      headers.forEach((header: string, index: number) => {
        const key = header.toLowerCase().trim();
        const value = row[index] || null;
        
        // Handling JSON string arrays
        if (["gambar", "dokumen", "tags", "google_task_ids"].includes(key)) {
          logItem[key] = safeParseJson(value);
        } else if (key === "is_pinned") {
          logItem[key] = value === "true" || value === "TRUE";
        } else {
          logItem[key] = value;
        }
      });

      // Filter empty rows (wajib ada ID atau tanggal)
      if (logItem.id || logItem.tanggal) {
        logData.push(logItem);
      }
    }

    return NextResponse.json({ data: logData, count: logData.length, error: null });
  } catch (err: any) {
    const status = err.message.includes("token") ? 401 : 500;
    return NextResponse.json({ data: null, error: err.message }, { status });
  }
}
