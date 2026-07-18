import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/Button";
import { CommentSection } from "@/components/CommentSection";
import { getGroupById } from "@/services/groups";
import {
  getCommentsForMemory,
  getMemoryById,
  getReactionsForMemory,
} from "@/services/memories";
import { formatDate } from "@/utils/date";

export default async function MemoryDetailsPage({
  params,
}: {
  params: Promise<{ groupId: string; memoryId: string }>;
}) {
  const { groupId, memoryId } = await params;
  const [group, memory, comments, reactions] = await Promise.all([
    getGroupById(groupId),
    getMemoryById(memoryId),
    getCommentsForMemory(memoryId),
    getReactionsForMemory(memoryId),
  ]);

  if (!group || !memory || memory.groupId !== group.id) notFound();

  const reactionCounts = reactions.reduce<Record<string, number>>((counts, reaction) => {
    counts[reaction.reactionType] = (counts[reaction.reactionType] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Button href={`/groups/${group.id}`} variant="ghost">
        Back to {group.name}
      </Button>
      <article className="mt-5 overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-indigo-100">
        <div className="relative min-h-[420px] bg-indigo-50">
          {memory.imageUrl ? (
            <Image
              alt={`${memory.title} memory`}
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 896px, 100vw"
              src={memory.imageUrl}
            />
          ) : null}
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                {formatDate(memory.memoryDate)}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                {memory.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                {memory.description}
              </p>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Location</dt>
                  <dd className="font-semibold text-slate-950">
                    {memory.location ?? "Not added"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Uploaded By</dt>
                  <dd className="font-semibold text-slate-950">
                    {memory.uploadedByName}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Upload Date</dt>
                  <dd className="font-semibold text-slate-950">
                    {formatDate(memory.createdAt)}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-3xl bg-indigo-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Reactions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["heart", "laugh", "spark", "nostalgia"].map((reaction) => (
                  <span
                    className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
                    key={reaction}
                  >
                    {reaction} {reactionCounts[reaction] ?? 0}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </article>
      <div className="mt-6">
        <CommentSection comments={comments} />
      </div>
    </section>
  );
}
