import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <SearchX className="w-12 h-12 text-muted-foreground" />
      </div>
      
      <h1 className="text-4xl font-black tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-semibold text-foreground mb-3">Halaman Tidak Ditemukan</h2>
      <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
        Maaf, halaman yang Anda cari tidak ada atau mungkin telah dipindahkan.
      </p>
      
      <Link href="/">
        <Button size="lg" className="gap-2 px-6 rounded-full">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Halaman Utama
        </Button>
      </Link>
    </div>
  );
}
