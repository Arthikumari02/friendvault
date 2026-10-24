"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CreateMemoryForm } from "@/features/memories/components/CreateMemoryForm";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { getUserGroup, getGroupErrorMessage } from "@/features/groups/apis/userGroups";
import type { Group } from "@/types";

export default function CreateMemoryController() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, isAuthLoading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [status, setStatus] = useState("Loading group...");
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) return;
    let active = true;
    void getUserGroup(groupId).then((value) => {
      if (active) { setGroup(value); setStatus(value ? "" : "Group not found or access denied."); }
    }).catch((error: unknown) => { if (active) setStatus(getGroupErrorMessage(error)); });
    return () => { active = false; };
  }, [groupId, isAuthLoading, user]);
  if (!user && !isAuthLoading) return <p className="mx-auto max-w-3xl px-4 py-10">Sign in to create a memory.</p>;
  if (!group || group.id !== groupId) return <p className="mx-auto max-w-3xl px-4 py-10 text-slate-700" role="status">{status}</p>;
  return <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Add memory</p>
    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Save a moment for {group.name}</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">Capture the date, photo, place, and story behind this memory.</p>
    <div className="mt-8"><CreateMemoryForm groupId={group.id} displayName={user?.name && user.name !== user.email ? user.name : "Friend"} /></div>
  </section>;
}
