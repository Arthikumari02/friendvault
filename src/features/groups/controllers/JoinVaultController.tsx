"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { joinWithCode } from "@/features/groups/apis/joinCodes";
import { getGroupErrorMessage } from "@/features/groups/apis/userGroups";

export default function JoinVaultController() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setValue(new URLSearchParams(window.location.search).get("code") || ""); }, []);
  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const input = value.trim();
    const shortCode = input.toUpperCase();
    if (/^[A-HJ-NP-Z2-9]{8}$/.test(shortCode)) {
      if (!user) { router.push(`/login?next=${encodeURIComponent(`/join?code=${shortCode}`)}`); return; }
      setBusy(true);
      try { const groupId = await joinWithCode(shortCode, user.name); router.push(`/groups/${groupId}`); }
      catch (cause) { setError(getGroupErrorMessage(cause)); }
      finally { setBusy(false); }
      return;
    }
    const match = input.match(/(?:^|\/)groups\/([^/?#]+)\/invite(?:[/?#]|$)/) || input.match(/^([A-Za-z0-9_-]+)$/);
    if (!match) { setError("Enter an 8-character code or invitation link."); return; }
    router.push(`/groups/${encodeURIComponent(match[1])}/invite`);
  }
  return <section className="profile-page paper"><div className="profile-inner"><p className="eyebrow">come on in</p><h1>Join a vault</h1><form className="profile-card" onSubmit={(event) => void join(event)}><p className="join-intro">Enter the code your friend shared, or paste an invitation link.</p><label htmlFor="invite-code">Vault code or invitation link</label><input id="invite-code" value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} placeholder="e.g. 2KV4T9VL" autoComplete="off" />{error && <p className="profile-status" role="alert">{error}</p>}<button className="pill pill-primary join-submit" type="submit" disabled={busy || isAuthLoading}>{busy ? "Joining..." : "Continue"}</button></form></div></section>;
}
