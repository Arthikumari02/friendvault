"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/Button";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <section aria-modal="true" role="dialog" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <Button aria-label="Close modal" onClick={onClose} variant="ghost">
            Close
          </Button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>, document.body
  );
}
