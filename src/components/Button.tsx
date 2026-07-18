import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "warm";
  children: ReactNode;
};

const variants = {
  primary:
    "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700",
  secondary:
    "border border-indigo-100 bg-white/80 text-slate-900 shadow-sm hover:border-indigo-200 hover:bg-white hover:text-indigo-700",
  ghost: "text-slate-600 hover:bg-white/70 hover:text-slate-950",
  warm: "bg-amber-300 text-slate-950 shadow-lg shadow-amber-200 hover:bg-amber-200",
};

export function Button({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition duration-200 ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
