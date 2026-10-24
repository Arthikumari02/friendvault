import { Suspense } from "react";
import { DashboardController } from "@/features/groups/controllers/DashboardController";

export default function DashboardPage() {
  return <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600">Loading vaults...</p>}><DashboardController /></Suspense>;
}
