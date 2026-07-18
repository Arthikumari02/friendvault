"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, navLinks } from "@/constants/app";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthLoading, logout } = useAuth();
  const visibleNavLinks = navLinks.filter(
    (link) => link.href !== "/login" || (!isAuthLoading && !user),
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-[#fffaf0]/85 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2 text-slate-950" href="/">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-600 via-purple-500 to-amber-300 text-sm font-black text-white shadow-lg shadow-indigo-200">
            FV
          </span>
          <span className="font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {visibleNavLinks.map((link) => (
            <Link
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                pathname === link.href
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-950"
              }`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex min-w-28 items-center justify-end gap-3">
          {isAuthLoading ? (
            <span
              aria-label="Checking sign-in status"
              className="h-11 w-28 rounded-full bg-white/60"
            />
          ) : user ? (
            <>
              <span className="hidden text-sm text-slate-500 sm:inline">
                {user.email}
              </span>
              <Button onClick={logout} variant="secondary">
                Logout
              </Button>
            </>
          ) : (
            <Button href="/login" variant="warm">
              Sign in
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
