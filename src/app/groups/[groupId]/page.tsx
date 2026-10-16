"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { AvatarStack } from "@/components/AvatarStack";
import { Button } from "@/components/Button";
import { Timeline } from "@/components/Timeline";
import { getGroupAvatars, getGroupById, getGroupMemberCount } from "@/services/groups";
import { getMemoriesForGroup } from "@/services/memories";
import { useAuth } from "@/context/AuthContext";
import { getGroupErrorMessage, getUserGroup } from "@/services/userGroups";
import type { Group, MemoryWithUser } from "@/types";
import { formatDate } from "@/utils/date";

type Details = {
  group: Group | null;
  memberCount: number;
  avatars: string[];
  memories: MemoryWithUser[];
  isSample: boolean;
  error: string;
};

export default function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, isAuthLoading } = useAuth();
  const [result, setResult] = useState<{ groupId: string; details: Details } | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let active = true;
    async function loadGroup(): Promise<Details> {
      const sample = await getGroupById(groupId);
      if (sample) {
        const [memberCount, avatars, memories] = await Promise.all([
          getGroupMemberCount(groupId),
          getGroupAvatars(groupId),
          getMemoriesForGroup(groupId),
        ]);
        return { group: sample, memberCount, avatars, memories, isSample: true, error: "" };
      }
      if (!user) return { group: null, memberCount: 0, avatars: [], memories: [], isSample: false, error: "Sign in to view this group." };
      const group = await getUserGroup(groupId);
      return {
        group,
        memberCount: group ? 1 : 0,
        avatars: group ? [user.initials ?? "FR"] : [],
        memories: [],
        isSample: false,
        error: "",
      };
    }
    void loadGroup()
      .then((details) => { if (active) setResult({ groupId, details }); })
      .catch((error: unknown) => {
        if (active) setResult({ groupId, details: { group: null, memberCount: 0, avatars: [], memories: [], isSample: false, error: getGroupErrorMessage(error) } });
      });
    return () => { active = false; };
  }, [groupId, isAuthLoading, user]);

  if (isAuthLoading || result?.groupId !== groupId) {
    return <p className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600">Loading group...</p>;
  }

  const { group, memberCount, avatars, memories, isSample, error } = result.details;
  if (error) return <p role="alert" className="mx-auto max-w-6xl px-4 py-10 text-sm text-rose-700">{error}</p>;
  if (!group) return <p className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600">Group not found.</p>;

  const latest = memories[0];
  const yearsTogether = Math.max(
    0,
    new Date().getFullYear() - new Date(group.createdAt).getFullYear(),
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="relative overflow-hidden rounded-[2.5rem] bg-white p-4 shadow-2xl shadow-indigo-100">
        <div className={`relative min-h-[520px] rounded-[2rem] bg-gradient-to-br ${group.coverImage ?? "from-indigo-300 to-purple-200"}`}>
          {latest?.imageUrl ? (
            <Image
              alt={`${latest.title} cover memory`}
              className="object-cover mix-blend-soft-light opacity-80"
              fill
              priority
              sizes="(min-width: 1024px) 1152px, 100vw"
              src={latest.imageUrl}
            />
          ) : null}
          <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.68),transparent_18rem),linear-gradient(180deg,transparent,rgba(15,23,42,.56))]" />
          <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-5 rounded-[2rem] bg-white/88 p-5 shadow-xl backdrop-blur lg:flex-row lg:items-end lg:justify-between">
            <div>
              <AvatarStack avatars={avatars} />
              {isSample ? <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Demo vault</p> : null}
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                {memberCount} friends - {yearsTogether} years together - created {formatDate(group.createdAt)}
              </p>
              <h1 className="mt-2 text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                {group.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {group.description}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary">Invite Friend</Button>
            </div>
          </div>
        </div>
      </header>
      <div className="mt-12">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
            The heart of the vault
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Timeline
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Every year gets its own shelf. Every card is a story your friends can come back to.
          </p>
        </div>
        <Timeline groupId={group.id} memories={memories} showAddAction={false} />
      </div>
    </section>
  );
}
