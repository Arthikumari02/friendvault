import Link from "next/link";
import Image from "next/image";
import { MemoryPhotoImage } from "@/features/memories/components/MemoryPhotoImage";
import type { GroupSummary } from "@/types";

export function GroupCard({ group }: { group: GroupSummary }) {
  const coverUrl = group.coverImage && (/^https:\/\//.test(group.coverImage) || group.coverImage === "/lake-vault-cover.png")
    ? group.coverImage
    : group.latestMemory?.imageUrl;
  const latest = group.latestMemory;
  return <Link className="vault-card" href={`/groups/${group.id}`}><div className={`vault-cover ${coverUrl || latest?.photos?.length ? "has-image" : ""}`}>
    {coverUrl ? <Image src={coverUrl} alt="" fill unoptimized sizes="350px" className="object-cover" /> : latest?.photos?.[0] ? <MemoryPhotoImage groupId={group.id} memoryId={latest.id} photo={latest.photos[0]} alt="" sizes="350px" retryable={false} /> : <div className="vault-cover-gradient" />}
  </div><div className="vault-card-body"><h2>{group.name}</h2><p>{group.description || group.coverCaption}</p><small>{group.memberCount} friends · {group.totalMemories} memories</small></div></Link>;
}
