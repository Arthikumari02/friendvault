"use client";

import { useId, useState } from "react";

export function ImageUploader({ label = "Cover Image", onFileChange, onFilesChange, multiple = false, disabled = false }: { label?: string; onFileChange?: (file: File | null) => void; onFilesChange?: (files: FileList | null) => void; multiple?: boolean; disabled?: boolean }) {
  const id = useId();
  const [fileName, setFileName] = useState("");
  return <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
    {label}
    <span className="mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/60 px-4 py-6 text-center transition hover:bg-indigo-50">
      <span className="text-sm font-semibold text-indigo-700">{fileName || (multiple ? "Choose photos or add more" : "Choose an image")}</span>
      <span className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP, or GIF · up to 10 MB</span>
    </span>
    <input accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" id={id} multiple={multiple} disabled={disabled} onChange={(event) => { const files = event.target.files; const file = files?.[0] ?? null; setFileName(multiple && files?.length ? `${files.length} photo${files.length === 1 ? "" : "s"} selected` : file?.name ?? ""); onFileChange?.(file); onFilesChange?.(files); event.target.value = ""; }} type="file" />
  </label>;
}
