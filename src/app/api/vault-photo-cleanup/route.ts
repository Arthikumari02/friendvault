import { PhotoRouteError, cloudinaryClient, photoRouteResponse, verifiedPhotoUser } from "@/server/memoryPhotos";
import { photoBelongsToMemory } from "@/features/memories/utils/memoryPhotos";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { uid, database } = await verifiedPhotoUser(request);
    const body = await request.json() as { groupId?: unknown };
    const groupId = body.groupId;
    if (typeof groupId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(groupId)) throw new PhotoRouteError("Invalid vault.", 400);
    const job = await database.doc(`vaultDeletionJobs/${groupId}`).get();
    if (!job.exists || job.get("ownerId") !== uid) throw new PhotoRouteError("Photo cleanup is unavailable for this vault.", 403);
    const ids: unknown = job.get("cloudinaryPublicIds") ?? [];
    if (!Array.isArray(ids) || ids.length > 4800 || !ids.every((id) => {
      if (typeof id !== "string") return false;
      const prefix = `friendvault/groups/${groupId}/memories/`;
      if (!id.startsWith(prefix)) return false;
      const memoryId = id.slice(prefix.length).split("/")[0];
      return photoBelongsToMemory(id, groupId, memoryId);
    })) throw new PhotoRouteError("Photo cleanup job has invalid asset IDs.", 400);
    if (!ids.length) return Response.json({ failures: 0 }, { headers: { "Cache-Control": "no-store" } });
    const client = cloudinaryClient();
    let failures = 0;
    for (const publicId of ids) {
      try {
        const result = await client.uploader.destroy(publicId, { resource_type: "image", type: "authenticated", invalidate: true });
        if (result.result !== "ok" && result.result !== "not found") failures++;
      } catch { failures++; }
    }
    return Response.json({ failures }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return photoRouteResponse(error); }
}
