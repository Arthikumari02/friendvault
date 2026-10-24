import Link from "next/link";

import { MemoryActions } from "@/features/memories/components/MemoryActions";
import { MemoryPhotoGallery } from "@/features/memories/components/MemoryPhotoGallery";
import { formatDate } from "@/utils/date";
import type { MemoryWithUser } from "@/types";

interface RecentMemoriesProps {
  groupId: string;
  ownerId: string;
  viewerId: string;
  memories: MemoryWithUser[];
  unavailable: boolean;
  onRetry: () => void;
  onDeleted: (cleanupFailed: boolean) => void;
}

export function RecentMemories({ groupId, ownerId, viewerId, memories, unavailable, onRetry, onDeleted }: RecentMemoriesProps) {
  return <section className="recent-memories" aria-labelledby="recent-heading">
    <div className="recent-heading"><div><p className="eyebrow">the moments that stay</p><h2 id="recent-heading">Recent memories</h2></div></div>
    {unavailable ? <div className="group-empty"><p>Memories are unavailable right now.</p><button className="pill pill-outline" onClick={onRetry} type="button">Retry</button></div>
      : memories.length ? <div className="recent-grid">{memories.map((memory) => <article className="recent-card" key={memory.id}>
        <div className="recent-photo">
          {memory.photos?.length || memory.imageUrl
            ? <MemoryPhotoGallery memory={memory} sizes="(min-width: 1000px) 350px, (min-width: 600px) 50vw, 100vw" />
            : <Link href={`/groups/${groupId}/memories/${memory.id}`}><span>{memory.title}</span></Link>}
        </div>
        <Link href={`/groups/${groupId}/memories/${memory.id}`}><div className="recent-card-copy">
          <time>{formatDate(memory.memoryDate)}</time><h3>{memory.title}</h3><p>{memory.description}</p>
          {memory.location ? <small>♧&nbsp; {memory.location}</small> : null}
        </div></Link>
        {viewerId === memory.uploadedBy || viewerId === ownerId ? <div className="recent-card-actions"><MemoryActions groupId={groupId} memoryId={memory.id} onDeleted={onDeleted} /></div> : null}
      </article>)}</div>
      : <div className="group-memory-empty"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.5"/></svg><h3>Your first memory belongs here</h3><p>A moment, a photo, a story worth keeping.</p><Link className="pill pill-outline" href={`/groups/${groupId}/memories/create`}>＋&nbsp; Add a memory</Link></div>}
  </section>;
}
