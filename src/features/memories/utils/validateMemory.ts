import { validatePhotoFile } from "./memoryPhotos.ts";

type MemoryFields = { title: string; description: string; memoryDate: string; location: string; image: File | null };
export type MemoryFieldErrors = Partial<Record<keyof MemoryFields, string>>;

export function validateMemoryFields(input: MemoryFields): MemoryFieldErrors {
  const errors: MemoryFieldErrors = {};
  if (!input.title.trim()) errors.title = "Title is required.";
  else if ([...input.title.trim()].length > 150) errors.title = "Title must be 150 characters or fewer.";
  if (!input.description.trim()) errors.description = "Description is required.";
  else if ([...input.description.trim()].length > 5000) errors.description = "Description must be 5,000 characters or fewer.";
  const parsed = Date.parse(input.memoryDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.memoryDate) || Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== input.memoryDate || input.memoryDate > new Date().toISOString().slice(0, 10)) errors.memoryDate = "Choose a valid date that is not in the future.";
  if ([...input.location.trim()].length > 150) errors.location = "Location must be 150 characters or fewer.";
  if (input.image) errors.image = validatePhotoFile(input.image) || undefined;
  return errors;
}

export function validateMemory(input: MemoryFields): string {
  const errors = validateMemoryFields(input);
  return errors.title || errors.description || errors.memoryDate || errors.location || errors.image || "";
}
