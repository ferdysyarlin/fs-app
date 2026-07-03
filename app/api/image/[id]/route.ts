import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  try {
    // Gunakan endpoint Google Drive untuk mendownload file publik
    const driveUrl = `https://drive.google.com/uc?export=download&id=${id}`;
    
    // Fetch dari sisi server untuk memotong batasan CORS/embedding Google Drive
    const response = await fetch(driveUrl, {
      headers: {
        // Terkadang menyamar sebagai browser membantu melewati limit
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      }
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch image from Google Drive", { status: response.status });
    }

    // Ambil content type dari response Google, atau gunakan default
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable", // Cache 1 tahun di browser
      },
    });
  } catch (error) {
    console.error("Error fetching drive image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
