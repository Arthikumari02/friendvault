"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage, useAuth } from "@/context/AuthContext";
import { hasFirebaseConfig } from "@/firebase/config";
import { isValidEmail } from "@/utils/validation";

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
    sendPasswordReset,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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

  async function handleGoogleSignIn() {
    setAuthMessage("");
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsGoogleLoading(false);
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

      {!hasFirebaseConfig ? (
        <div className="-mx-8 mt-6 bg-amber-700 px-8 py-3 text-sm leading-6 text-white sm:-mx-12 sm:px-12">
          Add Firebase values to .env.local, enable Email/Password authentication, then restart the dev server.
        </div>
      ) : authMessage ? (
        <div
          className={`-mx-8 mt-6 px-8 py-3 text-sm leading-6 text-white sm:-mx-12 sm:px-12 ${
            authMessageType === "success" ? "bg-emerald-700" : "bg-red-700"
          }`}
        >
          {authMessage}
        </div>
      ) : null}

      <div className="mt-5 space-y-2.5">
        <ProviderButton icon="P" label="Continue with Phone Number" onClick={() => setErrorMessage("Phone sign-in is not configured yet.")} />
        <ProviderButton
          disabled={isGoogleLoading || isAuthDisabled}
          highlighted
          icon="G"
          label={isGoogleLoading ? "Opening Google..." : "Continue with Google"}
          onClick={handleGoogleSignIn}
        />
        <ProviderButton icon="A" label="Continue with Apple" onClick={() => setErrorMessage("Apple sign-in is not configured yet.")} />
        <ProviderButton icon="L" label="Email me a one-time link" onClick={() => setErrorMessage("Email link sign-in is not configured yet.")} />
      </div>

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
