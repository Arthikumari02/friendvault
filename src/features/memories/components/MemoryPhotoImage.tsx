"use client";

import Image from "next/image";

import { useMemoryPhoto } from "@/features/memories/hooks/useMemoryPhoto";
import type { MemoryPhoto } from "@/features/memories/utils/memoryPhotos";

interface MemoryPhotoImageProps {
  groupId: string;
  memoryId: string;
  photo: MemoryPhoto;
  alt: string;
  sizes: string;
  className?: string;
  retryable?: boolean;
}

export function MemoryPhotoImage({ groupId, memoryId, photo, alt, sizes, className = "object-cover", retryable = true }: MemoryPhotoImageProps) {
  const { url, error, retry, markBroken } = useMemoryPhoto(groupId, memoryId, photo);

  if (error) return <div className="absolute inset-0 grid place-items-center bg-amber-50 p-4 text-center text-sm text-amber-900" role="alert"><div><p>{error}</p>{retryable ? <button className="mt-2 underline" onClick={retry} type="button">Retry photo</button> : null}</div></div>;
  if (!url) return <div className="absolute inset-0 grid place-items-center bg-indigo-50 text-sm text-slate-600" role="status">Loading photo...</div>;
  return <Image src={url} alt={alt} fill unoptimized sizes={sizes} className={className} onError={markBroken} />;
}
