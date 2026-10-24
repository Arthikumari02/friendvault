"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [menuError, setMenuError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!profileOpen) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setProfileOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [profileOpen]);

  async function signOut() {
    setSigningOut(true);
    setMenuError("");
    try {
      await logout();
      setProfileOpen(false);
      router.push("/login");
    } catch {
      setMenuError("Could not sign out. Try again.");
      setSigningOut(false);
    }
  }

  if (pathname === "/login") return null;
  return <header className="site-header"><nav className="header-inner"><Link className="brand" href="/">Friend <em>Vault</em></Link><div className="header-links"><Link href="/dashboard" onClick={() => setProfileOpen(false)}>My vaults{pathname === "/" ? " →" : ""}</Link>{user && pathname !== "/" ? <div className="profile-menu-wrap" ref={menuRef}><button className="avatar-link" type="button" aria-label="Account menu" aria-expanded={profileOpen} aria-controls="profile-menu" onClick={() => setProfileOpen((open) => !open)}><UserAvatar user={user} /></button>{profileOpen && <div className="profile-menu" id="profile-menu"><Link href="/profile" onClick={() => setProfileOpen(false)}><span aria-hidden="true">♙</span> Your profile</Link><button type="button" disabled={signingOut} onClick={() => void signOut()}><span aria-hidden="true">⇥</span> {signingOut ? "Signing out..." : "Sign out"}</button>{menuError && <p role="alert">{menuError}</p>}</div>}</div> : null}</div></nav></header>;
}
