"use client";

import { ThemeProvider } from "next-themes";
import { type ReactNode } from "react";
import { SWRProvider } from "@/components/providers/SWRProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </SWRProvider>
  );
}
