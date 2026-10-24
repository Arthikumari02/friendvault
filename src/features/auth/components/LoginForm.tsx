"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage, useAuth } from "@/features/auth/contexts/AuthContext";
import { hasFirebaseConfig } from "@/firebase/config";
import { isValidEmail } from "@/utils/validation";

function postLoginPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && /^\/join\?code=[A-HJ-NP-Z2-9]{8}$/.test(next) ? next : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const { user, isAuthLoading, login, signup, loginWithGoogle, sendPasswordReset, isEmailLink, completeEmailLink } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [emailLinkPending, setEmailLinkPending] = useState(false);

  useEffect(() => { if (!isAuthLoading && user) router.replace(postLoginPath()); }, [isAuthLoading, user, router]);
  useEffect(() => {
    if (!isEmailLink(window.location.href)) return;
    const savedEmail = window.localStorage.getItem("friendvaultEmailForSignIn");
    if (!savedEmail) { setEmailLinkPending(true); return; }
    void completeEmailLink(savedEmail, window.location.href).then(() => { window.localStorage.removeItem("friendvaultEmailForSignIn"); router.replace(postLoginPath()); }).catch((error: unknown) => { setEmailLinkPending(true); setMessage(getAuthErrorMessage(error)); });
  }, [isEmailLink, completeEmailLink, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!isValidEmail(email.trim())) { setMessage("Enter a valid email address."); return; }
    if (!emailLinkPending && (!password || (mode === "signup" && password.length < 6))) { setMessage(mode === "signup" ? "Use at least 6 characters for your password." : "Enter your password."); return; }
    setBusy(true);
    try {
      if (emailLinkPending) { await completeEmailLink(email.trim(), window.location.href); window.localStorage.removeItem("friendvaultEmailForSignIn"); }
      else if (mode === "signup") await signup(email.trim(), password);
      else await login(email.trim(), password);
      router.push(postLoginPath());
    } catch (error) { setMessage(getAuthErrorMessage(error)); } finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!isValidEmail(email.trim())) { setMessage("Enter your email address first, then choose Forgot?"); return; }
    setBusy(true); setMessage("");
    try { await sendPasswordReset(email.trim()); setMessage("Password reset email sent. Check your inbox."); }
    catch (error) { setMessage(getAuthErrorMessage(error)); } finally { setBusy(false); }
  }

  async function googleSignIn() {
    setBusy(true); setMessage("");
    try { await loginWithGoogle(); router.push(postLoginPath()); }
    catch (error) { setMessage(getAuthErrorMessage(error)); } finally { setBusy(false); }
  }

  return <form className="login-form" onSubmit={submit}>
    <h1>{mode === "login" ? "Welcome back" : "Make yourself at home"}</h1>
    {message && <p className="form-message" role="status">{message}</p>}
    {!hasFirebaseConfig && <p className="form-message" role="status">Firebase is not configured. Add your Firebase values to .env.local to sign in.</p>}
    <label htmlFor="login-email">Email</label><input id="login-email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
    {!emailLinkPending && <><div className="password-label"><label htmlFor="login-password">Password</label><button type="button" onClick={() => void resetPassword()} disabled={busy || !hasFirebaseConfig}>Forgot?</button></div><input id="login-password" autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></>}
    <button className="pill pill-primary login-submit" type="submit" disabled={busy || !hasFirebaseConfig}>{busy ? "Please wait..." : emailLinkPending ? "Complete sign in" : mode === "login" ? "Log in" : "Create account"}</button>
    <div className="login-divider"><span />or<span /></div>
    <button className="pill pill-outline google-button" type="button" onClick={() => void googleSignIn()} disabled={busy || !hasFirebaseConfig}>Continue with Google</button>
    <p className="signup-switch">{mode === "login" ? "New here? " : "Already have an account? "}<button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Create an account" : "Log in"}</button></p>
  </form>;
}
