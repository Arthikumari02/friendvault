import { DashboardContent } from "@/components/DashboardContent";
import { getGroupsForUser } from "@/services/groups";

export default async function DashboardPage() {
  const groups = await getGroupsForUser();

  return <DashboardContent groups={groups} />;
}
