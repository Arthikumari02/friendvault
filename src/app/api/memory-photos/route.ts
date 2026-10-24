import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

import { canEditMemory, cloudinaryClient, memoryPhotoAccess, photoIsInMemory, PhotoRouteError, photoRouteResponse } from "@/server/memoryPhotos";
import { MAX_MEMORY_PHOTO_BYTES, parseMemoryPhotos, validatePhotoFile, type MemoryPhoto } from "@/features/memories/utils/memoryPhotos";

export const runtime = "nodejs";

function photoParams(request: Request) {
  const url = new URL(request.url);
  return { groupId: url.searchParams.get("groupId") ?? "", memoryId: url.searchParams.get("memoryId") ?? "", publicId: url.searchParams.get("publicId") ?? "" };
}

function hasImageSignature(bytes: Buffer, type: string): boolean {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (type === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/gif") return bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a";
  if (type === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > MAX_MEMORY_PHOTO_BYTES + 1024 * 1024) throw new PhotoRouteError("Image must be 10 MB or smaller.", 413);
    const { groupId, memoryId } = photoParams(request);
    const access = await memoryPhotoAccess(request, groupId, memoryId);
    if (!canEditMemory(access)) throw new PhotoRouteError("Only the author or vault owner can add photos.", 403);
    const form = await request.formData();
    const file = form.get("file");
    if (form.get("groupId") !== groupId || form.get("memoryId") !== memoryId || !(file instanceof File)) throw new PhotoRouteError("Choose a memory and an image.", 400);
    const validation = validatePhotoFile(file);
    if (validation) throw new PhotoRouteError(validation, 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasImageSignature(bytes, file.type)) throw new PhotoRouteError("The selected file is not a supported image.", 400);
    const assetOwnerId = access.memory.exists ? access.memory.get("uploadedBy") : access.uid;
    const publicId = `friendvault/groups/${groupId}/memories/${memoryId}/${assetOwnerId}/${crypto.randomUUID()}`;
    cloudinaryClient();
    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ public_id: publicId, resource_type: "image", type: "authenticated", overwrite: false }, (error, result) => {
        if (error || !result) reject(error || new Error("No upload response."));
        else resolve(result);
      });
      stream.end(bytes);
    });
    const photo: MemoryPhoto = { publicId: uploaded.public_id, url: uploaded.secure_url, format: uploaded.format };
    return Response.json({ photo }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return photoRouteResponse(error); }
}

export async function GET(request: Request) {
  try {
    const { groupId, memoryId, publicId } = photoParams(request);
    const access = await memoryPhotoAccess(request, groupId, memoryId);
    if (!access.memory.exists) throw new PhotoRouteError("Photo not found.", 404);
    const photo = parseMemoryPhotos(access.memory.get("photos"), groupId, memoryId).find((item) => item.publicId === publicId);
    if (!photo) throw new PhotoRouteError("Photo not found.", 404);
    const client = cloudinaryClient();
    const signedUrl = client.utils.private_download_url(publicId, photo.format, { resource_type: "image", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 60 });
    const upstream = await fetch(signedUrl, { cache: "no-store" });
    if (!upstream.ok) throw new PhotoRouteError("Photo could not be loaded. Try again.", 502);
    return new Response(upstream.body, { headers: { "Content-Type": upstream.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return photoRouteResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const { groupId, memoryId, publicId } = photoParams(request);
    const access = await memoryPhotoAccess(request, groupId, memoryId);
    if (!canEditMemory(access)) throw new PhotoRouteError("Only the author or vault owner can remove photos.", 403);
    if (!publicId.startsWith(`friendvault/groups/${groupId}/memories/${memoryId}/`) ||
      !/^[A-Za-z0-9_-]+\/[a-f0-9-]{36}$/.test(publicId.split(`/memories/${memoryId}/`)[1] ?? "")) throw new PhotoRouteError("Invalid photo.", 400);
    if (photoIsInMemory(access, publicId, groupId, memoryId)) throw new PhotoRouteError("Save the memory before removing its photo.", 409);
    if (!access.isOwner && !publicId.startsWith(`friendvault/groups/${groupId}/memories/${memoryId}/${access.uid}/`)) throw new PhotoRouteError("You cannot remove this photo.", 403);
    const client = cloudinaryClient();
    const result = await client.uploader.destroy(publicId, { resource_type: "image", type: "authenticated", invalidate: true });
    if (result.result !== "ok" && result.result !== "not found") throw new PhotoRouteError("Photo could not be removed. Try again.", 502);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return photoRouteResponse(error); }
}
