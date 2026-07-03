"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Settings as SettingsIcon, Loader2, Camera, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";
import Image from "next/image";

export default function SettingsPage() {
  const [profilData, setProfilData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const prof = await fetch("/api/user-settings").then(r => r.json());
    setProfilData(prof.data || {});
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: profilData })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Profil laporan berhasil disimpan");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploadingImage(true);
    const toastId = toast.loading("Mengunggah foto profil...");

    try {
      // 1. Compress Image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      // 2. Generate unique filename
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 3. Upload to Supabase Storage bucket 'fs-storage'
      const { error: uploadError } = await supabase.storage
        .from("fs-storage")
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("fs-storage")
        .getPublicUrl(filePath);

      // 5. Update state and save to DB
      const newSettings = { ...profilData, profil_gambar: publicUrl };
      setProfilData(newSettings);
      
      const res = await fetch("/api/user-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { profil_gambar: publicUrl } })
      });
      
      if (!res.ok) throw new Error("Gagal menyimpan URL gambar ke database");

      // 6. Update global user metadata so Sidebar also updates
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      toast.success("Foto profil berhasil diperbarui", { id: toastId });
      
      // Force refresh to update layout avatar
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal mengunggah foto profil", { id: toastId });
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-1">
          <SettingsIcon size={22} className="text-muted-foreground" />
          Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil pegawai untuk laporan
        </p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil Pegawai &amp; Penilai</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-6">
                {/* Profile Picture Upload Section */}
                <div className="flex flex-col items-center justify-center py-4 border-b border-border">
                  <div className="relative group mb-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center relative">
                      {profilData.profil_gambar ? (
                        <img 
                          src={profilData.profil_gambar} 
                          alt="Profil" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground flex flex-col items-center">
                          <Camera size={24} />
                        </div>
                      )}
                      
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 size={24} className="animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload size={14} />
                    </button>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Klik ikon panah untuk mengubah foto profil (JPG/PNG max 2MB)</p>
                </div>

                <form onSubmit={handleSaveProfil} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Nama Lengkap</label>
                      <Input
                        value={profilData.nama_lengkap || ""}
                        onChange={(e) => setProfilData({...profilData, nama_lengkap: e.target.value})}
                        placeholder="Cth: Ferdy Syarlin, S.Sos"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">NIP</label>
                      <Input
                        value={profilData.nip || ""}
                        onChange={(e) => setProfilData({...profilData, nip: e.target.value})}
                        placeholder="NIP Pegawai"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Pangkat, Gol. Ruang</label>
                      <Input
                        value={profilData.pangkat_golongan || ""}
                        onChange={(e) => setProfilData({...profilData, pangkat_golongan: e.target.value})}
                        placeholder="Cth: III/b / Penata Muda Tingkat I"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Jabatan</label>
                      <Input
                        value={profilData.jabatan || ""}
                        onChange={(e) => setProfilData({...profilData, jabatan: e.target.value})}
                        placeholder="Cth: Arsiparis Ahli Pertama"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-medium">Unit Kerja</label>
                      <Input
                        value={profilData.unit_kerja || ""}
                        onChange={(e) => setProfilData({...profilData, unit_kerja: e.target.value})}
                        placeholder="Cth: Bagian Umum dan Layanan Akademik"
                      />
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-border">
                      <p className="text-sm font-semibold text-primary mb-3">Data Pejabat Penilai</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Nama Pejabat Penilai</label>
                          <Input
                            value={profilData.nama_penilai || ""}
                            onChange={(e) => setProfilData({...profilData, nama_penilai: e.target.value})}
                            placeholder="Nama atasan"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">NIP Pejabat Penilai</label>
                          <Input
                            value={profilData.nip_penilai || ""}
                            onChange={(e) => setProfilData({...profilData, nip_penilai: e.target.value})}
                            placeholder="NIP atasan"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={saving} className="gap-2">
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      Simpan Profil
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
