import { MemoryPhotoGallery } from "@/features/memories/components/MemoryPhotoGallery";
import Link from "next/link";
import { MemoryActions } from "@/features/memories/components/MemoryActions";
import { formatDate } from "@/utils/date";
import type { MemoryWithUser } from "@/types";

export function MemoryCard({ memory, viewerId, groupOwnerId, onDeleted }: { memory: MemoryWithUser; viewerId?: string; groupOwnerId?: string; onDeleted?: (cleanupFailed: boolean) => void }) {
  const canManage = Boolean(viewerId && (viewerId === memory.uploadedBy || viewerId === groupOwnerId));
  return <article className="relative rounded-[1.75rem] bg-white p-3 shadow-xl shadow-slate-200/80 transition duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-100">
    <div className="relative min-h-72 overflow-hidden rounded-[1.35rem] bg-indigo-50">
      {memory.photos?.length || memory.imageUrl ? <MemoryPhotoGallery memory={memory} sizes="(min-width: 768px) 50vw, 100vw" /> : <Link href={`/groups/${memory.groupId}/memories/${memory.id}`} className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-100 via-purple-50 to-amber-100 p-6 text-center"><span className="text-2xl font-bold tracking-tight text-indigo-900">{memory.title}</span></Link>}
      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700">{memory.photos?.length || memory.imageUrl ? "Photo" : "Story"}</span>
    </div>
    <Link className="group block" href={`/groups/${memory.groupId}/memories/${memory.id}`}>
      <div className="px-2 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600"><span>{formatDate(memory.memoryDate)}</span>{memory.location ? <span>{memory.location}</span> : null}</div>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{memory.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{memory.description}</p>
        <p className="mt-4 text-sm font-medium text-slate-500">Saved by {memory.uploadedByName}</p>
      </div>
    </Link>
    {canManage ? <div className="absolute right-6 top-6"><MemoryActions groupId={memory.groupId} memoryId={memory.id} onDeleted={onDeleted} /></div> : null}
  </article>;
}
