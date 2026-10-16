import { Button } from "@/components/Button";
import { GroupCard } from "@/components/GroupCard";
import { getGroupsForUser } from "@/services/groups";

export default async function DemoPage() {
  const groups = await getGroupsForUser();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Demo vaults</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">See how a friendship archive works.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">These sample groups and memories are for preview. Your own groups appear on the dashboard after you sign in.</p>
        </div>
        <Button href="/dashboard" variant="warm">Your vaults</Button>
      </div>
      <div className="space-y-8">
        {groups.map((group) => <GroupCard group={group} key={group.id} />)}
      </div>
    </section>
  );
}
