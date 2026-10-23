"use client";
import { useEffect, useRef } from "react";
export function Modal({
  children,
  title,
  onClose,
  wide = false,
}: {
  children: React.ReactNode;
  title: string;
  onClose?: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    el?.showModal();
    return () => {
      el?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      className={`m-auto w-[calc(100%-32px)] ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[85dvh] overflow-y-auto rounded-2xl border border-border bg-white p-6 md:p-8 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose?.();
        }
      }}
    >
      {children}
    </dialog>
  );
}
