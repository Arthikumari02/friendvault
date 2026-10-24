"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { MemoryCard } from "@/features/memories/components/MemoryCard";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { getUserGroups, getGroupErrorMessage } from "@/features/groups/apis/userGroups";
import { getMemoriesForGroup } from "@/features/memories/apis/memories";
import type { MemoryWithUser } from "@/types";

export default function MemoriesController() {
  const { user, isAuthLoading } = useAuth();
  const [result, setResult] = useState<{ userId: string; memories: MemoryWithUser[]; owners: Record<string, string>; error: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const [deletionNotice, setDeletionNotice] = useState("");
  useEffect(() => {
    if (!user || isAuthLoading) return;
    let active = true;
    void getUserGroups(user.id).then(async (groups) => {
      const lists = await Promise.all(groups.map((group) => getMemoriesForGroup(group.id)));
      if (active) setResult({ userId: user.id, memories: lists.flat().sort((a, b) => b.memoryDate.localeCompare(a.memoryDate)), owners: Object.fromEntries(groups.map((group) => [group.id, group.createdBy])), error: "" });
    }).catch((error: unknown) => { if (active) setResult({ userId: user.id, memories: [], owners: {}, error: getGroupErrorMessage(error) }); });
    return () => { active = false; };
  }, [user, isAuthLoading, revision]);
  return <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-700">Your stories</p>
    <h1 className="mt-3 text-4xl font-bold text-slate-950">Memories</h1>
    {deletionNotice ? <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{deletionNotice}</p> : null}
    {!user && !isAuthLoading ? <div className="mt-8"><p className="mb-4 text-slate-700">Sign in to see your memories.</p><Button href="/login">Sign in</Button></div> : !result || result.userId !== user?.id ? <p className="mt-8 text-slate-600">Loading memories...</p> : result.error ? <div className="mt-8" role="alert"><p className="text-rose-700">{result.error}</p><Button className="mt-4" onClick={() => setRevision((value) => value + 1)}>Try again</Button></div> : result.memories.length ? <div className="mt-8 grid gap-6 md:grid-cols-2">{result.memories.map((memory) => <MemoryCard key={`${memory.groupId}-${memory.id}`} memory={memory} viewerId={user?.id} groupOwnerId={result.owners[memory.groupId]} onDeleted={(cleanupFailed) => { setDeletionNotice(cleanupFailed ? "Memory deleted, but its photo could not be removed from Storage." : "Memory deleted."); setRevision((value) => value + 1); }} />)}</div> : <div className="mt-8 rounded-3xl bg-white p-8 shadow-lg shadow-indigo-100"><p className="text-slate-700">No memories yet. Open a vault to create the first one.</p><Button className="mt-5" href="/dashboard">Your vaults</Button></div>}
  </section>;
}
