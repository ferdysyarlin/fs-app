import type { MetadataRoute } from "next";

// Blokir semua search engine agar aplikasi tidak terindeks
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
  };
}
