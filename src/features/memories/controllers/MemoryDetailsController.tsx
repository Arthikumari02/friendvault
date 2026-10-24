"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { MemoryActions } from "@/features/memories/components/MemoryActions";
import { MemoryPhotoGallery } from "@/features/memories/components/MemoryPhotoGallery";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { getUserGroup, getGroupErrorMessage } from "@/features/groups/apis/userGroups";
import { getMemoryById } from "@/features/memories/apis/memories";
import type { Group, MemoryWithUser } from "@/types";
import { formatDate } from "@/utils/date";

export default function MemoryDetailsController() {
  const { groupId, memoryId } = useParams<{ groupId: string; memoryId: string }>();
  const searchParams = useSearchParams();
  const created = searchParams.get("created");
  const updated = searchParams.get("updated");
  const cleanup = searchParams.get("cleanup");
  const photoSkipped = searchParams.get("photo") === "skipped";
  const { user, isAuthLoading } = useAuth();
  const [result, setResult] = useState<{ group: Group; memory: MemoryWithUser } | null>(null);
  const [status, setStatus] = useState("Loading memory...");
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) return;
    let active = true;
    void Promise.all([getUserGroup(groupId), getMemoryById(groupId, memoryId)]).then(([group, memory]) => {
      if (!active) return;
      if (group && memory) setResult({ group, memory });
      else setStatus("Memory not found or access denied.");
    }).catch((error: unknown) => { if (active) setStatus(getGroupErrorMessage(error)); });
    return () => { active = false; };
  }, [groupId, memoryId, user, isAuthLoading, updated]);
  if (!user && !isAuthLoading) return <p className="mx-auto max-w-5xl px-4 py-10">Sign in to view this memory.</p>;
  if (!result || result.group.id !== groupId || result.memory.id !== memoryId) return <p role="status" className="mx-auto max-w-5xl px-4 py-10 text-slate-700">{status}</p>;
  const { group, memory } = result;
  return <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
    <Button href={`/groups/${group.id}`} variant="ghost">Back to {group.name}</Button>
    {created || updated ? <p role="status" className="my-4 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Memory {updated ? "updated" : "saved"} successfully.{photoSkipped ? " The new photo could not be uploaded, so it was not saved." : ""}{cleanup ? " A removed photo could not be cleaned up from its host." : ""}</p> : null}
    {user && (user.id === group.createdBy || user.id === memory.uploadedBy) ? <div className="mt-3 flex justify-end"><MemoryActions groupId={group.id} memoryId={memory.id} /></div> : null}
    <article className="mt-5 overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-indigo-100">
      {memory.photos?.length || memory.imageUrl ? <div className="relative h-64 overflow-hidden bg-indigo-50 sm:h-96"><MemoryPhotoGallery memory={memory} sizes="(min-width: 1024px) 896px, 100vw" /></div> : null}
      <div className="p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">{formatDate(memory.memoryDate)}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">{memory.title}</h1>
        <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-slate-700">{memory.description}</p>
        <dl className="mt-8 grid gap-5 border-t border-indigo-100 pt-6 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">Location</dt><dd className="font-semibold text-slate-950">{memory.location || "Not added"}</dd></div>
          <div><dt className="text-slate-500">Saved by</dt><dd className="font-semibold text-slate-950">{memory.uploadedByName}</dd></div>
          <div><dt className="text-slate-500">Saved on</dt><dd className="font-semibold text-slate-950">{formatDate(memory.createdAt)}</dd></div>
        </dl>
      </div>
    </article>
  </section>;
}
