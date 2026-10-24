import { FirebaseError } from "firebase/app";
import { getGroupErrorMessage } from "@/features/groups/apis/userGroups";

export function getFeatureErrorMessage(error: unknown, feature: "memories" | "invitations"): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    const path = feature === "memories" ? "groups/{groupId}/memories/{memoryId}" : "groups/{groupId}/invitations/{inviteeId}";
    return `Firestore denied access to ${feature}. Confirm this account owns the group or has the required membership, then review and publish the local firestore.rules for ${path} in the Firebase Console. The rules in this project have not been published by this app.`;
  }
  if (error instanceof FirebaseError && error.code === "storage/unauthorized") {
    return "Firebase Storage denied the photo upload. Review and publish storage.rules for group memory images in the Firebase Console, then retry.";
  }
  return getGroupErrorMessage(error);
}
