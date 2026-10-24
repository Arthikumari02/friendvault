"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { updateProfile } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { auth, storage } from "@/firebase/config";

export default function ProfileController() {
  const { user, isAuthLoading, refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { setName(user?.name || ""); }, [user?.name]);
  useEffect(() => { setPhoto(null); setPreview(""); setStatus(""); }, [user?.id]);
  useEffect(() => { if (!photo) return; const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [photo]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("");
    if (!auth?.currentUser || !name.trim()) { setStatus("Enter a display name to save your profile."); return; }
    setSaving(true);
    try {
      let photoURL = auth.currentUser.photoURL || undefined;
      if (photo) {
        if (!storage) throw new Error("Photo storage is unavailable.");
        const imageRef = ref(storage, `profiles/${auth.currentUser.uid}/avatar`);
        await uploadBytes(imageRef, photo, { contentType: photo.type });
        photoURL = await getDownloadURL(imageRef);
      }
      await updateProfile(auth.currentUser, { displayName: name.trim(), photoURL });
      refreshUser();
      setStatus("Profile saved.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save your profile."); }
    finally { setSaving(false); }
  }
  return <section className="profile-page paper"><div className="profile-inner"><p className="eyebrow">that&apos;s you</p><h1>Your profile</h1>{isAuthLoading ? <p>Loading your profile...</p> : !user ? <p>Please log in to edit your profile.</p> : <form className="profile-card" onSubmit={save}><div className="profile-photo-row"><div className="profile-avatar">{preview || user.profileImage ? <Image src={preview || user.profileImage || ""} alt="Your profile" fill unoptimized sizes="76px" className="object-cover" /> : user.initials?.slice(0, 1) || "F"}</div>{storage ? <><input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setStatus("Choose an image smaller than 5 MB."); return; } setPhoto(file); setStatus(""); }} /><button className="pill pill-outline" type="button" onClick={() => fileInput.current?.click()}>Change photo</button></> : <p role="status" className="text-sm text-slate-600">Photo uploads are unavailable. You can still update your display name.</p>}</div><label htmlFor="display-name">Display name</label><input id="display-name" value={name} onChange={(event) => setName(event.target.value)} /><p>{user.email ? `Signed in as ${user.email}` : "No email address on this account."}</p><details className="profile-invite-id"><summary>Your invite ID</summary><code>{user.id}</code></details>{status && <p role="status" className="profile-status">{status}</p>}<button className="pill pill-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button></form>}</div></section>;
}
