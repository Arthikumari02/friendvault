import { FirebaseError } from "firebase/app";

export type GroupListStage = "list-owned-groups" | "list-joined-memberships" | "read-joined-group" | "list-group-members" | "list-group-memories";

export class GroupListStepError extends Error {
  readonly stage: GroupListStage;
  readonly cause: unknown;

  constructor(stage: GroupListStage, cause: unknown) {
    super("Could not load My Vaults.");
    this.stage = stage;
    this.cause = cause;
  }
}

export function groupListErrorCode(error: unknown): string | null {
  const cause = error instanceof GroupListStepError ? error.cause : error;
  return cause instanceof FirebaseError ? cause.code : null;
}

export async function groupListStep<T>(stage: GroupListStage, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (cause) {
    console.info("[FriendVault] My Vaults load", { stage, errorCode: groupListErrorCode(cause) ?? "unknown" });
    throw new GroupListStepError(stage, cause);
  }
}

export function groupListErrorMessage(error: unknown): string | null {
  if (!(error instanceof GroupListStepError)) return null;
  const code = groupListErrorCode(error);
  const needsIndex = error.cause instanceof FirebaseError && /index/i.test(error.cause.message);
  if (code === "failed-precondition" && needsIndex && error.stage === "list-joined-memberships") {
    return "Joined vaults need the members.userId collection-group index. Create it in Firebase Console → Firestore Database → Indexes, then retry.";
  }
  if (code === "failed-precondition" && needsIndex) {
    return "A Firestore query needs an index. Check Firebase Console → Firestore Database → Indexes, then retry.";
  }
  if (code === "failed-precondition") return `Firestore rejected the ${error.stage.replaceAll("-", " ")} query (failed precondition). Check the database and query configuration.`;
  if (code === "permission-denied") {
    return `Firestore denied the ${error.stage.replaceAll("-", " ")} request. Check the published owner and member rules.`;
  }
  if (code === "unavailable") {
    return `Could not reach Firestore during ${error.stage.replaceAll("-", " ")}. Check your connection and retry.`;
  }
  return null;
}

export function isJoinedMembershipIndexError(error: unknown): boolean {
  return error instanceof GroupListStepError && error.stage === "list-joined-memberships"
    && groupListErrorCode(error) === "failed-precondition"
    && error.cause instanceof FirebaseError && /index/i.test(error.cause.message);
}
