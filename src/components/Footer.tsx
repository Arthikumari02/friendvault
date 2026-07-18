import Link from "next/link";
import { APP_NAME } from "@/constants/app";

const links = ["About", "Privacy", "Contact"];

export function Footer() {
  return (
    <footer className="border-t border-white/80 bg-white/55 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>{APP_NAME} is a private archive for the stories friendships are made of.</p>
        <div className="flex gap-5">
          {links.map((link) => (
            <Link className="transition hover:text-indigo-700" href="/" key={link}>
              {link}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
