"use client";

import { DashboardCreateAction } from "@/components/DashboardCreateAction";
import { EmptyState } from "@/components/EmptyState";
import { GroupCard } from "@/components/GroupCard";
import { VaultTemplatePreview } from "@/components/VaultTemplatePreview";
import { useAuth } from "@/context/AuthContext";
import type { GroupSummary } from "@/types";

export function DashboardContent({ groups }: { groups: GroupSummary[] }) {
  const { user } = useAuth();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
            Your vaults
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            Pick up the photo box where you left it.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            {user
              ? "Covers, friends, years, latest memories, and recent timelines without turning friendship into analytics."
              : "Sign in first. Then your real groups, friends, years, and memories will appear here."}
          </p>
        </div>
        <DashboardCreateAction />
      </div>
      <div className="mt-10">
        {!user ? (
          <VaultTemplatePreview />
        ) : groups.length > 0 ? (
          <div className="space-y-8">
            {groups.map((group) => (
              <GroupCard group={group} key={group.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            actionHref="/groups/create"
            actionLabel="Create Group"
            description="Create your first vault and invite friends to start preserving shared stories."
            title="No groups yet"
          />
        )}
      </div>
    </section>
  );
}
