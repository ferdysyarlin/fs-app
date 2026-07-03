import React from "react";

// Parallel route: @modal slot wajib dideklarasikan di layout
export default function LogLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
