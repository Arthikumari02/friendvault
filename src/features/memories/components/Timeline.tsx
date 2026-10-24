import { EmptyState } from "@/components/EmptyState";
import { MemoryCard } from "@/features/memories/components/MemoryCard";
import type { MemoryWithUser } from "@/types";

function groupByYear(memories: MemoryWithUser[]) {
  return memories.reduce<Record<string, MemoryWithUser[]>>((groups, memory) => {
    const year = new Date(memory.memoryDate).getFullYear().toString();
    groups[year] = [...(groups[year] ?? []), memory];
    return groups;
  }, {});
}

export function Timeline({
  memories,
  groupId,
  showAddAction = true,
  viewerId, groupOwnerId, onDeleted,
}: {
  memories: MemoryWithUser[];
  groupId: string;
  showAddAction?: boolean;
  viewerId?: string; groupOwnerId?: string; onDeleted?: (cleanupFailed: boolean) => void;
}) {
  if (memories.length === 0) {
    return (
      <EmptyState
        actionHref={showAddAction ? `/groups/${groupId}/memories/create` : undefined}
        actionLabel={showAddAction ? "Create your first memory" : undefined}
        description="Start the timeline with a photo, a story, or a small moment everyone still quotes."
        title="No memories yet"
      />
    );
  }

  const byYear = groupByYear(memories);
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-12">
      {years.map((year) => (
        <section className="relative" key={year}>
          <div className="mb-5 flex items-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-950 text-lg font-bold text-white shadow-xl shadow-slate-300">
              {year}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {byYear[year].map((memory, index) => (
              <div className={index % 2 === 0 ? "md:rotate-[-1deg]" : "md:rotate-[1deg]"} key={memory.id}>
                <MemoryCard memory={memory} viewerId={viewerId} groupOwnerId={groupOwnerId} onDeleted={onDeleted} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
