export type MemoryPhoto = { publicId: string; url: string; format: string };

export const MAX_MEMORY_PHOTOS = 12;
export const MAX_MEMORY_PHOTO_BYTES = 10 * 1024 * 1024;
export const MEMORY_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export function validatePhotoFile(file: Pick<File, "type" | "size">): string {
  if (!MEMORY_PHOTO_TYPES.includes(file.type as (typeof MEMORY_PHOTO_TYPES)[number])) return "Choose a JPEG, PNG, WebP, or GIF image.";
  if (file.size === 0) return "Choose a non-empty image.";
  if (file.size > MAX_MEMORY_PHOTO_BYTES) return "Each image must be 10 MB or smaller.";
  return "";
}

export function photoBelongsToMemory(publicId: string, groupId: string, memoryId: string): boolean {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^friendvault/groups/${escape(groupId)}/memories/${escape(memoryId)}/[A-Za-z0-9_-]+/[a-f0-9-]{36}$`).test(publicId);
}

export function parseMemoryPhotos(value: unknown, groupId: string, memoryId: string): MemoryPhoto[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_MEMORY_PHOTOS).filter((item): item is MemoryPhoto =>
    item !== null && typeof item === "object"
    && typeof item.publicId === "string" && photoBelongsToMemory(item.publicId, groupId, memoryId)
    && typeof item.url === "string" && item.url.startsWith("https://res.cloudinary.com/")
    && typeof item.format === "string" && /^(jpg|jpeg|png|webp|gif)$/.test(item.format),
  );
}
