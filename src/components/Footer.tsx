"use client";
import { usePathname } from "next/navigation";
export function Footer() { const pathname = usePathname(); return pathname === "/" ? <footer className="site-footer paper">Made for friendships that last · FriendVault</footer> : null; }
