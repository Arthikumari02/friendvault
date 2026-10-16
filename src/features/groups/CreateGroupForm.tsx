"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/context/AuthContext";
import { createUserGroup, getGroupErrorMessage } from "@/services/userGroups";
import { validateGroup } from "@/features/groups/validateGroup";

export function CreateGroupForm() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [setupUrl, setSetupUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const draftRef = useRef<{ id: string; createdAt: string } | null>(null);

  async function handleSubmit() {
    if (isSaving) return;
    const validation = validateGroup(name, description);
    setNameError(validation.nameError);
    setDescriptionError(validation.descriptionError);
    if (validation.nameError || validation.descriptionError) return;
    if (!user) {
      setSubmitError("Sign in before creating a group.");
      return;
    }

    setSubmitError("");
    setSetupUrl("");
    setIsSaving(true);
    draftRef.current ??= { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const draft = draftRef.current;
    let timeout: number | undefined;
    try {
      let statusResponse: Response | null = null;
      try {
        statusResponse = await fetch("/api/firestore-status", {
          cache: "no-store",
          signal: AbortSignal.timeout(6500),
        });
      } catch {
        // Continue to the Firestore write if the optional status check is unavailable.
      }
      if (statusResponse?.ok) {
        const status = await statusResponse.json() as {
          state: string;
          message?: string;
          setupUrl?: string;
        };
        if (status.state === "missing" || status.state === "disabled") {
          setSubmitError(status.message ?? "Firestore is not ready for group creation.");
          setSetupUrl(status.setupUrl ?? "");
          return;
        }
      }

      await Promise.race([
        createUserGroup(name, description, draft.id, draft.createdAt),
        new Promise<never>((_, reject) => {
          timeout = window.setTimeout(() => {
            reject(new Error("Firestore has not confirmed the group. Check your connection and Firestore setup, then try again. Your retry will use the same group ID."));
          }, 12000);
        }),
      ]);
      router.push("/dashboard");
    } catch (cause) {
      setSubmitError(getGroupErrorMessage(cause));
    } finally {
      window.clearTimeout(timeout);
      setIsSaving(false);
    }
  }

  return (
    <form
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-100"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <Input
        error={nameError}
        label="Group Name"
        onChange={(event) => {
          setName(event.target.value);
          setNameError("");
        }}
        placeholder="College Circle"
        value={name}
      />
      <Input
        error={descriptionError}
        label="Description"
        multiline
        onChange={(event) => {
          setDescription(event.target.value);
          setDescriptionError("");
        }}
        placeholder="What history will this group preserve?"
        value={description}
      />
      <p className="text-sm text-slate-500">New groups use a default cover. Cover uploads are not available yet.</p>
      {submitError ? (
        <div role="alert" className="text-sm text-rose-600">
          <p>{submitError}</p>
          {setupUrl ? <a className="mt-2 inline-block font-semibold underline" href={setupUrl} rel="noreferrer" target="_blank">Open Firebase setup</a> : null}
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button href="/dashboard" variant="secondary">
          Cancel
        </Button>
        <Button disabled={isSaving || isAuthLoading} type="submit">
          {isSaving ? "Creating..." : "Create Group"}
        </Button>
      </div>
    </form>
  );
}
