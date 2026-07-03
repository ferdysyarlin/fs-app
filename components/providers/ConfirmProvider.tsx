"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmVariant = "danger" | "primary" | "warning";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmContextType {
  confirmDialog: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirmDialog;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    message: "",
  });
  const [resolver, setResolver] = useState<(value: boolean) => void>();

  const confirmDialog = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions({
      confirmText: "Ya, Lanjutkan",
      cancelText: "Batal",
      variant: "danger", // Default to danger (e.g. for deletes)
      ...opts,
    });
    setOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleClose = (value: boolean) => {
    setOpen(false);
    if (resolver) resolver(value);
  };

  const getButtonVariant = (variant?: ConfirmVariant) => {
    switch (variant) {
      case "danger":
        return "destructive";
      case "primary":
        return "primary";
      case "warning":
        return "outline";
      default:
        return "destructive";
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirmDialog }}>
      {children}
      <Dialog open={open} onClose={() => handleClose(false)}>
        <DialogHeader>
          <h2 className="text-lg font-bold text-foreground">{options.title}</h2>
        </DialogHeader>
        <div className="p-6 pt-4">
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {options.message}
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
            >
              {options.cancelText}
            </Button>
            <Button
              variant={getButtonVariant(options.variant)}
              onClick={() => handleClose(true)}
            >
              {options.confirmText}
            </Button>
          </div>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
