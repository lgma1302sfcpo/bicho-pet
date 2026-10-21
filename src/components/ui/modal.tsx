"use client";

import { X } from "lucide-react";
import React, { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

const openModals: symbol[] = [];
let originalBodyOverflow = "";

export function Modal({ open, title, description, children, onClose, className }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const modalId = useRef(Symbol("modal")).current;
  const onCloseRef = useRef(onClose);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    // Only the last open dialog may restore page scrolling.
    if (!openModals.length) originalBodyOverflow = document.body.style.overflow;
    openModals.push(modalId);
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openModals[openModals.length - 1] === modalId) onCloseRef.current();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      const index = openModals.indexOf(modalId);
      if (index !== -1) openModals.splice(index, 1);
      if (!openModals.length) document.body.style.overflow = originalBodyOverflow;
    };
  }, [modalId, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="ui-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "ui-modal-panel flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]",
          className
        )}
      >
        <header className="ui-modal-header flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
            {description ? <p id={descriptionId} className="mt-1 text-sm text-subdued">{description}</p> : null}
          </div>
          <Button variant="ghost" className="shrink-0" onClick={onClose} aria-label="Fechar janela">
            <X size={19} />
          </Button>
        </header>
        <div className="ui-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      </section>
    </div>,
    document.body
  );
}
