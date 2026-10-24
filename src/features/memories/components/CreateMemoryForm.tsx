"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ImageUploader } from "@/components/ImageUploader";
import { MemoryPhotoImage } from "@/features/memories/components/MemoryPhotoImage";
import { Input } from "@/components/Input";
import { createMemory, updateMemory } from "@/features/memories/apis/memories";
import { deleteMemoryPhoto, uploadMemoryPhoto } from "@/features/memories/apis/cloudinaryPhotos";
import { MAX_MEMORY_PHOTOS, validatePhotoFile, type MemoryPhoto } from "@/features/memories/utils/memoryPhotos";
import type { MemoryWithUser } from "@/types";
import { getFeatureErrorMessage } from "@/utils/featureError";
import { validateMemoryFields, type MemoryFieldErrors } from "@/features/memories/utils/validateMemory";

type SelectedPhoto = { id: string; file: File; preview: string; status: "pending" | "uploading" | "uploaded" | "failed"; progress: number; photo?: MemoryPhoto; error?: string };

export function CreateMemoryForm({ groupId, displayName, memory }: { groupId: string; displayName: string; memory?: MemoryWithUser }) {
  const router = useRouter();
  const memoryId = useRef(memory?.id ?? crypto.randomUUID());
  const previewUrls = useRef<Set<string>>(new Set());
  const [title, setTitle] = useState(memory?.title ?? "");
  const [description, setDescription] = useState(memory?.description ?? "");
  const [date, setDate] = useState(memory?.memoryDate ?? "");
  const [location, setLocation] = useState(memory?.location ?? "");
  const [existingPhotos, setExistingPhotos] = useState<MemoryPhoto[]>(memory?.photos ?? []);
  const [selected, setSelected] = useState<SelectedPhoto[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<MemoryFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [canSaveWithoutFailed, setCanSaveWithoutFailed] = useState(false);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => { urls.forEach(URL.revokeObjectURL); };
  }, []);

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const additions = Array.from(files);
    if (existingPhotos.length + selected.length + additions.length > MAX_MEMORY_PHOTOS) {
      setFieldErrors((current) => ({ ...current, image: `Choose no more than ${MAX_MEMORY_PHOTOS} photos per memory.` }));
      return;
    }
    for (const file of additions) {
      const message = validatePhotoFile(file);
      if (message) { setFieldErrors((current) => ({ ...current, image: `${file.name}: ${message}` })); return; }
    }
    setSelected((current) => [...current, ...additions.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { id: crypto.randomUUID(), file, preview, status: "pending" as const, progress: 0 };
    })]);
    setFieldErrors((current) => ({ ...current, image: undefined }));
    setCanSaveWithoutFailed(false);
  }

  async function removeSelected(item: SelectedPhoto) {
    setSelected((current) => current.filter((entry) => entry.id !== item.id));
    previewUrls.current.delete(item.preview);
    URL.revokeObjectURL(item.preview);
    setCanSaveWithoutFailed(false);
    if (item.photo) {
      try { await deleteMemoryPhoto(groupId, memoryId.current, item.photo); }
      catch { setError("The removed upload could not be cleaned up in Cloudinary. The memory will not include it."); }
    }
  }

  async function save(withoutFailed = false) {
    const validation = validateMemoryFields({ title, description, memoryDate: date, location, image: null });
    setFieldErrors(validation);
    if (Object.keys(validation).length) return;
    if (selected.some((item) => item.status === "failed") && !withoutFailed) {
      setError("Retry failed photos, remove them, or choose Save without failed photos.");
      setCanSaveWithoutFailed(true);
      return;
    }
    setSaving(true); setError("");
    const uploaded: MemoryPhoto[] = [];
    let failed = false;
    for (const item of selected) {
      if (item.photo) { uploaded.push(item.photo); continue; }
      if (item.status === "failed" && withoutFailed) continue;
      setSelected((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "uploading", progress: 0, error: undefined } : entry));
      try {
        const photo = await uploadMemoryPhoto(groupId, memoryId.current, item.file, (progress) => {
          setSelected((current) => current.map((entry) => entry.id === item.id ? { ...entry, progress } : entry));
        });
        uploaded.push(photo);
        setSelected((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "uploaded", progress: 100, photo } : entry));
      } catch (cause) {
        failed = true;
        setSelected((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "failed", error: cause instanceof Error ? cause.message : "Upload failed." } : entry));
      }
    }
    if (failed) {
      setError("Some photos failed to upload. Retry them, or save without the failed photos.");
      setCanSaveWithoutFailed(true);
      setSaving(false);
      return;
    }
    try {
      const photos = [...existingPhotos, ...uploaded];
      if (memory) {
        const result = await updateMemory(groupId, memory.id, { title, description, memoryDate: date, location, photos, displayName });
        router.push(`/groups/${groupId}/memories/${memory.id}?updated=1${result.cleanupFailed ? "&cleanup=1" : ""}`);
      } else {
        await createMemory(groupId, { title, description, memoryDate: date, location, photos, displayName }, memoryId.current);
        router.push(`/groups/${groupId}/memories/${memoryId.current}?created=1`);
      }
    } catch (cause) { setError(getFeatureErrorMessage(cause, "memories")); }
    finally { setSaving(false); }
  }

  return <form className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-100" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <Input label="Title" error={fieldErrors.title} maxLength={150} onChange={(event) => { setTitle(event.target.value); setFieldErrors((current) => ({ ...current, title: undefined })); }} placeholder="Sunrise before the drive home" value={title} required />
    <Input label="Description" error={fieldErrors.description} maxLength={5000} multiline onChange={(event) => { setDescription(event.target.value); setFieldErrors((current) => ({ ...current, description: undefined })); }} placeholder="Tell the story behind this moment." value={description} required />
    <Input label="Date" error={fieldErrors.memoryDate} onChange={(event) => { setDate(event.target.value); setFieldErrors((current) => ({ ...current, memoryDate: undefined })); }} type="date" value={date} max={new Date().toISOString().slice(0, 10)} required />
    <div>
      <ImageUploader label="Photos (optional)" multiple disabled={saving} onFilesChange={addPhotos} />
      <p className="mt-2 text-xs text-slate-600">Add up to {MAX_MEMORY_PHOTOS} JPEG, PNG, WebP, or GIF photos, 10 MB each. You can choose more than once.</p>
      {fieldErrors.image ? <p role="alert" className="mt-2 text-xs text-rose-700">{fieldErrors.image}</p> : null}
      {memory?.imagePath ? <p className="mt-2 text-xs text-slate-600">The older attached photo remains with this memory.</p> : null}
      {existingPhotos.length || selected.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {existingPhotos.map((photo) => <div className="relative" key={photo.publicId}><div className="relative aspect-square overflow-hidden rounded-xl bg-indigo-50"><MemoryPhotoImage groupId={groupId} memoryId={memoryId.current} photo={photo} alt="Saved memory photo" sizes="(min-width: 640px) 33vw, 50vw" /></div><button className="mt-1 text-xs text-rose-700 underline" type="button" disabled={saving} onClick={() => setExistingPhotos((current) => current.filter((item) => item.publicId !== photo.publicId))}>Remove photo</button></div>)}
        {selected.map((item) => <div className="relative" key={item.id}><div className="relative aspect-square overflow-hidden rounded-xl bg-indigo-50"><Image src={item.preview} alt={`Selected ${item.file.name}`} fill unoptimized sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" /></div><p className="mt-1 truncate text-xs text-slate-600" title={item.file.name}>{item.file.name}</p><p className="text-xs text-slate-600" role="status">{item.status === "uploading" ? item.progress === 100 ? "Processing photo..." : `Uploading ${item.progress}%` : item.status === "uploaded" ? "Uploaded" : item.status === "failed" ? item.error : "Ready to upload"}</p><button className="text-xs text-rose-700 underline" type="button" disabled={saving} onClick={() => void removeSelected(item)}>Remove</button>{item.status === "failed" ? <button className="ml-3 text-xs text-indigo-700 underline" type="button" disabled={saving} onClick={() => { setSelected((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "pending", error: undefined } : entry)); setCanSaveWithoutFailed(false); setError(""); }}>Retry</button> : null}</div>)}
      </div> : null}
    </div>
    <Input label="Location" error={fieldErrors.location} maxLength={150} onChange={(event) => { setLocation(event.target.value); setFieldErrors((current) => ({ ...current, location: undefined })); }} placeholder="Optional" value={location} />
    {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
    {canSaveWithoutFailed ? <button className="text-sm text-amber-800 underline" type="button" disabled={saving} onClick={() => void save(true)}>Save without failed photos</button> : null}
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button href={`/groups/${groupId}`} variant="secondary">Cancel</Button><Button disabled={saving} type="submit">{saving ? "Saving..." : memory ? "Save changes" : "Save Memory"}</Button></div>
  </form>;
}
