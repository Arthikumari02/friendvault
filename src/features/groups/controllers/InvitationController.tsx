"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { acceptInvitation, getMyInvitation, rejectInvitation } from "@/features/groups/apis/memberships";
import { getGroupErrorMessage } from "@/features/groups/apis/userGroups";
import type { GroupInvitation } from "@/types";

export default function InvitationController() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
  const [status, setStatus] = useState("Checking invitation...");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) return;
    let active = true;
    void getMyInvitation(groupId).then((value) => {
      if (active) { setInvitation(value); setStatus(value ? "" : "No invitation found for this account."); }
    }).catch((error: unknown) => { if (active) setStatus(getGroupErrorMessage(error)); });
    return () => { active = false; };
  }, [groupId, user, isAuthLoading]);
  async function respond(accept: boolean) {
    if (!user) return;
    setBusy(true); setStatus("");
    try {
      if (accept) { await acceptInvitation(groupId, user.name && user.name !== user.email ? user.name : "Friend"); router.push(`/groups/${groupId}`); }
      else { await rejectInvitation(groupId); setInvitation(null); setStatus("Invitation declined."); }
    } catch (error) { setStatus(getGroupErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-xl px-4 py-14 sm:px-6">
    <div className="rounded-[2rem] bg-white p-7 shadow-xl shadow-indigo-100">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">FriendVault invitation</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">Join a group</h1>
      {invitation ? <><p className="mt-4 text-sm leading-7 text-slate-700">You have been invited to a private group. Accept to see its members and memories.</p><div className="mt-7 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void respond(true)}>Accept invitation</Button><Button disabled={busy} onClick={() => void respond(false)} variant="secondary">Decline</Button></div></> : null}
      {!user && !isAuthLoading ? <p className="mt-4 text-sm text-slate-700">Sign in with the invited account to respond.</p> : status ? <p role="status" className="mt-4 text-sm text-slate-700">{status}</p> : null}
      <Button className="mt-6" href="/dashboard" variant="ghost">Your vaults</Button>
    </div>
  </section>;
}
