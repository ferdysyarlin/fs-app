import { createClient } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function googleApiFetch(url: string, options: RequestInit = {}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
  }
  
  let accessToken = session.provider_token;
  if (!accessToken) {
    throw new Error("Google access token tidak tersedia. Silakan logout lalu login ulang.");
  }

  // Coba request pertama
  let res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Jika unauthorized, coba refresh token
  if (res.status === 401) {
    const { data: userSettings, error: dbError } = await supabase
      .from("user_settings")
      .select("value")
      .eq("user_id", session.user.id)
      .eq("key", "google_refresh_token")
      .single();

    if (dbError || !userSettings?.value) {
      throw new Error("Sesi Google kedaluwarsa dan refresh token tidak ditemukan. Silakan logout lalu login ulang.");
    }

    const refreshToken = userSettings.value;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Server tidak dikonfigurasi dengan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET");
    }

    // Tukar refresh token
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      throw new Error("Gagal memperbarui token Google. Silakan logout lalu login ulang.");
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
    
    // Opsional: Jika Google mengirim refresh_token baru, simpan ke database
    if (tokenData.refresh_token) {
        await supabase
          .from("user_settings")
          .upsert({
            user_id: session.user.id,
            key: "google_refresh_token",
            value: tokenData.refresh_token,
          }, { onConflict: "user_id, key" });
    }

    // Retry request
    res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return res;
}
