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
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import type { User } from "@/types";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
      "Firebase environment variables are required before email and Google sign-in can be used.",
    );
  }

  return auth;
}

function toAppUser(firebaseUser: FirebaseUser): User {
  const email = firebaseUser.email ?? "";
  const name = firebaseUser.displayName ?? email;
  const createdAt =
    firebaseUser.metadata.creationTime ?? new Date().toISOString();

  return {
    id: firebaseUser.uid,
    name,
    email,
    profileImage: firebaseUser.photoURL ?? undefined,
    initials: getInitials(name || email),
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
      return "Enable the Email/Password sign-in provider in Firebase Authentication.";
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
      login,
      loginWithGoogle,
      logout,
      sendPasswordReset,
      signup,
    }),
    [
      isAuthLoading,
      login,
      loginWithGoogle,
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
