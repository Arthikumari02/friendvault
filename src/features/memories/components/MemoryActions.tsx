"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { deleteMemory } from "@/features/memories/apis/memories";
import { getGroupErrorMessage } from "@/features/groups/apis/userGroups";

export function MemoryActions({ groupId, memoryId, onDeleted }: { groupId: string; memoryId: string; onDeleted?: (cleanupFailed: boolean) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function remove() {
    setBusy(true); setError("");
    try {
      const result = await deleteMemory(groupId, memoryId);
      setConfirming(false); setOpen(false);
      if (result.cleanupFailed) setNotice("Memory deleted, but a photo could not be removed from its host.");
      else setNotice("Memory deleted.");
      if (onDeleted) onDeleted(result.cleanupFailed);
      else router.push(`/groups/${groupId}?deleted=1${result.cleanupFailed ? "&cleanup=1" : ""}`);
    } catch (cause) { setError(getGroupErrorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <div className="relative z-10">
    <Button aria-expanded={open} aria-label="Memory actions" onClick={() => setOpen((value) => !value)} type="button" variant="secondary">···</Button>
    {open ? <div className="absolute right-0 z-20 mt-2 w-40 rounded-2xl border border-indigo-100 bg-white p-2 shadow-xl">
      <Button className="w-full justify-start" href={`/groups/${groupId}/memories/${memoryId}/edit`} variant="ghost">Edit Memory</Button>
      <button className="w-full rounded-xl px-4 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50" onClick={() => { setConfirming(true); setOpen(false); }} type="button">Delete Memory</button>
    </div> : null}
    {notice ? <p role="status" className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">{notice}</p> : null}
    <Modal open={confirming} title="Delete Memory" onClose={() => !busy && setConfirming(false)}>
      <p className="text-sm leading-6 text-slate-700">Permanently delete this memory and its attached photos?</p>
      {error ? <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p> : null}
      <div className="mt-5 flex gap-3"><Button disabled={busy} onClick={() => setConfirming(false)} variant="secondary">Cancel</Button><Button disabled={busy} onClick={() => void remove()}>{busy ? "Deleting..." : "Delete permanently"}</Button></div>
    </Modal>
  </div>;
}
