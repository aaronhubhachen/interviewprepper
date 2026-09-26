import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = { title: "Dashboard" };

/** "/" — retention, forecast, weak spots, activity, and the iMessage link (data loads client-side and live-refreshes). */
export default function DashboardPage() {
  return <Dashboard />;
}
