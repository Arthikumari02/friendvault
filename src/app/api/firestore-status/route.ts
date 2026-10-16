type FirestoreStatus = {
  state: "ready" | "missing" | "disabled" | "unknown";
  message?: string;
  setupUrl?: string;
};

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || !/^[a-z0-9-]+$/.test(projectId)) {
    return Response.json({ state: "unknown" } satisfies FirestoreStatus);
  }

  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/groups?pageSize=1`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (response.ok) {
      return Response.json({ state: "ready" } satisfies FirestoreStatus);
    }

    const body = await response.json() as { error?: { message?: string; details?: { reason?: string }[] } };
    if (response.status === 404 && body.error?.message?.includes("database (default) does not exist")) {
      return Response.json({
        state: "missing",
        message: "The default Firestore database does not exist in this Firebase project. Create it before adding a group.",
        setupUrl: `https://console.firebase.google.com/project/${projectId}/firestore`,
      } satisfies FirestoreStatus);
    }
    if (body.error?.details?.some((detail) => detail.reason === "SERVICE_DISABLED")) {
      return Response.json({
        state: "disabled",
        message: "The Cloud Firestore API is disabled for this Firebase project. Enable it before adding a group.",
        setupUrl: `https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=${projectId}`,
      } satisfies FirestoreStatus);
    }
  } catch {
    // The Firestore SDK will report connection or permission failures during the write.
  }

  return Response.json({ state: "unknown" } satisfies FirestoreStatus);
}
