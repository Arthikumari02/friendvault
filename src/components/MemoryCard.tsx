import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/utils/date";
import type { MemoryWithUser } from "@/types";

export function MemoryCard({ memory }: { memory: MemoryWithUser }) {
  return (
    <Link
      className="group block rounded-[1.75rem] bg-white p-3 shadow-xl shadow-slate-200/80 transition duration-200 hover:-translate-y-1 hover:rotate-0 hover:shadow-2xl hover:shadow-indigo-100"
      href={`/groups/${memory.groupId}/memories/${memory.id}`}
    >
      <div className="relative min-h-72 overflow-hidden rounded-[1.35rem] bg-indigo-50">
        {memory.imageUrl ? (
          <Image
            alt={`${memory.title} memory`}
            className="object-cover"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            src={memory.imageUrl}
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.28),transparent_16rem),linear-gradient(180deg,transparent,rgba(15,23,42,.18))]" />
        <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
          {memory.imageTone ?? "memory photo"}
        </span>
      </div>
      <div className="px-2 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
          <span>{formatDate(memory.memoryDate)}</span>
          {memory.location ? <span>{memory.location}</span> : null}
        </div>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          {memory.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
          {memory.caption ?? memory.description}
        </p>
        <p className="mt-4 text-sm font-medium text-slate-500">
          Saved by {memory.uploadedByName}
        </p>
      </div>
    </Link>
  );
}
