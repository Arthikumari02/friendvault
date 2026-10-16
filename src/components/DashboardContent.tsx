"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { DashboardCreateAction } from "@/components/DashboardCreateAction";
import { EmptyState } from "@/components/EmptyState";
import { GroupCard } from "@/components/GroupCard";
import { VaultTemplatePreview } from "@/components/VaultTemplatePreview";
import { useAuth } from "@/context/AuthContext";
import { getGroupErrorMessage, getUserGroups } from "@/services/userGroups";
import type { GroupSummary } from "@/types";

export function DashboardContent() {
  const { user, isAuthLoading } = useAuth();
  const [result, setResult] = useState<{ userId: string; groups: GroupSummary[]; error: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const userId = user?.id;
  const initials = user?.initials;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      active = false;
      setResult({
        userId,
        groups: [],
        error: "Loading your groups took too long. Check your connection and Firestore setup, then try again.",
      });
    }, 12000);

    void getUserGroups(userId, initials)
      .then((groups) => {
        if (active) setResult({ userId, groups, error: "" });
      })
      .catch((error: unknown) => {
        if (active) setResult({ userId, groups: [], error: getGroupErrorMessage(error) });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [userId, initials, retryCount]);

  const groups = result && result.userId === user?.id ? result.groups : [];
  const loadError = result && result.userId === user?.id ? result.error : "";

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
        {isAuthLoading ? (
          <p className="text-sm text-slate-600">Checking your account...</p>
        ) : !user ? (
          <VaultTemplatePreview />
        ) : !result || result.userId !== user.id ? (
          <p className="text-sm text-slate-600">Loading your groups...</p>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl bg-rose-50 p-5 text-sm text-rose-700">
            <p>{loadError}</p>
            <Button
              className="mt-4"
              onClick={() => {
                setResult(null);
                setRetryCount((count) => count + 1);
              }}
              type="button"
              variant="secondary"
            >
              Try again
            </Button>
          </div>
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
