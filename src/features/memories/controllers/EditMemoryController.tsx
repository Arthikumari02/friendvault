"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { CreateMemoryForm } from "@/features/memories/components/CreateMemoryForm";
import { getUserGroup, getGroupErrorMessage } from "@/features/groups/apis/userGroups";
import { getMemoryById } from "@/features/memories/apis/memories";
import type { Group, MemoryWithUser } from "@/types";

export default function EditMemoryController() {
  const { groupId, memoryId } = useParams<{ groupId: string; memoryId: string }>();
  const { user, isAuthLoading } = useAuth();
  const [result, setResult] = useState<{ group: Group; memory: MemoryWithUser } | null>(null);
  const [status, setStatus] = useState("Loading memory...");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (isAuthLoading || !user) return;
    let active = true;
    void Promise.all([getUserGroup(groupId), getMemoryById(groupId, memoryId)]).then(([group, memory]) => {
      if (!active) return;
      if (!group || !memory) { setStatus("Memory not found or access denied."); return; }
      if (user.id !== group.createdBy && user.id !== memory.uploadedBy) { setStatus("Only the author or group owner can edit this memory."); return; }
      setResult({ group, memory });
    }).catch((error: unknown) => { if (active) setStatus(getGroupErrorMessage(error)); });
    return () => { active = false; };
  }, [groupId, memoryId, user, isAuthLoading, revision]);
  if (!user && !isAuthLoading) return <p className="mx-auto max-w-3xl px-4 py-10">Sign in to edit this memory.</p>;
  if (!result || result.group.id !== groupId || result.memory.id !== memoryId) return <section className="mx-auto max-w-3xl px-4 py-10"><p role="status" className="text-slate-700">{status}</p><Button className="mt-4" onClick={() => setRevision((value) => value + 1)} variant="secondary">Try again</Button></section>;
  return <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Edit memory</p>
    <h1 className="mt-3 text-3xl font-bold text-slate-950">{result.memory.title}</h1>
    <div className="mt-8"><CreateMemoryForm key={memoryId} groupId={groupId} displayName={result.memory.uploadedByName} memory={result.memory} /></div>
  </section>;
}
