"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GroupCard } from "@/features/groups/components/GroupCard";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { JoinVaultDialog } from "@/features/groups/components/JoinVaultDialog";
import { CreateGroupForm } from "@/features/groups/components/CreateGroupForm";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { deleteUserGroup, getGroupErrorMessage, getOwnedUserGroup, getUserGroup, getUserGroups, retryPendingVaultPhotoCleanup } from "@/features/groups/apis/userGroups";
import { createSampleVault, type SampleVaultDraft } from "@/features/groups/apis/sampleVault";
import { isResumableSampleGroup, parseSampleVaultDraft } from "@/features/groups/utils/sampleVaultFlow";
import { setPreparedGroupDetails } from "@/features/groups/runtime/preparedGroupDetails";
import { getMembers } from "@/features/groups/apis/memberships";
import { getMemoriesForGroup } from "@/features/memories/apis/memories";
import { sampleVaultStage } from "@/features/groups/utils/sampleVaultError";
import type { Group, GroupMember, GroupSummary, MemoryWithUser } from "@/types";

export function DashboardController() {
  const { user, isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<{ userId: string; groups: GroupSummary[]; error: string; warning?: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupSummary | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deletedMessage, setDeletedMessage] = useState("");
  const [creatingSample, setCreatingSample] = useState(false);
  const [sampleError, setSampleError] = useState("");
  const sampleRequest = useRef(false);
  const sampleDraft = useRef<SampleVaultDraft | null>(null);
  const newlyCreatedSample = useRef<GroupSummary | null>(null);
  useEffect(() => {
    if (!isAuthLoading && !user) router.replace("/login");
  }, [isAuthLoading, user, router]);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    let warning = "";
    void getUserGroups(user.id, user.initials, (message) => { warning = message; }).then((groups) => {
      if (!active) return;
      const sample = newlyCreatedSample.current;
      setResult({ userId: user.id, groups: sample && sample.createdBy === user.id && !groups.some((group) => group.id === sample.id) ? [sample, ...groups] : groups, error: "", warning });
    }).catch((error: unknown) => { if (active) setResult({ userId: user.id, groups: [], error: getGroupErrorMessage(error) }); });
    return () => { active = false; };
  }, [user?.id, user?.initials, retryCount]);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void retryPendingVaultPhotoCleanup().then((failures) => {
      if (active && failures) setDeletedMessage("A deleted vault still has photos awaiting cleanup. Photo cleanup will be retried when you return to My vaults.");
    }).catch(() => { /* Older published rules may not permit cleanup-job reads. */ });
    return () => { active = false; };
  }, [user?.id]);
  const groups = result && result.userId === user?.id ? result.groups : [];
  function openSampleGroup(group: Group, members: GroupMember[], memories: MemoryWithUser[], incomplete: boolean, photosSkipped = false) {
    if (!user) return;
    const latestMemory = memories[0];
    const summary: GroupSummary = {
      ...group, memberCount: members.length, totalMemories: memories.length,
      lastActivity: latestMemory?.createdAt ?? group.createdAt,
      yearsTogether: Math.max(0, new Date().getFullYear() - new Date(group.createdAt).getFullYear()),
      memberAvatars: members.map((member) => member.userId === user.id ? user.initials ?? "FR" : member.displayName.slice(0, 2).toUpperCase()),
      latestMemory,
    };
    newlyCreatedSample.current = summary;
    setResult((current) => current?.userId === user.id ? { ...current, groups: [summary, ...current.groups.filter((item) => item.id !== group.id)] } : { userId: user.id, groups: [summary], error: "" });
    setPreparedGroupDetails(user.id, { group, role: "owner", members, memories, membersUnavailable: incomplete, memoriesUnavailable: incomplete });
    router.push(`/groups/${group.id}?sample=${incomplete ? "incomplete" : "created"}${photosSkipped ? "&photos=unavailable" : ""}`);
  }
  async function trySampleVault() {
    if (sampleRequest.current || !user) return;
    sampleRequest.current = true;
    setCreatingSample(true);
    const draftKey = `friendvault:sample-draft:${user.id}`;
    if (!sampleDraft.current) {
      try {
        const saved = parseSampleVaultDraft(JSON.parse(sessionStorage.getItem(draftKey) ?? "null"));
        if (saved) sampleDraft.current = saved;
      } catch { /* A damaged local draft can be replaced. */ }
      sampleDraft.current ??= { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      try { sessionStorage.setItem(draftKey, JSON.stringify(sampleDraft.current)); } catch { /* Continue with the in-memory draft. */ }
    }
    setSampleError("");
    try {
      const { groupId, photosSkipped } = await createSampleVault(user.name, sampleDraft.current);
      const group = await sampleVaultStage("preload-vault", () => getUserGroup(groupId));
      if (!group) throw new Error("The sample vault was created, but could not be loaded. Open it from My vaults.");
      const [members, memories] = await Promise.all([
        sampleVaultStage("preload-members", () => getMembers(group)),
        sampleVaultStage("preload-memories", () => getMemoriesForGroup(groupId)),
      ]);
      sampleDraft.current = null;
      try { sessionStorage.removeItem(draftKey); } catch { /* The vault is already saved. */ }
      openSampleGroup(group, members, memories, false, photosSkipped);
    } catch (error) {
      const draft = sampleDraft.current;
      const savedGroup = draft ? await getOwnedUserGroup(draft.id).catch(() => null) : null;
      if (draft && isResumableSampleGroup(savedGroup, draft, user.id)) {
        console.info("[FriendVault] Opening saved sample vault after setup error", { stage: "open-created-vault", errorCode: typeof error === "object" && error !== null && "code" in error ? error.code : "unknown" });
        openSampleGroup(savedGroup, [{ groupId: savedGroup.id, userId: user.id, role: "owner", displayName: user.name, joinedAt: savedGroup.createdAt }], [], true);
        return;
      }
      setSampleError(`${getGroupErrorMessage(error)} Retry will continue the same sample vault.`);
      setCreatingSample(false);
      sampleRequest.current = false;
      setRetryCount((count) => count + 1);
    }
  }
  async function removeGroup() {
    if (!groupToDelete || confirmName !== groupToDelete.name || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { cleanupFailures } = await deleteUserGroup(groupToDelete.id);
      setResult((current) => current ? { ...current, groups: current.groups.filter((group) => group.id !== groupToDelete.id) } : current);
      setDeletedMessage(cleanupFailures ? "Vault deleted. Photo cleanup is pending and will be retried when you return to My vaults." : "Vault deleted.");
      setGroupToDelete(null);
      setConfirmName("");
    } catch (error) {
      setDeleteError(getGroupErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }
  if (isAuthLoading || !user) {
    return <section className="dashboard-page paper"><div className="dashboard-inner">Checking your account...</div></section>;
  }
  return <section className="dashboard-page paper"><div className="dashboard-inner"><div className="dashboard-heading"><div><p className="eyebrow">your circles</p><h1>My vaults</h1></div><div className="dashboard-actions"><button className="pill pill-outline" type="button" disabled={creatingSample} aria-busy={creatingSample} onClick={() => void trySampleVault()}>{creatingSample ? "Creating your sample vault..." : "Try a sample vault"}</button><button className="pill pill-outline" type="button" onClick={() => setJoinDialogOpen(true)}>Join with code</button><button className="pill pill-primary" type="button" onClick={() => setCreateDialogOpen(true)}>New vault</button></div></div>
    {sampleError && <p className="form-message" role="alert">{sampleError}</p>}
    {searchParams.get("deleted") && <p className="form-message" role="status">Vault deleted.</p>}
    {deletedMessage && <p className="form-message" role="status">{deletedMessage}</p>}
    {!result || result.userId !== user.id ? <p>Loading your vaults...</p> : result.error ? <div role="alert" className="dashboard-empty"><p>{result.error}</p><button className="pill pill-outline" onClick={() => { setResult(null); setRetryCount((count) => count + 1); }}>Try again</button></div> : <>{result.warning && <p role="alert" className="form-message">{result.warning}</p>}{groups.length ? <div className="vault-grid">{groups.map((group) => <div className="vault-card-wrap" key={group.id}><GroupCard group={group} />{group.createdBy === user.id && <button className="vault-card-delete" type="button" aria-label={`Delete ${group.name} vault`} onClick={() => { setGroupToDelete(group); setConfirmName(""); setDeleteError(""); }}>Delete vault</button>}</div>)}</div> : <div className="dashboard-empty"><p>Your first shared story starts here.</p><button className="pill pill-primary" type="button" onClick={() => setCreateDialogOpen(true)}>Create a vault</button></div>}</>}
  </div>{joinDialogOpen && <JoinVaultDialog displayName={user.name} onClose={() => setJoinDialogOpen(false)} />}{createDialogOpen && <CreateGroupForm onClose={() => setCreateDialogOpen(false)} />}<Modal open={Boolean(groupToDelete)} title="Delete vault" onClose={() => { if (!deleting) setGroupToDelete(null); }}><p className="text-sm leading-6 text-slate-700">This permanently deletes the vault and everything in it. Type <strong>{groupToDelete?.name}</strong> to confirm.</p><form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void removeGroup(); }}><Input label="Confirm vault name" value={confirmName} onChange={(event) => setConfirmName(event.target.value)} />{deleteError && <p role="alert" className="text-sm text-rose-700">{deleteError}</p>}<div className="flex gap-3"><Button type="button" disabled={deleting} onClick={() => setGroupToDelete(null)} variant="secondary">Cancel</Button><Button type="submit" disabled={deleting || confirmName !== groupToDelete?.name}>{deleting ? "Deleting..." : "Delete permanently"}</Button></div></form></Modal></section>;
}
