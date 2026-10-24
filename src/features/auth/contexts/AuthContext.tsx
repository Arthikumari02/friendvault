"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  OAuthProvider,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import type { User } from "@/types";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  refreshUser: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  sendPhoneCode: (phone: string, container: HTMLElement) => Promise<ConfirmationResult>;
  confirmPhoneCode: (confirmation: ConfirmationResult, code: string) => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  isEmailLink: (url: string) => boolean;
  completeEmailLink: (email: string, url: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getInitials(nameOrEmail: string) {
  const nameParts = nameOrEmail
    .replace(/@.*/, "")
    .split(/[.\s_-]+/)
    .filter(Boolean);

  return nameParts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FR";
}

function requireAuth() {
  if (!auth) {
    throw new Error(
      "Firebase configuration is missing. Add the NEXT_PUBLIC_FIREBASE values to .env.local and restart the server.",
    );
  }

  return auth;
}

function toAppUser(firebaseUser: FirebaseUser): User {
  const email = firebaseUser.email?.trim() ?? "";
  const name = firebaseUser.displayName?.trim() || email || "Friend";
  const createdAt =
    firebaseUser.metadata.creationTime ?? new Date().toISOString();

  return {
    id: firebaseUser.uid,
    name,
    email,
    profileImage: firebaseUser.photoURL?.trim() || undefined,
    initials: getInitials(name),
    createdAt,
  };
}

export function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error
      ? error.message
      : "Authentication could not be completed. Try again.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account already exists for this email. Log in with the saved password or use Forgot password.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/user-not-found":
      return "No account exists for this email. Sign up first.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase Authentication.";
    case "auth/unauthorized-domain":
      return "Add this site's domain to Firebase Authentication authorized domains.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/popup-closed-by-user":
      return "The sign-in popup was closed before sign-in finished.";
    case "auth/invalid-phone-number":
      return "Enter a phone number with country code, such as +15551234567.";
    case "auth/invalid-verification-code":
      return "The verification code is incorrect. Try again.";
    case "auth/code-expired":
      return "The verification code expired. Request a new code.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    default:
      return error.message;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return;

    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? toAppUser(firebaseUser) : null);
      setIsAuthLoading(false);
    });
  }, []);

  const refreshUser = useCallback(() => {
    const firebaseUser = auth?.currentUser;
    setUser(firebaseUser ? toAppUser(firebaseUser) : null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const firebaseAuth = requireAuth();
    const result = await signInWithEmailAndPassword(
      firebaseAuth,
      email,
      password,
    );
    setUser(toAppUser(result.user));
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const firebaseAuth = requireAuth();
    const result = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password,
    );
    setUser(toAppUser(result.user));
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const firebaseAuth = requireAuth();

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(firebaseAuth, provider);
    setUser(toAppUser(result.user));
  }, []);

  const loginWithApple = useCallback(async () => {
    const firebaseAuth = requireAuth();
    const result = await signInWithPopup(firebaseAuth, new OAuthProvider("apple.com"));
    setUser(toAppUser(result.user));
  }, []);

  const sendPhoneCode = useCallback(async (phone: string, container: HTMLElement) => {
    const firebaseAuth = requireAuth();
    const verifier = new RecaptchaVerifier(firebaseAuth, container, { size: "normal" });
    try {
      return await signInWithPhoneNumber(firebaseAuth, phone, verifier);
    } finally {
      verifier.clear();
    }
  }, []);

  const confirmPhoneCode = useCallback(async (confirmation: ConfirmationResult, code: string) => {
    const result = await confirmation.confirm(code);
    setUser(toAppUser(result.user));
  }, []);

  const sendEmailLink = useCallback(async (email: string) => {
    const firebaseAuth = requireAuth();
    await sendSignInLinkToEmail(firebaseAuth, email, {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true,
    });
  }, []);

  const isEmailLink = useCallback((url: string) => Boolean(auth && isSignInWithEmailLink(auth, url)), []);

  const completeEmailLink = useCallback(async (email: string, url: string) => {
    const firebaseAuth = requireAuth();
    const result = await signInWithEmailLink(firebaseAuth, email, url);
    setUser(toAppUser(result.user));
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const firebaseAuth = requireAuth();
    await sendPasswordResetEmail(firebaseAuth, email);
  }, []);

  const logout = useCallback(async () => {
    if (auth) await signOut(auth);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthLoading,
      refreshUser,
      login,
      loginWithGoogle,
      loginWithApple,
      sendPhoneCode,
      confirmPhoneCode,
      sendEmailLink,
      isEmailLink,
      completeEmailLink,
      logout,
      sendPasswordReset,
      signup,
    }),
    [
      isAuthLoading,
      refreshUser,
      login,
      loginWithGoogle,
      loginWithApple,
      sendPhoneCode,
      confirmPhoneCode,
      sendEmailLink,
      isEmailLink,
      completeEmailLink,
      logout,
      sendPasswordReset,
      signup,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
