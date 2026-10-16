"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage, useAuth } from "@/context/AuthContext";
import { hasFirebaseConfig } from "@/firebase/config";
import { isValidEmail } from "@/utils/validation";
import type { ConfirmationResult } from "firebase/auth";

function ProviderButton({
  icon,
  label,
  onClick,
  disabled = false,
  highlighted = false,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  return (
    <button
      className={`grid min-h-11 w-full grid-cols-[32px_1fr_32px] items-center rounded-full border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
        highlighted
          ? "border-[#e5eefb] bg-[#e8f1ff] text-slate-950 hover:bg-white"
          : "border-white/15 bg-white text-slate-950 hover:bg-slate-100"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="text-left text-xl font-bold">{icon}</span>
      <span>{label}</span>
      <span />
    </button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const {
    user,
    isAuthLoading,
    login,
    signup,
    loginWithGoogle,
    loginWithApple,
    sendPhoneCode,
    confirmPhoneCode,
    sendEmailLink,
    isEmailLink,
    completeEmailLink,
    sendPasswordReset,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState<ConfirmationResult | null>(null);
  const [emailLinkPending, setEmailLinkPending] = useState(false);
  const emailLinkAttempted = useRef(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "reset" | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [authMessageType, setAuthMessageType] = useState<"error" | "success">("error");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0,
    [email, password],
  );

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, router, user]);

  useEffect(() => {
    if (!isEmailLink(window.location.href) || emailLinkAttempted.current) return;
    emailLinkAttempted.current = true;
    const savedEmail = window.localStorage.getItem("friendvaultEmailForSignIn");
    if (!savedEmail) {
      queueMicrotask(() => setEmailLinkPending(true));
      return;
    }
    void completeEmailLink(savedEmail, window.location.href)
      .then(() => {
        window.localStorage.removeItem("friendvaultEmailForSignIn");
        router.replace("/dashboard");
      })
      .catch((error: unknown) => {
        setEmailLinkPending(true);
        setErrorMessage(getAuthErrorMessage(error));
      })
      .finally(() => setProviderLoading(null));
  }, [completeEmailLink, isEmailLink, router]);

  function setErrorMessage(message: string) {
    setAuthMessageType("error");
    setAuthMessage(message);
  }

  function setSuccessMessage(message: string) {
    setAuthMessageType("success");
    setAuthMessage(message);
  }

  function validate(mode: "login" | "signup") {
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = "Email is required.";
    else if (!isValidEmail(email)) nextErrors.email = "Enter a valid email.";
    if (!password.trim()) nextErrors.password = "Password is required.";
    else if (mode === "signup" && password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateResetEmail() {
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = "Email is required.";
    else if (!isValidEmail(email)) nextErrors.email = "Enter a valid email.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleAuth(mode: "login" | "signup") {
    setAuthMessage("");
    if (!validate(mode)) return;

    setAuthMode(mode);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await signup(email.trim(), password);
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setAuthMode(null);
    }
  }

  async function handlePasswordReset() {
    setAuthMessage("");
    if (!validateResetEmail()) return;

    setAuthMode("reset");
    try {
      await sendPasswordReset(email.trim());
      setSuccessMessage("Password reset email sent. Check your inbox for the reset link.");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setAuthMode(null);
    }
  }

  async function handlePopupSignIn(provider: "Google" | "Apple") {
    setAuthMessage("");
    setPhoneOpen(false);
    setProviderLoading(provider);

    try {
      if (provider === "Google") await loginWithGoogle();
      else await loginWithApple();
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setProviderLoading(null);
    }
  }

  async function handleSendPhoneCode() {
    setAuthMessage("");
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      setErrorMessage("Enter a phone number with country code, such as +15551234567.");
      return;
    }
    setProviderLoading("phone");
    try {
      const container = document.getElementById("phone-recaptcha");
      if (!container) throw new Error("Phone verification is unavailable. Reload the page and try again.");
      const confirmation = await sendPhoneCode(phone.trim(), container);
      setPhoneConfirmation(confirmation);
      setSuccessMessage("Verification code sent. Check your phone.");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setProviderLoading(null);
    }
  }

  async function handleConfirmPhoneCode() {
    setAuthMessage("");
    setProviderLoading("phone");
    try {
      if (!phoneConfirmation) throw new Error("Request a verification code first.");
      await confirmPhoneCode(phoneConfirmation, phoneCode.trim());
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setProviderLoading(null);
    }
  }

  async function handleEmailLink() {
    setAuthMessage("");
    setPhoneOpen(false);
    if (!isValidEmail(email.trim())) {
      setErrors((current) => ({ ...current, email: "Enter a valid email." }));
      return;
    }
    setErrors((current) => ({ ...current, email: undefined }));
    setProviderLoading("emailLink");
    try {
      if (isEmailLink(window.location.href)) {
        await completeEmailLink(email.trim(), window.location.href);
        window.localStorage.removeItem("friendvaultEmailForSignIn");
        router.replace("/dashboard");
      } else {
        await sendEmailLink(email.trim());
        window.localStorage.setItem("friendvaultEmailForSignIn", email.trim());
        setSuccessMessage("Sign-in link sent. Check your inbox and open the link to finish signing in.");
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setProviderLoading(null);
    }
  }

  const isSubmitting = authMode !== null;
  const isAuthDisabled = isSubmitting || !hasFirebaseConfig;

  return (
    <form
      className="w-full max-w-[530px] rounded-[1.2rem] bg-[#161c1f] px-8 py-10 shadow-2xl shadow-black/50 sm:px-12"
      onSubmit={(event) => {
        event.preventDefault();
        void handleAuth("login");
      }}
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Log In</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-300">
          By continuing, you agree to our <span className="text-blue-400">User Agreement</span> and acknowledge that you understand the <span className="text-blue-400">Privacy Policy</span>.
        </p>
      </div>

      {authMessage ? (
        <div
          role="alert"
          className={`-mx-8 mt-6 px-8 py-3 text-sm leading-6 text-white sm:-mx-12 sm:px-12 ${
            authMessageType === "success" ? "bg-emerald-700" : "bg-red-700"
          }`}
        >
          {authMessage}
        </div>
      ) : !hasFirebaseConfig ? (
        <div className="-mx-8 mt-6 bg-amber-700 px-8 py-3 text-sm leading-6 text-white sm:-mx-12 sm:px-12">
          Firebase is not configured. Copy .env.local.example to .env.local, add your Firebase Web App values, enable the sign-in providers, and restart the dev server.
        </div>
      ) : null}

      {emailLinkPending ? (
        <p className="mt-5 text-sm text-slate-300">
          Enter the email address that received this link, then choose Complete email link sign-in.
        </p>
      ) : null}

      <div className="mt-5 space-y-2.5">
        <ProviderButton icon="P" label="Continue with Phone Number" onClick={() => { setAuthMessage(""); setPhoneOpen((open) => !open); }} />
        <ProviderButton
          disabled={providerLoading !== null || isSubmitting}
          highlighted
          icon="G"
          label={providerLoading === "Google" ? "Opening Google..." : "Continue with Google"}
          onClick={() => void handlePopupSignIn("Google")}
        />
        <ProviderButton disabled={providerLoading !== null || isSubmitting} icon="A" label={providerLoading === "Apple" ? "Opening Apple..." : "Continue with Apple"} onClick={() => void handlePopupSignIn("Apple")} />
        <ProviderButton disabled={providerLoading !== null || isSubmitting} icon="L" label={emailLinkPending ? "Complete email link sign-in" : "Email me a one-time link"} onClick={() => void handleEmailLink()} />
      </div>

      {phoneOpen ? (
        <div className="mt-4 space-y-3 rounded-xl border border-white/15 p-4">
          <label className="block text-sm text-white" htmlFor="phone-number">Phone number with country code</label>
          <input id="phone-number" autoComplete="tel" className="min-h-11 w-full rounded-lg bg-[#293337] px-3 text-white" onChange={(event) => { setPhone(event.target.value); setPhoneConfirmation(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleSendPhoneCode(); } }} placeholder="+15551234567" type="tel" value={phone} />
          <button className="min-h-11 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={providerLoading !== null} onClick={() => void handleSendPhoneCode()} type="button">{providerLoading === "phone" ? "Please wait..." : "Send verification code"}</button>
          {phoneConfirmation ? (
            <>
              <label className="block text-sm text-white" htmlFor="phone-code">Verification code</label>
              <input id="phone-code" autoComplete="one-time-code" className="min-h-11 w-full rounded-lg bg-[#293337] px-3 text-white" onChange={(event) => setPhoneCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleConfirmPhoneCode(); } }} inputMode="numeric" value={phoneCode} />
              <button className="min-h-11 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={providerLoading !== null || !phoneCode.trim()} onClick={() => void handleConfirmPhoneCode()} type="button">Verify and sign in</button>
            </>
          ) : null}
          <div id="phone-recaptcha" />
        </div>
      ) : null}

      <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="sr-only">Email or username</span>
          <input
            autoComplete="email"
            className="min-h-14 w-full rounded-[1.3rem] border border-transparent bg-[#293337] px-4 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-blue-400"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email or username *"
            type="email"
            value={email}
          />
          {errors.email ? <span className="mt-2 block text-sm text-red-300">{errors.email}</span> : null}
        </label>

        <label className="block">
          <span className="sr-only">Password</span>
          <div className="flex min-h-14 items-center rounded-[1.3rem] border border-transparent bg-[#293337] px-4 transition focus-within:border-blue-400">
            <input
              autoComplete="current-password"
              className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-400"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password *"
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              className="ml-3 text-sm font-semibold text-slate-300 hover:text-white"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password ? <span className="mt-2 block text-sm text-red-300">{errors.password}</span> : null}
        </label>
      </div>

      <div className="mt-6 space-y-4 text-sm">
        <button
          className="text-blue-400 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isAuthDisabled}
          onClick={() => void handlePasswordReset()}
          type="button"
        >
          {authMode === "reset" ? "Sending reset email..." : "Forgot password?"}
        </button>
        <p className="text-slate-300">
          New to FriendVault?{" "}
          <button
            className="text-blue-400 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isAuthDisabled}
            onClick={() => void handleAuth("signup")}
            type="button"
          >
            {authMode === "signup" ? "Creating account..." : "Sign Up"}
          </button>
        </p>
      </div>

      <button
        className="mt-6 min-h-12 w-full rounded-full bg-white/8 text-sm font-bold text-white/35 transition enabled:bg-blue-500 enabled:text-white enabled:hover:bg-blue-400"
        disabled={!canSubmit || isAuthDisabled}
        type="submit"
      >
        {authMode === "login" ? "Logging In..." : "Log In"}
      </button>
    </form>
  );
}
