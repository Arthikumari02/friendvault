import { redirect } from "next/navigation";

export default async function GroupMemoriesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  redirect(`/groups/${encodeURIComponent(groupId)}`);
}
