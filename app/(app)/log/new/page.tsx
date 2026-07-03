import { Metadata } from "next";
import { LogForm } from "@/components/log/LogForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tambah Log Kerja" };

export default function NewLogPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/log">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Tambah Log Kerja</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215,20%,55%)" }}>
            Catat aktivitas kerja harian Anda
          </p>
        </div>
      </div>

      <LogForm />
    </div>
  );
}
