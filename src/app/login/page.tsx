import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <section className="relative min-h-[calc(100svh-4.5rem)] overflow-hidden bg-[#050909] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -left-20 top-28 h-48 w-64 rounded-[4rem] bg-emerald-950" />
        <div className="absolute left-36 bottom-6 h-32 w-72 rounded-[4rem] bg-slate-800" />
        <div className="absolute right-10 top-24 h-32 w-80 rounded-[4rem] bg-slate-800" />
        <div className="absolute right-32 bottom-16 h-48 w-64 rounded-[4rem] bg-emerald-950" />
      </div>
      <div className="relative mx-auto flex min-h-[calc(100svh-8.5rem)] max-w-3xl items-center justify-center">
        <LoginForm />
      </div>
    </section>
  );
}
