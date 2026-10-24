import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { v2 as cloudinary } from "cloudinary";
import { photoBelongsToMemory } from "@/features/memories/utils/memoryPhotos";
import { photoAuthFailure } from "@/server/photoAuthErrors";

export class PhotoRouteError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function adminApp() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new PhotoRouteError("Photo service is not configured.", 503);
  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new PhotoRouteError("Photo service Firebase project does not match this app.", 503);
  }
  const existing = getApps().find((app) => app.name === "friendvault-photos");
  if (existing) return existing;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (Boolean(clientEmail) !== Boolean(privateKey)) {
    throw new PhotoRouteError("Firebase Admin credentials are incomplete. Set both the client email and private key.", 503);
  }
  const credential = clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") })
    : applicationDefault();
  return initializeApp({ credential, projectId }, "friendvault-photos");
}

export function cloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new PhotoRouteError("Cloudinary photo uploads are not configured.", 503);
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudinary;
}

export function validPhotoIds(groupId: string, memoryId: string): boolean {
  return [groupId, memoryId].every((value) => /^[A-Za-z0-9_-]{1,128}$/.test(value));
}

export async function memoryPhotoAccess(request: Request, groupId: string, memoryId: string) {
  if (!validPhotoIds(groupId, memoryId)) throw new PhotoRouteError("Invalid memory path.", 400);
  const { uid, database } = await verifiedPhotoUser(request);
  const groupRef = database.doc(`groups/${groupId}`);
  const group = await groupRef.get();
  if (!group.exists) throw new PhotoRouteError("Vault not found.", 404);
  const isOwner = group.get("createdBy") === uid;
  if (!isOwner) {
    const membership = await groupRef.collection("members").doc(uid).get();
    if (!membership.exists) throw new PhotoRouteError("You cannot access this vault's photos.", 403);
  }
  const memory = await groupRef.collection("memories").doc(memoryId).get();
  return { uid, isOwner, memory };
}

export async function verifiedPhotoUser(request: Request) {
  const match = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new PhotoRouteError("Sign in to access memory photos.", 401);
  let app: ReturnType<typeof adminApp>;
  try {
    app = adminApp();
    if (!app.options.credential) throw new Error("Firebase Admin credential is missing.");
    await app.options.credential.getAccessToken();
  } catch (error) {
    if (error instanceof PhotoRouteError) throw error;
    const failure = photoAuthFailure(error);
    console.error("[FriendVault] Photo auth setup failed", { stage: "admin-credentials", reason: failure.reason });
    throw new PhotoRouteError("Photo authentication is not configured on the server. Set up Firebase Admin credentials and retry.", 503);
  }
  let uid: string;
  try { uid = (await getAuth(app).verifyIdToken(match[1], true)).uid; }
  catch (error) {
    const failure = photoAuthFailure(error);
    console.error("[FriendVault] Photo token verification failed", { stage: "verify-id-token", reason: failure.reason });
    throw new PhotoRouteError(failure.message, failure.status);
  }
  return { uid, database: getFirestore(app) };
}

export function canEditMemory(access: Awaited<ReturnType<typeof memoryPhotoAccess>>): boolean {
  return !access.memory.exists || access.isOwner || access.memory.get("uploadedBy") === access.uid;
}

export function photoIsInMemory(access: Awaited<ReturnType<typeof memoryPhotoAccess>>, publicId: string, groupId: string, memoryId: string): boolean {
  return access.memory.exists && photoBelongsToMemory(publicId, groupId, memoryId)
    && Array.isArray(access.memory.get("photos"))
    && access.memory.get("photos").some((photo: unknown) =>
      typeof photo === "object" && photo !== null && "publicId" in photo && photo.publicId === publicId);
}

export function photoRouteResponse(error: unknown): Response {
  if (error instanceof PhotoRouteError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  console.error("[FriendVault] Photo request failed", error);
  return Response.json({ error: "Photo service failed. Try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}
