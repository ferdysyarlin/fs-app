"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { toast } from "sonner";
import { BarChart2, FileText, Loader2, Printer } from "lucide-react";
import { format, eachDayOfInterval, endOfMonth, isFriday } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { createPortal } from "react-dom";

const formatTimeInput = (val: string) => {
  const digits = val.replace(/\D/g, "");
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  return digits;
};

interface ReportItem {
  id?: string;
  date: Date;
  dateStr: string; // YYYY-MM-DD
  checked: boolean;
  jamMasuk: string;
  jamPulang: string;
  rencana: string;
  realisasi: string;
  link: string;
}

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState<"wfh" | "bulanan">("wfh");
  const [bulan, setBulan] = useState(format(new Date(), "MM"));
  const [tahun, setTahun] = useState(format(new Date(), "yyyy"));

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [profil, setProfil] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const months = [
    { value: "01", label: "Januari" }, { value: "02", label: "Februari" },
    { value: "03", label: "Maret" }, { value: "04", label: "April" },
    { value: "05", label: "Mei" }, { value: "06", label: "Juni" },
    { value: "07", label: "Juli" }, { value: "08", label: "Agustus" },
    { value: "09", label: "September" }, { value: "10", label: "Oktober" },
    { value: "11", label: "November" }, { value: "12", label: "Desember" },
  ];

  // Fetch Data when month/year/tab changes
  useEffect(() => {
    fetchData();
    fetchProfil();
  }, [bulan, tahun, activeTab]);

  const fetchProfil = async () => {
    try {
      const res = await fetch("/api/user-settings");
      const json = await res.json();
      if (json.data) setProfil(json.data);
    } catch (e) {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = new Date(parseInt(tahun), parseInt(bulan) - 1, 1);
      const end = endOfMonth(start);
      const dari = format(start, "yyyy-MM-dd");
      const sampai = format(end, "yyyy-MM-dd");
      
      const res = await fetch(`/api/log?tanggal_dari=${dari}&tanggal_sampai=${sampai}&per_page=1000`);
      const json = await res.json();
      let logs = json.data || [];

      // Sort logs by tanggal ascending for the report
      logs.sort((a: any, b: any) => a.tanggal.localeCompare(b.tanggal));

      if (activeTab === "wfh") {
        // Calculate all Fridays
        const days = eachDayOfInterval({ start, end });
        const fridaysDates = days.filter(d => isFriday(d));

        const mapped = fridaysDates.map(date => {
          const dateStr = format(date, "yyyy-MM-dd");
          // Find log for this friday (just take the first one if multiple)
          const log = logs.find((l: any) => l.tanggal === dateStr);
          
          let allLinks: string[] = [];
          if (log) {
            if (log.gambar) allLinks.push(...log.gambar.map((g: any) => g.url));
            if (log.dokumen) allLinks.push(...log.dokumen.map((d: any) => d.url));
          }
          let link = allLinks.join("\n");

          return {
            id: dateStr,
            date,
            dateStr,
            checked: !!log,
            jamMasuk: log?.jam_masuk || "07:30",
            jamPulang: log?.jam_pulang || (isFriday(date) ? "16:30" : "16:00"),
            rencana: log?.program?.nama || "",
            realisasi: log?.deskripsi || "",
            link,
          };
        });
        setReportData(mapped);
      } else {
        // Laporan Bulanan: show all logs found
        const mapped = logs.map((log: any, idx: number) => {
          let allLinks: string[] = [];
          if (log.gambar) allLinks.push(...log.gambar.map((g: any) => g.url));
          if (log.dokumen) allLinks.push(...log.dokumen.map((d: any) => d.url));
          let link = allLinks.join("\n");
          
          return {
            id: log.id || `log-${idx}`,
            date: new Date(log.tanggal),
            dateStr: log.tanggal,
            checked: true,
            jamMasuk: log.jam_masuk || "07:30",
            jamPulang: log.jam_pulang || (isFriday(new Date(log.tanggal)) ? "16:30" : "16:00"),
            rencana: log.program?.nama || "",
            realisasi: log.deskripsi || "",
            link,
          };
        });
        setReportData(mapped);
      }
    } catch (err) {
      toast.error("Gagal mengambil data laporan");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: keyof ReportItem, value: any) => {
    const newData = [...reportData];
    newData[index] = { ...newData[index], [field]: value };
    setReportData(newData);
  };

  const selectedItems = reportData.filter(f => f.checked);
  const monthLabel = months.find(m => m.value === bulan)?.label;
  const isWfh = activeTab === "wfh";
  const titleReport = isWfh ? "Rekapitulasi Pelaksanaan Work From Home" : "Laporan Kinerja Bulanan";
  const columnRealisasi = isWfh ? "Realisasi" : "Bukti Dukung";

  return (
    <div className="p-6 w-full">
      {/* Title removed */}

      <div className="flex flex-col gap-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Horizontal Tabs (Capsule) */}
          <div className="flex gap-2 bg-muted p-1 rounded-full">
            {[
              { id: "wfh", label: "WFH" },
              { id: "bulanan", label: "Bulanan" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-5 py-2 text-sm font-medium transition-all rounded-full ${
                  activeTab === t.id
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filter Bulan & Tahun */}
          <div className="flex items-center gap-2">
            <Select value={bulan} onChange={e => setBulan(e.target.value)} className="w-auto h-10 text-sm rounded-full bg-background border-border">
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
            <Select value={tahun} onChange={e => setTahun(e.target.value)} className="w-auto h-10 text-sm rounded-full bg-background border-border">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">

              <div className="space-y-4">
                {loading ? (
                  <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden bg-card overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 w-10 text-center">✓</th>
                            <th className="px-3 py-2 whitespace-nowrap">Tanggal</th>
                            <th className="px-3 py-2 w-20">Masuk</th>
                            <th className="px-3 py-2 w-20">Pulang</th>
                            <th className="px-3 py-2">Rencana Hasil Kerja</th>
                            <th className="px-3 py-2">{columnRealisasi}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {reportData.map((f, i) => (
                            <tr key={f.id} className={`transition-colors ${!f.checked ? "opacity-50" : ""}`}>
                              <td className="px-3 py-2 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={f.checked} 
                                  onChange={(e) => updateItem(i, "checked", e.target.checked)}
                                  className="w-4 h-4 rounded border-border"
                                />
                              </td>
                              <td className="px-3 py-2 font-medium whitespace-nowrap">
                                {format(f.date, "dd MMM yyyy", { locale: idLocale })}
                              </td>
                              <td className="px-3 py-2">
                                <Input 
                                  value={f.jamMasuk} 
                                  onChange={(e) => updateItem(i, "jamMasuk", formatTimeInput(e.target.value))} 
                                  disabled={!f.checked}
                                  className="h-8 px-2 w-16 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input 
                                  value={f.jamPulang} 
                                  onChange={(e) => updateItem(i, "jamPulang", formatTimeInput(e.target.value))} 
                                  disabled={!f.checked}
                                  className="h-8 px-2 w-16 text-center text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 min-w-[200px]">
                                <textarea 
                                  value={f.rencana} 
                                  onChange={(e) => updateItem(i, "rencana", e.target.value)} 
                                  disabled={!f.checked}
                                  className="w-full h-16 bg-transparent border border-border/50 rounded-md p-1.5 text-xs outline-none focus:border-primary resize-none"
                                  placeholder="Rencana kerja..."
                                />
                              </td>
                              <td className="px-3 py-2 space-y-1.5 min-w-[200px]">
                                <textarea 
                                  value={f.realisasi} 
                                  onChange={(e) => updateItem(i, "realisasi", e.target.value)} 
                                  disabled={!f.checked}
                                  className="w-full h-10 bg-transparent border border-border/50 rounded-md p-1.5 text-xs outline-none focus:border-primary resize-none"
                                  placeholder={columnRealisasi + "..."}
                                />
                                <textarea 
                                  value={f.link} 
                                  onChange={(e) => updateItem(i, "link", e.target.value)} 
                                  disabled={!f.checked}
                                  placeholder="Link bukti (s.id/...)"
                                  className="w-full mt-1.5 h-12 bg-transparent border border-border/50 rounded-md p-1.5 text-[10px] outline-none focus:border-primary resize-none leading-tight"
                                />
                              </td>
                            </tr>
                          ))}
                          {reportData.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                                Tidak ada data log kerja pada bulan ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <Button 
          onClick={() => {
            if (!profil.nama_lengkap) {
              toast.error("Data profil belum lengkap! Silakan isi di menu Pengaturan > Profil Laporan.");
            }
            setShowPreview(true);
          }}
          disabled={selectedItems.length === 0}
          className="rounded-full shadow-lg h-14 px-6 gap-2 bg-primary hover:bg-primary/90 hover:scale-105 transition-all text-primary-foreground"
        >
          <Printer size={20} /> <span className="hidden sm:inline font-semibold">Preview & Cetak</span>
        </Button>
      </div>

      {/* Print Preview Modal */}
      {showPreview && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm overflow-y-auto">
          {/* Action Bar */}
          <div className="sticky top-0 left-0 right-0 h-16 bg-card border-b flex items-center justify-between px-6 z-[101] shadow-sm print:hidden">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText size={18} className="text-primary" /> Preview Dokumen
            </h2>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Batal
              </Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer size={16} /> Cetak (Ctrl+P)
              </Button>
            </div>
          </div>
          
          {/* Paper Document Wrapper */}
          <div className="flex justify-center p-8 print:p-0 print:bg-white print:text-black">
            {/* The A4 Paper Content */}
            <div id="print-document" className="bg-white text-black p-[1.5cm] w-full max-w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none print:max-w-none relative print:m-0" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              
              {/* Global print CSS override specifically for this document */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  @page { size: A4; margin: 1.5cm; }
                  body * { visibility: hidden; }
                  .fixed.inset-0 { position: absolute; left: 0; top: 0; margin: 0; padding: 0; }
                  .print\\:hidden { display: none !important; }
                  #print-document { 
                    visibility: visible !important; 
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    box-shadow: none !important;
                    padding: 0 !important;
                  }
                  #print-document * { visibility: visible !important; }
                  table, th, td { border: 1px solid black !important; }
                  th { font-weight: bold; }
                }
              `}} />

              {/* Document Header */}
              <div className="text-center mb-4 mt-0">
                <h1 className="font-bold text-[16pt] leading-tight">
                  {titleReport}<br/>
                  {monthLabel} {tahun}
                </h1>
              </div>

              {/* Profile Table */}
              <table className="w-full max-w-xl mb-4 border-none text-[12pt] leading-tight">
                <tbody>
                  <tr>
                    <td className="py-0.5 w-48 align-top">Nama</td>
                    <td className="py-0.5 w-4 align-top">:</td>
                    <td className="py-0.5 align-top">{profil.nama_lengkap || "-"}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">NIP</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5 align-top">{profil.nip || "-"}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Pangkat, Gol. Ruang</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5 align-top">{profil.pangkat_golongan || "-"}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Jabatan</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5 align-top">{profil.jabatan || "-"}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 align-top">Unit Kerja</td>
                    <td className="py-0.5 align-top">:</td>
                    <td className="py-0.5 align-top">{profil.unit_kerja || "-"}</td>
                  </tr>
                </tbody>
              </table>

              {/* Main Report Table */}
              <table className="w-full border-collapse text-[11pt] mb-6 border border-black">
                <thead>
                  <tr className="bg-gray-100/50 leading-tight">
                    <th className="border border-black px-2 py-1 w-px text-center align-middle font-semibold">No</th>
                    <th className="border border-black px-2 py-1 w-px whitespace-nowrap text-center align-middle font-semibold">Tanggal</th>
                    <th className="border border-black px-2 py-1 w-px whitespace-nowrap text-center align-middle font-semibold">Jam<br/>Masuk</th>
                    <th className="border border-black px-2 py-1 w-px whitespace-nowrap text-center align-middle font-semibold">Jam<br/>Pulang</th>
                    <th className="border border-black px-4 py-1 text-center align-middle font-semibold w-1/3">Rencana Hasil Kerja</th>
                    <th className="border border-black px-4 py-1 text-center align-middle font-semibold">{columnRealisasi}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((f, i) => (
                    <tr key={i}>
                      <td className="border border-black px-2 py-4 text-center align-middle">{i + 1}.</td>
                      <td className="border border-black px-2 py-4 text-center align-middle leading-snug whitespace-nowrap">
                        {format(f.date, "d MMM", { locale: idLocale })}<br/>
                        {tahun}
                      </td>
                      <td className="border border-black px-2 py-4 text-center align-middle">{f.jamMasuk}</td>
                      <td className="border border-black px-2 py-4 text-center align-middle">{f.jamPulang}</td>
                      <td className="border border-black px-4 py-4 align-middle whitespace-pre-wrap">{f.rencana}</td>
                      <td className="border border-black px-4 py-4 align-middle">
                        <div className="whitespace-pre-wrap mb-2">{f.realisasi}</div>
                        {f.link && f.link.split("\n").map((url, uIdx) => (
                          <div key={uIdx} className="text-[10pt] leading-tight mb-0.5 flex gap-1">
                            <span className="flex-shrink-0 text-black">•</span>
                            <span className="text-blue-800 break-all underline decoration-1">{url}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="flex justify-between mt-6 text-[11pt] leading-tight">
                <div className="w-64 flex flex-col justify-between">
                  <div>
                    <br/>
                    Pegawai Yang Dinilai
                  </div>
                  <div className="mt-20">
                    <div className="font-bold pb-0.5">{profil.nama_lengkap || "-"}</div>
                    <div>NIP {profil.nip || "-"}</div>
                  </div>
                </div>
                <div className="w-64 flex flex-col justify-between">
                  <div>
                    Mengetahui,<br/>
                    Pejabat Penilai Kinerja
                  </div>
                  <div className="mt-20">
                    <div className="font-bold pb-0.5">{profil.nama_penilai || "-"}</div>
                    <div>NIP {profil.nip_penilai || "-"}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
