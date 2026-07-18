import Image from "next/image";
import { AvatarStack } from "@/components/AvatarStack";
import { Button } from "@/components/Button";
import {
  APP_TAGLINE,
  galleryMemories,
  scatteredSources,
  timelinePreview,
} from "@/constants/app";

function MemoryPhoto({
  item,
  priority = false,
}: {
  item: (typeof timelinePreview)[number];
  priority?: boolean;
}) {
  return (
    <article className="rounded-[2rem] bg-white p-3 shadow-2xl shadow-slate-200/80">
      <div className="relative h-64 overflow-hidden rounded-[1.5rem]">
        <Image
          alt={`${item.title} memory`}
          className="object-cover"
          fill
          priority={priority}
          sizes="(min-width: 1024px) 360px, 90vw"
          src={item.src}
        />
      </div>
      <div className="px-2 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
          <span>{item.date}</span>
          <span className="text-amber-700">{item.reactions}</span>
        </div>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          {item.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{item.caption}</p>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <>
      <section className="overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
              Open the old photo box
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-tight tracking-tight text-slate-950 sm:text-7xl">
              {APP_TAGLINE}
            </h1>
            <p className="mt-6 max-w-xl whitespace-pre-line text-2xl font-semibold leading-snug text-slate-700">
              {"Every trip.\nEvery birthday.\nEvery inside joke.\nEvery memory.\n\nPreserved forever."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/login" variant="warm">
                Start Your Vault
              </Button>
              <Button href="#timeline" variant="secondary">
                See The Timeline
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <AvatarStack avatars={["AM", "MS", "KR", "RS"]} />
              <p className="max-w-xs text-sm leading-6 text-slate-600">
                Friends, years, reactions, captions, and the moments that made the group yours.
              </p>
            </div>
          </div>
          <div className="relative min-h-[680px]">
            <div className="absolute left-0 top-8 w-[18rem] rotate-[-5deg] sm:w-[20rem]">
              <MemoryPhoto item={timelinePreview[0]} priority />
            </div>
            <div className="absolute right-0 top-0 w-[17rem] rotate-[4deg] sm:w-[19rem]">
              <MemoryPhoto item={timelinePreview[1]} />
            </div>
            <div className="absolute bottom-12 left-10 w-[17rem] rotate-[3deg] sm:w-[19rem]">
              <MemoryPhoto item={timelinePreview[2]} />
            </div>
            <div className="absolute bottom-0 right-8 w-72 rounded-[2rem] border border-white/80 bg-white/88 p-5 shadow-2xl shadow-indigo-100 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                College Circle
              </p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <AvatarStack avatars={["AM", "MS", "KR", "RS"]} />
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  4 years
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                142 memories
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Trips, exams, birthdays, cricket weekends, and graduation day in one private story.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16" id="timeline">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
              Living timeline preview
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              The story unfolds by year.
            </h2>
          </div>
          <div className="mt-10 space-y-8">
            {timelinePreview.map((item, index) => (
              <div className="grid gap-5 md:grid-cols-[96px_1fr]" key={`${item.year}-${item.title}`}>
                <div className="flex md:block">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-950 text-lg font-bold text-white shadow-xl shadow-slate-300">
                    {item.year}
                  </div>
                  {index < timelinePreview.length - 1 ? (
                    <div className="ml-8 hidden h-full w-px bg-gradient-to-b from-indigo-300 to-purple-200 md:block" />
                  ) : null}
                </div>
                <MemoryPhoto item={item} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
              Why FriendVault exists
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              Your friendship story is scattered everywhere.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Photos are in one app, jokes are buried in chats, videos sit in folders, and stories disappear after a day. FriendVault keeps the story together.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {scatteredSources.map((source) => (
              <div
                className="rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-xl shadow-slate-200/70 backdrop-blur"
                key={source}
              >
                <p className="text-lg font-bold text-slate-950">{source}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">A piece of the memory, separated from the rest.</p>
              </div>
            ))}
            <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl shadow-indigo-100 sm:col-span-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
                FriendVault
              </p>
              <p className="mt-3 text-2xl font-bold">One private place for the whole friendship story.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-900 p-6 text-white shadow-2xl shadow-indigo-200 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">
                  Friendship time capsule
                </p>
                <h2 className="mt-3 text-4xl font-bold tracking-tight">
                  A question for your future selves.
                </h2>
                <p className="mt-4 text-lg leading-8 text-indigo-100">
                  Lock a message inside the vault and open it years later with the same people.
                </p>
              </div>
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-300 text-2xl font-black text-slate-950 shadow-lg shadow-amber-400/30">
                  Lock
                </div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
                  Locked message
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight">
                  Did we finally visit Japan?
                </p>
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <dt className="text-sm text-indigo-100">Created</dt>
                    <dd className="mt-1 text-2xl font-bold">2026</dd>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <dt className="text-sm text-indigo-100">Opens</dt>
                    <dd className="mt-1 text-2xl font-bold">2030</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16" id="gallery">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
                Memory gallery
              </p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
                The archive should feel full from the first glance.
              </h2>
            </div>
            <Button href="/dashboard" variant="warm">
              Open Demo Vaults
            </Button>
          </div>
          <div className="mt-10 grid auto-rows-[220px] gap-5 md:grid-cols-3">
            {galleryMemories.map((memory) => (
              <article
                className={`group relative overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-200/80 ${memory.className}`}
                key={memory.title}
              >
                <Image
                  alt={`${memory.title} memory`}
                  className="object-cover transition duration-500 group-hover:scale-105"
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  src={memory.src}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/72 via-slate-950/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                    {memory.date} - {memory.reactions}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold">{memory.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/80">{memory.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
