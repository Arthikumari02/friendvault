"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

import { MemoryPhotoImage } from "@/features/memories/components/MemoryPhotoImage";
import type { MemoryWithUser } from "@/types";

interface LegacyPhotoProps {
  src: string;
  alt: string;
  sizes: string;
  className: string;
}

interface MemoryPhotoGalleryProps {
  memory: MemoryWithUser;
  sizes: string;
}

function LegacyPhoto({ src, alt, sizes, className }: LegacyPhotoProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  if (status === "error") return <div className="absolute inset-0 grid place-items-center bg-amber-50 p-4 text-center text-sm text-amber-900" role="alert">Photo could not be displayed.</div>;
  return <>
    {status === "loading" ? <div className="absolute inset-0 z-10 grid place-items-center bg-indigo-50 text-sm text-slate-600" role="status">Loading photo...</div> : null}
    <Image src={src} alt={alt} fill unoptimized sizes={sizes} className={className} onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
  </>;
}

export function MemoryPhotoGallery({ memory, sizes }: MemoryPhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const photos = memory.photos ?? [];
  const count = photos.length + (memory.imageUrl ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key === "Tab") {
        const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
        if (!buttons.length) return;
        const current = buttons.findIndex((button) => button === document.activeElement);
        const next = current < 0 ? (event.shiftKey ? buttons.length - 1 : 0) : event.shiftKey ? (current - 1 + buttons.length) % buttons.length : (current + 1) % buttons.length;
        buttons[next].focus();
        event.preventDefault();
      }
      if (count > 1 && event.key === "ArrowRight") { setIndex((current) => (current + 1) % count); event.preventDefault(); }
      if (count > 1 && event.key === "ArrowLeft") { setIndex((current) => (current - 1 + count) % count); event.preventDefault(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open, count]);

  if (!count) return null;

  const currentPhoto = photos[index];
  const photoAlt = `${memory.title} photo ${index + 1}`;
  return <>
    <button ref={triggerRef} type="button" className="absolute inset-0 block w-full overflow-hidden text-left focus-visible:outline-4 focus-visible:outline-indigo-600" aria-label={`Open photos for ${memory.title}, ${count} ${count === 1 ? "photo" : "photos"}`} onClick={() => { setIndex(0); setOpen(true); }}>
      {photos[0] ? <MemoryPhotoImage groupId={memory.groupId} memoryId={memory.id} photo={photos[0]} alt={`${memory.title} photo 1`} sizes={sizes} retryable={false} /> : memory.imageUrl ? <LegacyPhoto key={memory.imageUrl} src={memory.imageUrl} alt={`${memory.title} photo 1`} sizes={sizes} className="object-cover" /> : null}
      {count > 1 ? <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-3 py-1 text-sm font-semibold text-white shadow-md" aria-hidden="true">+{count - 1}</span> : null}
    </button>
    {open ? createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 sm:p-6" onClick={() => setOpen(false)}>
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${memory.title} photo gallery`} className="flex max-h-full w-full max-w-5xl flex-col gap-3 text-white" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0 truncate text-sm font-medium sm:text-base">{memory.title} · {index + 1} of {count}</p>
            <button ref={closeRef} type="button" className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white" aria-label="Close photo gallery" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="relative h-[65vh] min-h-48 w-full overflow-hidden rounded-xl bg-slate-900 sm:h-[75vh]" onClick={(event) => event.stopPropagation()}>
            {currentPhoto ? <MemoryPhotoImage key={currentPhoto.publicId} groupId={memory.groupId} memoryId={memory.id} photo={currentPhoto} alt={photoAlt} sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain" /> : memory.imageUrl ? <LegacyPhoto key={memory.imageUrl} src={memory.imageUrl} alt={photoAlt} sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain" /> : null}
          </div>
          {count > 1 ? <div className="flex items-center justify-between gap-4">
            <button type="button" className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white" aria-label="Previous photo" onClick={() => setIndex((current) => (current - 1 + count) % count)}>← Previous</button>
            <span className="text-sm" aria-live="polite">{index + 1} of {count}</span>
            <button type="button" className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white" aria-label="Next photo" onClick={() => setIndex((current) => (current + 1) % count)}>Next →</button>
          </div> : null}
        </section>
      </div>, document.body
    ) : null}
  </>;
}
