"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";

interface LogDetailActionsProps {
  logId: string;
  logJudul: string;
}

export function LogDetailActions({ logId, logJudul }: LogDetailActionsProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res  = await fetch(`/api/log/${logId}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || json.error) throw new Error(json.error || "Gagal menghapus");

      // If Drive file IDs returned, delete them from Drive too
      if (json.data?.drive_file_ids?.length > 0) {
        await Promise.all(
          json.data.drive_file_ids.map((dfId: string) =>
            fetch(`/api/files?drive_file_id=${dfId}`, { method: "DELETE" }).catch(() => {})
          )
        );
      }

      toast.success("Log kerja dihapus");
      router.push("/log");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
      setDeleting(false);
      setShowDelete(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href={`/log/${logId}/edit`}>
          <Button id="btn-edit-log-header" variant="secondary" size="sm" className="gap-2">
            <Edit size={14} /> Edit
          </Button>
        </Link>
        <Button
          id="btn-delete-log"
          variant="destructive"
          size="sm"
          onClick={() => setShowDelete(true)}
          className="gap-2"
        >
          <Trash2 size={14} /> Hapus
        </Button>
      </div>

      <Dialog open={showDelete} onClose={() => setShowDelete(false)}>
        <DialogHeader>
          <DialogTitle>Konfirmasi Hapus</DialogTitle>
          <DialogClose onClose={() => setShowDelete(false)} />
        </DialogHeader>
        <DialogBody>
          <p className="text-sm" style={{ color: "hsl(215,20%,70%)" }}>
            Apakah Anda yakin ingin menghapus log kerja{" "}
            <span className="font-semibold text-white">"{logJudul}"</span>?
          </p>
          <p className="text-sm mt-2" style={{ color: "hsl(0,84%,60%)" }}>
            ⚠️ Semua file lampiran di Google Drive juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowDelete(false)}>
            Batal
          </Button>
          <Button
            id="btn-confirm-delete"
            variant="destructive"
            onClick={handleDelete}
            loading={deleting}
          >
            <Trash2 size={14} className="mr-2" />
            Ya, Hapus
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
