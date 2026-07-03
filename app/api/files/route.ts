import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Tipe file dokumen yang diizinkan
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_DOC_SIZE = 1 * 1024 * 1024; // 1 MB

export async function POST(request: NextRequest) {
  const supabase = await createAdminClient();

  const formData = await request.formData();
  const file         = formData.get("file") as File;
  const logKerjaId   = formData.get("log_kerja_id") as string;
  const logTanggal   = formData.get("tanggal") as string;     // "YYYY-MM-DD"
  const menuName     = formData.get("menu_name") as string || "Kinerja";
  const fileCategory = (formData.get("file_category") as string) || "gambar"; // "gambar" | "dokumen"

  if (!file || !logKerjaId) {
    return NextResponse.json({ error: "File dan log_kerja_id wajib diisi", data: null }, { status: 400 });
  }

  // Validasi khusus dokumen
  if (fileCategory === "dokumen") {
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: `Tipe file tidak diizinkan. Hanya PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX.`,
        data: null
      }, { status: 400 });
    }
    if (file.size > MAX_DOC_SIZE) {
      return NextResponse.json({
        error: `Ukuran file melebihi batas 1 MB. Ukuran file: ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
        data: null
      }, { status: 400 });
    }
  }

  const gasUrl = process.env.GAS_WEBAPP_URL;
  if (!gasUrl) {
    return NextResponse.json({ error: "GAS_WEBAPP_URL belum diatur di .env", data: null }, { status: 500 });
  }

  try {
    // 1. Konversi file ke Base64
    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");

    // 2. Buat nama file yang rapi
    const ext = file.name.split(".").pop()?.toLowerCase() || "file";
    const yearMonth = logTanggal.substring(0, 7); // "YYYY-MM"
    const cleanMenu = menuName.toUpperCase().replace(/\s+/g, "_");
    const dateCompact = logTanggal.replace(/-/g, ""); // "YYYYMMDD"
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const filename = `${cleanMenu}-${dateCompact}-${randomSuffix}.${ext}`;

    // 3. Kirim ke GAS (folder sama, tidak dibedakan antara gambar & dokumen)
    const gasResponse = await fetch(gasUrl, {
      method: "POST",
      body: JSON.stringify({
        action: "upload",
        menuName,
        yearMonth,
        filename,
        mimeType: file.type,
        base64: base64Data,
      }),
    });

    const gasResult = await gasResponse.json();

    if (gasResult.status !== "success") {
      throw new Error(gasResult.message || "Gagal upload ke Google Drive via GAS");
    }

    const driveFile = gasResult.data;

    if (fileCategory === "dokumen") {
      // 4a. Format item dokumen
      const newDoc = {
        id:          driveFile.id,
        name:        filename,
        url:         driveFile.webViewLink,
        type:        file.type,
        size:        file.size,
        uploaded_at: new Date().toISOString(),
      };

      // 5a. Append ke array JSONB dokumen di log_kerja
      const { data: currentLog } = await supabase
        .from("log_kerja")
        .select("dokumen")
        .eq("id", logKerjaId)
        .single();

      const existingDocs: any[] = currentLog?.dokumen ?? [];
      const updatedDocs = [...existingDocs, newDoc];

      const { error: updateError } = await supabase
        .from("log_kerja")
        .update({ dokumen: updatedDocs })
        .eq("id", logKerjaId);

      if (updateError) {
        await fetch(gasUrl, {
          method: "POST",
          body: JSON.stringify({ action: "delete", fileId: driveFile.id }),
        }).catch(() => {});
        return NextResponse.json({ error: updateError.message, data: null }, { status: 500 });
      }

      return NextResponse.json({ data: newDoc, error: null }, { status: 201 });

    } else {
      // 4b. Format item gambar
      const newImage = {
        id:          driveFile.id,
        name:        filename,
        url:         driveFile.webViewLink,
        type:        file.type,
        uploaded_at: new Date().toISOString(),
      };

      // 5b. Append ke array JSONB gambar di log_kerja
      const { data: currentLog } = await supabase
        .from("log_kerja")
        .select("gambar")
        .eq("id", logKerjaId)
        .single();

      const existingImages: any[] = currentLog?.gambar ?? [];
      const updatedImages = [...existingImages, newImage];

      const { error: updateError } = await supabase
        .from("log_kerja")
        .update({ gambar: updatedImages })
        .eq("id", logKerjaId);

      if (updateError) {
        await fetch(gasUrl, {
          method: "POST",
          body: JSON.stringify({ action: "delete", fileId: driveFile.id }),
        }).catch(() => {});
        return NextResponse.json({ error: updateError.message, data: null }, { status: 500 });
      }

      return NextResponse.json({ data: newImage, error: null }, { status: 201 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message, data: null }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const logKerjaId   = searchParams.get("log_kerja_id");
  const driveFileId  = searchParams.get("drive_file_id");
  const fileCategory = searchParams.get("file_category") || "gambar";
  const gasUrl = process.env.GAS_WEBAPP_URL;

  if (!logKerjaId || !driveFileId) {
    return NextResponse.json({ error: "log_kerja_id dan drive_file_id wajib diisi", data: null }, { status: 400 });
  }

  // Hapus dari Google Drive via GAS
  if (gasUrl) {
    await fetch(gasUrl, {
      method: "POST",
      body: JSON.stringify({ action: "delete", fileId: driveFileId }),
    }).catch((err) => {
      console.error("Gagal hapus dari Drive:", err.message);
    });
  }

  if (fileCategory === "dokumen") {
    // Hapus dari array JSONB dokumen
    const { data: currentLog } = await supabase
      .from("log_kerja")
      .select("dokumen")
      .eq("id", logKerjaId)
      .single();

    const updatedDocs = (currentLog?.dokumen ?? []).filter((doc: any) => doc.id !== driveFileId);

    const { error } = await supabase
      .from("log_kerja")
      .update({ dokumen: updatedDocs })
      .eq("id", logKerjaId);

    if (error) return NextResponse.json({ error: error.message, data: null }, { status: 500 });
  } else {
    // Hapus dari array JSONB gambar
    const { data: currentLog } = await supabase
      .from("log_kerja")
      .select("gambar")
      .eq("id", logKerjaId)
      .single();

    const updatedImages = (currentLog?.gambar ?? []).filter((img: any) => img.id !== driveFileId);

    const { error } = await supabase
      .from("log_kerja")
      .update({ gambar: updatedImages })
      .eq("id", logKerjaId);

    if (error) return NextResponse.json({ error: error.message, data: null }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted: true }, error: null });
}
