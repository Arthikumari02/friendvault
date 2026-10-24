import { Button } from "@/components/Button";

export function VaultTemplatePreview() {
  return (
    <article className="overflow-hidden rounded-[2.5rem] bg-white/78 shadow-2xl shadow-indigo-100/70 backdrop-blur">
      <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative min-h-[420px] bg-gradient-to-br from-indigo-200 via-purple-100 to-amber-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,.72),transparent_18rem),linear-gradient(180deg,transparent,rgba(15,23,42,.35))]" />
          <div className="absolute left-6 top-6 flex -space-x-3">
            {["You", "F", "+"].map((item) => (
              <span
                className="grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-white/70 text-xs font-bold text-indigo-700 shadow-sm backdrop-blur"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
              Your first vault
            </p>
            <h2 className="mt-3 text-5xl font-bold tracking-tight">Create your circle</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/86">
              After signing in, this cover becomes your real group: your friends, your years, your photos, your timeline.
            </p>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Years", "--"],
              ["Friends", "--"],
              ["Memories", "--"],
            ].map(([label, value]) => (
              <div className="rounded-3xl bg-slate-50 p-4" key={label}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-400">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[2rem] bg-white p-4 shadow-xl shadow-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Latest memory</p>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              Waiting for your first memory
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in, create a group, and your latest trip, birthday, or inside joke will live here.
            </p>
          </div>
          <div className="mt-6">
            <p className="text-sm font-bold text-slate-950">Recent timeline</p>
            <div className="mt-3 space-y-3">
              {["First uploaded photo", "First friend invited", "First saved story"].map((item) => (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3" key={item}>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-slate-100" />
                  <span className="text-sm font-semibold text-slate-500">Template - {item}</span>
                </div>
              ))}
            </div>
          </div>
          <Button className="mt-7 w-full" href="/login" variant="warm">
            Sign in to start
          </Button>
        </div>
      </div>
    </article>
  );
}
