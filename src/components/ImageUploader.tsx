"use client";

import { useId, useState } from "react";

export function ImageUploader({ label = "Cover Image" }: { label?: string }) {
  const id = useId();
  const [fileName, setFileName] = useState("");

  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      <span className="mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/60 px-4 py-6 text-center transition hover:bg-indigo-50">
        <span className="text-sm font-semibold text-indigo-700">
          {fileName || "Choose an image"}
        </span>
        <span className="mt-1 text-xs text-slate-500">
          Firebase Storage upload hook is ready for integration.
        </span>
      </span>
      <input
        accept="image/*"
        className="sr-only"
        id={id}
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        type="file"
      />
    </label>
  );
}
