"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { createUserGroup, getGroupErrorMessage } from "@/features/groups/apis/userGroups";
import { validateGroup } from "@/features/groups/utils/validateGroup";

export function CreateGroupForm({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { user, isAuthLoading } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [setupUrl, setSetupUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const draftRef = useRef<{ id: string; createdAt: string } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

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
      dialogRef.current?.close();
      router.push(`/groups/${draft.id}`);
    } catch (cause) {
      setSubmitError(getGroupErrorMessage(cause));
    } finally {
      window.clearTimeout(timeout);
      setIsSaving(false);
    }
  }

  if (onClose) return (
    <dialog ref={dialogRef} className="join-dialog create-vault-dialog" aria-labelledby="create-vault-title" onClose={onClose} onCancel={(event) => { if (isSaving) event.preventDefault(); }} onClick={(event) => { if (!isSaving && event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="join-dialog-content">
        <button className="join-dialog-close" type="button" aria-label="Close" disabled={isSaving} onClick={() => dialogRef.current?.close()}>×</button>
        <h2 id="create-vault-title">A new vault</h2>
        <form onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
          <label htmlFor="new-vault-name">Name</label>
          <input id="new-vault-name" autoFocus maxLength={100} placeholder="The Lake House Crew" value={name} onChange={(event) => { setName(event.target.value); setNameError(""); }} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "new-vault-name-error" : undefined} />
          {nameError && <p className="join-dialog-error" id="new-vault-name-error" role="alert">{nameError}</p>}
          <label htmlFor="new-vault-description">What&apos;s this group about?</label>
          <textarea id="new-vault-description" maxLength={2000} value={description} onChange={(event) => { setDescription(event.target.value); setDescriptionError(""); }} aria-invalid={Boolean(descriptionError)} aria-describedby={descriptionError ? "new-vault-description-error" : undefined} />
          {descriptionError && <p className="join-dialog-error" id="new-vault-description-error" role="alert">{descriptionError}</p>}
          {submitError && <div className="join-dialog-error" role="alert"><p>{submitError}</p>{setupUrl && <a href={setupUrl} rel="noopener noreferrer" target="_blank">Open Firebase setup</a>}</div>}
          <button className="join-dialog-submit" type="submit" disabled={isSaving || isAuthLoading || !name.trim()}>{isSaving ? "Creating..." : "Create vault"}</button>
        </form>
      </div>
    </dialog>
  );

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
          {setupUrl ? <a className="mt-2 inline-block font-semibold underline" href={setupUrl} rel="noopener noreferrer" target="_blank">Open Firebase setup</a> : null}
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
