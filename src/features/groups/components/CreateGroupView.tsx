import { CreateGroupForm } from "@/features/groups/components/CreateGroupForm";

export default function CreateGroupView() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
        New vault
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        Create a friend group
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Give the group a name, a short description, and a cover image that
        sets the mood for the archive.
      </p>
      <div className="mt-8">
        <CreateGroupForm />
      </div>
    </section>
  );
}
