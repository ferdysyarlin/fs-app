import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary/50 mb-4" />
      <p className="text-sm text-muted-foreground animate-pulse">Memuat halaman...</p>
    </div>
  );
}
