import Image from "next/image";
import { AvatarStack } from "@/components/AvatarStack";
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
import type { GroupSummary } from "@/types";

export function GroupCard({ group }: { group: GroupSummary }) {
  const recent = group.latestMemory;

  return (
    <article className="overflow-hidden rounded-[2.5rem] bg-white/78 shadow-2xl shadow-indigo-100/70 backdrop-blur">
      <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
        <div className={`relative min-h-[420px] bg-gradient-to-br ${group.coverImage ?? "from-indigo-300 to-purple-200"}`}>
          {recent?.imageUrl ? (
            <Image
              alt={`${recent.title} latest memory`}
              className="object-cover mix-blend-soft-light opacity-80"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              src={recent.imageUrl}
            />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,.72),transparent_18rem),linear-gradient(180deg,transparent,rgba(15,23,42,.45))]" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <AvatarStack avatars={group.memberAvatars} />
            <h2 className="mt-5 text-5xl font-bold tracking-tight">{group.name}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/86">{group.coverCaption}</p>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-3xl bg-amber-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Years</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{group.yearsTogether}</p>
            </div>
            <div className="rounded-3xl bg-indigo-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Friends</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{group.memberCount}</p>
            </div>
            <div className="rounded-3xl bg-purple-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-700">Memories</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{group.totalMemories}</p>
            </div>
          </div>
          <div className="mt-6 rounded-[2rem] bg-white p-4 shadow-xl shadow-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Latest memory</p>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {recent?.title ?? "Start the archive"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {recent?.caption ?? group.description}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              {recent ? formatDate(recent.memoryDate) : "No date yet"}
            </p>
          </div>
          <div className="mt-6">
            <p className="text-sm font-bold text-slate-950">Recent activity</p>
            <div className="mt-3 space-y-3">
              {["Goa Trip", "Birthday Surprise", "Chai After Exam"].map((item) => (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3" key={item}>
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300 ring-4 ring-amber-100" />
                  <span className="text-sm font-semibold text-slate-700">Photo · {item}</span>
                </div>
              ))}
            </div>
          </div>
          <Button className="mt-7 w-full" href={`/groups/${group.id}`} variant="warm">
            Open Timeline
          </Button>
        </div>
      </div>
    </article>
  );
}
