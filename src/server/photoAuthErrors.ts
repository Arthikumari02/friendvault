type AuthError = { code?: unknown; message?: unknown; name?: unknown };

export function photoAuthFailure(error: unknown): { status: number; message: string; reason: string } {
  const failure = error && typeof error === "object" ? error as AuthError : {};
  const code = typeof failure.code === "string" ? failure.code : "";
  const message = typeof failure.message === "string" ? failure.message : "";

  if (code === "auth/id-token-expired") return { status: 401, message: "Your sign-in token expired. Refresh your sign-in and retry.", reason: code };
  if (code === "auth/id-token-revoked") return { status: 401, message: "Your sign-in was revoked. Sign in again and retry.", reason: code };
  if (code === "auth/user-disabled") return { status: 403, message: "This account is disabled.", reason: code };
  if (code === "auth/user-not-found") return { status: 401, message: "This account is no longer available. Sign in again.", reason: code };
  if (code === "auth/invalid-id-token" || code === "auth/argument-error" || code === "auth/invalid-argument") {
    return { status: 401, message: "Invalid sign-in token. Sign in again and retry.", reason: code };
  }
  if (code === "auth/insufficient-permission" || code === "auth/invalid-credential" || code === "auth/project-not-found"
    || code.startsWith("app/") || /default credentials|credential|service account/i.test(message)) {
    return { status: 503, message: "Photo authentication is not configured on the server. Set up Firebase Admin credentials and retry.", reason: code || "admin-credentials-unavailable" };
  }
  return { status: 503, message: "Photo authentication is temporarily unavailable. Try again shortly.", reason: code || "verification-unavailable" };
}
