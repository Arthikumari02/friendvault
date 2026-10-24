"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { joinWithCode } from "@/features/groups/apis/joinCodes";
import { getGroupErrorMessage } from "@/features/groups/apis/userGroups";

type JoinVaultDialogProps = {
  displayName: string;
  onClose: () => void;
};

export function JoinVaultDialog({ displayName, onClose }: JoinVaultDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalizedCode)) {
      setError("Enter an 8-character vault code.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const groupId = await joinWithCode(normalizedCode, displayName);
      router.push(`/groups/${encodeURIComponent(groupId)}`);
    } catch (cause) {
      setError(getGroupErrorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="join-dialog"
      aria-labelledby="join-dialog-title"
      aria-describedby="join-dialog-description"
      onClose={onClose}
      onCancel={(event) => { if (busy) event.preventDefault(); }}
      onClick={(event) => { if (!busy && event.target === event.currentTarget) event.currentTarget.close(); }}
    >
      <div className="join-dialog-content">
        <button className="join-dialog-close" type="button" aria-label="Close" onClick={() => dialogRef.current?.close()} disabled={busy}>×</button>
        <h2 id="join-dialog-title">Join a friend&apos;s vault</h2>
        <p id="join-dialog-description">Enter the code your friend shared with you.</p>
        <form onSubmit={(event) => void join(event)}>
          <label htmlFor="join-dialog-code">Vault code</label>
          <input
            id="join-dialog-code"
            autoFocus
            autoComplete="off"
            placeholder="ABCD2345"
            value={code}
            onChange={(event) => { setCode(event.target.value.toUpperCase()); setError(""); }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "join-dialog-error" : undefined}
          />
          {error && <p id="join-dialog-error" className="join-dialog-error" role="alert">{error}</p>}
          <button className="join-dialog-submit" type="submit" disabled={busy || !code.trim()}>{busy ? "Joining..." : "Join vault"}</button>
        </form>
      </div>
    </dialog>
  );
}
