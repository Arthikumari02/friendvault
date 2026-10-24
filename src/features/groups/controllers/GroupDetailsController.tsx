"use client";

import { useEffect, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Input";
import { validateGroup } from "@/features/groups/utils/validateGroup";
import { GroupMembers } from "@/features/groups/components/GroupMembers";
import { RecentMemories } from "@/features/groups/components/RecentMemories";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { auth } from "@/firebase/config";
import { resolveGroupSections } from "@/features/groups/utils/resolveGroupSections";
import { clearPreparedGroupDetails, getPreparedGroupDetails, type PreparedGroupDetails } from "@/features/groups/runtime/preparedGroupDetails";
import { deleteUserGroup, getUserGroup, getGroupErrorMessage, updateUserGroup } from "@/features/groups/apis/userGroups";
import { cancelInvitation, changeMemberRole, getMembers, getMyRole, getPendingInvitations, removeMember, sendInvitation } from "@/features/groups/apis/memberships";
import { getMemoriesForGroup } from "@/features/memories/apis/memories";
import { setJoinCode } from "@/features/groups/apis/joinCodes";
import { getFeatureErrorMessage } from "@/utils/featureError";
import type { Group, GroupInvitation, GroupMember } from "@/types";

type Details = PreparedGroupDetails;

export default function GroupDetailsController() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthLoading } = useAuth();
  const [details, setDetails] = useState<Details | null>(() => getPreparedGroupDetails(user?.id, groupId));
  const [detailsUserId, setDetailsUserId] = useState(user?.id);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "denied" | "error">(() => getPreparedGroupDetails(user?.id, groupId) ? "ready" : "loading");
  const preparedOnMount = useRef(Boolean(getPreparedGroupDetails(user?.id, groupId)));
  const [message, setMessage] = useState("");
  const [deletionNotice, setDeletionNotice] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<GroupInvitation[]>([]);
  const [pendingError, setPendingError] = useState("");
  const [pendingLoading, setPendingLoading] = useState(false);
  const [modal, setModal] = useState<"edit" | "delete" | "invite" | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const joinCodeRequest = useRef<{ groupId: string; promise: Promise<string> } | null>(null);
  const loadedGroupId = details?.group.id;
  const loadedCode = details?.group.inviteCode;
  const loadedRole = details?.role;

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) return;
    const signedInUserId = user.id;
    if (preparedOnMount.current && revision === 0) {
      preparedOnMount.current = false;
      clearPreparedGroupDetails(groupId);
      return;
    }
    let active = true;
    async function load() {
      try {
        const group = await getUserGroup(groupId);
        if (!group) { if (active) setStatus("missing"); return; }
        const role = await getMyRole(group);
        if (!role) { if (active) setStatus("denied"); return; }
        const [membersResult, memoriesResult] = await Promise.allSettled([getMembers(group), getMemoriesForGroup(groupId)]);
        const sections = resolveGroupSections(group, auth?.currentUser?.uid ?? "", membersResult, memoriesResult);
        if (active) {
          setDetails({ group, role, ...sections });
          setDetailsUserId(signedInUserId);
          setStatus("ready");
        }
      } catch (error) {
        if (active) { setStatus(error instanceof FirebaseError && error.code === "permission-denied" ? "denied" : "error"); setMessage(getGroupErrorMessage(error)); }
      }
    }
    void load();
    return () => { active = false; };
  }, [groupId, isAuthLoading, user, revision]);

  useEffect(() => {
    if (loadedGroupId !== groupId || loadedRole !== "owner" || loadedCode) return;
    let active = true;
    if (joinCodeRequest.current?.groupId !== groupId) joinCodeRequest.current = { groupId, promise: setJoinCode(groupId) };
    void joinCodeRequest.current.promise.then((code) => {
      if (active) setDetails((current) => current ? { ...current, group: { ...current.group, inviteCode: code } } : current);
    }).catch((error: unknown) => {
      if (active) { joinCodeRequest.current = null; setCopyStatus(getGroupErrorMessage(error)); }
    });
    return () => { active = false; };
  }, [loadedGroupId, loadedCode, loadedRole, groupId]);

  async function invite() {
    setBusy(true); setMessage(""); setInviteLink("");
    try {
      await sendInvitation(groupId, inviteId);
      setInviteLink(`${window.location.origin}/groups/${groupId}/invite`);
      setMessage("Invitation saved. Share this link with the invited friend.");
      setInviteId("");
      try { setPendingInvitations(await getPendingInvitations(groupId)); setPendingError(""); }
      catch (error) { setPendingError(getFeatureErrorMessage(error, "invitations")); }
    } catch (error) { setMessage(getFeatureErrorMessage(error, "invitations")); }
    finally { setBusy(false); }
  }

  function openEdit(group: Group) {
    setEditName(group.name); setEditDescription(group.description); setModalError(""); setActionsOpen(false); setModal("edit");
  }

  async function saveGroup() {
    const validation = validateGroup(editName, editDescription);
    if (validation.nameError || validation.descriptionError) { setModalError(validation.nameError || validation.descriptionError); return; }
    setBusy(true); setModalError("");
    try {
      await updateUserGroup(groupId, editName, editDescription);
      setDetails((current) => current ? { ...current, group: { ...current.group, name: editName.trim(), description: editDescription.trim() } } : current);
      setModal(null); setMessage("Group updated.");
    } catch (error) { setModalError(getGroupErrorMessage(error)); }
    finally { setBusy(false); }
  }

  async function deleteGroup(group: Group) {
    if (confirmName !== group.name) { setModalError("Type the group name exactly to confirm deletion."); return; }
    setBusy(true); setModalError("");
    try {
      const result = await deleteUserGroup(groupId);
      router.push(`/dashboard?deleted=1${result.cleanupFailures ? `&cleanup=${result.cleanupFailures}` : ""}`);
    } catch (error) { setModalError(getGroupErrorMessage(error)); setBusy(false); }
  }

  async function openInvite() {
    setModal("invite"); setModalError(""); setMessage(""); setPendingError(""); setPendingLoading(true); setActionsOpen(false);
    try { setPendingInvitations(await getPendingInvitations(groupId)); }
    catch (error) { setPendingError(getFeatureErrorMessage(error, "invitations")); }
    finally { setPendingLoading(false); }
  }

  async function cancelPending(inviteeId: string) {
    setBusy(true); setModalError("");
    try {
      await cancelInvitation(groupId, inviteeId);
      setPendingInvitations((current) => current.filter((item) => item.inviteeId !== inviteeId));
      setMessage("Invitation canceled.");
    } catch (error) { setModalError(getGroupErrorMessage(error)); }
    finally { setBusy(false); }
  }

  async function changeMember(member: GroupMember, action: "remove" | "admin" | "member") {
    setBusy(true); setMessage("");
    try {
      if (action === "remove") await removeMember(groupId, member.userId);
      else await changeMemberRole(groupId, member.userId, action);
      setMessage(action === "remove" ? "Member removed." : "Role updated.");
      setRevision((value) => value + 1);
    } catch (error) { setMessage(getGroupErrorMessage(error)); }
    finally { setBusy(false); }
  }

  if (!user && !isAuthLoading) return <p className="mx-auto max-w-6xl px-4 py-14 text-slate-700">Sign in to view this group.</p>;
  if (status !== "ready" || !details || !user || details.group.id !== groupId || detailsUserId !== user.id) return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" role={status === "denied" || status === "error" ? "alert" : undefined}>
      <h1 className="text-2xl font-bold text-slate-950">{status === "loading" || (status === "ready" && (details?.group.id !== groupId || detailsUserId !== user?.id)) ? "Loading group..." : status === "missing" ? "Group not found" : status === "denied" ? "Access denied" : "Could not load group"}</h1>
      <p className="mt-2 text-slate-600">{status === "denied" ? "Sign in with a member account or accept your invitation." : status === "error" ? message : ""}</p>
      {status === "error" ? <Button className="mt-5" onClick={() => setRevision((value) => value + 1)}>Try again</Button> : null}
    </section>
  );

  const { group, members, memories, role, membersUnavailable, memoriesUnavailable } = details;
  const cover = group.coverImage || "";
  const coverIsUrl = /^https:\/\//.test(cover) || cover === "/lake-vault-cover.png";
  const showCover = cover !== "from-indigo-300 via-purple-200 to-amber-100";
  const isOwnerOrAdmin = role === "owner" || role === "admin";
  const sortedMemories = [...memories].sort((a, b) => b.memoryDate.localeCompare(a.memoryDate));
  async function copyVaultId() {
    try {
      if (!group.inviteCode) return;
      await navigator.clipboard.writeText(group.inviteCode);
      setCopyStatus("Vault code copied.");
    } catch {
      setCopyStatus("Could not copy. Select the vault code instead.");
    }
  }
  async function rotateCode() {
    setCodeBusy(true); setCopyStatus("");
    try {
      const code = await setJoinCode(groupId, group.inviteCode);
      setDetails((current) => current ? { ...current, group: { ...current.group, inviteCode: code } } : current);
      setCopyStatus("New code ready. The old code no longer works.");
    } catch (error) { setCopyStatus(getGroupErrorMessage(error)); }
    finally { setCodeBusy(false); }
  }
  return (
    <section className="group-page paper">
      <div className="group-container">
        {showCover && <div className={`group-cover ${coverIsUrl ? "" : "group-cover-default"}`}>
          {coverIsUrl ? <Image src={cover} alt={`${group.name} cover`} fill priority sizes="(min-width: 1200px) 1120px, 100vw" className="object-cover" /> : null}
        </div>}
        <div className="group-heading">
          <div>
            <p className="group-private"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>JUST YOUR CIRCLE</p>
            <h1>{group.name}</h1>
            {group.description && <p className="group-description">{group.description}</p>}
            <p className="group-since">Keeping memories since {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(group.createdAt))}</p>
          </div>
          <div className="group-heading-actions">
            <Link className="pill pill-primary" href={`/groups/${groupId}/memories/create`}>＋&nbsp; Add a memory</Link>
            {role === "owner" ? <div className="relative"><button className="group-more pill pill-outline" aria-expanded={actionsOpen} aria-label="Vault actions" onClick={() => setActionsOpen((value) => !value)} type="button">···</button>{actionsOpen ? <div className="group-action-menu"><button onClick={() => openEdit(group)} type="button">Edit vault</button><button className="danger" onClick={() => { setConfirmName(""); setModalError(""); setModal("delete"); setActionsOpen(false); }} type="button">Delete vault</button></div> : null}</div> : null}
          </div>
        </div>
        {deletionNotice ? <p role="status" className="group-notice">{deletionNotice}</p> : null}
        {searchParams.get("sample") === "created" ? <p role="status" className="group-notice">Your sample vault is ready. It has been saved to My vaults.{searchParams.get("photos") === "unavailable" ? " Sample photos were unavailable, so the memories were saved as text only." : ""}</p> : null}
        {searchParams.get("sample") === "incomplete" ? <p role="alert" className="group-notice">Your sample vault was saved and opened, but its sample memories could not be added or loaded. Check the Firestore memory permissions, then return to <Link href="/dashboard">My vaults</Link> and select Try a sample vault to finish this same vault.</p> : null}
        {searchParams.get("deleted") ? <p role="status" className="group-notice">Memory deleted.{searchParams.get("cleanup") ? " A photo could not be removed from its host." : ""}</p> : null}
        {membersUnavailable || memoriesUnavailable ? <p role="status" className="group-notice">{membersUnavailable ? "People could not be loaded. " : ""}{memoriesUnavailable ? "Memories could not be loaded. " : ""}Check your Firestore permissions and try again.</p> : null}
        <div className="group-invite-card">
          <div className="group-invite-copy"><span className="group-key">⚿</span><div><p>Share this code so friends can join</p><code>{group.inviteCode || "Preparing code..."}</code></div></div>
          <div className="group-invite-actions"><button className="pill pill-outline" disabled={!group.inviteCode} onClick={() => void copyVaultId()} type="button">▢&nbsp; Copy</button>{role === "owner" ? <button className="group-text-button" disabled={codeBusy} onClick={() => void rotateCode()} type="button">⟳&nbsp; {codeBusy ? "Creating..." : "New code"}</button> : null}{isOwnerOrAdmin ? <button className="group-text-button" onClick={() => void openInvite()} type="button">Invite friend</button> : null}</div>
        </div>
        {copyStatus ? <p className="group-copy-status" role="status">{copyStatus}</p> : null}
        <GroupMembers
          members={members}
          viewer={user}
          viewerRole={role}
          memoryCount={memories.length}
          busy={busy}
          onChangeMember={(member, action) => void changeMember(member, action)}
        />
        {message ? <p role="status" className="group-notice">{message}</p> : null}
        <RecentMemories
          groupId={groupId}
          ownerId={group.createdBy}
          viewerId={user.id}
          memories={sortedMemories}
          unavailable={memoriesUnavailable}
          onRetry={() => setRevision((value) => value + 1)}
          onDeleted={(cleanupFailed) => {
            setDeletionNotice(cleanupFailed ? "Memory deleted, but a photo could not be removed from its host." : "Memory deleted.");
            setRevision((value) => value + 1);
          }}
        />
      </div>
      <Modal open={modal === "edit"} title="Edit Group" onClose={() => !busy && setModal(null)}>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void saveGroup(); }}>
          <Input label="Group Name" maxLength={100} value={editName} onChange={(event) => setEditName(event.target.value)} required />
          <Input label="Description" maxLength={2000} multiline value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
          {modalError ? <p role="alert" className="text-sm text-rose-700">{modalError}</p> : null}
          <Button className="w-full" disabled={busy} type="submit">{busy ? "Saving..." : "Save changes"}</Button>
        </form>
      </Modal>
      <Modal open={modal === "delete"} title="Delete Group" onClose={() => !busy && setModal(null)}>
        <p className="text-sm leading-6 text-slate-700">This permanently deletes the group, its memories, members, and invitations. Type <strong>{group.name}</strong> to confirm.</p>
        <Input label="Confirm group name" value={confirmName} onChange={(event) => setConfirmName(event.target.value)} />
        {modalError ? <p role="alert" className="mt-3 text-sm text-rose-700">{modalError}</p> : null}
        <div className="mt-5 flex gap-3"><Button disabled={busy} onClick={() => setModal(null)} variant="secondary">Cancel</Button><Button disabled={busy || confirmName !== group.name} onClick={() => void deleteGroup(group)}>{busy ? "Deleting..." : "Delete permanently"}</Button></div>
      </Modal>
      <Modal open={modal === "invite"} title="Invite Friend" onClose={() => !busy && setModal(null)}>
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void invite(); }}>
            <p className="text-sm text-slate-700">Ask your friend for the user ID shown on their Vaults dashboard. Only that account can accept this invitation.</p>
            <Input label="Friend user ID" value={inviteId} onChange={(event) => setInviteId(event.target.value)} required />
            <Button className="w-full" disabled={busy} type="submit">{busy ? "Sending..." : "Create invitation"}</Button>
          </form>
          {inviteLink ? <div className="mt-4 break-all rounded-xl bg-indigo-50 p-3 text-sm"><p className="font-semibold text-indigo-900">Invitation saved. Share this link:</p><a className="underline" href={inviteLink}>{inviteLink}</a><Button className="mt-3" onClick={() => void navigator.clipboard.writeText(inviteLink)} type="button" variant="secondary">Copy link</Button></div> : null}
          <h3 className="mt-6 text-sm font-bold text-slate-950">Pending invitations</h3>
          {pendingLoading ? <p className="mt-2 text-sm text-slate-600">Loading invitations...</p> : pendingError ? <p role="alert" className="mt-2 text-sm text-amber-800">{pendingError}</p> : pendingInvitations.length ? <ul className="mt-2 space-y-2">{pendingInvitations.map((item) => <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs" key={item.inviteeId}><span className="break-all">{item.inviteeId}</span><button className="font-semibold text-rose-700 underline" disabled={busy} onClick={() => void cancelPending(item.inviteeId)} type="button">Cancel</button></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No pending invitations.</p>}
        {modalError ? <p role="alert" className="mt-3 text-sm text-rose-700">{modalError}</p> : null}
        {message ? <p role="status" className="mt-3 text-sm text-indigo-800">{message}</p> : null}
      </Modal>
    </section>
  );
}
