import { auth } from "@/firebase/config";
import type { MemoryPhoto } from "@/features/memories/utils/memoryPhotos";

function photoEndpoint(groupId: string, memoryId: string, publicId?: string) {
  const query = new URLSearchParams({ groupId, memoryId });
  if (publicId) query.set("publicId", publicId);
  return `/api/memory-photos?${query}`;
}

async function idToken(forceRefresh = false): Promise<string> {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in to use memory photos.");
  const token = await user.getIdToken(forceRefresh);
  if (auth?.currentUser?.uid !== user.uid) throw new Error("Your signed-in account changed. Retry the photo upload.");
  return token;
}

export async function uploadMemoryPhoto(groupId: string, memoryId: string, file: File, onProgress: (percent: number) => void): Promise<MemoryPhoto> {
  const token = await idToken(true);
  const form = new FormData();
  form.set("groupId", groupId);
  form.set("memoryId", memoryId);
  form.set("file", file);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", photoEndpoint(groupId, memoryId));
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => {
      let result: { photo?: MemoryPhoto; error?: string } = {};
      try { result = JSON.parse(request.responseText); } catch { /* Treat an invalid response as a failed upload. */ }
      if (request.status >= 200 && request.status < 300 && result.photo) resolve(result.photo);
      else reject(new Error(result.error || "Photo upload failed. Try again."));
    };
    request.onerror = () => reject(new Error("Photo upload could not connect. Try again."));
    request.send(form);
  });
}

export async function loadMemoryPhoto(groupId: string, memoryId: string, photo: MemoryPhoto): Promise<string> {
  const response = await fetch(photoEndpoint(groupId, memoryId, photo.publicId), {
    headers: { Authorization: `Bearer ${await idToken()}` }, cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "Photo could not be loaded.");
  }
  return URL.createObjectURL(await response.blob());
}

export async function deleteMemoryPhoto(groupId: string, memoryId: string, photo: MemoryPhoto): Promise<void> {
  const response = await fetch(photoEndpoint(groupId, memoryId, photo.publicId), {
    method: "DELETE", headers: { Authorization: `Bearer ${await idToken()}` }, cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "Photo could not be removed.");
  }
}

export async function cleanupCloudinaryVaultPhotos(groupId: string): Promise<number> {
  const response = await fetch("/api/vault-photo-cleanup", {
    method: "POST", headers: { Authorization: `Bearer ${await idToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ groupId }), cache: "no-store",
  });
  if (!response.ok) throw new Error("Cloudinary photo cleanup could not run.");
  const result = await response.json() as { failures?: number };
  return typeof result.failures === "number" ? result.failures : 1;
}
