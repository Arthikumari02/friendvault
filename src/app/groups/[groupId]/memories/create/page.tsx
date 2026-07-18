import { notFound } from "next/navigation";
import { CreateMemoryForm } from "@/features/memories/CreateMemoryForm";
import { getGroupById } from "@/services/groups";

export default async function CreateMemoryPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = await getGroupById(groupId);
  if (!group) notFound();

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
        Add memory
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        Save a moment for {group.name}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Capture the title, date, photo, place, and story behind this memory.
      </p>
      <div className="mt-8">
        <CreateMemoryForm groupId={group.id} />
      </div>
    </section>
  );
}
